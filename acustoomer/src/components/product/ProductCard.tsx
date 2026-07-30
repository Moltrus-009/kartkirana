import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Heart, Star, Plus, Minus, CalendarClock } from 'lucide-react';
import { Product } from '../../types';
import { useCart } from '../../context/CartContext';
import { motion } from 'framer-motion';

interface ProductCardProps {
  product: Product;
}

export const ProductCard: React.FC<ProductCardProps> = ({ product }) => {
  const navigate = useNavigate();
  const { cartItems, addToCart, updateQuantity } = useCart();
  const [isWished, setIsWished] = useState(false);

  // Check if in Cart
  const cartItem = cartItems.find(item => item.product.id === product.id);
  const quantity = cartItem ? cartItem.quantity : 0;

  // Manage Wishlist State via local storage
  useEffect(() => {
    const list = JSON.parse(localStorage.getItem('wishlist_products') || '[]');
    setIsWished(list.includes(product.id));
  }, [product.id]);

  const toggleWishlist = (e: React.MouseEvent) => {
    e.stopPropagation();
    const list = JSON.parse(localStorage.getItem('wishlist_products') || '[]');
    let updated = [];
    if (isWished) {
      updated = list.filter((id: string) => id !== product.id);
      setIsWished(false);
    } else {
      updated = [...list, product.id];
      setIsWished(true);
    }
    localStorage.setItem('wishlist_products', JSON.stringify(updated));
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
      onClick={() => !isOutOfStock && navigate(`/product/${product.id}`)}
      className={`group relative overflow-hidden bg-white dark:bg-[#1E293B] border border-[#E2E8F0] dark:border-[#334155] rounded-[20px] transition-all duration-300 shadow-[0_4px_16px_rgba(46,125,50,0.04)] hover:shadow-[0_8px_24px_rgba(46,125,50,0.08)] flex flex-col justify-between h-full p-3.5 ${isOutOfStock ? 'opacity-60 cursor-not-allowed' : 'cursor-pointer'}`}
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
            <span className="px-2 py-0.5 rounded-lg bg-[#1565C0] dark:bg-[#1E88E5] text-white text-[9px] font-extrabold uppercase tracking-wide">
              {discountPercent}% OFF
            </span>
          ) : (
            <div />
          )}

          <button
            onClick={toggleWishlist}
            disabled={isOutOfStock}
            className="p-1.5 rounded-full bg-[#F8FAFC]/80 dark:bg-[#1E293B]/80 hover:bg-white dark:hover:bg-[#334155] shadow-sm text-gray-400 dark:text-gray-300 hover:text-red-500 transition-colors cursor-pointer"
          >
            <Heart className={`h-4 w-4 transition-transform duration-200 active:scale-125 ${isWished ? 'fill-red-500 text-red-500' : ''}`} />
          </button>
        </div>

        {/* Product Image */}
        <div className="aspect-square w-full my-2 overflow-hidden flex items-center justify-center rounded-xl bg-[#F8FAFC]/50 dark:bg-[#1E293B]/50">
          <img
            src={product.image}
            alt={product.name}
            className="h-full w-full object-contain mix-blend-multiply dark:mix-blend-normal p-1.5 transition-transform duration-500 group-hover:scale-105"
          />
        </div>

        {/* Preorder Badge */}
        {product.isPreorder && (
          <span className="absolute bottom-2 left-0 inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-purple-100 dark:bg-purple-950/60 text-purple-700 dark:text-purple-400 text-[9px] font-bold uppercase tracking-wider">
            <CalendarClock className="h-3 w-3" />
            Preorder
          </span>
        )}
      </div>

      {/* Info & Action Section */}
      <div className="text-left mt-2 flex flex-col flex-1 justify-between">
        <div>
          <span className="text-[10px] font-bold text-gray-400 dark:text-[#94A3B8] block truncate">
            {product.shopName}
          </span>
          <h4 className="text-xs font-bold text-gray-800 dark:text-gray-100 group-hover:text-[#1565C0] dark:group-hover:text-[#1E88E5] transition-colors line-clamp-2 h-8 mt-0.5 leading-snug">
            {product.name}
          </h4>
          
          {/* Quantity and delivery text */}
          <div className="flex items-center justify-between gap-1 mt-1.5">
            <span className="text-[9px] font-black uppercase text-gray-400 dark:text-[#64748B]">
              {product.specifications?.['Weight'] || product.specifications?.['Volume'] || product.specifications?.['Quantity'] || product.specifications?.['Count'] || product.specifications?.['Size'] || '1 unit'}
            </span>
            <span className="text-[9px] font-bold text-[#1565C0] dark:text-[#1E88E5] truncate">
              {product.isPreorder ? 'Preorder' : `ETA: ${product.estimatedDelivery}`}
            </span>
          </div>
        </div>

        {/* Price & Add Button */}
        <div className="mt-3 flex items-center justify-between gap-1.5">
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
          <div className="w-20 h-8 flex-shrink-0">
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
                className="w-full h-8 bg-gradient-to-br from-[#1E88E5] to-[#0B74E8] hover:from-[#0B74E8] hover:to-[#0758C7] text-white hover:shadow-md hover:shadow-[#0B74E8]/25 rounded-full text-xs font-black transition-all cursor-pointer flex items-center justify-center gap-0.5 shadow-sm shadow-[#0B74E8]/10 btn-glossy border border-[#90CAF9]/20"
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
