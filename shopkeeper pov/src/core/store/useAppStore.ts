import { useDiagnostics } from '../diagnostics/diagnostics';
import { create } from 'zustand';
import type { Merchant } from '../../domain/entities/Merchant';
import type { Shop } from '../../domain/entities/Shop';
import type { Product } from '../../domain/entities/Product';
import type { Order } from '../../domain/entities/Order';
import { shopRepository } from '../../infrastructure/repositories/shopRepository';
import { productRepository } from '../../infrastructure/repositories/productRepository';
import { orderRepository } from '../../infrastructure/repositories/orderRepository';
import { authRepository } from '../../infrastructure/repositories/authRepository';
import { userRepository } from '../../infrastructure/repositories/userRepository';
import { auth, db } from '../../infrastructure/firebase/firebase';
import { onAuthStateChanged } from 'firebase/auth';
import { addDoc, collection, deleteDoc, doc, getDoc, getDocs, query, setDoc, updateDoc, where } from 'firebase/firestore';
import type { ApplicationVerifier } from 'firebase/auth';
import type { OrderBatch, OnlineRider } from '../../domain/repositories/OrderRepository';
import { logger } from '../logger/logger';
export const withTimeout = <T>(promise: Promise<T>, timeoutMs: number, errorMessage: string): Promise<T> => {
  return new Promise<T>((resolve, reject) => {
    const timeout = window.setTimeout(() => reject(new Error(errorMessage)), timeoutMs);
    promise.then(
      (value) => {
        window.clearTimeout(timeout);
        resolve(value);
      },
      (error) => {
        window.clearTimeout(timeout);
        reject(error);
      },
    );
  });
};

let ordersUnsubscribe: (() => void) | null = null;

export interface AppNotification {
  id: string;
  title: string;
  message: string;
  type: 'order' | 'stock' | 'review' | 'system';
  timestamp: string;
  read: boolean;
}

export interface ReviewDocument {
  id: string;
  shopId: string;
  productId?: string;
  productName?: string;
  customerName: string;
  customerPhone?: string;
  rating: number;
  comment: string;
  reply?: {
    comment: string;
    createdAt: string;
  };
  isReported?: boolean;
  reportReason?: string;
  createdAt: string;
}

export interface OfferDocument {
  id: string;
  shopId: string;
  code: string;
  description: string;
  discountType: 'percentage' | 'flat' | 'bogo' | 'free_delivery';
  value: number;
  minOrder: number;
  maxDiscount?: number;
  startDate: string;
  endDate: string;
  isActive: boolean;
}

export interface InventoryLog {
  id: string;
  shopId: string;
  productId: string;
  productName: string;
  changeType: 'purchase' | 'cancel_restock' | 'return_restock' | 'manual_adjust' | 'bulk_update';
  quantityChanged: number;
  previousStock: number;
  newStock: number;
  timestamp: string;
  updatedBy: string;
  notes?: string;
}

interface AppStoreState {
  user: Merchant | null;
  shop: Shop | null;
  products: Product[];
  orders: Order[];
  reviews: ReviewDocument[];
  offers: OfferDocument[];
  logs: InventoryLog[];
  notifications: AppNotification[];
  loading: boolean;
  theme: 'light';
  
  setUser: (user: Merchant | null) => void;
  setShop: (shop: Shop | null) => void;
  setLoading: (loading: boolean) => void;
  
  // Auth
  triggerOTP: (phone: string, verifier: ApplicationVerifier) => Promise<{ success: boolean; error?: string }>;
  verifyOTP: (phone: string, code: string, name?: string) => Promise<{ success: boolean; error?: string }>;
  logoutOwner: () => Promise<void>;
  
  // Shop operations
  updateShop: (fields: Partial<Shop>) => Promise<void>;
  
  // Product Operations
  addNewProduct: (product: Omit<Product, 'id' | 'rating' | 'reviewsCount'>) => Promise<void>;
  editProductDetails: (id: string, fields: Partial<Product>) => Promise<void>;
  removeProduct: (id: string) => Promise<void>;
  duplicateProductItem: (id: string) => Promise<void>;
  bulkStockUpdate: (items: { id: string; stock: number }[]) => Promise<void>;
  bulkPriceUpdate: (items: { id: string; price: number }[]) => Promise<void>;
  bulkDeleteProductsList: (ids: string[]) => Promise<void>;
  
