import { 
  doc, 
  getDoc, 
  setDoc, 
  updateDoc, 
  collection, 
  getDocs, 
  writeBatch,
  query,
  orderBy,
  onSnapshot,
  runTransaction
} from 'firebase/firestore';
import type { Unsubscribe } from 'firebase/firestore';
import { db, isFirebaseActive } from '../lib/firebase';
import type { OrderStatus } from '../types/orderStatus';
import { isOrderStatus } from '../types/orderStatus';
import { MAX_BATCH_SIZE } from '../constants/earnings';
import { uploadFile } from './storageService';

// Helper for local mock storage updates
const triggerMockDBUpdate = () => {
  window.dispatchEvent(new Event('mock-db-update'));
};

const getMockData = <T>(key: string, defaultValue: T): T => {
  const data = localStorage.getItem(key);
  return data ? JSON.parse(data) : defaultValue;
};

const saveMockData = <T>(key: string, data: T) => {
  localStorage.setItem(key, JSON.stringify(data));
  triggerMockDBUpdate();
};

export interface UserProfileDoc {
  uid: string;
  fullName: string;
  email: string;
  phone: string;
  role: 'customer' | 'owner' | 'admin' | 'rider';
  vehicleType?: 'Bike' | 'Scooter' | 'Cycle';
  vehicleNumber?: string;
  rating?: number;
  totalDeliveries?: number;
  todayDeliveries?: number;
  todayEarnings?: number;
  acceptanceRate?: number;
  documentStatus?: 'verified' | 'pending' | 'rejected';
  status?: 'online' | 'offline';
  coords?: { lat: number; lng: number };
  createdAt: string;
  lastLogin: string;
  avatarUrl?: string;
  dlUrl?: string;
  aadhaarUrl?: string;
  rcUrl?: string;
  fcmToken?: string;
}

export interface CartItem {
  product: {
    id: string;
    name: string;
    price: number;
    image: string;
    shopId: string;
    shopName: string;
  };
  quantity: number;
  shopId: string;
  isPreorder?: boolean;
}

export interface OrderDocument {
  id: string;
  userId?: string;
  shopId: string;
  shopName: string;
  shopAddress: string;
  items: CartItem[];
  subtotal: number;
  deliveryFee: number;
  platformFee: number;
  tax: number;
  discount: number;
  total: number;
  status: OrderStatus;
  paymentMethod: string;
  paymentStatus: 'pending' | 'completed' | 'failed';
  deliveryAddress: {
    id: string;
    label: string;
    address: string;
    coords: { lat: number; lng: number };
  };
  contact: { name: string; phone: string };
  instructions: string;
  createdAt: string;
  rider?: {
    uid?: string;
    name: string;
    phone: string;
    coords: { lat: number; lng: number };
    progress: number;
  } | null;
  riderId?: string | null;
  batchId?: string | null;
  timeline?: { status: string; timestamp: string; title: string; desc: string }[];
  prescriptionUrl?: string;
  shopCoords?: { lat: number; lng: number };
}

export interface RouteStop {
  id: string; // unique ID for stop
  type: 'pickup' | 'delivery';
  orderId: string;
  shopId?: string;
  shopName?: string;
  shopAddress?: string;
  customerName?: string;
  customerPhone?: string;
  address?: string;
  coords: { lat: number; lng: number };
  /** All orders collected at this stop. `orderId` is retained for legacy batches. */
  orderIds?: string[];
  status: 'pending' | 'arrived' | 'completed';
}

export interface BatchDocument {
  id: string;
  riderId: string;
  status: 'assigned' | 'accepted' | 'in_progress' | 'completed' | 'rejected';
  orderIds: string[];
  totalEarnings: number;
  totalDistance: number;
  estimatedTime: number; // in mins
  stops: RouteStop[];
  currentStopIndex: number;
  createdAt: string;
}

// User Profile CRUD

