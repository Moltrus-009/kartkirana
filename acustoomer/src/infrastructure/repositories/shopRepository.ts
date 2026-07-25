import { collection, getDocs } from 'firebase/firestore';
import { db } from '../firebase/firebase';
import { Shop } from '../../types';
import { ShopRepository } from '../../domain/repositories/ShopRepository';
export const shopRepository: ShopRepository = {
  async fetchShops(): Promise<Shop[]> {
    if (!db) return [];
    const colRef = collection(db, 'shops');
    const snap = await getDocs(colRef);
    return snap.docs.map(d => ({ id: d.id, ...d.data() } as Shop));
  }
};