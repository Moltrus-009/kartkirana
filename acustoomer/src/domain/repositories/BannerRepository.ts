import { PromoBanner, Coupon } from '../../types';
export interface BannerRepository {
  fetchBanners(): Promise<PromoBanner[]>;
  fetchCoupons(): Promise<Coupon[]>;
}