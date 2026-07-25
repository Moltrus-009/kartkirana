import { Product } from '../../types';
import type { Unsubscribe } from 'firebase/firestore';
export interface ProductRepository {
  fetchProducts(): Promise<Product[]>;
  subscribeProducts(onUpdate: (products: Product[]) => void): Unsubscribe | null;
}
