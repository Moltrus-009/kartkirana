import { Order } from '../../types';
import { Unsubscribe } from 'firebase/firestore';
export interface OrderRepository {
  placeOrder(order: Order): Promise<void>;
  cancelOrder(orderId: string): Promise<void>;
  updateOrder(orderId: string, fields: Partial<Order>): Promise<void>;
  getUserOrdersDirect(userId: string): Promise<Order[]>;
  subscribeUserOrders(userId: string, onUpdate: (orders: Order[]) => void): Unsubscribe | null;
}