  // Stock adjustments
  adjustStockQuantity: (productId: string, qty: number, type: InventoryLog['changeType'], notes?: string) => Promise<void>;
  
  // Order actions
  changeOrderStatus: (orderId: string, status: Order['status'], notes?: string) => Promise<void>;
  getOnlineRidersList: () => Promise<OnlineRider[]>;
  createOrderBatch: (batch: OrderBatch) => Promise<void>;
  
  // Review actions
  replyToCustomerReview: (reviewId: string, comment: string) => Promise<void>;
  reportCustomerReview: (reviewId: string, reason: string) => Promise<void>;
  
  // Offer actions
  addPromoOffer: (offer: Omit<OfferDocument, 'id' | 'shopId'>) => Promise<void>;
  removePromoOffer: (id: string) => Promise<void>;
  
  // Theme
  toggleTheme: () => void;
  
  // Notifications
  markAllNotificationsRead: () => void;
  clearNotificationItem: (id: string) => void;

  // Hydration sync
  syncAppData: (user: Merchant) => Promise<void>;
  initStore: () => (() => void) | null;
}

const requireDb = () => {
  if (!db) throw new Error('Data service is unavailable. Check your connection and try again.');
  return db;
};

export const useAppStore = create<AppStoreState>((set, get) => ({
  user: null,
  shop: null,
  products: [],
  orders: [],
  reviews: [],
  offers: [],
  logs: [],
  notifications: [],
  loading: true,
  theme: 'light',

  setUser: (user) => set({ user }),
  setShop: (shop) => set({ shop }),
  setLoading: (loading) => set({ loading }),

  triggerOTP: async (phone, verifier) => {
    return authRepository.triggerOTP(phone, verifier);
  },

  verifyOTP: async (phone, code, name) => {
    const res = await authRepository.verifyOTP(phone, code, name);
    if (res.success && res.user) {
      set({ user: res.user });
    }
    return { success: res.success, error: res.error };
  },

  logoutOwner: async () => {
    await authRepository.logout();
    ordersUnsubscribe?.();
    ordersUnsubscribe = null;
    set({ user: null, shop: null, products: [], orders: [], reviews: [], offers: [], logs: [], notifications: [] });
  },

  updateShop: async (fields) => {
    const { shop } = get();
    if (!shop) return;
    const updated = { ...shop, ...fields };
    await shopRepository.updateShop(shop.id, fields);
    set({ shop: updated });
  },

  addNewProduct: async (prodData) => {
    const { shop } = get();
    if (!shop) return;
    const newId = `prod_${Math.floor(100000 + Math.random() * 900000)}`;
    const newProduct: Product = {
      ...prodData,
      id: newId,
      shopId: shop.id,
      shopName: shop.name,
      rating: 5.0,
      reviewsCount: 0
    };
    await productRepository.addProduct(newProduct);
    set(state => ({ products: [...state.products, newProduct] }));
  },

  editProductDetails: async (id, fields) => {
    const { shop } = get();
    const ownership = shop ? { shopId: shop.id, shopName: shop.name } : {};
    await productRepository.updateProduct(id, { ...fields, ...ownership });
    set(state => ({
      products: state.products.map(p => p.id === id ? { ...p, ...fields, ...ownership } : p)
    }));
  },

  removeProduct: async (id) => {
    await productRepository.deleteProduct(id);
    set(state => ({
      products: state.products.filter(p => p.id !== id)
    }));
  },

  duplicateProductItem: async (id) => {
    const { products } = get();
    const existing = products.find(p => p.id === id);
    if (!existing) return;
    const newId = `prod_${Math.floor(100000 + Math.random() * 900000)}`;
    const duplicated: Product = {
      ...existing,
      id: newId,
      name: `${existing.name} (Copy)`
    };
    await productRepository.addProduct(duplicated);
    set(state => ({ products: [...state.products, duplicated] }));
  },

  bulkStockUpdate: async (items) => {
    await Promise.all(items.map((item) => productRepository.updateProduct(item.id, { stock: Math.max(0, item.stock) })));
    set(state => ({
      products: state.products.map(p => {
        const match = items.find(it => it.id === p.id);
        return match ? { ...p, stock: match.stock } : p;
      })
    }));
  },

  bulkPriceUpdate: async (items) => {
    await Promise.all(items.map((item) => productRepository.updateProduct(item.id, { price: Math.max(0, item.price) })));
    set(state => ({
      products: state.products.map(p => {
        const match = items.find(it => it.id === p.id);
        return match ? { ...p, price: match.price } : p;
      })
    }));
  },

  bulkDeleteProductsList: async (ids) => {
    await Promise.all(ids.map((id) => productRepository.deleteProduct(id)));
    set(state => ({
      products: state.products.filter(p => !ids.includes(p.id))
    }));
  },

  adjustStockQuantity: async (productId, qty, changeType, notes) => {
    const { products, shop } = get();
    if (!shop) return;
    const prod = products.find(p => p.id === productId);
    if (!prod) return;
    const previousStock = prod.stock;
    const newStock = Math.max(0, previousStock + qty);
    
    await productRepository.updateProduct(productId, { stock: newStock });
    
    const newLog: InventoryLog = {
      id: `log_${Math.floor(100000 + Math.random() * 900000)}`,
      shopId: shop.id,
      productId,
      productName: prod.name,
      changeType,
      quantityChanged: qty,
      previousStock,
      newStock,
      timestamp: new Date().toISOString(),
      updatedBy: 'Owner',
      notes
    };

    await addDoc(collection(requireDb(), 'inventoryLogs'), newLog);

    set(state => ({
      products: state.products.map(p => p.id === productId ? { ...p, stock: newStock } : p),
      logs: [newLog, ...state.logs]
    }));
  },

  changeOrderStatus: async (orderId, status, notes) => {
    const order = get().orders.find((item) => item.id === orderId);
    if (!order) throw new Error('The order is no longer available. Refresh and try again.');
    const updatedTimeline = [...order.timeline, {
      status,
      timestamp: new Date().toISOString(),
      title: status === 'SHOP_ACCEPTED' ? 'Order Accepted' : status,
      desc: notes || `Order status updated to ${status}`,
    }];

    // Update local state immediately for fast UI feedback
    set(state => ({
      orders: state.orders.map(o => o.id === orderId ? { ...o, status, timeline: updatedTimeline, updatedAt: new Date().toISOString() } : o)
    }));

    await orderRepository.updateOrderStatus(orderId, status, updatedTimeline);
  },

  getOnlineRidersList: async () => {
    return orderRepository.getOnlineRiders();
  },

  createOrderBatch: async (batch) => {
    await orderRepository.createBatch(batch);
  },

  replyToCustomerReview: async (reviewId, comment) => {
    const reply = { comment: comment.trim(), createdAt: new Date().toISOString() };
    if (!reply.comment) throw new Error('A reply cannot be empty.');
    await updateDoc(doc(requireDb(), 'reviews', reviewId), { reply });
    set(state => ({
      reviews: state.reviews.map(r => r.id === reviewId ? { ...r, reply } : r)
    }));
  },

  reportCustomerReview: async (reviewId, reason) => {
    const reportReason = reason.trim();
    if (!reportReason) throw new Error('A report reason is required.');
    await updateDoc(doc(requireDb(), 'reviews', reviewId), { isReported: true, reportReason });
    set(state => ({
      reviews: state.reviews.map(r => r.id === reviewId ? { ...r, isReported: true, reportReason: reason } : r)
    }));
  },

  addPromoOffer: async (offerData) => {
    const { shop } = get();
    if (!shop) return;
    const newId = doc(collection(requireDb(), 'offers')).id;
    const newOffer: OfferDocument = {
      ...offerData,
      id: newId,
      shopId: shop.id
    };
    await setDoc(doc(requireDb(), 'offers', newId), newOffer);
    set(state => ({ offers: [...state.offers, newOffer] }));
  },

  removePromoOffer: async (id) => {
    await deleteDoc(doc(requireDb(), 'offers', id));
    set(state => ({ offers: state.offers.filter(o => o.id !== id) }));
  },

  toggleTheme: () => {
    // Forced Light Theme fallback to prevent compile crash
  },

  markAllNotificationsRead: () => {
    set(state => ({
      notifications: state.notifications.map(n => ({ ...n, read: true }))
    }));
  },

  clearNotificationItem: (id) => {
    set(state => ({
      notifications: state.notifications.filter(n => n.id !== id)
    }));
  },

  syncAppData: async (activeUser) => {
    set({ loading: true });
    useDiagnostics.getState().addEvent('Syncing Application Databases', 'PENDING');
    useDiagnostics.getState().updateProvider('Database Sync', 'Waiting', 'Fetching collections...');
    try {
      let shopDoc: Shop | null = null;
      if (activeUser.shopId && db) {
        try {
          const docRef = doc(db, 'shops', activeUser.shopId);
          const snap = await withTimeout(getDoc(docRef), 5000, 'Direct shop lookup timed out');
          if (snap.exists()) {
            shopDoc = { id: snap.id, ...snap.data() } as Shop;
          }
        } catch (err) {
          logger.warn('Startup', `Direct shop fetch failed for ID ${activeUser.shopId}, falling back to ownerId query`, err);
        }
      }
      if (!shopDoc) {
        shopDoc = await withTimeout(shopRepository.fetchShopByOwner(activeUser.uid), 5000, 'Shop search by owner timed out');
      }

      // One merchant account is intended to manage one storefront. Earlier
      // interrupted onboarding attempts could leave an empty duplicate shop in
      // the profile while its catalogue remained on the original shop record.
      // Prefer the merchant-owned shop that actually has the catalogue and
      // repair the saved profile link so all three apps use the same shopId.
      const ownedShops = await withTimeout(
        shopRepository.fetchShopsByOwner(activeUser.uid),
        5000,
        'Shop search by owner timed out',
      );
      const linkedShops = [shopDoc, ...ownedShops]
        .filter((candidate): candidate is Shop => candidate !== null && candidate.ownerId === activeUser.uid);
      const candidateShops = Array.from(
        new Map(linkedShops.map((candidate) => [candidate.id, candidate])).values(),
      );

      if (candidateShops.length > 1) {
        const catalogueSizes = await Promise.all(
          candidateShops.map((candidate) => withTimeout(
            productRepository.fetchProductsByShop(candidate.id),
            5000,
            'Fetch products timed out',
          ).then((products) => products.length)),
        );
        const selectedIndex = catalogueSizes.reduce(
          (bestIndex, size, index) => size > catalogueSizes[bestIndex] ? index : bestIndex,
          0,
        );
        shopDoc = candidateShops[selectedIndex];
      } else if (candidateShops.length === 1) {
        shopDoc = candidateShops[0];
      }

      if (shopDoc && activeUser.shopId !== shopDoc.id) {
        await userRepository.updateProfile(activeUser.uid, { shopId: shopDoc.id });
        set({ user: { ...activeUser, shopId: shopDoc.id } });
        useDiagnostics.getState().addEvent('Shop Link Repaired', 'SUCCESS', shopDoc.name);
      }

      if (shopDoc) {
        set({ shop: shopDoc });
        useDiagnostics.getState().addEvent('Shop Profile Loaded', 'SUCCESS', shopDoc.name);
        useDiagnostics.getState().updateProvider('Shop Profile', 'Loaded', shopDoc.name);
        
        const database = requireDb();
        const [prods, ords, reviewSnapshot, offerSnapshot, logSnapshot] = await Promise.all([
          withTimeout(productRepository.fetchProductsByShop(shopDoc.id), 5000, 'Fetch products timed out'),
          withTimeout(orderRepository.fetchOrdersByShop(shopDoc.id), 5000, 'Fetch orders timed out'),
          withTimeout(getDocs(query(collection(database, 'reviews'), where('shopId', '==', shopDoc.id))), 5000, 'Fetch reviews timed out'),
          withTimeout(getDocs(query(collection(database, 'offers'), where('shopId', '==', shopDoc.id))), 5000, 'Fetch offers timed out'),
          withTimeout(getDocs(query(collection(database, 'inventoryLogs'), where('shopId', '==', shopDoc.id))), 5000, 'Fetch inventory logs timed out'),
        ]);
        const revs = reviewSnapshot.docs.map((entry) => ({ id: entry.id, ...entry.data() }) as ReviewDocument);
        const offs = offerSnapshot.docs.map((entry) => ({ id: entry.id, ...entry.data() }) as OfferDocument);
        const logEntries = logSnapshot.docs.map((entry) => ({ id: entry.id, ...entry.data() }) as InventoryLog);
        
        // Low Stock warnings
        const lowStock = prods.filter(p => p.status === 'active' && p.stock <= (p.minStockAlert || 5));
        const notifs: AppNotification[] = lowStock.map(p => ({
          id: `notif-stock-${p.id}`,
          title: 'Low Stock Alert',
          message: `Product ${p.name} has only ${p.stock} units left!`,
          type: 'stock',
          timestamp: new Date().toISOString(),
          read: false
        }));

        useDiagnostics.getState().addEvent('Collections Synced Successfully', 'SUCCESS');
        useDiagnostics.getState().updateProvider('Database Sync', 'Ready', `Synced ${prods.length} products, ${ords.length} orders`);
        set({
          products: prods,
          orders: ords.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()),
          reviews: revs.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()),
          offers: offs,
          logs: logEntries.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()),
          notifications: notifs
        });
        ordersUnsubscribe?.();
        ordersUnsubscribe = orderRepository.subscribeShopOrders(shopDoc.id, (nextOrders) => {
          const currentOrderIds = new Set(get().orders.map((order) => order.id));
          const incomingOrders = nextOrders.filter((order) =>
            !currentOrderIds.has(order.id) && order.status === 'PLACED'
          );
          const incomingNotifications: AppNotification[] = incomingOrders.map((order) => ({
            id: `order-${order.id}`,
            title: 'New order received',
            message: `Order ${order.id.slice(-6)} from ${order.contact.name} is ready for your review.`,
            type: 'order',
            timestamp: order.createdAt,
            read: false,
          }));

          set((state) => ({
            orders: nextOrders,
            notifications: [
              ...incomingNotifications,
              ...state.notifications.filter((notification) => !incomingNotifications.some((incoming) => incoming.id === notification.id)),
            ],
          }));
        });
      }
    } catch (error) {
      logger.error('Sync', 'Unable to synchronize merchant data.', error);
    } finally {
      set({ loading: false });
    }
  },

  initStore: () => {
    if (!auth) {
      logger.error('Startup', 'Firebase auth object is null/undefined during store init.');
      set({ loading: false });
      return null;
    }
    logger.info('Startup', 'Registering global Firebase Auth state observer...');
    useDiagnostics.getState().addEvent('Auth Observer Attached', 'SUCCESS');
    useDiagnostics.getState().updateProvider('Authentication', 'Initialized', 'onAuthStateChanged registered');
    const unsub = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        logger.info('Startup', `Firebase authenticated user found: UID ${firebaseUser.uid}`);
        useDiagnostics.getState().addEvent(`Firebase Auth Session Found: ${firebaseUser.uid}`, 'SUCCESS');
        useDiagnostics.getState().updateProvider('Authentication', 'Ready', `Logged in as UID ${firebaseUser.uid}`);
        try {
          useDiagnostics.getState().addEvent('Fetching Merchant Profile', 'PENDING', firebaseUser.uid);
          useDiagnostics.getState().updateProvider('Merchant Profile', 'Waiting', 'Fetching from Firestore...');
          const profile = await withTimeout(userRepository.fetchProfile(firebaseUser.uid), 5000, 'Fetch user profile timed out');
          if (profile) {
            logger.info('Startup', `Fetched Merchant profile successfully for UID ${firebaseUser.uid}`);
            useDiagnostics.getState().addEvent('Merchant Profile Loaded', 'SUCCESS', JSON.stringify(profile));
            useDiagnostics.getState().updateProvider('Merchant Profile', 'Loaded', profile.fullName);
            set({ user: profile });
            await get().syncAppData(profile);
          } else {
            logger.warn('Startup', `No merchant Firestore profile found for UID ${firebaseUser.uid}`);
            set({ user: null, loading: false });
          }
        } catch (e) {
          logger.error('Startup', 'Failed to retrieve user profile or sync app state', e);
          set({ loading: false });
        }
      } else {
        logger.info('Startup', 'No active authenticated Firebase user session found.');
        useDiagnostics.getState().addEvent('No Active Firebase Session', 'SUCCESS');
        useDiagnostics.getState().updateProvider('Authentication', 'Ready', 'Unauthenticated mode');
        useDiagnostics.getState().updateProvider('Merchant Profile', 'Ready', 'No profile required');
        useDiagnostics.getState().updateProvider('Shop Profile', 'Ready', 'No shop required');
        set({ user: null, shop: null, products: [], orders: [], reviews: [], offers: [], logs: [], notifications: [], loading: false });
      }
    });
    return unsub;
  }
}));
