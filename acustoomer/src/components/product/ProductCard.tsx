import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Heart, Plus, Minus, CalendarClock } from 'lucide-react';
import { Product, ShopPromotion } from '../../types';
import { useCart } from '../../context/CartContext';
import { useAuth } from '../../context/AuthContext';
import { motion } from 'framer-motion';
import { CUSTOMER_STORAGE_KEYS, getCustomerStorageItem, setCustomerStorageItem } from '../../utils/customerStorage';
import { SafeImage } from '../ui/SafeImage';

interface ProductCardProps {
  product: Product;
  promotion?: ShopPromotion;
  compact?: boolean;
}

export const ProductCard: React.FC<ProductCardProps> = ({ product, promotion, compact = false }) => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { cartItems, addToCart, updateQuantity } = useCart();
  const [isWished, setIsWished] = useState(false);

  // Check if in Cart
  const cartItem = cartItems.find(item => item.product.id === product.id);
  const quantity = cartItem ? cartItem.quantity : 0;

  // Manage Wishlist State via local storage
  useEffect(() => {
    const list = JSON.parse(getCustomerStorageItem(CUSTOMER_STORAGE_KEYS.wishlist, user?.uid) || '[]');
    setIsWished(list.includes(product.id));
  }, [product.id, user?.uid]);

  const toggleWishlist = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!user?.uid) return;
    const list = JSON.parse(getCustomerStorageItem(CUSTOMER_STORAGE_KEYS.wishlist, user.uid) || '[]');
    let updated = [];
    if (isWished) {
      updated = list.filter((id: string) => id !== product.id);
      setIsWished(false);
    } else {
      updated = [...list, product.id];
      setIsWished(true);
    }
    setCustomerStorageItem(CUSTOMER_STORAGE_KEYS.wishlist, user.uid, JSON.stringify(updated));
    // Trigger custom event for other wishlist components to update
    window.dispatchEvent(new Event('wishlist_updated'));
  };

  const handleAdd = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (product.isPreorder) {
      // Navigate to details to select preorder date/slot
      navigate(`/product/${product.id}`);
    } else {
      addToCart(product, 1);
    }
  };

  const handleIncrement = (e: React.MouseEvent) => {
    e.stopPropagation();
    updateQuantity(product.id, quantity + 1);
  };

  const handleDecrement = (e: React.MouseEvent) => {
    e.stopPropagation();
    updateQuantity(product.id, quantity - 1);
  };

  // Calculate discount percentage
  const discountPercent = product.originalPrice > product.price
    ? Math.round(((product.originalPrice - product.price) / product.originalPrice) * 100)
    : 0;

  const isOutOfStock = product.stock !== undefined && product.stock <= 0;

  return (
    <div
      role="button"
      tabIndex={isOutOfStock ? -1 : 0}
      aria-label={`View ${product.name}`}
      onClick={() => !isOutOfStock && navigate(`/product/${product.id}`)}
      onKeyDown={event => {
        if (!isOutOfStock && (event.key === 'Enter' || event.key === ' ')) {
          event.preventDefault();
          navigate(`/product/${product.id}`);
        }
      }}
      className={`group relative flex h-full flex-col justify-between overflow-hidden border border-[#E2E8F0] bg-white transition-all duration-200 hover:border-blue-200 dark:border-[#334155] dark:bg-[#1E293B] ${compact ? 'rounded-[17px] p-2.5 shadow-[0_8px_22px_-22px_rgba(5,10,36,0.7)]' : 'rounded-[20px] p-3.5 shadow-[0_8px_24px_-20px_rgba(5,10,36,0.45)] hover:shadow-[0_12px_30px_-20px_rgba(11,116,232,0.35)]'} ${isOutOfStock ? 'opacity-60 cursor-not-allowed' : 'cursor-pointer'}`}
    >
      {/* Out of Stock Overlay */}
      {isOutOfStock && (
        <div className="absolute inset-0 bg-white/60 dark:bg-[#0F172A]/60 z-20 flex flex-col items-center justify-center p-2 text-center pointer-events-none">
          <span className="px-3 py-1.5 rounded-full bg-red-500 text-white text-[10px] font-black uppercase tracking-wider shadow-sm">
            Out of Stock
          </span>
        </div>
      )}

      {/* Top badges & Wishlist */}
      <div className="relative">
        <div className="flex items-center justify-between z-10 relative">
          {discountPercent > 0 ? (
            <span className={`${compact ? 'px-1.5 text-[8px]' : 'px-2 text-[9px]'} rounded-lg bg-[#1565C0] py-0.5 font-extrabold uppercase tracking-wide text-white dark:bg-[#1E88E5]`}>
              {discountPercent}% OFF
            </span>
          ) : (
            <div />
          )}

          <button
            aria-label={isWished ? `Remove ${product.name} from wishlist` : `Add ${product.name} to wishlist`}
            onClick={toggleWishlist}
            disabled={isOutOfStock}
            className={`${compact ? 'p-1' : 'p-1.5'} cursor-pointer rounded-full bg-[#F8FAFC]/80 text-gray-400 shadow-sm transition-colors hover:bg-white hover:text-red-500 dark:bg-[#1E293B]/80 dark:text-gray-300 dark:hover:bg-[#334155]`}
          >
            <Heart className={`${compact ? 'h-3.5 w-3.5' : 'h-4 w-4'} transition-transform duration-200 active:scale-125 ${isWished ? 'fill-red-500 text-red-500' : ''}`} />
          </button>
        </div>

        {/* Product Image */}
        <div className={`${compact ? 'my-1' : 'my-2'} flex aspect-square w-full items-center justify-center overflow-hidden rounded-xl bg-[#F8FAFC]/50 dark:bg-[#1E293B]/50`}>
          <SafeImage
            src={product.image}
            alt={product.name}
            className={`${compact ? 'p-1' : 'p-1.5'} h-full w-full object-contain mix-blend-multiply transition-transform duration-500 group-hover:scale-105 dark:mix-blend-normal`}
            fallback="📦"
          />
        </div>

        {/* Preorder Badge */}
        {product.isPreorder && (
          <span className="absolute bottom-2 left-0 inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-[#FFC928] text-[#071128] text-[9px] font-bold uppercase tracking-wider">
            <CalendarClock className="h-3 w-3" />
            Preorder
          </span>
        )}
        {promotion && !product.isPreorder && (
          <span className="absolute bottom-2 left-0 inline-flex items-center gap-1 rounded-md bg-[#FFC928] px-2 py-0.5 text-[9px] font-black uppercase tracking-wider text-[#071128]">
            {promotion.discountType === 'bogo' ? `Buy ${promotion.buyQuantity || 1} get ${promotion.getQuantity || 1}` : promotion.discountType === 'percentage' ? `${promotion.value}% special` : promotion.title}
          </span>
        )}
      </div>

      {/* Info & Action Section */}
      <div className={`${compact ? 'mt-1.5' : 'mt-2'} flex flex-1 flex-col justify-between text-left`}>
        <div>
          <span className="text-[10px] font-bold text-gray-400 dark:text-[#94A3B8] block truncate">
            {product.shopName}
          </span>
          <h4 className={`${compact ? 'text-[11px]' : 'text-xs'} mt-0.5 line-clamp-2 h-8 font-bold leading-snug text-gray-800 transition-colors group-hover:text-[#1565C0] dark:text-gray-100 dark:group-hover:text-[#1E88E5]`}>
            {product.name}
          </h4>
          
          {/* Quantity and delivery text */}
          <div className="mt-1.5 flex items-center justify-between gap-1">
            <span className="text-[9px] font-black uppercase text-gray-400 dark:text-[#64748B]">
              {product.specifications?.['Weight'] || product.specifications?.['Volume'] || product.specifications?.['Quantity'] || product.specifications?.['Count'] || product.specifications?.['Size'] || '1 unit'}
            </span>
            {!compact && <span className="truncate text-[9px] font-bold text-[#1565C0] dark:text-[#1E88E5]">{product.isPreorder ? 'Preorder' : `ETA: ${product.estimatedDelivery}`}</span>}
          </div>
        </div>

        {/* Price & Add Button */}
        <div className={`${compact ? 'mt-2' : 'mt-3'} flex items-center justify-between gap-1.5`}>
          <div className="flex flex-col">
            <span className="text-sm font-black text-gray-900 dark:text-white">
              ₹{product.price}
            </span>
            {product.originalPrice > product.price && (
              <span className="text-[10px] font-bold text-gray-400 dark:text-[#64748B] line-through leading-none">
                ₹{product.originalPrice}
              </span>
            )}
          </div>

          {/* Add Button Logic */}
          <div className={`${compact ? 'h-8 w-[66px]' : 'h-8 w-20'} flex-shrink-0`}>
            {isOutOfStock ? (
              <button
                disabled
                className="w-full h-8 bg-gray-200 dark:bg-gray-800 text-gray-400 rounded-full text-xs font-bold transition-all cursor-not-allowed flex items-center justify-center animate-none"
              >
                SOLD OUT
              </button>
            ) : quantity > 0 && !product.isPreorder ? (
              <div className="w-full h-8 flex items-center justify-between bg-gradient-to-r from-[#1E88E5] to-[#1565C0] text-white rounded-full px-1.5 py-0.5 shadow-sm shadow-[#1565C0]/10">
                <button
                  onClick={handleDecrement}
                  className="p-1 text-white hover:bg-blue-600 rounded-full cursor-pointer transition-colors flex items-center justify-center"
                >
                  <Minus className="h-3 w-3" />
                </button>
                <span className="text-xs font-black text-white w-4 text-center">
                  {quantity}
                </span>
                <button
                  onClick={handleIncrement}
                  className="p-1 text-white hover:bg-blue-600 rounded-full cursor-pointer transition-colors flex items-center justify-center"
                >
                  <Plus className="h-3 w-3" />
                </button>
              </div>
            ) : (
              <motion.button
                whileTap={{ scale: 0.94 }}
                onClick={handleAdd}
                className={`${compact ? 'border border-[#0B74E8] bg-white text-[#0B74E8] hover:bg-blue-50 dark:bg-transparent dark:text-[#36B6F4]' : 'bg-[#0B74E8] text-white shadow-sm shadow-[#0B74E8]/15 hover:bg-[#0758C7]'} flex h-8 w-full cursor-pointer items-center justify-center gap-0.5 rounded-lg text-xs font-black transition-all`}
              >
                {product.isPreorder ? (
                  <>
                    <CalendarClock className="h-3.5 w-3.5" />
                    <span>BOOK</span>
                  </>
                ) : (
                  <>
                    <Plus className="h-3.5 w-3.5" />
                    <span>ADD</span>
                  </>
                )}
              </motion.button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