export async function getUserProfile(uid: string): Promise<UserProfileDoc | null> {
  if (isFirebaseActive() && db) {
    try {
      const docRef = doc(db, 'riders', uid);
      const snap = await getDoc(docRef);
      if (snap.exists()) {
        return snap.data() as UserProfileDoc;
      }
      return null;
    } catch (e) {
      console.error("Error getting user profile:", e);
      return null;
    }
  }
  
  const mockUsers = getMockData<UserProfileDoc[]>('hs_firestore_users', []);
  return mockUsers.find(u => u.uid === uid) || null;
}

export async function createUserProfile(uid: string, profile: UserProfileDoc): Promise<void> {
  if (isFirebaseActive() && db) {
    try {
      await setDoc(doc(db, 'riders', uid), profile);
      return;
    } catch (e) {
      console.error("Error creating user profile:", e);
      throw e;
    }
  }
  
  const mockUsers = getMockData<UserProfileDoc[]>('hs_firestore_users', []);
  const clean = mockUsers.filter(u => u.uid !== uid);
  mockUsers.push(profile);
  saveMockData('hs_firestore_users', [...clean, profile]);

  // Sync to registered registry for login support
  const registry = getMockData<any[]>('hs_registered_users', []);
  const cleanReg = registry.filter((u: any) => u.id !== uid && u.phone !== profile.phone);
  registry.push({
    id: uid,
    name: profile.fullName,
    phone: profile.phone,
    role: 'rider',
    password: 'password', // Default fallback
    phoneVerified: true,
    emailVerified: true
  });
  saveMockData('hs_registered_users', [...cleanReg, registry[registry.length - 1]]);
}

export async function updateUserProfile(uid: string, fields: Partial<UserProfileDoc>): Promise<void> {
  if (isFirebaseActive() && db) {
    try {
      await updateDoc(doc(db, 'riders', uid), fields);
      return;
    } catch (e) {
      console.error("Error updating user profile:", e);
      throw e;
    }
  }
  
  const mockUsers = getMockData<UserProfileDoc[]>('hs_firestore_users', []);
  const idx = mockUsers.findIndex(u => u.uid === uid);
  if (idx > -1) {
    mockUsers[idx] = { ...mockUsers[idx], ...fields };
    saveMockData('hs_firestore_users', mockUsers);

    // Sync to active hs_user / hs_logged_in_user if it matches
    const currentLoggedUser = getMockData<any>('hs_logged_in_user', null);
    if (currentLoggedUser && currentLoggedUser.id === uid) {
      const updatedUser = { 
        ...currentLoggedUser, 
        name: fields.fullName || currentLoggedUser.name,
        phone: fields.phone || currentLoggedUser.phone,
        ...fields 
      };
      localStorage.setItem('hs_logged_in_user', JSON.stringify(updatedUser));
      localStorage.setItem('hs_user', JSON.stringify(updatedUser));
    }
  }
}

