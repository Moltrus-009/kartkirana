import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import { onAuthStateChanged, signOut, signInWithPhoneNumber, RecaptchaVerifier } from 'firebase/auth';
import { collection, doc, query, onSnapshot, getDocs, updateDoc, setDoc, deleteDoc } from 'firebase/firestore';
import { auth, db } from '../lib/firebase';
import { adminService } from '../services/adminService';
import { logger } from '../lib/logger';
import { mapFirebaseError } from '../lib/errorMapper';

export interface UserDoc {
  uid: string;
  name?: string;
  fullName?: string;
  email?: string;
  phone: string;
  role?: 'customer' | 'owner' | 'rider' | 'admin' | 'super_admin' | 'operations' | 'finance' | 'support' | 'marketing' | 'merchant_success' | 'logistics' | 'analyst';
  shopId?: string | null;
  status?: string;
  accountStatus?: 'pending' | 'approved' | 'suspended' | 'active';
  createdAt?: string;
  dlUrl?: string;
  aadhaarUrl?: string;
  rcUrl?: string;
  wallet?: number;
  lastOnline?: string;
  deviceToken?: string;
  isDeleted?: boolean;
}

export interface ShopDoc {
  id: string;
  name: string;
  ownerId: string;
  phone?: string;
  image?: string;
  logo?: string;
  coverImage?: string;
  rating: number;
  deliveryTime?: number | string;
  deliveryFee?: number;
  productsCount?: number;
  status: 'open' | 'closed';
  address: string;
  categories?: string[];
  lat?: number;
  lng?: number;
  gst?: string;
  bankDetails?: { bankName: string; accountNo: string; ifsc: string };
  verificationStep?: 'pending' | 'documents' | 'gst' | 'bank' | 'location' | 'approved' | 'live';
  revenueToday?: number;
  revenueThisMonth?: number;
  todayOrdersCount?: number;
  pendingOrdersCount?: number;
  isDeleted?: boolean;
  isArchived?: boolean;
}

export interface ProductDoc {
  id: string;
  shopId: string;
  shopName: string;
  name: string;
  price: number;
  mrp?: number;
  stock: number;
  category: string;
  image?: string;
  status: 'active' | 'disabled';
  isDeleted?: boolean;
  isFastMoving?: boolean;
  isSlowMoving?: boolean;
  expiryDate?: string;
}

export interface OrderDoc {
  id: string;
  userId: string;
  shopId: string;
  shopName: string;
  status: 'PLACED' | 'SHOP_ACCEPTED' | 'SEARCHING_RIDER' | 'RIDER_ASSIGNED' | 'ARRIVED_AT_SHOP' | 'PICKED_UP' | 'OUT_FOR_DELIVERY' | 'DELIVERED' | 'COMPLETED' | 'SHOP_REJECTED' | 'upcoming' | 'confirmed' | 'accepted' | 'preparing' | 'packed' | 'ready_for_pickup' | 'rider_assigned' | 'rider_picked_up' | 'out_for_delivery' | 'delivered' | 'cancelled' | 'returned';
  total: number;
  paymentMethod: string;
  paymentStatus: string;
  deliveryAddress: {
    address: string;
    coords?: { lat: number; lng: number };
    lat?: number;
    lng?: number;
  };
  contact: { name: string; phone: string };
  createdAt: string;
  timeline: { status: string; timestamp: string; title: string; desc: string; actor?: string; lat?: number; lng?: number }[];
  rider?: {
    uid?: string;
    name: string;
    phone: string;
    coords?: { lat: number; lng: number };
    progress: number;
  } | null;
  shopCoords?: { lat: number; lng: number };
  subtotal?: number;
  deliveryFee?: number;
  platformFee?: number;
  tax?: number;
  discount?: number;
}

export interface RiderDoc {
  uid: string;
  name: string;
  phone: string;
  vehicle: string;
  status: 'online' | 'offline' | 'busy' | 'idle';
  coords?: { lat: number; lng: number };
  latitude?: number;
  longitude?: number;
  todayDeliveries?: number;
  rating?: number;
  earnings?: number;
  wallet?: number;
  assignedOrders?: number;
  completedOrders?: number;
  cancelledOrders?: number;
  acceptanceRate?: number;
  averageDeliveryTime?: number;
  photoUrl?: string;
  batteryLevel?: number;
  gpsAccuracy?: number;
  lastHeartbeat?: string;
  lastLocationUpdate?: string;
  currentSpeed?: number;
  onlineHoursToday?: number;
  verificationStatus?: 'pending' | 'approved' | 'rejected' | 'suspended';
  isDeleted?: boolean;
}

