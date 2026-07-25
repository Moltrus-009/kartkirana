import { collection, doc, query, where, setDoc, onSnapshot, Unsubscribe, updateDoc, getDocs } from 'firebase/firestore';
import { db } from '../firebase/firebase';
import { Order } from '../../types';
import { OrderRepository } from '../../domain/repositories/OrderRepository';
export const orderRepository: OrderRepository = {
  async placeOrder(order: Order): Promise<void> {
    if (!db) return;
    const docRef = doc(db, 'orders', order.id);
    await setDoc(docRef, order);
  },
  async cancelOrder(orderId: string): Promise<void> {
    const { paymentService } = await import('../../services/paymentService');
    await paymentService.cancelOrder(orderId, 'Cancelled by customer');
  },
  async updateOrder(orderId: string, fields: Partial<Order>): Promise<void> {
    if (!db) return;
    const docRef = doc(db, 'orders', orderId);
    await updateDoc(docRef, fields);
  },
  async getUserOrdersDirect(userId: string): Promise<Order[]> {
    if (!db) return [];
    const q = query(collection(db, 'orders'), where('userId', '==', userId));
    const snap = await getDocs(q);
    const list = snap.docs.map(d => ({ id: d.id, ...d.data() } as Order));
    list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    return list;
  },
  subscribeUserOrders(userId: string, onUpdate: (orders: Order[]) => void): Unsubscribe | null {
    if (!db) return null;
    const q = query(collection(db, 'orders'), where('userId', '==', userId));
    return onSnapshot(q, (snap) => {
      const list = snap.docs.map(d => ({ id: d.id, ...d.data() } as Order));
      list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      onUpdate(list);
    });
  }
};