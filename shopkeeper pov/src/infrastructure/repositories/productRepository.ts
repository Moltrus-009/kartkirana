import { collection, query, where, getDocs, doc, setDoc, updateDoc, deleteDoc, runTransaction, type DocumentData } from 'firebase/firestore';
import { db } from '../firebase/firebase';
import type { ProductRepository } from '../../domain/repositories/ProductRepository';
import type { Product } from '../../domain/entities/Product';

const requireDb = () => {
  if (!db) throw new Error('Product service is unavailable. Check your connection and try again.');
  return db;
};

export const mapFirestoreDocToProduct = (docId: string, data: DocumentData): Product => {
  return {
    id: docId,
    shopId: data.shopId || '',
    shopName: data.shopName || '',
    name: data.name || 'Unnamed Product',
    image: data.image || '',
    images: data.images || [],
    price: data.price || 0,
    mrp: data.mrp || 0,
    discount: data.discount || 0,
    category: data.category || '',
    stock: Number(data.totalStock ?? data.stock ?? 0),
    description: data.description || '',
    specs: data.specs || {},
    tags: data.tags || [],
    featured: data.featured || false,
    status: data.status || 'active',
    rating: data.rating || 5.0,
    reviewsCount: data.reviewsCount || 0
  };
};

export const productRepository: ProductRepository = {
  async fetchProductsByShop(shopId: string): Promise<Product[]> {
    const database = requireDb();
    const q = query(collection(database, 'products'), where('shopId', '==', shopId));
    const snap = await getDocs(q);
    return snap.docs.map(d => mapFirestoreDocToProduct(d.id, d.data()));
  },

  async addProduct(product: Product): Promise<void> {
    const docRef = doc(requireDb(), 'products', product.id);
    const stock = Math.max(0, Number(product.stock || 0));
    await setDoc(docRef, { ...product, stock, totalStock: stock, reservedStock: 0 });
  },

  async updateProduct(productId: string, updates: Partial<Product>): Promise<void> {
    const database = requireDb();
    const docRef = doc(database, 'products', productId);
    if (updates.stock === undefined) {
      await updateDoc(docRef, updates);
      return;
    }

    await runTransaction(database, async transaction => {
      const snapshot = await transaction.get(docRef);
      if (!snapshot.exists()) throw new Error('Product no longer exists. Refresh inventory and try again.');

      const current = snapshot.data();
      const reservedStock = Math.max(0, Number(current.reservedStock ?? 0));
      const totalStock = Math.max(0, Number(updates.stock));
      if (totalStock < reservedStock) {
        throw new Error(`Cannot set stock below ${reservedStock}; those units are reserved in active checkouts.`);
      }

      transaction.update(docRef, {
        ...updates,
        stock: totalStock,
        totalStock,
        reservedStock,
      });
    });
  },

  async deleteProduct(productId: string): Promise<void> {
    const docRef = doc(requireDb(), 'products', productId);
    await deleteDoc(docRef);
  }
};
