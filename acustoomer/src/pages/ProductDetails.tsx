import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Star, Heart, Share2, Plus, Minus, CalendarClock, ShoppingBag, ShieldCheck } from 'lucide-react';
import { dbService } from '../services/dbService';
import { Product, Review } from '../types';
import { useCart } from '../context/CartContext';
import { Button } from '../components/ui/Button';
import { ProductCard } from '../components/product/ProductCard';
import { ReviewComposer } from '../components/reviews/ReviewComposer';
import { PreorderModal } from '../components/PreorderModal';
import { useAuth } from '../context/AuthContext';
import { CUSTOMER_STORAGE_KEYS, getCustomerStorageItem, setCustomerStorageItem } from '../utils/customerStorage';
import { SafeImage } from '../components/ui/SafeImage';

export const ProductDetails: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { cartItems, addToCart, updateQuantity, preorderSchedule, setPreorderSchedule } = useCart();

  const [product, setProduct] = useState<Product | null>(null);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [related, setRelated] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);

  // UI state
  const [activeImageIdx, setActiveImageIdx] = useState(0);
  const [isZoomed, setIsZoomed] = useState(false);
  const [isWished, setIsWished] = useState(false);
  const [isCopied, setIsCopied] = useState(false);

  const [isPreorderModalOpen, setIsPreorderModalOpen] = useState(false);

  // Cart item matching
  const cartItem = cartItems.find(item => item.product.id === product?.id);
  const quantity = cartItem ? cartItem.quantity : 0;

  useEffect(() => {
    const fetchDetails = async () => {
      if (!id) return;
      try {
        const productData = await dbService.getProducts();
        const foundProduct = productData.find(p => p.id === id);
        
        if (foundProduct) {
          setProduct(foundProduct);
          const [reviewsData, relatedData] = await Promise.all([
            dbService.getReviews(foundProduct.id),
            dbService.getProductsByCategory(foundProduct.category)
          ]);
          setReviews(reviewsData);
          setRelated(relatedData.filter(p => p.id !== foundProduct.id).slice(0, 3));
          
        }
      } catch (e) {
        console.error('Error fetching product details:', e);
      } finally {
        setLoading(false);
      }
    };
    fetchDetails();
    
    // Check wishlist
    const list = JSON.parse(getCustomerStorageItem(CUSTOMER_STORAGE_KEYS.wishlist, user?.uid) || '[]');
    setIsWished(list.includes(id));
  }, [id, user?.uid]);

  if (loading) {
    return (
      <div className="max-w-xl mx-auto px-4 py-6 text-left">
        <div className="w-full aspect-square shimmer rounded-3xl mb-4" />
        <div className="w-1/2 h-6 shimmer rounded mb-2" />
        <div className="w-1/3 h-4 shimmer rounded mb-6" />
        <div className="w-full h-24 shimmer rounded" />
      </div>
    );
  }

  if (!product) {
    return (
      <div className="max-w-xl mx-auto px-4 py-20 text-center">
        <span className="text-5xl">📦</span>
        <h3 className="text-base font-bold text-gray-800 mt-2">Product Not Found</h3>
        <Button variant="primary" className="mt-4 rounded-xl" onClick={() => navigate('/')}>
          Back to Home
        </Button>
      </div>
    );
  }

  const toggleWishlist = () => {
    if (!user?.uid) return;
    const list = JSON.parse(getCustomerStorageItem(CUSTOMER_STORAGE_KEYS.wishlist, user.uid) || '[]');
    let updated = [];
    if (isWished) {
      updated = list.filter((pid: string) => pid !== product.id);
      setIsWished(false);
    } else {
      updated = [...list, product.id];
      setIsWished(true);
    }
    setCustomerStorageItem(CUSTOMER_STORAGE_KEYS.wishlist, user.uid, JSON.stringify(updated));
    window.dispatchEvent(new Event('wishlist_updated'));
  };

  const handleShare = async () => {
    try {
      if (navigator.share) {
        await navigator.share({
          title: product.name,
          text: `Check out ${product.name} on Kart Kirana!`,
          url: window.location.href,
        });
      } else {
        await navigator.clipboard.writeText(window.location.href);
        setIsCopied(true);
        setTimeout(() => setIsCopied(false), 2000);
      }
    } catch (err) {
      console.warn('Share failed:', err);
    }
  };

  const handleAdd = () => {
    if (product.isPreorder) {
      if (!preorderSchedule) {
        setIsPreorderModalOpen(true);
        return;
      }
      addToCart(product, 1, true, preorderSchedule.date, preorderSchedule.slot);
    } else {
      addToCart(product, 1);
    }
  };

  const handleIncrement = () => {
    updateQuantity(product.id, quantity + 1);
  };

  const handleDecrement = () => {
    updateQuantity(product.id, quantity - 1);
  };

  const handleBuyNow = () => {
    if (product.isPreorder && !preorderSchedule) {
      setIsPreorderModalOpen(true);
      return;
    }
    if (quantity === 0) {
      handleAdd();
    }
    navigate('/cart');
  };

  const discountPercent = product.originalPrice > product.price
    ? Math.round(((product.originalPrice - product.price) / product.originalPrice) * 100)
    : 0;

  return (
    <div className="max-w-xl mx-auto pb-28 text-left">
      
      {/* Header bar */}
      <div className="sticky top-0 z-35 bg-white/80 dark:bg-slate-950/80 backdrop-blur-md px-4 py-3.5 border-b border-gray-100 dark:border-slate-900 flex items-center justify-between">
        <button
          onClick={() => navigate(-1)}
          className="p-2.5 rounded-xl hover:bg-gray-50 dark:hover:bg-slate-900 text-gray-500 dark:text-gray-400 cursor-pointer"
        >
          <ArrowLeft className="h-5 w-5" />
        </button>

        <div className="flex items-center gap-2">
          <button
            onClick={handleShare}
            className="p-2.5 rounded-xl hover:bg-gray-50 dark:hover:bg-slate-900 text-gray-500 dark:text-gray-400 cursor-pointer relative"
          >
            <Share2 className="h-5 w-5" />
            {isCopied && (
              <span className="absolute -bottom-7 right-0 px-2 py-0.5 rounded bg-gray-900 text-[9px] font-bold text-white uppercase whitespace-nowrap">
                Copied Link!
              </span>
            )}
          </button>
          
          <button
            onClick={toggleWishlist}
            className="p-2.5 rounded-xl hover:bg-gray-50 dark:hover:bg-slate-900 text-gray-500 hover:text-red-500 dark:text-gray-400 cursor-pointer"
          >
            <Heart className={`h-5 w-5 ${isWished ? 'fill-red-500 text-red-500' : ''}`} />
          </button>
        </div>
      </div>

      {/* Main Image Slider with zoom click */}
      <div className="px-4 mt-4">
        <div 
          onClick={() => setIsZoomed(!isZoomed)}
          className="relative aspect-square w-full rounded-3xl overflow-hidden border border-gray-50 dark:border-slate-850 bg-gray-50 dark:bg-slate-900 flex items-center justify-center p-6 cursor-zoom-in"
        >
          <SafeImage
            src={(product.images || [])[activeImageIdx] || product.image}
            alt={product.name}
            className={`h-full w-full object-contain p-2 mix-blend-multiply dark:mix-blend-normal transition-all duration-300
              ${isZoomed ? 'scale-135' : 'scale-100'}`}
            fallback="📦"
          />
          {discountPercent > 0 && (
            <span className="absolute top-4 left-4 px-3 py-1 rounded-xl bg-blue-500 text-white text-xs font-black shadow-md shadow-blue-500/20">
              {discountPercent}% OFF
            </span>
          )}
        </div>

        {/* Thumbnail Selector list */}
        {(product.images || []).filter(image => image?.trim()).length > 1 && (
          <div className="flex gap-3 justify-center mt-4">
            {(product.images || []).filter(image => image?.trim()).map((img, index) => (
              <button
                key={index}
                onClick={() => {
                  setActiveImageIdx(index);
                  setIsZoomed(false);
                }}
                className={`h-14 w-14 rounded-2xl overflow-hidden border-2 transition-all p-1 bg-white
                  ${index === activeImageIdx ? 'border-blue-500' : 'border-gray-100 dark:border-slate-800'}`}
              >
                <SafeImage src={img} alt="" className="h-full w-full object-contain" fallback="📦" />
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Core Details Content */}
      <div className="px-4 mt-6">
        <div>
          <span 
            onClick={() => navigate(`/shop/${product.shopId}`)}
            className="text-xs font-black uppercase text-blue-600 dark:text-blue-400 hover:underline cursor-pointer"
          >
            {product.shopName}
          </span>
          <h1 className="text-xl font-black text-gray-800 dark:text-gray-100 mt-1 leading-snug">
            {product.name}
          </h1>
          
          <div className="flex items-center gap-4 mt-2">
            <div className="flex items-center gap-1 text-xs font-bold text-amber-500 bg-amber-50 dark:bg-amber-950/20 px-2 py-0.5 rounded">
              <Star className="h-3.5 w-3.5 fill-current" />
              <span>{product.rating}</span>
            </div>
            <span className="text-xs font-bold text-gray-400">
              {product.isPreorder ? 'Scheduled Delivery' : `Delivered in ${product.estimatedDelivery}`}
            </span>
            <span className={`text-xs font-black ${product.stock > 0 ? 'text-blue-600' : 'text-red-500'}`}>
              {product.stock > 0 ? 'In Stock' : 'Out of Stock'}
            </span>
          </div>
        </div>

        {/* Pricing Segment */}
        <div className="mt-5 p-4 rounded-3xl bg-gray-50 dark:bg-slate-900 border border-gray-100 dark:border-slate-850 flex items-center justify-between">
          <div>
            <span className="text-[10px] font-black uppercase text-gray-400 block">Offer Price</span>
            <div className="flex items-baseline gap-2 mt-0.5">
              <span className="text-2xl font-black text-gray-800 dark:text-gray-100">₹{product.price}</span>
              {product.originalPrice > product.price && (
                <span className="text-sm font-bold text-gray-400 line-through">₹{product.originalPrice}</span>
              )}
            </div>
          </div>

          {/* Cart Quantity Adder */}
          <div className="w-24">
            {quantity > 0 && !product.isPreorder ? (
              <div className="flex items-center justify-between border border-blue-500 bg-blue-50 dark:bg-blue-950/30 rounded-2xl px-2 py-1.5 shadow-sm">
                <button
                  onClick={handleDecrement}
                  className="p-1 text-blue-600 dark:text-blue-400 hover:bg-blue-100 dark:hover:bg-blue-900 rounded cursor-pointer"
                >
                  <Minus className="h-4 w-4" />
                </button>
                <span className="text-sm font-black text-blue-700 dark:text-blue-300">
                  {quantity}
                </span>
                <button
                  onClick={handleIncrement}
                  className="p-1 text-blue-600 dark:text-blue-400 hover:bg-blue-100 dark:hover:bg-blue-900 rounded cursor-pointer"
                >
                  <Plus className="h-4 w-4" />
                </button>
              </div>
            ) : (
              <Button
                onClick={handleAdd}
                fullWidth
                className="rounded-2xl py-2 text-xs font-black"
                disabled={product.stock <= 0}
              >
                {product.isPreorder ? 'BOOK NOW' : 'ADD'}
              </Button>
            )}
          </div>
        </div>

        {/* Preorder Configuration Panel */}
        {product.isPreorder && (
          <div className="mt-6 flex flex-col gap-3 rounded-3xl border border-blue-100 bg-blue-50/70 p-5 dark:border-blue-900/40 dark:bg-blue-950/20">
            <div className="flex items-center gap-2 text-[#0758C7] dark:text-blue-300">
              <CalendarClock className="h-5 w-5" />
              <span className="text-xs font-black uppercase tracking-wider">Scheduled delivery</span>
            </div>
            <p className="text-xs font-semibold leading-relaxed text-slate-600 dark:text-slate-300">
              {preorderSchedule
                ? `${preorderSchedule.date} · ${preorderSchedule.slot}${preorderSchedule.time ? ` · preferred ${preorderSchedule.time}` : ''}`
                : 'Choose a convenient two-hour window before adding this item.'}
            </p>
            <Button variant="secondary" onClick={() => setIsPreorderModalOpen(true)} className="self-start text-xs">
              {preorderSchedule ? 'Change delivery slot' : 'Choose delivery slot'}
            </Button>
          </div>
        )}

        {/* Description Accordion */}
        <div className="mt-7">
          <span className="text-[10px] font-black uppercase text-gray-400 tracking-wider block mb-2">Description</span>
          <p className="text-xs font-medium text-gray-500 dark:text-gray-400 leading-relaxed">
            {product.description}
          </p>
        </div>

        {/* Specifications List */}
        {product.specifications && Object.keys(product.specifications).length > 0 && (
          <div className="mt-7">
            <span className="text-[10px] font-black uppercase text-gray-400 tracking-wider block mb-3">Specifications</span>
            <div className="border border-gray-100 dark:border-slate-850 rounded-2xl overflow-hidden divide-y divide-gray-100 dark:divide-slate-850 text-xs font-semibold">
              {Object.entries(product.specifications).map(([key, value]) => (
                <div key={key} className="flex p-3 bg-white dark:bg-slate-900">
                  <span className="w-1/3 text-gray-400">{key}</span>
                  <span className="flex-1 text-gray-800 dark:text-gray-250">{value}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Brand Support Guarantees */}
        <div className="mt-6 p-4 rounded-2xl bg-blue-500/5 border border-blue-500/10 flex items-start gap-2.5 text-xs text-blue-600 dark:text-blue-500 font-bold">
          <ShieldCheck className="h-5 w-5 text-blue-500 flex-shrink-0" />
          <div>
            <span className="block font-black mb-0.5">Contactless Superfast Guarantee</span>
            <span>Assured hygiene packaging, direct sourcing, and prompt support returns within 2 hours.</span>
          </div>
        </div>

        {/* Reviews Section */}
        <div className="mt-7">
          <span className="text-[10px] font-black uppercase text-gray-400 tracking-wider block mb-3">
            Customer Reviews ({reviews.length})
          </span>
          <ReviewComposer
            targetId={product.id}
            targetName={product.name}
            shopId={product.shopId}
            onSubmitted={(review) => setReviews(current => [review, ...current])}
          />
          {reviews.length > 0 ? (
            <div className="flex flex-col gap-3">
              {reviews.map(rev => (
                <div key={rev.id} className="p-3.5 rounded-2xl bg-white dark:bg-slate-900 border border-gray-50 dark:border-slate-850 flex flex-col gap-1.5">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-black text-gray-800 dark:text-gray-200">{rev.userName}</span>
                    <div className="flex items-center gap-0.5 text-amber-500 font-bold bg-amber-50 dark:bg-amber-950/20 px-1.5 py-0.2 rounded">
                      <Star className="h-3.5 w-3.5 fill-current" />
                      <span>{rev.rating}</span>
                    </div>
                  </div>
                  <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 leading-snug">{rev.comment}</p>
                </div>
              ))}
            </div>
          ) : (
            <span className="text-xs font-semibold text-gray-400 italic">No reviews for this product yet.</span>
          )}
        </div>

        {/* Similar / Related Products */}
        {related.length > 0 && (
          <div className="mt-8">
            <span className="text-xs font-black uppercase text-gray-400 tracking-wider block mb-4 flex items-center gap-1.5">
              <ShoppingBag className="h-4 w-4 text-blue-500" />
              Similar Products you may like
            </span>
            <div className="grid grid-cols-2 gap-4">
              {related.map(p => (
                <ProductCard key={p.id} product={p} />
              ))}
            </div>
          </div>
        )}

      </div>

      {/* Floating Bottom Action Drawer */}
      <div className="fixed bottom-0 left-0 right-0 z-30 bg-white/95 dark:bg-slate-950/95 backdrop-blur-md border-t border-gray-100 dark:border-slate-900 p-4 shadow-2xl">
        <div className="max-w-xl mx-auto flex gap-3">
          <Button
            variant="outline"
            onClick={handleBuyNow}
            disabled={product.stock <= 0}
            className="flex-1 rounded-2xl py-3 text-xs font-black border-2"
          >
            {product.stock <= 0 ? 'OUT OF STOCK' : 'BUY NOW'}
          </Button>
          
          {quantity > 0 && !product.isPreorder ? (
            <div className="flex-1 flex items-center justify-between border-2 border-blue-500 bg-blue-50 dark:bg-blue-950/30 rounded-2xl px-4 py-2">
              <button onClick={handleDecrement} className="p-1 text-blue-600 dark:text-blue-400"><Minus className="h-4 w-4" /></button>
              <span className="text-sm font-black text-blue-700 dark:text-blue-300">{quantity}</span>
              <button onClick={handleIncrement} className="p-1 text-blue-600 dark:text-blue-400"><Plus className="h-4 w-4" /></button>
            </div>
          ) : (
            <Button
              onClick={handleAdd}
              className="flex-1 rounded-2xl py-3 text-xs font-black"
              disabled={product.stock <= 0}
            >
              {product.stock <= 0 ? 'OUT OF STOCK' : (product.isPreorder ? 'BOOK PREORDER' : 'ADD TO CART')}
            </Button>
          )}
        </div>
      </div>

      <PreorderModal
        isOpen={isPreorderModalOpen}
        onClose={() => setIsPreorderModalOpen(false)}
        onConfirm={(schedule) => {
          setPreorderSchedule(schedule);
          if (!cartItems.some(item => item.product.id === product.id)) {
            addToCart(product, 1, true, schedule.date, schedule.slot);
          }
        }}
        initialDate={preorderSchedule?.date}
        initialSlot={preorderSchedule?.slot}
        initialTime={preorderSchedule?.time}
        maxDaysAhead={product.preorderDaysAhead || 7}
      />
    </div>
  );
};
