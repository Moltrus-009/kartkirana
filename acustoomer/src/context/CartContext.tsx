import React, { createContext, useContext, useState, useEffect } from 'react';
import { CartItem, Product, Coupon, PriceBreakdown, AppliedPromotion } from '../types';
import { dbService } from '../services/dbService';
import { paymentService } from '../services/paymentService';
import { IS_MOCK_MODE } from '../infrastructure/firebase/firebase';
import { PreorderSchedule, isValidPreorderSchedule } from '../utils/preorder';
import { useAuth } from './AuthContext';
import { usePromotions } from '../hooks/usePromotions';
import { calculateBestPromotion } from '../utils/promotions';
import {
  CUSTOMER_STORAGE_KEYS,
  getCustomerStorageItem,
  removeCustomerStorageItem,
  setCustomerStorageItem
} from '../utils/customerStorage';

interface CartContextType {
  cartItems: CartItem[];
  cartShopId: string | null;
  cartShopName: string | null;
  coupon: Coupon | null;
  priceBreakdown: PriceBreakdown;
  addToCart: (product: Product, quantity?: number, isPreorder?: boolean, preorderDate?: string, preorderSlot?: string) => void;
  removeFromCart: (productId: string) => void;
  updateQuantity: (productId: string, quantity: number) => void;
  clearCart: () => void;
  applyCoupon: (code: string) => Promise<{ success: boolean; message: string }>;
  removeCoupon: () => void;
  preorderSchedule: PreorderSchedule | null;
  setPreorderSchedule: (schedule: PreorderSchedule | null) => void;
  conflictItem: { product: Product; quantity: number } | null;
  confirmReplaceCart: () => void;
  cancelReplaceCart: () => void;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

const getDistanceBetweenCoords = (lat1: number, lon1: number, lat2: number, lon2: number): number => {
  const R = 6371; // Radius of the earth in km
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = 
    Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
    Math.sin(dLon/2) * Math.sin(dLon/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c; // Distance in km
};

export const CartProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, loading: authLoading } = useAuth();
  const [cartItems, setCartItems] = useState<CartItem[]>([]);
  const [coupon, setCoupon] = useState<Coupon | null>(null);
  const [preorderSchedule, setPreorderScheduleState] = useState<PreorderSchedule | null>(null);
  const [allShops, setAllShops] = useState<any[]>([]);
  const [conflictItem, setConflictItem] = useState<{ product: Product; quantity: number } | null>(null);
  const { promotions } = usePromotions(cartItems[0]?.product.shopId, user?.uid);

  // Reload the authenticated customer's own cart whenever the account changes.
  useEffect(() => {
    if (authLoading) return;

    setConflictItem(null);
    if (!user?.uid) {
      setCartItems([]);
      setCoupon(null);
      setPreorderScheduleState(null);
      return;
    }

    try {
      const savedCart = JSON.parse(getCustomerStorageItem(CUSTOMER_STORAGE_KEYS.cart, user.uid) || '[]');
      setCartItems(Array.isArray(savedCart) ? savedCart : []);
    } catch {
      setCartItems([]);
      removeCustomerStorageItem(CUSTOMER_STORAGE_KEYS.cart, user.uid);
    }

    try {
      setCoupon(JSON.parse(getCustomerStorageItem(CUSTOMER_STORAGE_KEYS.coupon, user.uid) || 'null'));
    } catch {
      setCoupon(null);
      removeCustomerStorageItem(CUSTOMER_STORAGE_KEYS.coupon, user.uid);
    }

    try {
      const savedSchedule = JSON.parse(getCustomerStorageItem(CUSTOMER_STORAGE_KEYS.preorderSchedule, user.uid) || 'null');
      if (savedSchedule && isValidPreorderSchedule(savedSchedule)) setPreorderScheduleState(savedSchedule);
      else {
        setPreorderScheduleState(null);
        removeCustomerStorageItem(CUSTOMER_STORAGE_KEYS.preorderSchedule, user.uid);
      }
    } catch {
      setPreorderScheduleState(null);
      removeCustomerStorageItem(CUSTOMER_STORAGE_KEYS.preorderSchedule, user.uid);
    }
  }, [authLoading, user?.uid]);

  useEffect(() => {
    // Fetch all shops to resolve coordinates
    dbService.getShops().then(list => setAllShops(list));
  }, []);

  // Save to local storage on changes
  const saveCart = (items: CartItem[]) => {
    setCartItems(items);
    setCustomerStorageItem(CUSTOMER_STORAGE_KEYS.cart, user?.uid, JSON.stringify(items));
  };

