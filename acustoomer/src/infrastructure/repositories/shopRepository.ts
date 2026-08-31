import { collection, getDocs } from 'firebase/firestore';
import { db } from '../firebase/firebase';
import { Shop } from '../../types';
import { ShopRepository } from '../../domain/repositories/ShopRepository';
export const shopRepository: ShopRepository = {
  async fetchShops(): Promise<Shop[]> {
    if (!db) return [];
    const colRef = collection(db, 'shops');
    const snap = await getDocs(colRef);
    return snap.docs.map(d => {
      const data = d.data();
      const status = String(data.status || '').toLowerCase();
      return {
        id: d.id,
        ...data,
        // Shopkeeper/admin use `status`; retain `isOpen` only as a legacy
        // fallback so every client agrees on whether checkout is available.
        isOpen: status ? status === 'open' : data.isOpen !== false
      } as Shop;
    });
  }
};
