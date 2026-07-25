import { collection, query, where, getDocs, doc, setDoc, updateDoc } from 'firebase/firestore';
import { db } from '../firebase/firebase';
import type { ShopRepository } from '../../domain/repositories/ShopRepository';
import type { Shop } from '../../domain/entities/Shop';

const requireDb = () => {
  if (!db) throw new Error('Shop service is unavailable. Check your connection and try again.');
  return db;
};

export const shopRepository: ShopRepository = {
  async fetchShopByOwner(ownerId: string): Promise<Shop | null> {
    const shops = await this.fetchShopsByOwner(ownerId);
    return shops[0] || null;
  },

  async fetchShopsByOwner(ownerId: string): Promise<Shop[]> {
    const database = requireDb();
    const q = query(collection(database, 'shops'), where('ownerId', '==', ownerId));
    const snap = await getDocs(q);
    return snap.docs.map((entry) => ({ id: entry.id, ...entry.data() }) as Shop);
  },

  async createShop(shopId: string, shop: Shop): Promise<void> {
    const docRef = doc(requireDb(), 'shops', shopId);
    await setDoc(docRef, shop);
  },

  async updateShop(shopId: string, updates: Partial<Shop>): Promise<void> {
    const docRef = doc(requireDb(), 'shops', shopId);
    await updateDoc(docRef, updates);
  }
};
