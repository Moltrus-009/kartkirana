import type { Product } from '../entities/Product';
export interface ProductRepository {
  fetchProductsByShop(shopId: string): Promise<Product[]>;
  addProduct(product: Product): Promise<void>;
  updateProduct(productId: string, updates: Partial<Product>): Promise<void>;
  deleteProduct(productId: string): Promise<void>;
}