// Update Rider Location
export async function updateRiderLocation(
  uid: string, 
  coords: { 
    lat: number; 
    lng: number; 
    heading?: number; 
    speed?: number; 
    accuracy?: number; 
    timestamp?: string;
  }, 
  activeOrderIds: string[],
  progress?: number
): Promise<void> {
  const simpleCoords = { lat: coords.lat, lng: coords.lng };
  
  // 1. Update in user profile
  await updateUserProfile(uid, { coords: simpleCoords });

  const now = new Date().toISOString();

  // 2. Update in riders collection
  if (isFirebaseActive() && db) {
    try {
      const riderRef = doc(db, 'riders', uid);
      await setDoc(riderRef, {
        coords: simpleCoords,
        latitude: coords.lat,
        longitude: coords.lng,
        heading: coords.heading ?? 0,
        speed: coords.speed ?? 0,
        accuracy: coords.accuracy ?? 0,
        timestamp: coords.timestamp || now,
        online: true,
        updatedAt: now
      }, { merge: true });
    } catch (e) {
      console.error("Error writing coordinates to riders collection:", e);
    }
  }

  // 3. Update in each active order document
  if (isFirebaseActive() && db) {
    try {
      const batch = writeBatch(db);
      for (const orderId of activeOrderIds) {
        const orderRef = doc(db, 'orders', orderId);
        const updateFields: any = { 'rider.coords': simpleCoords };
        if (progress !== undefined) {
          updateFields['rider.progress'] = progress;
        }
        batch.update(orderRef, updateFields);
      }
      await batch.commit();
      return;
    } catch (e) {
      console.error("Error updating location in batch:", e);
      return;
    }
  } else {
    // LocalStorage updates
    const orders = getMockData<OrderDocument[]>('hs_orders', []);
    let modified = false;
    const updated = orders.map(o => {
      if (activeOrderIds.includes(o.id)) {
        modified = true;
        return {
          ...o,
          rider: o.rider 
            ? { ...o.rider, coords: simpleCoords, progress: progress !== undefined ? progress : (o.rider.progress || 0) } 
            : { name: 'Amit Kumar', phone: '+91 95482 12345', coords: simpleCoords, progress: progress || 0 }
        };
      }
      return o;
    });
    if (modified) {
      saveMockData('hs_orders', updated);
    }
  }
}

// Order Operations

export async function getOrders(): Promise<OrderDocument[]> {
  if (isFirebaseActive() && db) {
    try {
      const snap = await getDocs(collection(db, 'orders'));
      return snap.docs.map(d => ({ id: d.id, ...d.data() } as OrderDocument));
    } catch (e) {
      console.error("Error getting orders:", e);
      return [];
    }
  }
  
  return getMockData<OrderDocument[]>('hs_orders', []);
}

export async function updateOrderStatus(
  orderId: string, 
  status: OrderStatus,
  riderCoords?: { lat: number; lng: number },
  riderProgress?: number
): Promise<void> {
  const now = new Date().toISOString();
  let title = '';
  let desc = '';
  
  switch (status) {
    case 'RIDER_ASSIGNED':
      title = 'Delivery Executive Assigned';
      desc = 'Rider is assigned and on the way to the shop.';
      break;
    case 'ARRIVED_AT_SHOP':
      title = 'Arrived at Shop';
      desc = 'Rider has arrived at the merchant store.';
      break;
    case 'PICKED_UP':
      title = 'Order Picked Up';
      desc = 'Rider has picked up your package and is starting delivery.';
      break;
    case 'OUT_FOR_DELIVERY':
      title = 'Out for Delivery';
      desc = 'Your order is on the way to your location.';
      break;
    case 'DELIVERED':
      title = 'Delivered';
      desc = 'Order delivered successfully by the partner.';
      break;
    case 'COMPLETED':
      title = 'Order Completed';
      desc = 'Order has been marked as completed.';
      break;
    default:
      title = 'Status Update';
      desc = `Order updated to ${status}`;
  }

  if (isFirebaseActive() && db) {
    try {
      const oRef = doc(db, 'orders', orderId);
      const snap = await getDoc(oRef);
      if (snap.exists()) {
        const orderData = snap.data() as OrderDocument;
        const timeline = orderData.timeline || [];
        timeline.push({ status, timestamp: now, title, desc });
        
        const updateFields: any = { status, timeline, updatedAt: now };
        if (riderCoords) updateFields['rider.coords'] = riderCoords;
        if (riderProgress !== undefined) updateFields['rider.progress'] = riderProgress;

        await updateDoc(oRef, updateFields);

        // Write notification to Customer
        if (orderData.userId) {
          const notifId = `notif_${Math.floor(100000 + Math.random() * 900000)}`;
          const customerNotifRef = doc(db, 'users', orderData.userId, 'notifications', notifId);
          await setDoc(customerNotifRef, {
            id: notifId,
            title: title,
            body: desc,
            createdAt: now,
            read: false,
            type: 'order'
          });
        }
      }
      return;
    } catch (e) {
      console.error("Error updating order status:", e);
      throw e;
    }
  }
  
  const orders = getMockData<OrderDocument[]>('hs_orders', []);
  const idx = orders.findIndex(o => o.id === orderId);
  if (idx > -1) {
    const o = orders[idx];
    const timeline = o.timeline || [];
    timeline.push({ status, timestamp: now, title, desc });
    
    orders[idx] = {
      ...o,
      status,
      timeline,
      rider: o.rider ? {
        ...o.rider,
        coords: riderCoords || o.rider.coords,
        progress: riderProgress !== undefined ? riderProgress : o.rider.progress
      } : {
        name: 'Amit Kumar',
        phone: '+91 95482 12345',
        coords: riderCoords || { lat: 28.58, lng: 77.31 },
        progress: riderProgress !== undefined ? riderProgress : 0
      },
      // Delivery completion is not payment settlement.  Payment state is
      // owned by the checkout/payment service, especially for COD orders.
      paymentStatus: o.paymentStatus
    };
    saveMockData('hs_orders', orders);
  }
}