  const clearCart = () => {
    saveCart([]);
    setCoupon(null);
    setPreorderScheduleState(null);
    removeCustomerStorageItem(CUSTOMER_STORAGE_KEYS.coupon, user?.uid);
    removeCustomerStorageItem(CUSTOMER_STORAGE_KEYS.preorderSchedule, user?.uid);
  };

  // Determine active shop from items
  const cartShopId = cartItems.length > 0 ? cartItems[0].product.shopId : null;
  const cartShopName = cartItems.length > 0 ? cartItems[0].product.shopName : null;

  const addToCart = (
    product: Product,
    quantity = 1,
    isPreorder = false,
    preorderDate?: string,
    preorderSlot?: string
  ) => {
    // Multi-shop check
    if (cartShopId && cartShopId !== product.shopId) {
      const existingShop = allShops.find(s => s.id === cartShopId);
      const newShop = allShops.find(s => s.id === product.shopId);
      
      let isNearby = false;
      if (existingShop && newShop) {
        const distance = getDistanceBetweenCoords(existingShop.lat, existingShop.lng, newShop.lat, newShop.lng);
        if (distance * 1000 <= 500) {
          isNearby = true;
        }
      }

      if (!isNearby) {
        setConflictItem({ product, quantity });
        return;
      }
    }

    const existsIdx = cartItems.findIndex(item => item.product.id === product.id);
    let updatedList = [...cartItems];

    if (existsIdx > -1) {
      updatedList[existsIdx].quantity += quantity;
      if (preorderDate) updatedList[existsIdx].preorderDate = preorderDate;
      if (preorderSlot) updatedList[existsIdx].preorderSlot = preorderSlot;
    } else {
      updatedList.push({
        product,
        quantity,
        isPreorder,
        preorderDate,
        preorderSlot,
      });
    }

    saveCart(updatedList);
  };

  const removeFromCart = (productId: string) => {
    const updated = cartItems.filter(item => item.product.id !== productId);
    saveCart(updated);
    if (updated.length === 0) {
      setCoupon(null);
      setPreorderScheduleState(null);
      removeCustomerStorageItem(CUSTOMER_STORAGE_KEYS.preorderSchedule, user?.uid);
    }
  };

  const updateQuantity = (productId: string, quantity: number) => {
    if (quantity <= 0) {
      removeFromCart(productId);
      return;
    }
    const updated = cartItems.map(item => 
      item.product.id === productId ? { ...item, quantity } : item
    );
    saveCart(updated);
  };

  const applyCoupon = async (code: string): Promise<{ success: boolean; message: string }> => {
    try {
      const normalizedCode = code.trim().toUpperCase();
      const subtotal = cartItems.reduce((acc, item) => acc + (item.product.price * item.quantity), 0);
      if (!normalizedCode || !cartShopId || subtotal <= 0) {
        return { success: false, message: 'Add items to your cart before applying a coupon.' };
      }

      // The live service is authoritative for expiry, shop eligibility, global
      // and per-customer limits. The same validation runs again at checkout.
      if (!IS_MOCK_MODE) {
        const result = await paymentService.validateCoupon(normalizedCode, cartShopId, subtotal);
        const data = result.coupon || {};
        const appliedCoupon: Coupon = {
          code: result.code,
          discountType: result.type === 'percentage' ? 'percentage' : 'fixed',
          discountValue: Number(data.discountValue ?? data.value ?? 0),
          minOrderValue: Number(data.minOrderValue ?? data.minPurchase ?? 0),
          maxDiscount: Number(data.maxDiscount ?? data.maxDiscountCap ?? 0) || undefined,
          description: String(data.description || `${result.code} applied`),
          expiryDate: String(data.validUntil ?? data.expiryDate ?? ''),
          validatedDiscount: result.discount,
          freeDelivery: result.isFreeDelivery
        };
        setCoupon(appliedCoupon);
        setCustomerStorageItem(CUSTOMER_STORAGE_KEYS.coupon, user?.uid, JSON.stringify(appliedCoupon));
        return { success: true, message: 'Coupon applied successfully!' };
      }

      const coupons = await dbService.getCoupons();
      const found = coupons.find(c => c.code.toUpperCase() === normalizedCode);
      
      if (!found) {
        return { success: false, message: 'Invalid coupon code.' };
      }

      // Check expiry date
      if (new Date(found.expiryDate) < new Date()) {
        return { success: false, message: 'Coupon code has expired.' };
      }

      if (subtotal < found.minOrderValue) {
        return { success: false, message: `Minimum order value for this coupon is ₹${found.minOrderValue}.` };
      }

      setCoupon(found);
      setCustomerStorageItem(CUSTOMER_STORAGE_KEYS.coupon, user?.uid, JSON.stringify(found));
      return { success: true, message: 'Coupon applied successfully!' };
    } catch (error) {
      return { success: false, message: 'Failed to apply coupon. Try again.' };
    }
  };

