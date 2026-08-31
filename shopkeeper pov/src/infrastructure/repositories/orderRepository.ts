import { collection, query, where, getDocs, doc, setDoc, onSnapshot, runTransaction, type DocumentData } from 'firebase/firestore';
import type { Unsubscribe } from 'firebase/firestore';
import { db } from '../firebase/firebase';
import type { OrderRepository, OnlineRider, OrderBatch } from '../../domain/repositories/OrderRepository';
import type { Order } from '../../domain/entities/Order';

const requireDb = () => {
  if (!db) throw new Error('Order service is unavailable. Check your connection and try again.');
  return db;
};

const MIN_BATCH_SIZE = 2;
const MAX_BATCH_SIZE = 3;
const MAX_BATCH_SPREAD_METERS = 1500;

const validCoords = (coords: unknown): coords is { lat: number; lng: number } => {
  if (!coords || typeof coords !== 'object') return false;
  const candidate = coords as { lat?: unknown; lng?: unknown };
  const lat = Number(candidate.lat);
  const lng = Number(candidate.lng);
  return Number.isFinite(lat) && Number.isFinite(lng) && Math.abs(lat) <= 90 && Math.abs(lng) <= 180 && !(lat === 0 && lng === 0);
};

const distanceMeters = (from: { lat: number; lng: number }, to: { lat: number; lng: number }) => {
  const radians = (degrees: number) => degrees * Math.PI / 180;
  const latDelta = radians(to.lat - from.lat);
  const lngDelta = radians(to.lng - from.lng);
  const a = Math.sin(latDelta / 2) ** 2 +
    Math.cos(radians(from.lat)) * Math.cos(radians(to.lat)) * Math.sin(lngDelta / 2) ** 2;
  return 6371000 * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
};

export const mapFirestoreDocToOrder = (docId: string, data: DocumentData): Order => {
  const deliveryAddress = data.deliveryAddress || {};
  const addressText = deliveryAddress.address || [deliveryAddress.details, deliveryAddress.area, deliveryAddress.city, deliveryAddress.pinCode]
    .filter(Boolean)
    .join(', ') || deliveryAddress.street || '';
  const coordinates = deliveryAddress.coords || (
    Number.isFinite(Number(deliveryAddress.lat)) && Number.isFinite(Number(deliveryAddress.lng))
      ? { lat: Number(deliveryAddress.lat), lng: Number(deliveryAddress.lng) }
      : { lat: 0, lng: 0 }
  );
  const contact = {
    name: data.contact?.name || deliveryAddress.name || 'Customer',
    phone: data.contact?.phone || deliveryAddress.phone || '',
  };
  const timeline = Array.isArray(data.timeline)
    ? data.timeline.map((entry: DocumentData) => ({
        status: entry.status || '',
        timestamp: entry.timestamp || new Date().toISOString(),
        title: entry.title || '',
        desc: entry.desc || entry.description || '',
      }))
    : [];

  return {
    id: docId,
    userId: data.userId,
    shopId: data.shopId || '',
    shopName: data.shopName || '',
    shopAddress: data.shopAddress || '',
    items: Array.isArray(data.items) ? data.items : [],
    subtotal: Number(data.subtotal || 0),
    deliveryFee: Number(data.deliveryFee || 0),
    platformFee: Number(data.platformFee || 0),
    tax: Number(data.tax || 0),
    platformDiscount: Number(data.platformDiscount || 0),
    couponDiscount: Number(data.couponDiscount || 0),
    appliedPromotion: data.appliedPromotion || data.priceBreakdown?.appliedPromotion || null,
    total: Number(data.total ?? data.grandTotal ?? 0),
    grandTotal: Number(data.grandTotal ?? data.total ?? 0),
    paymentMethod: data.paymentMethod || 'COD',
    paymentStatus: data.paymentStatus || 'pending',
    status: data.status || 'PLACED',
    createdAt: data.createdAt || new Date().toISOString(),
    updatedAt: data.updatedAt || new Date().toISOString(),
    deliveryAddress: {
      name: deliveryAddress.name || '',
      phone: deliveryAddress.phone || '',
      street: deliveryAddress.street || '',
      city: deliveryAddress.city || '',
      address: addressText,
      coords: coordinates,
    },
    contact,
    rider: data.rider || null,
    timeline,
    batchId: data.batchId || undefined,
  };
};

const shopOrdersQuery = (shopId: string) => query(
  collection(requireDb(), 'orders'),
  where('shopId', '==', shopId),
);

