export interface OrderItem {
  product: {
    id: string;
    name: string;
    price: number;
    image: string;
    shopId: string;
    shopName: string;
    category?: string;
  };
  quantity: number;
  shopId: string;
  isPreorder?: boolean;
}

export interface Order {
  id: string;
  userId?: string;
  shopId: string;
  shopName: string;
  shopAddress: string;
  items: OrderItem[];
  subtotal: number;
  deliveryFee: number;
  platformFee: number;
  tax: number;
  platformDiscount: number;
  couponDiscount: number;
  appliedPromotion?: {
    promotionId: string;
    title: string;
    discountType: 'percentage' | 'flat' | 'bogo' | 'free_delivery';
    discount: number;
    isFreeDelivery: boolean;
    saving: number;
    freeItems?: Array<{ productId: string; name: string; quantity: number }>;
  } | null;
  total: number; // original name instead of grandTotal
  grandTotal?: number;
  paymentMethod: string;
  paymentStatus: 'pending' | 'completed' | 'failed' | 'refunded';
  status: 'upcoming' | 'PLACED' | 'SHOP_ACCEPTED' | 'PREPARING' | 'READY' | 'ASSIGNED' | 'PICKED_UP' | 'DELIVERED' | 'cancelled' | 'ORDER_PLACED' | 'SEARCHING_RIDER' | 'RIDER_ASSIGNED' | 'ARRIVED_AT_SHOP' | 'OUT_FOR_DELIVERY' | 'COMPLETED' | 'SHOP_REJECTED';
  createdAt: string;
  updatedAt: string;
  deliveryAddress: {
    name: string;
    phone: string;
    street: string;
    city: string;
    address: string; // required
    coords: {
      lat: number;
      lng: number;
    };
  };
  contact: {
    name: string;
    phone: string;
  };
  rider: {
    name: string;
    phone: string;
    coords: { lat: number; lng: number };
    progress: number;
  } | null;
  timeline: Array<{
    status: string;
    timestamp: string;
    title: string;
    desc: string; // desc instead of description
  }>;
  batchId?: string;
}
