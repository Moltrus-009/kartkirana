import { collection, getDocs } from 'firebase/firestore';
import { db } from '../firebase/firebase';
import { PromoBanner, Coupon } from '../../types';
import { BannerRepository } from '../../domain/repositories/BannerRepository';
export const bannerRepository: BannerRepository = {
  async fetchBanners(): Promise<PromoBanner[]> {
    if (!db) return [];
    const colRef = collection(db, 'banners');
    const snap = await getDocs(colRef);
    return snap.docs.map(d => ({ id: d.id, ...d.data() } as PromoBanner));
  },
  async fetchCoupons(): Promise<Coupon[]> {
    if (!db) return [];
    const colRef = collection(db, 'coupons');
    const snap = await getDocs(colRef);
    return snap.docs.map(d => ({ code: d.id, ...d.data() } as any as Coupon));
  }
};