export const orderRepository: OrderRepository = {
  async fetchOrdersByShop(shopId) {
    const snapshot = await getDocs(shopOrdersQuery(shopId));
    const list = snapshot.docs.map((entry) => mapFirestoreDocToOrder(entry.id, entry.data()));
    return list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  },

  async updateOrderStatus(orderId, status, timeline) {
    await setDoc(doc(requireDb(), 'orders', orderId), {
      status,
      timeline,
      updatedAt: new Date().toISOString(),
    }, { merge: true });
  },

  subscribeShopOrders(shopId, onUpdate): Unsubscribe {
    return onSnapshot(shopOrdersQuery(shopId), (snapshot) => {
      const list = snapshot.docs.map((entry) => mapFirestoreDocToOrder(entry.id, entry.data()));
      list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      onUpdate(list);
    }, (err) => {
      console.warn('Shop orders subscription snapshot listener error:', err);
    });
  },

  async getOnlineRiders(): Promise<OnlineRider[]> {
    const riderQuery = query(collection(requireDb(), 'riders'), where('online', '==', true));
    const userQuery = query(collection(requireDb(), 'users'), where('role', '==', 'rider'));
    const [snapshot, userSnapshot] = await Promise.all([getDocs(riderQuery), getDocs(userQuery)]);
    const verifiedProfiles = new Map(userSnapshot.docs
      .filter(entry => entry.data().documentStatus === 'verified')
      .map(entry => [entry.id, entry.data()]));
    return snapshot.docs
      .filter(entry => verifiedProfiles.has(entry.id))
      .map((entry) => ({ uid: entry.id, ...verifiedProfiles.get(entry.id), ...entry.data() }));
  },

  async createBatch(batch: OrderBatch): Promise<void> {
    const database = requireDb();
    const uniqueOrderIds = [...new Set(batch.orderIds)];
    if (uniqueOrderIds.length < MIN_BATCH_SIZE || uniqueOrderIds.length > MAX_BATCH_SIZE) {
      throw new Error(`Select ${MIN_BATCH_SIZE} to ${MAX_BATCH_SIZE} orders for one batch.`);
    }
    if (uniqueOrderIds.length !== batch.orderIds.length) {
      throw new Error('A batch cannot contain the same order twice.');
    }

    await runTransaction(database, async (transaction) => {
      const batchRef = doc(database, 'batches', batch.id);
      const riderRef = doc(database, 'riders', batch.riderId);
      const riderProfileRef = doc(database, 'users', batch.riderId);
      const orderRefs = uniqueOrderIds.map(orderId => doc(database, 'orders', orderId));

      // Firestore requires every transaction read to happen before any write.
      const [riderSnapshot, riderProfileSnapshot, orderSnapshots] = await Promise.all([
        transaction.get(riderRef),
        transaction.get(riderProfileRef),
        Promise.all(orderRefs.map(orderRef => transaction.get(orderRef))),
      ]);

      if (!riderSnapshot.exists() || riderSnapshot.data().online !== true || !riderProfileSnapshot.exists() || riderProfileSnapshot.data().documentStatus !== 'verified') {
        throw new Error('The selected delivery partner is no longer online.');
      }

      const orderData = orderSnapshots.map((snapshot, index) => {
        if (!snapshot.exists()) throw new Error('One of the selected orders no longer exists.');
        const data = snapshot.data();
        const status = String(data.status || '').toUpperCase();
        if (data.shopId !== batch.shopId) throw new Error('All batched orders must belong to this shop.');
        if (data.batchId || data.riderId || data.currentRiderId) throw new Error('One of the orders has already been assigned.');
        if (!['SHOP_ACCEPTED', 'SEARCHING_RIDER', 'READY', 'READY_FOR_PICKUP'].includes(status)) {
          throw new Error('Only accepted or ready orders can be batched.');
        }
        const coords = data.deliveryAddress?.coords;
        if (!validCoords(coords)) throw new Error('Every batched order needs a valid customer map location.');
        return { id: uniqueOrderIds[index], coords };
      });

      for (let first = 0; first < orderData.length; first += 1) {
        for (let second = first + 1; second < orderData.length; second += 1) {
          if (distanceMeters(orderData[first].coords, orderData[second].coords) > MAX_BATCH_SPREAD_METERS) {
            throw new Error('Selected delivery points are too far apart for one batch.');
          }
        }
      }

      const now = new Date().toISOString();
      transaction.set(batchRef, {
        ...batch,
        orderIds: uniqueOrderIds,
        updatedAt: now,
        expiresAt: new Date(Date.now() + 30 * 1000).toISOString(),
        source: 'merchant_assignment'
      });
      orderRefs.forEach((orderRef) => {
        transaction.update(orderRef, {
          batchId: batch.id,
          currentRiderId: batch.riderId,
          updatedAt: now,
        });
      });
    });
  },
};
