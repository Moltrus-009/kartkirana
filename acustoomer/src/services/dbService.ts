import { UserProfile, Shop, Product, Order, Review, Coupon, PromoBanner, NotificationItem, ChatMessage } from '../types';
import { useAppStore } from '../core/store/useAppStore';
import { userRepository } from '../infrastructure/repositories/userRepository';
import { orderRepository } from '../infrastructure/repositories/orderRepository';
import { IS_MOCK_MODE } from '../infrastructure/firebase/firebase';
import { collection, addDoc, query, where, getDocs, orderBy, updateDoc, doc, setDoc, onSnapshot, Unsubscribe } from 'firebase/firestore';
import { db } from '../infrastructure/firebase/firebase';
import { MOCK_REVIEWS } from './mockData';

// Helper for local mock storage
const getMockItem = <T>(key: string, defaultValue: T): T => {
  const data = localStorage.getItem(key);
  return data ? JSON.parse(data) : defaultValue;
};

const setMockItem = (key: string, value: any) => {
  localStorage.setItem(key, JSON.stringify(value));
};

export const dbService = {
  // User Profile Adapter
  async getUserProfile(uid: string): Promise<UserProfile | null> {
    return useAppStore.getState().fetchUserProfile(uid);
  },

  async createUserProfile(uid: string, profile: Partial<UserProfile>): Promise<UserProfile> {
    const defaultProfile = {
      uid,
      name: profile.name || '',
      phone: profile.phone || '',
      email: profile.email || '',
      profileImage: profile.profileImage || '',
      addresses: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      lastLogin: new Date().toISOString(),
    };
    await userRepository.createProfile(uid, defaultProfile);
    useAppStore.getState().setUserProfile(defaultProfile);
    return defaultProfile;
  },

  async updateUserProfile(uid: string, updates: Partial<UserProfile>): Promise<UserProfile> {
    return useAppStore.getState().updateUserProfile(uid, updates);
  },

  // Catalogue listings
  async getShops(): Promise<Shop[]> {
    return useAppStore.getState().fetchShops();
  },

  async getShopById(id: string): Promise<Shop | null> {
    const shops = await this.getShops();
    return shops.find(s => s.id === id) || null;
  },

  async getProducts(): Promise<Product[]> {
    return useAppStore.getState().fetchProducts();
  },

  async getProductsByShop(shopId: string): Promise<Product[]> {
    const products = await this.getProducts();
    return products.filter(p => p.shopId === shopId);
  },

  async getProductsByCategory(category: string): Promise<Product[]> {
    const products = await this.getProducts();
    return products.filter(p => p.category === category);
  },

  async getBanners(): Promise<PromoBanner[]> {
    return useAppStore.getState().fetchBanners();
  },

  async getCoupons(): Promise<Coupon[]> {
    return useAppStore.getState().fetchCoupons();
  },

  // Orders flow
  async placeOrder(orderData: Omit<Order, 'id' | 'status' | 'timeline' | 'createdAt' | 'updatedAt'>): Promise<Order> {
    const timestamp = new Date().toISOString();
    const initialTimeline = [
      {
        status: 'PLACED' as const,
        timestamp,
        title: 'Order Placed',
        description: 'Your order has been successfully placed.'
      },
      {
        status: 'SHOP_ACCEPTED' as const,
        timestamp: new Date(Date.now() + 5000).toISOString(),
        title: 'Preparing',
        description: 'The shop is currently packing your items.'
      }
    ];

    const generatedId = `ord_${Math.floor(100000 + Math.random() * 900000)}`;
    const newOrder: Order = {
      ...orderData,
      id: generatedId,
      status: 'upcoming',
      timeline: initialTimeline,
      createdAt: timestamp,
      updatedAt: timestamp,
    };

    if (IS_MOCK_MODE) {
      await useAppStore.getState().createOrder(newOrder);
      this.simulateMockOrderProgress(newOrder.id);
      return newOrder;
    }

    try {
      await orderRepository.placeOrder(newOrder);
      return newOrder;
    } catch (error) {
      console.error('Error placing order:', error);
      return newOrder;
    }
  },

  async cancelOrder(orderId: string): Promise<void> {
    await useAppStore.getState().cancelOrder(orderId);
  },

  /** Updates only schedule metadata on an existing order. The backend remains the source of truth. */
  async updateScheduledOrder(orderId: string, schedule: { preorderDate: string; preorderSlot: string }): Promise<void> {
    await useAppStore.getState().updateOrder(orderId, {
      ...schedule,
      updatedAt: new Date().toISOString(),
    });
  },

  async getOrders(userId: string): Promise<Order[]> {
    const state = useAppStore.getState();
    if (!state.ordersUnsubscribe) {
      state.subscribeOrders(userId);
    }
    return state.orders;
  },

  // Real-time tracking mock simulator
  simulateMockOrderProgress(orderId: string) {
    const statuses: Array<{ status: Order['status']; delay: number; title: string; desc: string }> = [
      { status: 'SHOP_ACCEPTED', delay: 10000, title: 'Preparing', desc: 'Shop has packaged your fresh products.' },
      { status: 'PICKED_UP', delay: 25000, title: 'Packed', desc: 'Delivery partner has picked up your packet.' },
      { status: 'OUT_FOR_DELIVERY', delay: 45000, title: 'Out For Delivery', desc: 'Delivery partner is moving towards your location.' },
      { status: 'DELIVERED', delay: 80000, title: 'Delivered', desc: 'Package delivered at your doorstep.' },
    ];

    statuses.forEach(step => {
      setTimeout(() => {
        const orders = getMockItem<Order[]>('mock_orders', []);
        const orderIdx = orders.findIndex(o => o.id === orderId);
        if (orderIdx !== -1) {
          const currentOrder = orders[orderIdx];
          
          if (currentOrder.status !== 'cancelled' && currentOrder.status !== 'DELIVERED') {
            const timestamp = new Date().toISOString();
            currentOrder.status = step.status;
            currentOrder.timeline.push({
              status: step.status,
              timestamp,
              title: step.title,
              description: step.desc
            });
            currentOrder.updatedAt = timestamp;
            orders[orderIdx] = currentOrder;
            setMockItem('mock_orders', orders);
            
            window.dispatchEvent(new CustomEvent('mock_order_update', { detail: { orderId, order: currentOrder } }));
          }
        }
      }, step.delay);
    });
  },

  // Reviews logic
  async getReviews(targetId: string): Promise<Review[]> {
    if (IS_MOCK_MODE) {
      const localReviews = getMockItem<Review[]>('mock_reviews', MOCK_REVIEWS);
      return localReviews.filter(r => r.targetId === targetId);
    }

    if (!db) return [];

    try {
      const colRef = collection(db!, 'reviews');
      const q = query(colRef, where('targetId', '==', targetId));
      const snap = await getDocs(q);
      return snap.docs.map(d => ({ id: d.id, ...d.data() } as Review));
    } catch (error) {
      console.error('Error fetching reviews:', error);
      return [];
    }
  },

  async addReview(reviewData: Omit<Review, 'id' | 'createdAt'>): Promise<Review> {
    const newReview: Review = {
      ...reviewData,
      id: `rev_${Math.floor(100000 + Math.random() * 900000)}`,
      createdAt: new Date().toISOString(),
    };

    if (IS_MOCK_MODE) {
      const localReviews = getMockItem<Review[]>('mock_reviews', MOCK_REVIEWS);
      localReviews.push(newReview);
      setMockItem('mock_reviews', localReviews);
      return newReview;
    }

    if (!db) return newReview;

    try {
      const colRef = collection(db!, 'reviews');
      const docRef = await addDoc(colRef, newReview);
      await updateDoc(docRef, { id: docRef.id });
      newReview.id = docRef.id;
      return newReview;
    } catch (error) {
      console.error('Error adding review:', error);
      return newReview;
    }
  },

  // Notifications (Gated by IS_MOCK_MODE)
  async getNotifications(userId: string): Promise<NotificationItem[]> {
    if (IS_MOCK_MODE) {
      const mockNotifs: NotificationItem[] = [
        {
          id: 'n1',
          title: 'Welcome to Kart Kirana!',
          body: 'Get super fast delivery of fresh farm goods and grocery essentials in minutes.',
          createdAt: new Date().toISOString(),
          read: false,
          type: 'system',
        },
        {
          id: 'n2',
          title: 'Flat 50% Off Coupon',
          body: 'Use promo code WELCOME50 on checkout to get 50% off up to ₹100 on your first order.',
          createdAt: new Date(Date.now() - 3600000).toISOString(),
          read: true,
          type: 'offer',
        }
      ];
      return mockNotifs;
    }

    if (!db) return [];

    try {
      const colRef = collection(db!, 'users', userId, 'notifications');
      const q = query(colRef, orderBy('createdAt', 'desc'));
      const snap = await getDocs(q);
      return snap.docs.map(d => ({ id: d.id, ...d.data() } as NotificationItem));
    } catch (error) {
      console.error('[dbService] Error fetching notifications:', error);
      return [];
    }
  },

  async markNotificationRead(userId: string, notificationId: string): Promise<void> {
    if (IS_MOCK_MODE || !db) return;
    try {
      const docRef = doc(db!, 'users', userId, 'notifications', notificationId);
      await updateDoc(docRef, { read: true });
    } catch (error) {
      console.error('[dbService] Error marking notification read:', error);
    }
  },

  // Chat integration methods for WebRTC and text communication
  async sendChatMessage(
    orderId: string,
    text: string,
    senderId: string,
    senderName: string,
    senderRole: 'customer' | 'rider',
    imageFile?: File
  ): Promise<ChatMessage> {
    const timestamp = new Date().toISOString();
    const messageId = `msg_${Math.floor(100000 + Math.random() * 900000)}`;

    const newMessage: ChatMessage = {
      id: messageId,
      senderId,
      senderName,
      senderRole,
      text,
      createdAt: timestamp
    };

    if (IS_MOCK_MODE) {
      const chatKey = `mock_chat_${orderId}`;
      const localMessages = getMockItem<ChatMessage[]>(chatKey, []);
      localMessages.push(newMessage);
      setMockItem(chatKey, localMessages);
      window.dispatchEvent(new CustomEvent('mock_chat_update', { detail: { orderId, messages: localMessages } }));
      return newMessage;
    }

    if (!db) {
      console.warn('Database connection unavailable, cannot send chat message.');
      return newMessage;
    }

    try {
      const colRef = collection(db!, 'orders', orderId, 'messages');
      await setDoc(doc(colRef, messageId), newMessage);
      return newMessage;
    } catch (error) {
      console.error('Error sending chat message:', error);
      return newMessage;
    }
  },

  subscribeChatMessages(
    orderId: string,
    onUpdate: (messages: ChatMessage[]) => void
  ): Unsubscribe | (() => void) {
    if (IS_MOCK_MODE) {
      const chatKey = `mock_chat_${orderId}`;
      const initialMessages = getMockItem<ChatMessage[]>(chatKey, []);
      onUpdate(initialMessages);

      const handleUpdate = (e: any) => {
        if (e.detail && e.detail.orderId === orderId) {
          onUpdate(e.detail.messages);
        }
      };

      window.addEventListener('mock_chat_update', handleUpdate);
      return () => {
        window.removeEventListener('mock_chat_update', handleUpdate);
      };
    }

    if (!db) {
      return () => {};
    }

    const q = query(
      collection(db!, 'orders', orderId, 'messages'),
      orderBy('createdAt', 'asc')
    );

    return onSnapshot(q, (snap) => {
      const list = snap.docs.map(d => d.data() as ChatMessage);
      onUpdate(list);
    }, (err) => {
      console.error('[dbService] Chat subscribe error:', err);
    });
  }
};
