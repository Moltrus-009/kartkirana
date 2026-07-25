import type { Order } from '../entities/Order';
import type { Unsubscribe } from 'firebase/firestore';

export interface OnlineRider {
  uid: string;
  fullName?: string;
  phone?: string;
  online?: boolean;
}

export interface OrderBatch {
  id: string;
  riderId: string;
  riderName: string;
  orders: Array<Pick<Order, 'id'>>;
  [key: string]: unknown;
}

export interface OrderRepository {
  fetchOrdersByShop(shopId: string): Promise<Order[]>;
  updateOrderStatus(orderId: string, status: Order['status'], timeline: Order['timeline']): Promise<void>;
  subscribeShopOrders(shopId: string, onUpdate: (orders: Order[]) => void): Unsubscribe | null;
  getOnlineRiders(): Promise<OnlineRider[]>;
  createBatch(batch: OrderBatch): Promise<void>;
}
