import { collection, query, where, getDocs, doc, setDoc, onSnapshot, writeBatch, type DocumentData } from 'firebase/firestore';
import type { Unsubscribe } from 'firebase/firestore';
import { db } from '../firebase/firebase';
import type { OrderRepository, OnlineRider, OrderBatch } from '../../domain/repositories/OrderRepository';
import type { Order } from '../../domain/entities/Order';

const requireDb = () => {
  if (!db) throw new Error('Order service is unavailable. Check your connection and try again.');
  return db;
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
    const snapshot = await getDocs(riderQuery);
    return snapshot.docs.map((entry) => ({ uid: entry.id, ...entry.data() }));
  },

  async createBatch(batch: OrderBatch): Promise<void> {
    const database = requireDb();
    const writer = writeBatch(database);
    writer.set(doc(database, 'batches', batch.id), batch);
    batch.orders.forEach((order) => {
      writer.update(doc(database, 'orders', order.id), {
        status: 'ASSIGNED',
        batchId: batch.id,
        riderId: batch.riderId,
        riderName: batch.riderName,
        updatedAt: new Date().toISOString(),
      });
    });
    await writer.commit();
  },
};
