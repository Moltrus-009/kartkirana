import { useEffect } from 'react';
import { useAppStore } from '../core/store/useAppStore';

export const useShops = (force = false) => {
  const shops = useAppStore(state => state.shops);
  const loading = useAppStore(state => state.loading.shops || false);
  const fetchShops = useAppStore(state => state.fetchShops);

  useEffect(() => {
    fetchShops(force);
  }, [fetchShops, force]);

  return { shops: shops || [], loading, fetchShops };
};

export const useProducts = (force = false) => {
  const products = useAppStore(state => state.products);
  const loading = useAppStore(state => state.loading.products || false);
  const fetchProducts = useAppStore(state => state.fetchProducts);

  useEffect(() => {
    fetchProducts(force);
  }, [fetchProducts, force]);

  return { products: products || [], loading, fetchProducts };
};

export const useBanners = (force = false) => {
  const banners = useAppStore(state => state.banners);
  const loading = useAppStore(state => state.loading.banners || false);
  const fetchBanners = useAppStore(state => state.fetchBanners);

  useEffect(() => {
    fetchBanners(force);
  }, [fetchBanners, force]);

  return { banners: banners || [], loading, fetchBanners };
};

export const useCoupons = (force = false) => {
  const coupons = useAppStore(state => state.coupons);
  const loading = useAppStore(state => state.loading.coupons || false);
  const fetchCoupons = useAppStore(state => state.fetchCoupons);

  useEffect(() => {
    fetchCoupons(force);
  }, [fetchCoupons, force]);

  return { coupons: coupons || [], loading, fetchCoupons };
};

export const useOrders = (userId: string | undefined) => {
  const orders = useAppStore(state => state.orders);
  const subscribeOrders = useAppStore(state => state.subscribeOrders);
  const unsubscribeOrders = useAppStore(state => state.unsubscribeOrders);

  useEffect(() => {
    if (userId) {
      subscribeOrders(userId);
    }
    return () => {
      unsubscribeOrders();
    };
  }, [userId, subscribeOrders, unsubscribeOrders]);

  return orders;
};
