import { Shop } from '../../types';
export interface ShopRepository {
  fetchShops(): Promise<Shop[]>;
}