export async function assignRiderToOrder(
  orderId: string, 
  riderDetails: { name: string; phone: string; coords: { lat: number; lng: number } }
): Promise<void> {
  const status = 'RIDER_ASSIGNED';
  const now = new Date().toISOString();
  const timelineEntry = {
    status,
    timestamp: now,
    title: 'Delivery Executive Assigned',
    desc: `${riderDetails.name} is on the way to pick up your order.`
  };

  if (isFirebaseActive() && db) {
    try {
      const oRef = doc(db, 'orders', orderId);
      const snap = await getDoc(oRef);
      if (snap.exists()) {
        const timeline = snap.data().timeline || [];
        timeline.push(timelineEntry);
        await updateDoc(oRef, {
          status,
          timeline,
          rider: {
            ...riderDetails,
            progress: 0
          }
        });
      }
      return;
    } catch (e) {
      console.error("Error assigning rider to order:", e);
      throw e;
    }
  }

  const orders = getMockData<OrderDocument[]>('hs_orders', []);
  const idx = orders.findIndex(o => o.id === orderId);
  if (idx > -1) {
    const o = orders[idx];
    const timeline = o.timeline || [];
    timeline.push(timelineEntry);
    orders[idx] = {
      ...o,
      status: 'RIDER_ASSIGNED',
      timeline,
      rider: {
        name: riderDetails.name,
        phone: riderDetails.phone,
        coords: riderDetails.coords,
        progress: 0
      }
    };
    saveMockData('hs_orders', orders);
  }
}

// Batch Operations

export async function createBatch(batch: BatchDocument): Promise<void> {
  if (isFirebaseActive() && db) {
    try {
      await setDoc(doc(db, 'batches', batch.id), batch);
      
      // Update each order with batch ID in Firestore
      const batchRef = writeBatch(db);
      for (const orderId of batch.orderIds) {
        const orderRef = doc(db, 'orders', orderId);
        batchRef.update(orderRef, { batchId: batch.id });
      }
      await batchRef.commit();
      return;
    } catch (e) {
      console.error("Error creating batch:", e);
      throw e;
    }
  }

  const mockBatches = getMockData<BatchDocument[]>('hs_batches', []);
  mockBatches.push(batch);
  saveMockData('hs_batches', mockBatches);

  // Link orders
  const orders = getMockData<OrderDocument[]>('hs_orders', []);
  const updatedOrders = orders.map(o => {
    if (batch.orderIds.includes(o.id)) {
      return { ...o, batchId: batch.id };
    }
    return o;
  });
  saveMockData('hs_orders', updatedOrders);
}

