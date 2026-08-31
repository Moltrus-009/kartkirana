export interface UserAddress {
  id: string;
  name: string; // e.g., 'Home', 'Work', 'Other'
  details: string; // house number, building
  area: string;
  city: string;
  pinCode: string;
  lat: number;
  lng: number;
  isDefault: boolean;
  floor?: string;
  landmark?: string;
  instructions?: string;
  placeId?: string;
  label?: string;
}

export interface UserProfile {
  uid: string;
  role?: 'customer';
  name: string;
  phone: string;
  email: string;
  profileImage: string;
  addresses: UserAddress[];
  createdAt: string;
  updatedAt: string;
  lastLogin: string;
  /** Tokenized payment references only. Never persist full card or UPI details. */
  savedPaymentMethods?: SavedPaymentMethod[];
  notificationPreferences?: NotificationPreferences;
  walletBalance?: number;
}

export interface SavedPaymentMethod {
  id: string;
  type: 'upi' | 'card' | 'net_banking' | 'wallet';
  label: string;
  last4?: string;
  isDefault?: boolean;
}

export interface NotificationPreferences {
  orderUpdates?: boolean;
  offers?: boolean;
  deliveryUpdates?: boolean;
}

export interface Coupon {
  code: string;
  discountType: 'percentage' | 'fixed';
  discountValue: number;
  minOrderValue: number;
  maxDiscount?: number;
  description: string;
  expiryDate: string;
  /** Server-calculated preview. Checkout always validates again on the server. */
  validatedDiscount?: number;
  freeDelivery?: boolean;
}

export interface ShopPromotion {
  id: string;
  shopId: string;
  title: string;
  description: string;
  offerType: 'sale' | 'loyalty' | 'addon' | 'subscription';
  discountType: 'percentage' | 'flat' | 'bogo' | 'free_delivery';
  value: number;
  minOrder: number;
  maxDiscount?: number;
  scope: 'order' | 'products';
  productIds: string[];
  audience: 'all' | 'selected_customers' | 'subscribers';
  buyQuantity?: number;
  getQuantity?: number;
  subscriptionPrice?: number;
  billingPeriod?: 'monthly' | 'quarterly';
  startDate: string;
  endDate: string;
  isActive: boolean;
  automatic: true;
  promotionVersion: 1;
  /** Client-resolved eligibility. The server always validates it again. */
  eligible: boolean;
}

export interface AppliedPromotion {
  promotionId: string;
  offerType: ShopPromotion['offerType'];
  title: string;
  description: string;
  discountType: ShopPromotion['discountType'];
  discount: number;
  isFreeDelivery: boolean;
  saving: number;
  freeItems: Array<{ productId: string; name: string; quantity: number }>;
}

export interface PromoBanner {
  id: string;
  image: string;
  title: string;
  subtitle?: string;
  shopId?: string;
  categoryId?: string;
}

export interface Shop {
  id: string;
  name: string;
  coverImage: string;
  logo: string;
  rating: number;
  reviewsCount: number;
  deliveryTime: string; // e.g., '15-20 min'
  distance: string; // e.g., '2.4 km'
  isOpen: boolean;
  offers: string[];
  categories: string[];
  address: string;
  lat: number;
  lng: number;
  featured: boolean;
}

export interface Product {
  id: string;
  shopId: string;
  shopName: string;
  name: string;
  image: string;
  images: string[];
  price: number;
  originalPrice: number;
  stock: number;
  rating: number;
  category: string;
  description: string;
  specifications: Record<string, string>;
  isPreorder: boolean;
  preorderDaysAhead?: number; // how many days ahead can be preordered
  estimatedDelivery: string;
}

export interface CartItem {
  product: Product;
  quantity: number;
  isPreorder: boolean;
  preorderDate?: string;
  preorderSlot?: string;
  preorderTime?: string;
}

export interface PriceBreakdown {
  subtotal: number;
  discount: number;
  taxes: number;
  deliveryCharge: number;
  platformFee: number;
  packagingFee?: number;
  grandTotal: number;
  appliedPromotion?: AppliedPromotion | null;
}

export type OrderStatus =
  | 'upcoming'
  | 'PLACED'
  | 'ORDER_PLACED'
  | 'SHOP_ACCEPTED'
  | 'SEARCHING_RIDER'
  | 'RIDER_ASSIGNED'
  | 'ARRIVED_AT_SHOP'
  | 'PICKED_UP'
  | 'OUT_FOR_DELIVERY'
  | 'DELIVERED'
  | 'COMPLETED'
  | 'SHOP_REJECTED'
  | 'cancelled';

export interface OrderTimelineEvent {
  status: OrderStatus;
  timestamp: string;
  title: string;
  description: string;
}

export interface Order {
  id: string;
  userId: string;
  shopId: string;
  shopName: string;
  items: CartItem[];
  status: OrderStatus;
  timeline: OrderTimelineEvent[];
  paymentMethod: 'upi' | 'card' | 'net_banking' | 'cod' | 'wallet';
  couponApplied?: Coupon;
  priceBreakdown: PriceBreakdown;
  deliveryAddress: UserAddress;
  orderNotes?: string;
  estimatedDelivery: string;
  createdAt: string;
  updatedAt: string;
  preorderDate?: string;
  preorderSlot?: string;
  preorderTime?: string;
  appliedPromotion?: AppliedPromotion | null;
  rider?: {
    name: string;
    phone: string;
    coords: { lat: number; lng: number };
    progress: number;
  } | null;
  prescriptionUrl?: string;
  shopAddress?: string;
  shopCoords?: { lat: number; lng: number };
  
  // Flat billing fields for cross-app compatibility:
  subtotal?: number;
  deliveryFee?: number;
  platformFee?: number;
  tax?: number;
  discount?: number;
  total?: number;
  paymentStatus?: 'pending' | 'completed' | 'failed';
  contact?: { name: string; phone: string };
  instructions?: string;
  riderId?: string | null;
  batchId?: string | null;
  razorpayPaymentId?: string;
  razorpayOrderId?: string;
  razorpaySignature?: string;
  paymentGateway?: 'razorpay' | 'cod' | 'wallet';
  paymentTimestamp?: string;
}

export interface Review {
  id: string;
  targetId: string; // shopId or productId
  userId: string;
  userName: string;
  userImage?: string;
  rating: number;
  comment: string;
  images?: string[];
  createdAt: string;
}

export interface NotificationItem {
  id: string;
  title: string;
  body: string;
  type: 'order' | 'offer' | 'delivery' | 'system';
  createdAt: string;
  read: boolean;
  link?: string;
}

export interface ChatMessage {
  id: string;
  senderId: string;
  senderName: string;
  senderRole: 'customer' | 'rider';
  text: string;
  imageUrl?: string;
  createdAt: string;
}
