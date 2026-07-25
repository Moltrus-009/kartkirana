import React, { createContext, useContext, useState, useEffect } from 'react';
import { CartItem, Product, Coupon, PriceBreakdown } from '../types';
import { dbService } from '../services/dbService';

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
  preorderSchedule: { date?: string; slot?: string } | null;
  setPreorderSchedule: (schedule: { date?: string; slot?: string } | null) => void;
  conflictItem: { product: Product; quantity: number } | null;
  confirmReplaceCart: () => void;
  cancelReplaceCart: () => void;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

const LOCAL_STORAGE_KEY = 'shop_app_cart';
const LOCAL_STORAGE_COUPON_KEY = 'shop_app_coupon';

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
  const [cartItems, setCartItems] = useState<CartItem[]>([]);
  const [coupon, setCoupon] = useState<Coupon | null>(null);
  const [preorderSchedule, setPreorderScheduleState] = useState<{ date?: string; slot?: string } | null>(null);
  const [allShops, setAllShops] = useState<any[]>([]);
  const [conflictItem, setConflictItem] = useState<{ product: Product; quantity: number } | null>(null);

  // Load from local storage on mount
  useEffect(() => {
    const savedCart = localStorage.getItem(LOCAL_STORAGE_KEY);
    if (savedCart) {
      setCartItems(JSON.parse(savedCart));
    }
    const savedCoupon = localStorage.getItem(LOCAL_STORAGE_COUPON_KEY);
    if (savedCoupon) {
      setCoupon(JSON.parse(savedCoupon));
    }
    // Fetch all shops to resolve coordinates
    dbService.getShops().then(list => setAllShops(list));
  }, []);

  // Save to local storage on changes
  const saveCart = (items: CartItem[]) => {
    setCartItems(items);
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(items));
  };

  const clearCart = () => {
    saveCart([]);
    setCoupon(null);
    setPreorderScheduleState(null);
    localStorage.removeItem(LOCAL_STORAGE_COUPON_KEY);
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
      const coupons = await dbService.getCoupons();
      const found = coupons.find(c => c.code.toUpperCase() === code.toUpperCase());
      
      if (!found) {
        return { success: false, message: 'Invalid coupon code.' };
      }

      // Check expiry date
      if (new Date(found.expiryDate) < new Date()) {
        return { success: false, message: 'Coupon code has expired.' };
      }

      // Calculate subtotal
      const subtotal = cartItems.reduce((acc, item) => acc + (item.product.price * item.quantity), 0);
      if (subtotal < found.minOrderValue) {
        return { success: false, message: `Minimum order value for this coupon is ₹${found.minOrderValue}.` };
      }

      setCoupon(found);
      localStorage.setItem(LOCAL_STORAGE_COUPON_KEY, JSON.stringify(found));
      return { success: true, message: 'Coupon applied successfully!' };
    } catch (error) {
      return { success: false, message: 'Failed to apply coupon. Try again.' };
    }
  };

  const removeCoupon = () => {
    setCoupon(null);
    localStorage.removeItem(LOCAL_STORAGE_COUPON_KEY);
  };

  const setPreorderSchedule = (schedule: { date?: string; slot?: string } | null) => {
    setPreorderScheduleState(schedule);
  };

  // Compute price breakdown
  const calculateBreakdown = (): PriceBreakdown => {
    const subtotal = cartItems.reduce((acc, item) => acc + (item.product.price * item.quantity), 0);
    
    let discount = 0;
    if (coupon) {
      const code = coupon.code.toUpperCase();
      if (code === 'FLAT50') {
        discount = Math.min(50, subtotal);
      } else if (code === 'SAVE20') {
        discount = Math.round(subtotal * 0.20);
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

    // Free delivery check (above 500)
    const qualifiesFreeDelivery = subtotal >= 500;
    const deliveryCharge = cartItems.length > 0 && !qualifiesFreeDelivery ? 30 : 0;
    
    const platformFee = cartItems.length > 0 ? 2 : 0;
    const packagingFee = cartItems.length > 0 ? 5 : 0;

    const taxableAmount = Math.max(0, subtotal - discount);
    const taxes = Math.round(taxableAmount * 0.05 * 100) / 100; // 5% GST
    
    const grandTotal = Math.max(0, subtotal - discount + taxes + deliveryCharge + platformFee + packagingFee);

    return {
      subtotal,
      discount,
      taxes,
      deliveryCharge,
      platformFee,
      packagingFee,
      grandTotal: Math.round(grandTotal * 100) / 100,
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
      setPreorderScheduleState(conflictItem.product.isPreorder ? { date: newItem.preorderDate, slot: newItem.preorderSlot } : null);
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