export async function updateBatch(batchId: string, fields: Partial<BatchDocument>): Promise<void> {
  if (isFirebaseActive() && db) {
    try {
      await updateDoc(doc(db, 'batches', batchId), fields);
      return;
    } catch (e) {
      console.error("Error updating batch:", e);
      throw e;
    }
  }

  const mockBatches = getMockData<BatchDocument[]>('hs_batches', []);
  const idx = mockBatches.findIndex(b => b.id === batchId);
  if (idx > -1) {
    mockBatches[idx] = { ...mockBatches[idx], ...fields };
    saveMockData('hs_batches', mockBatches);
  }
}

export interface ChatMessage {
  id: string;
  senderId: string;
  senderName: string;
  senderRole: 'customer' | 'rider';
  text: string;
  imageUrl?: string;
  createdAt: string;
}

export async function sendChatMessage(
  orderId: string, 
  text: string, 
  senderId: string, 
  senderName: string, 
  senderRole: 'customer' | 'rider', 
  imageFile?: File
): Promise<ChatMessage> {
  const timestamp = new Date().toISOString();
  const messageId = `msg_${Math.floor(100000 + Math.random() * 900000)}`;
  
  let imageUrl = '';
  if (imageFile) {
    const storagePath = `orders/${orderId}/chat_images/${messageId}.jpg`;
    try {
      imageUrl = await uploadFile(storagePath, imageFile, { compress: true, quality: 0.7 });
    } catch (err) {
      console.error('Error uploading chat image:', err);
    }
  }

  const newMessage: ChatMessage = {
    id: messageId,
    senderId,
    senderName,
    senderRole,
    text,
    createdAt: timestamp,
    ...(imageUrl ? { imageUrl } : {})
  };

  if (!isFirebaseActive()) {
    const chatKey = `mock_chat_${orderId}`;
    const localMessages = getMockData<ChatMessage[]>(chatKey, []);
    localMessages.push(newMessage);
    saveMockData(chatKey, localMessages);
    window.dispatchEvent(new CustomEvent('mock_chat_update', { detail: { orderId, messages: localMessages } }));
    return newMessage;
  }

  if (!db) {
    console.warn('Database connection unavailable, cannot send chat message.');
    return newMessage;
  }

  try {
    const colRef = collection(db, 'orders', orderId, 'messages');
    await setDoc(doc(colRef, messageId), newMessage);
    return newMessage;
  } catch (error) {
    console.error('Error sending chat message:', error);
    return newMessage;
  }
}

export function subscribeChatMessages(orderId: string, onUpdate: (messages: ChatMessage[]) => void): Unsubscribe | (() => void) {
  if (!isFirebaseActive()) {
    const chatKey = `mock_chat_${orderId}`;
    const initialMessages = getMockData<ChatMessage[]>(chatKey, []);
    onUpdate(initialMessages);

    const handleUpdate = (e: any) => {
      if (e.detail && e.detail.orderId === orderId) {
        onUpdate(e.detail.messages);
      }
    };

    window.addEventListener('mock_chat_update', handleUpdate);
    return () => {
      window.removeEventListener('mock_chat_update', handleUpdate);
    };
  }

  if (!db) {
    return () => {};
  }

  const q = query(
    collection(db, 'orders', orderId, 'messages'),
    orderBy('createdAt', 'asc')
  );

  return onSnapshot(q, (snap) => {
    const list = snap.docs.map(d => d.data() as ChatMessage);
    onUpdate(list);
  }, (err) => {
    console.error('[firestoreService] Chat subscribe error:', err);
  });
}

