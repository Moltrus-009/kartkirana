import React, { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Heart, ShoppingCart } from 'lucide-react';
import { dbService } from '../services/dbService';
import { Product } from '../types';
import { useCart } from '../context/CartContext';
import { Button } from '../components/ui/Button';
import { useAuth } from '../context/AuthContext';
import { CUSTOMER_STORAGE_KEYS, getCustomerStorageItem, setCustomerStorageItem } from '../utils/customerStorage';
import { SafeImage } from '../components/ui/SafeImage';

export const Wishlist: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { addToCart } = useCart();
  const [wishlistItems, setWishlistItems] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchWishlistItems = useCallback(async () => {
    try {
      const ids: string[] = JSON.parse(getCustomerStorageItem(CUSTOMER_STORAGE_KEYS.wishlist, user?.uid) || '[]');
      const allProducts = await dbService.getProducts();
      const filtered = allProducts.filter(p => ids.includes(p.id));
      setWishlistItems(filtered);
    } catch (e) {
      console.error('Error loading wishlist items:', e);
    } finally {
      setLoading(false);
    }
  }, [user?.uid]);

  useEffect(() => {
    fetchWishlistItems();

    // Listen to local changes
    const handleWishUpdate = () => {
      fetchWishlistItems();
    };

    window.addEventListener('wishlist_updated', handleWishUpdate);
    return () => {
      window.removeEventListener('wishlist_updated', handleWishUpdate);
    };
  }, [fetchWishlistItems]);

  const handleRemove = (productId: string) => {
    if (!user?.uid) return;
    const ids: string[] = JSON.parse(getCustomerStorageItem(CUSTOMER_STORAGE_KEYS.wishlist, user.uid) || '[]');
    const updated = ids.filter(id => id !== productId);
    setCustomerStorageItem(CUSTOMER_STORAGE_KEYS.wishlist, user.uid, JSON.stringify(updated));
    // Trigger update
    fetchWishlistItems();
  };

  const handleMoveToCart = (product: Product) => {
    if (product.stock <= 0) {
      alert(`${product.name} is currently out of stock.`);
      return;
    }
    addToCart(product, 1);
    handleRemove(product.id);
    navigate('/cart');
  };

  return (
    <div className="w-full px-4 pb-24 text-left">
      
      {/* Header */}
      <div className="sticky top-0 z-35 bg-slate-50 dark:bg-slate-950 py-3.5 flex items-center gap-3 border-b border-gray-100 dark:border-slate-900 mb-4">
        <button
          onClick={() => navigate(-1)}
          className="p-2.5 rounded-xl hover:bg-gray-150 dark:hover:bg-slate-900 text-gray-500 dark:text-gray-400 cursor-pointer"
        >
          <ArrowLeft className="h-5 w-5" />
        </button>
        <h2 className="text-lg font-black text-gray-800 dark:text-gray-100 uppercase tracking-wider flex items-center gap-1.5">
          <Heart className="h-5 w-5 text-red-500 fill-current" />
          My Wishlist
        </h2>
      </div>

      {loading ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
          <div className="w-full aspect-square shimmer rounded-3xl" />
          <div className="w-full aspect-square shimmer rounded-3xl" />
          <div className="w-full aspect-square shimmer rounded-3xl" />
          <div className="w-full aspect-square shimmer rounded-3xl" />
        </div>
      ) : wishlistItems.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center text-gray-400">
          <div className="h-20 w-20 rounded-full bg-red-50 dark:bg-red-950/20 text-red-500 flex items-center justify-center mb-4">
            <Heart className="h-10 w-10 fill-current" />
          </div>
          <h3 className="text-sm font-bold text-gray-700 dark:text-gray-300">Your Wishlist is Empty</h3>
          <p className="text-xs mt-1">Bookmark items you love to shop them later.</p>
          <Button variant="primary" className="mt-6 rounded-xl" onClick={() => navigate('/')}>
            Explore Products
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
          {wishlistItems.map(product => (
            <div
              key={product.id}
              className="group relative overflow-hidden bg-white dark:bg-slate-900 border border-gray-100 dark:border-slate-800 rounded-3xl p-3.5 flex flex-col justify-between h-full"
            >
              {/* Product Header */}
              <div className="relative">
                <button
                  onClick={() => handleRemove(product.id)}
                  className="absolute right-0 top-0 p-1.5 rounded-full bg-red-50 dark:bg-red-950/20 text-red-500 cursor-pointer"
                >
                  <Heart className="h-4 w-4 fill-current" />
                </button>

                <div className="aspect-square w-full my-2 overflow-hidden flex items-center justify-center rounded-xl bg-gray-50 dark:bg-slate-850">
                  <SafeImage src={product.image} alt={product.name} className="h-full w-full object-contain p-1" fallback="📦" />
                </div>
              </div>

              {/* Product info */}
              <div className="text-left mt-1">
                <span className="text-[9px] font-bold text-gray-400 block truncate">{product.shopName}</span>
                <h4 className="text-xs font-bold text-gray-800 dark:text-gray-200 line-clamp-2 h-8 leading-snug mt-0.5">
                  {product.name}
                </h4>
                <div className="mt-2.5 flex items-center justify-between">
                  <span className="text-xs font-black text-gray-900 dark:text-gray-100">₹{product.price}</span>
                  
                  <Button
                    onClick={() => handleMoveToCart(product)}
                    disabled={product.stock <= 0}
                    className="rounded-xl px-2.5 py-1 text-[10px] font-black flex items-center gap-1"
                  >
                    <ShoppingCart className="h-3 w-3" />
                    {product.stock <= 0 ? 'OUT' : 'MOVE'}
                  </Button>
                </div>
              </div>

            </div>
          ))}
        </div>
      )}

    </div>
  );
};
