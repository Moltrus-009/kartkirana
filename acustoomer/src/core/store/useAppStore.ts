import { create } from 'zustand';
import { Shop, Product, PromoBanner, Coupon, Order, UserProfile } from '../../types';
import { shopRepository } from '../../infrastructure/repositories/shopRepository';
import { productRepository } from '../../infrastructure/repositories/productRepository';
import { orderRepository } from '../../infrastructure/repositories/orderRepository';
import { bannerRepository } from '../../infrastructure/repositories/bannerRepository';
import { userRepository } from '../../infrastructure/repositories/userRepository';
import { IS_MOCK_MODE } from '../../infrastructure/firebase/firebase';
import { MOCK_SHOPS, MOCK_PRODUCTS, MOCK_BANNERS, MOCK_COUPONS } from '../../services/mockData';
import { Unsubscribe } from 'firebase/firestore';

const getHaversineDistance = (lat1: number, lon1: number, lat2: number, lon2: number): number => {
  const R = 6371; // Earth's radius in km
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
};

interface AppState {
  shops: Shop[] | null;
  products: Product[] | null;
  banners: PromoBanner[] | null;
  coupons: Coupon[] | null;
  orders: Order[];
  userProfile: UserProfile | null;
  loading: Record<string, boolean>;
  errors: Record<string, string | null>;

  // Cache Timestamps
  shopsLastFetched: number | null;
  productsLastFetched: number | null;
  bannersLastFetched: number | null;
  couponsLastFetched: number | null;

  // Actions
  fetchShops: (force?: boolean) => Promise<Shop[]>;
  updateShopDistances: (lat: number, lng: number) => Promise<void>;
  fetchProducts: (force?: boolean) => Promise<Product[]>;
  fetchBanners: (force?: boolean) => Promise<PromoBanner[]>;
  fetchCoupons: (force?: boolean) => Promise<Coupon[]>;
  fetchUserProfile: (uid: string) => Promise<UserProfile | null>;
  setUserProfile: (profile: UserProfile | null) => void;
  updateUserProfile: (uid: string, updates: Partial<UserProfile>) => Promise<UserProfile>;
  
  // Realtime Orders
  ordersUnsubscribe: Unsubscribe | null;
  subscribeOrders: (userId: string) => void;
  unsubscribeOrders: () => void;
  createOrder: (order: Order) => Promise<void>;
  cancelOrder: (orderId: string) => Promise<void>;
  updateOrder: (orderId: string, fields: Partial<Order>) => Promise<void>;
  
  // Reset cache
  clearCache: () => void;
}

// Cache durations (in milliseconds)
const CACHE_LIMITS = {
  SHOPS: 5 * 60 * 1000,      // 5 minutes
  PRODUCTS: 2 * 60 * 1000,   // 2 minutes
  BANNERS: 30 * 60 * 1000,   // 30 minutes
  COUPONS: 30 * 60 * 1000,   // 30 minutes
};

let productsUnsubscribe: Unsubscribe | null = null;