interface AdminContextProps {
  adminUser: any | null;
  loading: boolean;
  users: UserDoc[];
  shops: ShopDoc[];
  products: ProductDoc[];
  orders: OrderDoc[];
  riders: RiderDoc[];
  
  // Auth actions
  sendOTP: (phoneNumber: string, containerId: string) => Promise<any>;
  verifyOTP: (confirmationResult: any, code: string) => Promise<void>;
  logout: () => Promise<void>;
  
  // Admin management actions
  updateUserRole: (uid: string, role: UserDoc['role'], shopId?: string | null) => Promise<void>;
  updateOrderStatus: (orderId: string, status: OrderDoc['status'], riderCoords?: { lat: number; lng: number }) => Promise<void>;
  deleteOrder: (orderId: string) => Promise<void>;
  updateShopStatus: (shopId: string, status: 'open' | 'closed') => Promise<void>;
  updateShopVerification: (shopId: string, step: ShopDoc['verificationStep']) => Promise<void>;
  approveShopAndMerchant: (shopId: string, ownerUid?: string) => Promise<void>;
  updateUserAccountStatus: (uid: string, accountStatus: 'pending' | 'approved' | 'suspended' | 'active') => Promise<void>;
  updateRiderStatus: (riderId: string, status: RiderDoc['status']) => Promise<void>;
  updateRiderVerification: (riderId: string, status: RiderDoc['verificationStatus']) => Promise<void>;
  deleteProduct: (productId: string) => Promise<void>;
  createNewShop: (shop: Omit<ShopDoc, 'rating'>) => Promise<void>;
  refreshAllData: () => Promise<void>;
}

type FirestoreData = Record<string, unknown>;

const isRecord = (value: unknown): value is FirestoreData =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

const stringValue = (value: unknown, fallback = ''): string =>
  typeof value === 'string' ? value : fallback;

const numberValue = (value: unknown, fallback = 0): number =>
  typeof value === 'number' && Number.isFinite(value) ? value : fallback;

const coordinates = (value: unknown): { lat: number; lng: number } | undefined => {
  if (!isRecord(value)) return undefined;
  const lat = numberValue(value.lat, Number.NaN);
  const lng = numberValue(value.lng, Number.NaN);
  return Number.isFinite(lat) && Number.isFinite(lng) ? { lat, lng } : undefined;
};

const dateValue = (value: unknown): string => {
  if (typeof value === 'string') return value;
  if (value instanceof Date) return value.toISOString();
  if (isRecord(value) && typeof value.toDate === 'function') {
    const converted = value.toDate();
    if (converted instanceof Date) return converted.toISOString();
  }
  return new Date(0).toISOString();
};

// Orders created by older app versions do not always include the newer nested
// contact, address, or rider structures. Normalize once at the Firebase boundary
// so every admin screen can render the same safe shape.
const normalizeOrder = (id: string, value: unknown): OrderDoc => {
  const source = isRecord(value) ? value : {};
  const contact = isRecord(source.contact) ? source.contact : {};
  const deliveryAddress = isRecord(source.deliveryAddress) ? source.deliveryAddress : {};
  const rider = isRecord(source.rider) ? source.rider : null;
  const riderCoords = rider ? coordinates(rider.coords) : undefined;

  return {
    id,
    userId: stringValue(source.userId),
    shopId: stringValue(source.shopId),
    shopName: stringValue(source.shopName, 'Unassigned shop'),
    status: stringValue(source.status, 'confirmed') as OrderDoc['status'],
    total: numberValue(source.total),
    paymentMethod: stringValue(source.paymentMethod, 'unknown'),
    paymentStatus: stringValue(source.paymentStatus, 'pending'),
    deliveryAddress: {
      address: stringValue(deliveryAddress.address, stringValue(source.address, 'Address unavailable')),
      coords: coordinates(deliveryAddress.coords),
      lat: numberValue(deliveryAddress.lat, Number.NaN),
      lng: numberValue(deliveryAddress.lng, Number.NaN)
    },
    contact: {
      name: stringValue(contact.name, stringValue(source.customerName, 'Customer')),
      phone: stringValue(contact.phone, stringValue(source.customerPhone))
    },
    createdAt: dateValue(source.createdAt),
    timeline: Array.isArray(source.timeline) ? source.timeline as OrderDoc['timeline'] : [],
    rider: rider ? {
      uid: stringValue(rider.uid) || undefined,
      name: stringValue(rider.name, 'Assigned rider'),
      phone: stringValue(rider.phone),
      coords: riderCoords,
      progress: numberValue(rider.progress)
    } : null,
    shopCoords: coordinates(source.shopCoords),
    subtotal: numberValue(source.subtotal),
    deliveryFee: numberValue(source.deliveryFee),
    platformFee: numberValue(source.platformFee),
    tax: numberValue(source.tax),
    discount: numberValue(source.discount)
  };
};

