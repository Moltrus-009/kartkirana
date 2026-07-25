import type { Shop } from '../entities/Shop';
export interface ShopRepository {
  fetchShopByOwner(ownerId: string): Promise<Shop | null>;
  fetchShopsByOwner(ownerId: string): Promise<Shop[]>;
  createShop(shopId: string, shop: Shop): Promise<void>;
  updateShop(shopId: string, updates: Partial<Shop>): Promise<void>;
}