  const removeCoupon = () => {
    setCoupon(null);
    removeCustomerStorageItem(CUSTOMER_STORAGE_KEYS.coupon, user?.uid);
  };

  const setPreorderSchedule = (schedule: PreorderSchedule | null) => {
    if (schedule && !isValidPreorderSchedule(schedule)) return;
    setPreorderScheduleState(schedule);
    if (schedule) setCustomerStorageItem(CUSTOMER_STORAGE_KEYS.preorderSchedule, user?.uid, JSON.stringify(schedule));
    else removeCustomerStorageItem(CUSTOMER_STORAGE_KEYS.preorderSchedule, user?.uid);
  };

  // Compute price breakdown
  const calculateBreakdown = (): PriceBreakdown => {
    const subtotal = cartItems.reduce((acc, item) => acc + (item.product.price * item.quantity), 0);
    
    let discount = 0;
    if (coupon) {
      if (coupon.validatedDiscount !== undefined) {
        discount = coupon.validatedDiscount;
      } else if (subtotal >= coupon.minOrderValue) {
        if (coupon.discountType === 'percentage') {
          discount = subtotal * (coupon.discountValue / 100);
          if (coupon.maxDiscount) {
            discount = Math.min(discount, coupon.maxDiscount);
          }
        } else {
          discount = coupon.discountValue;
        }
      }
    }

    // Free delivery check (above ₹149)
    const qualifiesFreeDelivery = subtotal >= 149;
    const baseDeliveryCharge = cartItems.length > 0 && !qualifiesFreeDelivery ? 25 : 0;
    let deliveryCharge = coupon?.freeDelivery ? 0 : baseDeliveryCharge;
    let appliedPromotion: AppliedPromotion | null = null;
    const bestPromotion = calculateBestPromotion(promotions, cartItems, subtotal, baseDeliveryCharge);
    const couponSaving = discount + (coupon?.freeDelivery ? baseDeliveryCharge : 0);
    if (bestPromotion && bestPromotion.saving > couponSaving) {
      appliedPromotion = bestPromotion;
      discount = bestPromotion.discount;
      deliveryCharge = bestPromotion.isFreeDelivery ? 0 : baseDeliveryCharge;
    }
    
    // Flat handling fee of ₹5 per delivery
    const platformFee = cartItems.length > 0 ? 5 : 0;
    const packagingFee = 0;

    const taxes = 0; // GST removed - prices are inclusive as shown on platform
    
    const grandTotal = Math.max(0, subtotal - discount + deliveryCharge + platformFee + packagingFee);

    return {
      subtotal,
      discount,
      taxes,
      deliveryCharge,
      platformFee,
      packagingFee,
      grandTotal: Math.round(grandTotal * 100) / 100,
      appliedPromotion,
    };
  };

  const confirmReplaceCart = () => {
    if (conflictItem) {
      const newItem: CartItem = { 
        product: conflictItem.product, 
        quantity: conflictItem.quantity, 
        isPreorder: conflictItem.product.isPreorder 
      };
      saveCart([newItem]);
      setCoupon(null);
      setPreorderScheduleState(null);
      removeCustomerStorageItem(CUSTOMER_STORAGE_KEYS.preorderSchedule, user?.uid);
      setConflictItem(null);
    }
  };

  const cancelReplaceCart = () => {
    setConflictItem(null);
  };

  const priceBreakdown = calculateBreakdown();

  return (
    <CartContext.Provider value={{
      cartItems,
      cartShopId,
      cartShopName,
      coupon,
      priceBreakdown,
      addToCart,
      removeFromCart,
      updateQuantity,
      clearCart,
      applyCoupon,
      removeCoupon,
      preorderSchedule,
      setPreorderSchedule,
      conflictItem,
      confirmReplaceCart,
      cancelReplaceCart,
    }}>
      {children}
    </CartContext.Provider>
  );
};

export const useCart = () => {
  const context = useContext(CartContext);
  if (!context) throw new Error('useCart must be used within a CartProvider');
  return context;
};