const AdminContext = createContext<AdminContextProps | undefined>(undefined);

export const AdminProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [adminUser, setAdminUser] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [users, setUsers] = useState<UserDoc[]>([]);
  const [shops, setShops] = useState<ShopDoc[]>([]);
  const [products, setProducts] = useState<ProductDoc[]>([]);
  const [orders, setOrders] = useState<OrderDoc[]>([]);
  const [riders, setRiders] = useState<RiderDoc[]>([]);
  const recaptchaVerifierRef = useRef<RecaptchaVerifier | null>(null);

  // Monitor auth state
  useEffect(() => {
    if (!auth) {
      setLoading(false);
      return;
    }
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setLoading(true);
      if (user) {
        try {
          // Force refresh custom claims
          await user.getIdToken(true);
          const tokenResult = await user.getIdTokenResult();
          
          const role = tokenResult.claims.role as string;

          const adminRoles = ['super_admin', 'admin', 'operations', 'support', 'finance', 'marketing', 'logistics', 'merchant_success', 'analyst'];
          
          if (role && adminRoles.includes(role)) {
            setAdminUser({ uid: user.uid, phone: user.phoneNumber, role });
          } else {
            console.warn('[AUTH ERROR] User does not possess administrative claims.');
            if (auth) await signOut(auth);
            setAdminUser(null);
            alert('Access Denied: You do not possess administrative permissions.');
          }
        } catch (err: any) {
          console.error('[AUTH ERROR] Claims check failed:', err.message);
          setAdminUser(null);
        }
      } else {
        setAdminUser(null);
      }
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  // Fetch non-realtime collections from Admin API upon successful auth
  useEffect(() => {
    if (!adminUser) {
      setUsers([]);
      setShops([]);
      setProducts([]);
      return;
    }

    async function loadData() {
      try {
        console.log('[ADMIN API] Pre-fetching users, shops, and products...');
        const [uList, sList, pList] = await Promise.all([
          adminService.getUsers(),
          adminService.getShops(),
          adminService.getProducts()
        ]);
        setUsers(uList.filter((u: any) => !u.isDeleted));
        setShops(sList.filter((s: any) => !s.isDeleted));
        setProducts(pList.filter((p: any) => !p.isDeleted));
      } catch (err: any) {
        console.error('[ADMIN API ERROR] Failed to fetch collections:', err.message);
      }
    }

    loadData();
  }, [adminUser]);

  // Set up Firebase Real-Time snapshot listeners for real-time dispatch ONLY (orders & riders)
  useEffect(() => {
    if (!db || !adminUser) {
      setOrders([]);
      setRiders([]);
      return;
    }

    console.log('[FIREBASE] Binding real-time listeners for dispatch models...');

    // 1. Orders collection
    const unsubOrders = onSnapshot(collection(db, 'orders'), (snap) => {
      const list = snap.docs.map(d => normalizeOrder(d.id, d.data()));
      list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      setOrders(list);
    }, (err) => {
      logger.error('Firestore', 'Unable to load orders for the admin portal.', err);
    });

    // 2. Riders collection
    const unsubRiders = onSnapshot(collection(db, 'riders'), (snap) => {
      const list = snap.docs.map(d => ({ uid: d.id, ...d.data() } as RiderDoc));
      setRiders(list.filter(r => !r.isDeleted));
    }, (err) => {
      logger.error('Firestore', 'Unable to load riders for the admin portal.', err);
    });

    // Cleanup unsubscribes on unmount/auth state change
    return () => {
      console.log('[FIREBASE] Unsubscribed dispatch listeners.');
      unsubOrders();
      unsubRiders();
    };
  }, [adminUser]);

  const refreshAllData = async () => {
    if (!adminUser) return;
    try {
      console.log('[ADMIN API] Forcing data refresh...');
      
      // Refresh riders & orders via snapshot or manual pull
      if (db) {
        const snapRiders = await getDocs(collection(db, 'riders'));
        setRiders(snapRiders.docs.map(d => ({ uid: d.id, ...d.data() } as RiderDoc)).filter(r => !r.isDeleted));
      }

      const [uList, sList, pList] = await Promise.all([
        adminService.getUsers(),
        adminService.getShops(),
        adminService.getProducts()
      ]);
      setUsers(uList.filter((u: any) => !u.isDeleted));
      setShops(sList.filter((s: any) => !s.isDeleted));
      setProducts(pList.filter((p: any) => !p.isDeleted));
    } catch (err: any) {
      console.error('[ADMIN API ERROR] Failed refreshing data:', err.message);
    }
  };

  // Auth Operations
  const sendOTP = async (phoneNumber: string, containerId: string) => {
    if (!auth) throw new Error("Firebase auth not configured.");
    const digits = phoneNumber.replace(/\D/g, '');
    const formatted = phoneNumber.trim().startsWith('+')
      ? `+${digits}`
      : `+91${digits.replace(/^91/, '')}`;

    if (!/^\+\d{8,15}$/.test(formatted)) {
      throw new Error('Enter a valid phone number, for example +91 95801 84045.');
    }
    logger.info('Auth', `Sending admin OTP to: ${formatted}`);

    if (recaptchaVerifierRef.current) {
      try {
        recaptchaVerifierRef.current.clear();
      } catch (err) {
        // Ignored
      }
      recaptchaVerifierRef.current = null;
    }

    const container = document.getElementById(containerId);
    if (container) {
      container.innerHTML = '<div id="recaptcha-widget"></div>';
    }

    try {
      const verifier = new RecaptchaVerifier(auth, 'recaptcha-widget', {
        size: 'invisible'
      });
      recaptchaVerifierRef.current = verifier;
      
      const confirmResult = await signInWithPhoneNumber(auth, formatted, verifier);
      return confirmResult;
    } catch (err: any) {
      logger.error('Auth', 'Admin sendOTP error:', err);
      throw new Error(mapFirebaseError(err));
    }
  };

  const verifyOTP = async (confirmationResult: any, code: string) => {
    logger.info('Auth', 'Confirming admin OTP code.');
    try {
      const res = await confirmationResult.confirm(code);
      const user = res.user;

      if (!user) throw new Error('Auth transaction failed to resolve user.');

      // Firebase Auth custom claims are the sole source of administrative access.
      // Browser clients must not create privileged Firestore profiles: the security
      // rules correctly reject that escalation path.
      const tokenResult = await user.getIdTokenResult(true);
      const role = tokenResult.claims.role as string | undefined;
      const adminRoles = ['super_admin', 'admin', 'operations', 'support', 'finance', 'marketing', 'logistics', 'merchant_success', 'analyst'];
      if (!role || !adminRoles.includes(role)) {
        if (auth) await signOut(auth);
        throw new Error('This phone number is not authorised for the admin portal.');
      }

      if (recaptchaVerifierRef.current) {
        recaptchaVerifierRef.current.clear();
        recaptchaVerifierRef.current = null;
      }

      setAdminUser({ uid: user.uid, phone: user.phoneNumber, role });
    } catch (err: any) {
      logger.error('Auth', 'Admin verifyOTP error:', err);
      if (recaptchaVerifierRef.current) {
        recaptchaVerifierRef.current.clear();
        recaptchaVerifierRef.current = null;
      }
      throw new Error(mapFirebaseError(err));
    }
  };

  const logout = async () => {
    if (auth) await signOut(auth);
    setAdminUser(null);
  };

  // Admin Management Actions
  const updateUserRole = async (uid: string, role: UserDoc['role'], shopId: string | null = null) => {
    if (!db) return;
    const userRef = doc(db, 'users', uid);
    await updateDoc(userRef, { 
      role, 
      shopId: shopId || null 
    });
  };

  const updateOrderStatus = async (orderId: string, status: OrderDoc['status'], riderCoords?: { lat: number; lng: number }) => {
    if (!db) return;
    const orderRef = doc(db, 'orders', orderId);
    
    // Construct timeline title & desc
    let title = `Status Updated`;
    let desc = `Order status changed to ${status}`;
    if (status === 'accepted') {
      title = 'Order Accepted';
      desc = 'The merchant has accepted your order.';
    } else if (status === 'preparing') {
      title = 'Preparing';
      desc = 'Rider is driving to the shop.';
    } else if (status === 'ready_for_pickup') {
      title = 'Ready for Pickup';
      desc = 'Order is packed and ready for pickup.';
    } else if (status === 'rider_picked_up') {
      title = 'Order Picked Up';
      desc = 'Rider has picked up your package.';
    } else if (status === 'out_for_delivery') {
      title = 'Out for Delivery';
      desc = 'Rider is moving towards your location.';
    } else if (status === 'delivered') {
      title = 'Delivered';
      desc = 'Order delivered successfully.';
    }

    const orderSnap = await getDocs(query(collection(db, 'orders')));
    const foundDoc = orderSnap.docs.find(d => d.id === orderId);
    if (foundDoc) {
      const data = normalizeOrder(foundDoc.id, foundDoc.data());
      const timeline = data.timeline || [];
      timeline.push({ 
        status, 
        timestamp: new Date().toISOString(), 
        title, 
        desc,
        actor: 'admin',
        lat: riderCoords?.lat,
        lng: riderCoords?.lng
      });
      
      const updates: any = { status, timeline };
      if (riderCoords) {
        updates['rider.coords'] = riderCoords;
      }
      await updateDoc(orderRef, updates);
    }
  };

  const deleteOrder = async (orderId: string) => {
    if (!db) return;
    await deleteDoc(doc(db, 'orders', orderId));
  };

  const updateShopStatus = async (shopId: string, status: 'open' | 'closed') => {
    if (!db) return;
    await updateDoc(doc(db, 'shops', shopId), { status });
  };

  const updateShopVerification = async (shopId: string, step: ShopDoc['verificationStep']) => {
    if (!db) return;
    await updateDoc(doc(db, 'shops', shopId), { verificationStep: step });
    setShops(prev => prev.map(s => s.id === shopId ? { ...s, verificationStep: step } : s));
  };

  const approveShopAndMerchant = async (shopId: string, ownerUid?: string) => {
    if (!db) return;
    await updateDoc(doc(db, 'shops', shopId), { verificationStep: 'approved', status: 'open' });
    setShops(prev => prev.map(s => s.id === shopId ? { ...s, verificationStep: 'approved', status: 'open' } : s));
    if (ownerUid) {
      await updateDoc(doc(db, 'users', ownerUid), { accountStatus: 'active', role: 'owner', shopId });
      setUsers(prev => prev.map(u => u.uid === ownerUid ? { ...u, accountStatus: 'active', role: 'owner', shopId } : u));
    }
  };

  const updateUserAccountStatus = async (uid: string, accountStatus: 'pending' | 'approved' | 'suspended' | 'active') => {
    if (!db) return;
    await updateDoc(doc(db, 'users', uid), { accountStatus });
    setUsers(prev => prev.map(u => u.uid === uid ? { ...u, accountStatus } : u));
  };

  const updateRiderStatus = async (riderId: string, status: RiderDoc['status']) => {
    if (!db) return;
    await updateDoc(doc(db, 'riders', riderId), { status });
  };

  const updateRiderVerification = async (riderId: string, status: RiderDoc['verificationStatus']) => {
    if (!db) return;
    await updateDoc(doc(db, 'riders', riderId), { verificationStatus: status });
  };

  const deleteProduct = async (productId: string) => {
    if (!db) return;
    await deleteDoc(doc(db, 'products', productId));
  };

  const createNewShop = async (shop: Omit<ShopDoc, 'rating'>) => {
    if (!db) return;
    const shopRef = doc(db, 'shops', shop.id);
    const newShopDoc = {
      ...shop,
      rating: 5.0,
      productsCount: 0,
      verificationStep: 'pending',
      isDeleted: false,
      isArchived: false
    };
    await setDoc(shopRef, newShopDoc);
  };

  return (
    <AdminContext.Provider value={{
      adminUser,
      loading,
      users,
      shops,
      products,
      orders,
      riders,
      sendOTP,
      verifyOTP,
      logout,
      updateUserRole,
      updateOrderStatus,
      deleteOrder,
      updateShopStatus,
      updateShopVerification,
      approveShopAndMerchant,
      updateUserAccountStatus,
      updateRiderStatus,
      updateRiderVerification,
      deleteProduct,
      createNewShop,
      refreshAllData
    }}>
      {children}
    </AdminContext.Provider>
  );
};

export const useAdmin = () => {
  const context = useContext(AdminContext);
  if (!context) throw new Error("useAdmin must be used inside AdminProvider");
  return context;
};
