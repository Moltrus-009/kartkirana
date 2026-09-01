import { collection, getDocs, onSnapshot } from 'firebase/firestore';
import type { DocumentData, Unsubscribe } from 'firebase/firestore';
import { db } from '../firebase/firebase';
import { Product } from '../../types';
import { ProductRepository } from '../../domain/repositories/ProductRepository';
const mapProduct = (id: string, data: DocumentData): Product => ({
  id,
  shopId: data.shopId || '',
  shopName: data.shopName || '',
  name: data.name || 'Unnamed Product',
  image: data.image || '',
  images: Array.isArray(data.images) ? data.images : [],
  price: Number(data.price || 0),
  originalPrice: Number(data.originalPrice ?? data.mrp ?? data.price ?? 0),
  // The payment backend keeps physical and temporarily-reserved inventory
  // separately. Customers must only be offered the units that are actually
  // available to start a new checkout.
  stock: Math.max(
    0,
    Number(data.totalStock ?? data.stock ?? 0) - Number(data.reservedStock ?? 0)
  ),
  rating: Number(data.rating ?? 0),
  category: data.category || 'General',
  description: data.description || '',
  specifications: data.specifications || data.specs || {},
  isPreorder: Boolean(data.isPreorder),
  estimatedDelivery: data.estimatedDelivery || '15-20 min',
});

const mapAvailableProducts = (docs: Array<{ id: string; data: () => DocumentData }>): Product[] =>
  docs
    .map((entry) => ({ product: mapProduct(entry.id, entry.data()), data: entry.data() }))
    .filter(({ product, data }) => Boolean(product.shopId) && data.status !== 'inactive' && data.status !== 'disabled' && data.status !== 'deleted')
    .map(({ product }) => product);

export const productRepository: ProductRepository = {
  async fetchProducts(): Promise<Product[]> {
    if (!db) return [];
    const colRef = collection(db, 'products');
    const snap = await getDocs(colRef);
    return mapAvailableProducts(snap.docs);
  },

  subscribeProducts(onUpdate: (products: Product[]) => void): Unsubscribe | null {
    if (!db) return null;
    return onSnapshot(collection(db, 'products'), (snapshot) => {
      onUpdate(mapAvailableProducts(snapshot.docs));
    }, (error) => {
      console.error('[productRepository] Live catalogue subscription failed:', error);
    });
  },
};