// Update riders/{riderId} collection online status
export async function updateRiderOnlineStatus(
  riderId: string, 
  online: boolean, 
  coords?: { lat: number; lng: number }
): Promise<void> {
  if (isFirebaseActive() && db) {
    try {
      const riderRef = doc(db!, 'riders', riderId);
      const now = new Date().toISOString();
      const updateData: any = { 
        online, 
        updatedAt: now 
      };
      if (coords) {
        updateData.coords = coords;
        updateData.latitude = coords.lat;
        updateData.longitude = coords.lng;
      }
      
      const snap = await getDoc(riderRef);
      if (snap.exists()) {
        await updateDoc(riderRef, updateData);
      } else {
        const userProfile = await getUserProfile(riderId);
        await setDoc(riderRef, {
          uid: riderId,
          fullName: userProfile?.fullName || 'Rider Partner',
          phone: userProfile?.phone || '',
          vehicleType: userProfile?.vehicleType || 'Bike',
          vehicleNumber: userProfile?.vehicleNumber || 'UP-16-AM-9999',
          coords: coords || { lat: 28.5835, lng: 77.3142 },
          latitude: coords?.lat || 28.5835,
          longitude: coords?.lng || 77.3142,
          heading: 0,
          speed: 0,
          accuracy: 0,
          timestamp: now,
          ...updateData
        });
      }
    } catch (e) {
      console.error("Error updating riders collection online status:", e);
    }
  }
}

// Atomic Firestore Transaction for Order Acceptance Lock
export async function acceptOrderTransaction(
  orderId: string, 
  riderDetails: { uid: string; name: string; phone: string; coords: { lat: number; lng: number } }
): Promise<{ success: boolean; message: string }> {
  if (!isFirebaseActive()) {
    return { success: true, message: 'Local Mock acceptance succeeded!' };
  }

  const orderRef = doc(db!, 'orders', orderId);
  const now = new Date().toISOString();

  try {
    const result = await runTransaction(db!, async (transaction) => {
      const orderDocSnap = await transaction.get(orderRef);
      if (!orderDocSnap.exists()) {
        throw new Error('Order does not exist!');
      }

      const orderData = orderDocSnap.data();
      
      // Check if rider is already assigned
      if (orderData.rider || orderData.riderId) {
        return { success: false, message: 'Order already accepted by another rider.' };
      }

      // Check status to ensure it's still unassigned/confirmed/searching
      if (!isOrderStatus(orderData.status, 'SEARCHING_RIDER', 'SHOP_ACCEPTED')) {
        return { success: false, message: 'Order is no longer available for acceptance.' };
      }

      const status = 'RIDER_ASSIGNED';
      const timelineEntry = {
        status,
        timestamp: now,
        title: 'Delivery Executive Assigned',
        desc: `${riderDetails.name} is on the way to pick up your order.`
      };

      const timeline = orderData.timeline || [];
      timeline.push(timelineEntry);

      transaction.update(orderRef, {
        status,
        timeline,
        riderId: riderDetails.uid,
        rider: {
          uid: riderDetails.uid,
          name: riderDetails.name,
          phone: riderDetails.phone,
          coords: riderDetails.coords,
          progress: 0
        },
        updatedAt: now
      });

      // Write notification to Customer
      const notifId = `notif_${Math.floor(100000 + Math.random() * 900000)}`;
      const customerNotifRef = doc(db!, 'users', orderData.userId, 'notifications', notifId);
      transaction.set(customerNotifRef, {
        id: notifId,
        title: timelineEntry.title,
        body: timelineEntry.desc,
        createdAt: now,
        read: false,
        type: 'order'
      });

      return { success: true, message: 'Order successfully accepted!' };
    });

    return result;
  } catch (error: any) {
    console.error('[acceptOrderTransaction] Failed:', error);
    return { success: false, message: error?.message || 'Transaction failed.' };
  }
}