export const useAppStore = create<AppState>((set, get) => ({
  shops: null,
  products: null,
  banners: null,
  coupons: null,
  orders: [],
  userProfile: null,
  loading: {},
  errors: {},
  
  shopsLastFetched: null,
  productsLastFetched: null,
  bannersLastFetched: null,
  couponsLastFetched: null,
  
  ordersUnsubscribe: null,

  fetchShops: async (force = false) => {
    const { shops, shopsLastFetched } = get();
    const now = Date.now();
    
    if (!force && shops && shopsLastFetched && (now - shopsLastFetched < CACHE_LIMITS.SHOPS)) {
      return shops;
    }

    set(state => ({ loading: { ...state.loading, shops: true }, errors: { ...state.errors, shops: null } }));
    
    try {
      let data: Shop[] = [];
      if (IS_MOCK_MODE) {
        data = MOCK_SHOPS;
      } else {
        data = await shopRepository.fetchShops();
      }
      
      set({ shops: data, shopsLastFetched: now });
      return data;
    } catch (err: any) {
      console.warn('[useAppStore] Failed fetching shops from Firestore:', err);
      const emptyShops: Shop[] = IS_MOCK_MODE ? MOCK_SHOPS : [];
      set({ shops: emptyShops, shopsLastFetched: now });
      return emptyShops;
    } finally {
      set(state => ({ loading: { ...state.loading, shops: false } }));
    }
  },

  updateShopDistances: async (lat: number, lng: number) => {
    const { shops } = get();
    if (!shops || shops.length === 0) return;

    try {
      const coords = [`${lng},${lat}`];
      shops.forEach(s => {
        coords.push(`${s.lng},${s.lat}`);
      });

      const url = `https://router.project-osrm.org/table/v1/driving/${coords.join(';')}?sources=0&annotations=distance,duration`;
      const res = await fetch(url);
      if (!res.ok) throw new Error('OSRM table request failed');

      const data = await res.json();
      const distances = data.distances ? data.distances[0] : [];
      const durations = data.durations ? data.durations[0] : [];

      const updatedShops = shops.map((s, idx) => {
        const distMeters = distances[idx + 1];
        const durSeconds = durations[idx + 1];

        let distanceStr = s.distance;
        let timeStr = s.deliveryTime;

        if (distMeters !== undefined && durSeconds !== undefined) {
          const distKm = (distMeters / 1000).toFixed(1);
          const timeMins = Math.round(durSeconds / 60) + 5; // Prep time
          distanceStr = `${distKm} km`;
          timeStr = `${timeMins}-${timeMins + 5} min`;
        }

        return {
          ...s,
          distance: distanceStr,
          deliveryTime: timeStr
        };
      });

      set({ shops: updatedShops });
    } catch (err: any) {
      console.warn('[useAppStore] OSRM table request failed, using Haversine fallback:', err);
      const updatedShops = shops.map(s => {
        const distKm = getHaversineDistance(lat, lng, s.lat, s.lng) * 1.35;
        const timeMins = Math.round((distKm / 25) * 60) + 5;
        return {
          ...s,
          distance: `${distKm.toFixed(1)} km`,
          deliveryTime: `${timeMins}-${timeMins + 5} min`
        };
      });
      set({ shops: updatedShops });
    }
  },

  fetchProducts: async (force = false) => {
    const { products, productsLastFetched } = get();
    const now = Date.now();

    if (!force && products && productsLastFetched && (now - productsLastFetched < CACHE_LIMITS.PRODUCTS)) {
      return products;
    }

    set(state => ({ loading: { ...state.loading, products: true }, errors: { ...state.errors, products: null } }));

    try {
      let data: Product[] = [];
      if (IS_MOCK_MODE) {
        data = MOCK_PRODUCTS;
      } else {
        data = await productRepository.fetchProducts();
        productsUnsubscribe?.();
        productsUnsubscribe = productRepository.subscribeProducts((liveProducts) => {
          set({ products: liveProducts, productsLastFetched: Date.now() });
        });
      }

      set({ products: data, productsLastFetched: now });
      return data;
    } catch (err: any) {
      console.warn('[useAppStore] Failed fetching live products.', err);
      set(state => ({
        products: [],
        productsLastFetched: now,
        errors: { ...state.errors, products: 'Unable to load available products.' }
      }));
      return [];
    } finally {
      set(state => ({ loading: { ...state.loading, products: false } }));
    }
  },

  fetchBanners: async (force = false) => {
    const { banners, bannersLastFetched } = get();
    const now = Date.now();

    if (!force && banners && bannersLastFetched && (now - bannersLastFetched < CACHE_LIMITS.BANNERS)) {
      return banners;
    }

    set(state => ({ loading: { ...state.loading, banners: true } }));

    try {
      let data: PromoBanner[] = [];
      if (IS_MOCK_MODE) {
        data = MOCK_BANNERS;
      } else {
        data = await bannerRepository.fetchBanners();
      }

      set({ banners: data, bannersLastFetched: now });
      return data;
    } catch (err: any) {
      console.warn('[useAppStore] Failed fetching banners from Firestore:', err);
      const emptyBanners: PromoBanner[] = IS_MOCK_MODE ? MOCK_BANNERS : [];
      set({ banners: emptyBanners, bannersLastFetched: now });
      return emptyBanners;
    } finally {
      set(state => ({ loading: { ...state.loading, banners: false } }));
    }
  },

  fetchCoupons: async (force = false) => {
    const { coupons, couponsLastFetched } = get();
    const now = Date.now();

    if (!force && coupons && couponsLastFetched && (now - couponsLastFetched < CACHE_LIMITS.COUPONS)) {
      return coupons;
    }

    set(state => ({ loading: { ...state.loading, coupons: true } }));

    try {
      let data: Coupon[] = [];
      if (IS_MOCK_MODE) {
        data = MOCK_COUPONS;
      } else {
        data = await bannerRepository.fetchCoupons();
      }

      set({ coupons: data, couponsLastFetched: now });
      return data;
    } catch (err: any) {
      console.warn('[useAppStore] Failed fetching coupons from Firestore:', err);
      const emptyCoupons: Coupon[] = IS_MOCK_MODE ? MOCK_COUPONS : [];
      set({ coupons: emptyCoupons, couponsLastFetched: now });
      return emptyCoupons;
    } finally {
      set(state => ({ loading: { ...state.loading, coupons: false } }));
    }
  },

  fetchUserProfile: async (uid: string) => {
    set(state => ({ loading: { ...state.loading, userProfile: true } }));
    
    try {
      let profile: UserProfile | null = null;
      if (IS_MOCK_MODE) {
        const mockUsers = JSON.parse(localStorage.getItem('mock_users') || '{}');
        profile = mockUsers[uid] || null;
      } else {
        profile = await userRepository.fetchProfile(uid);
      }

      set({ userProfile: profile });
      return profile;
    } catch (err: any) {
      console.warn('[useAppStore] Failed fetching user profile. Falling back to local mock cache.', err);
      const mockUsers = JSON.parse(localStorage.getItem('mock_users') || '{}');
      const profile = mockUsers[uid] || null;
      set({ userProfile: profile });
      return profile;
    } finally {
      set(state => ({ loading: { ...state.loading, userProfile: false } }));
    }
  },

  setUserProfile: (profile: UserProfile | null) => {
    set({ userProfile: profile });
  },

  updateUserProfile: async (uid: string, updates: Partial<UserProfile>) => {
    set(state => ({ loading: { ...state.loading, userProfile: true } }));
    const current = get().userProfile;
    
    const updated: UserProfile = {
      ...(current || {
        uid,
        name: '',
        phone: '',
        email: '',
        profileImage: '',
        addresses: [],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        lastLogin: new Date().toISOString(),
      }),
      ...updates,
      updatedAt: new Date().toISOString(),
    };

    try {
      if (IS_MOCK_MODE) {
        const mockUsers = JSON.parse(localStorage.getItem('mock_users') || '{}');
        mockUsers[uid] = updated;
        localStorage.setItem('mock_users', JSON.stringify(mockUsers));
      } else {
        await userRepository.updateProfile(uid, updates);
      }

      set({ userProfile: updated });
      return updated;
    } catch (err: any) {
      console.warn('[useAppStore] Failed updating user profile. Saving to local storage fallback.', err);
      const mockUsers = JSON.parse(localStorage.getItem('mock_users') || '{}');
      mockUsers[uid] = updated;
      localStorage.setItem('mock_users', JSON.stringify(mockUsers));
      set({ userProfile: updated });
      return updated;
    } finally {
      set(state => ({ loading: { ...state.loading, userProfile: false } }));
    }
  },

  subscribeOrders: (userId: string) => {
    const { ordersUnsubscribe } = get();
    if (ordersUnsubscribe) {
      ordersUnsubscribe();
    }

    set(state => ({ loading: { ...state.loading, orders: true } }));

    if (IS_MOCK_MODE) {
      const fetchMockOrders = () => {
        const allOrders: Order[] = JSON.parse(localStorage.getItem('mock_orders') || '[]');
        const filtered = allOrders.filter(o => o.userId === userId);
        filtered.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
        set({ orders: filtered, loading: { ...get().loading, orders: false } });
      };

      fetchMockOrders();

      const handleMockUpdate = () => {
        fetchMockOrders();
      };
      
      window.addEventListener('mock_order_update', handleMockUpdate);
      const unsub = () => {
        window.removeEventListener('mock_order_update', handleMockUpdate);
      };
      set({ ordersUnsubscribe: unsub });
      return;
    }

    try {
      const unsub = orderRepository.subscribeUserOrders(userId, (list) => {
        set({ orders: list, loading: { ...get().loading, orders: false } });
      });
      if (unsub) {
        set({ ordersUnsubscribe: unsub });
      }
    } catch (err: any) {
      console.error('[useAppStore] Failed subscribing to user orders', err);
      set(state => ({ loading: { ...state.loading, orders: false } }));
    }
  },

  unsubscribeOrders: () => {
    const { ordersUnsubscribe } = get();
    if (ordersUnsubscribe) {
      ordersUnsubscribe();
      set({ ordersUnsubscribe: null, orders: [] });
    }
  },

  createOrder: async (order: Order) => {
    try {
      if (IS_MOCK_MODE) {
        const allOrders: Order[] = JSON.parse(localStorage.getItem('mock_orders') || '[]');
        allOrders.push(order);
        localStorage.setItem('mock_orders', JSON.stringify(allOrders));
        
        window.dispatchEvent(new CustomEvent('mock_order_update', { detail: { orderId: order.id, order } }));
      } else {
        await orderRepository.placeOrder(order);
      }
    } catch (err: any) {
      console.error('[useAppStore] Failed placing order:', err);
      throw err;
    }
  },

  cancelOrder: async (orderId: string) => {
    try {
      if (IS_MOCK_MODE) {
        const allOrders: Order[] = JSON.parse(localStorage.getItem('mock_orders') || '[]');
        const idx = allOrders.findIndex(o => o.id === orderId);
        if (idx !== -1) {
          const timestamp = new Date().toISOString();
          allOrders[idx].status = 'cancelled';
          allOrders[idx].timeline.push({
            status: 'cancelled',
            timestamp,
            title: 'Order Cancelled',
            description: 'You cancelled this preorder.'
          });
          allOrders[idx].updatedAt = timestamp;
          localStorage.setItem('mock_orders', JSON.stringify(allOrders));
          
          window.dispatchEvent(new CustomEvent('mock_order_update', { detail: { orderId, order: allOrders[idx] } }));
        }
      } else {
        await orderRepository.cancelOrder(orderId);
      }
    } catch (err: any) {
      console.error('[useAppStore] Failed to cancel order:', err);
      throw err;
    }
  },

  updateOrder: async (orderId: string, fields: Partial<Order>) => {
    try {
      if (IS_MOCK_MODE) {
        const allOrders: Order[] = JSON.parse(localStorage.getItem('mock_orders') || '[]');
        const index = allOrders.findIndex(order => order.id === orderId);
        if (index === -1) throw new Error('Order not found');
        allOrders[index] = { ...allOrders[index], ...fields };
        localStorage.setItem('mock_orders', JSON.stringify(allOrders));
        window.dispatchEvent(new CustomEvent('mock_order_update', { detail: { orderId, order: allOrders[index] } }));
      } else {
        await orderRepository.updateOrder(orderId, fields);
      }
    } catch (err: any) {
      console.error('[useAppStore] Failed updating order:', err);
      throw err;
    }
  },

  clearCache: () => {
    set({
      shops: null,
      products: null,
      banners: null,
      coupons: null,
      shopsLastFetched: null,
      productsLastFetched: null,
      bannersLastFetched: null,
      couponsLastFetched: null,
      orders: []
    });
  }
}));