// Atomic Firestore Transaction for Batch Acceptance Lock
export async function acceptBatchTransaction(
  batchId: string, 
  riderId: string,
  riderDetails: { name: string; phone: string; coords: { lat: number; lng: number } }
): Promise<{ success: boolean; message: string }> {
  if (!isFirebaseActive()) {
    const batches = getMockData<BatchDocument[]>('hs_batches', []);
    const batchIndex = batches.findIndex(batch => batch.id === batchId);
    if (batchIndex < 0) {
      return { success: false, message: 'This batch is no longer available.' };
    }

    const batch = batches[batchIndex];
    if (batch.status !== 'assigned' || batch.riderId !== riderId) {
      return { success: false, message: 'This batch is no longer available.' };
    }
    if (batch.orderIds.length === 0 || batch.orderIds.length > MAX_BATCH_SIZE) {
      return { success: false, message: `A batch must contain 1 to ${MAX_BATCH_SIZE} orders.` };
    }

    const now = new Date().toISOString();
    batches[batchIndex] = { ...batch, status: 'accepted' };
    saveMockData('hs_batches', batches);

    const orders = getMockData<OrderDocument[]>('hs_orders', []);
    const unavailableOrder = batch.orderIds.some(orderId => {
      const order = orders.find(candidate => candidate.id === orderId);
      return !order || order.riderId || order.rider || !isOrderStatus(order.status, 'SEARCHING_RIDER', 'SHOP_ACCEPTED');
    });
    if (unavailableOrder) {
      batches[batchIndex] = { ...batch, status: 'assigned' };
      saveMockData('hs_batches', batches);
      return { success: false, message: 'One or more orders in this batch are no longer available.' };
    }

    const updatedOrders = orders.map(order => {
      if (!batch.orderIds.includes(order.id)) return order;
      const timeline = [...(order.timeline || []), {
        status: 'RIDER_ASSIGNED',
        timestamp: now,
        title: 'Delivery Executive Assigned',
        desc: `${riderDetails.name} is on the way to pick up your order.`
      }];
      return {
        ...order,
        status: 'RIDER_ASSIGNED' as OrderStatus,
        timeline,
        riderId,
        rider: { uid: riderId, ...riderDetails, progress: 0 },
        batchId,
        updatedAt: now
      };
    });
    saveMockData('hs_orders', updatedOrders);
    return { success: true, message: 'Batch successfully accepted!' };
  }

  const batchRef = doc(db!, 'batches', batchId);
  const now = new Date().toISOString();

  try {
    const result = await runTransaction(db!, async (transaction) => {
      const batchSnap = await transaction.get(batchRef);
      if (!batchSnap.exists()) {
        throw new Error('Batch does not exist');
      }

      const batchData = batchSnap.data() as BatchDocument;
      if (batchData.status !== 'assigned') {
        return { success: false, message: 'Batch is no longer available.' };
      }
      if (batchData.riderId !== riderId) {
        return { success: false, message: 'This batch is assigned to another rider.' };
      }
      if (batchData.orderIds.length > MAX_BATCH_SIZE) {
        return { success: false, message: `Batch exceeds the maximum of ${MAX_BATCH_SIZE} orders.` };
      }

      // Update batch status to accepted
      transaction.update(batchRef, {
        status: 'accepted',
        riderId: riderId,
        updatedAt: now
      });

      // Update status of all orders in this batch to accepted
      for (const orderId of batchData.orderIds) {
        const orderRef = doc(db!, 'orders', orderId);
        const orderSnap = await transaction.get(orderRef);
        if (orderSnap.exists()) {
          const order = orderSnap.data();
          const timeline = order.timeline || [];
          timeline.push({
            status: 'RIDER_ASSIGNED',
            timestamp: now,
            title: 'Delivery Executive Assigned',
            desc: `${riderDetails.name} is on the way to pick up your order.`
          });
          transaction.update(orderRef, {
            status: 'RIDER_ASSIGNED',
            timeline,
            riderId,
            rider: {
              uid: riderId,
              name: riderDetails.name,
              phone: riderDetails.phone,
              coords: riderDetails.coords,
              progress: 0
            },
            batchId: batchId,
            updatedAt: now
          });
        }
      }

      return { success: true, message: 'Batch successfully accepted!' };
    });

    return result;
  } catch (error: any) {
    console.error('[acceptBatchTransaction] Failed:', error);
    return { success: false, message: error?.message || 'Transaction failed.' };
  }
}
