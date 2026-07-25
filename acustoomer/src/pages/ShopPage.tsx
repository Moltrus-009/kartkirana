import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Star, MapPin, Clock, Search, MessageSquare, ShieldCheck, Heart } from 'lucide-react';
import { dbService } from '../services/dbService';
import { Shop, Product, Review } from '../types';
import { ProductCard } from '../components/product/ProductCard';
import { Button } from '../components/ui/Button';
import { SkeletonCard } from '../components/layout/Skeleton';
import { ReviewComposer } from '../components/reviews/ReviewComposer';
import { useAppStore } from '../core/store/useAppStore';

export const ShopPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [shop, setShop] = useState<Shop | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [reviews, setReviews] = useState<Review[]>([]);
  
  const [loading, setLoading] = useState(true);
  const [shopQuery, setShopQuery] = useState('');
  const [selectedCat, setSelectedCat] = useState<string>('all');
  const [activeTab, setActiveTab] = useState<'products' | 'reviews' | 'about'>('products');
  const catalogueProducts = useAppStore((state) => state.products);

  useEffect(() => {
    const fetchShopDetails = async () => {
      if (!id) return;
      try {
        const [shopData, productsData, reviewsData] = await Promise.all([
          dbService.getShopById(id),
          dbService.getProductsByShop(id),
          dbService.getReviews(id)
        ]);
        setShop(shopData);
        setProducts(productsData);
        setReviews(reviewsData);
      } catch (e) {
        console.error('Error fetching shop data:', e);
      } finally {
        setLoading(false);
      }
    };
    fetchShopDetails();
  }, [id]);

  // The catalogue has a Firestore listener. Keep an open shop page in sync
  // when its merchant adds, edits, disables, or removes an item.
  useEffect(() => {
    if (id && catalogueProducts) {
      setProducts(catalogueProducts.filter((product) => product.shopId === id));
    }
  }, [catalogueProducts, id]);

  if (loading) {
    return (
      <div className="max-w-xl mx-auto px-4 py-6 text-left">
        <div className="w-full h-44 shimmer rounded-3xl mb-4" />
        <div className="w-2/3 h-6 shimmer rounded mb-2" />
        <div className="w-1/3 h-4 shimmer rounded mb-6" />
        <div className="grid grid-cols-2 gap-4">
          <SkeletonCard />
          <SkeletonCard />
        </div>
      </div>
    );
  }

  if (!shop) {
    return (
      <div className="max-w-xl mx-auto px-4 py-20 text-center">
        <span className="text-5xl">🏪</span>
        <h3 className="text-base font-bold text-gray-800 mt-2">Store Not Found</h3>
        <Button variant="primary" className="mt-4 rounded-xl" onClick={() => navigate('/')}>
          Go Back Home
        </Button>
      </div>
    );
  }

  // Filter in-store products
  let displayProducts = products;
  if (selectedCat !== 'all') {
    displayProducts = displayProducts.filter(p => p.category === selectedCat);
  }
  if (shopQuery.trim()) {
    const q = shopQuery.toLowerCase().trim();
    displayProducts = displayProducts.filter(p => 
      p.name.toLowerCase().includes(q) || 
      p.description.toLowerCase().includes(q)
    );
  }

  return (
    <div className="max-w-xl mx-auto pb-24 text-left">
      
      {/* Cover Banner header */}
      <div className="relative w-full aspect-video md:aspect-[21/9] overflow-hidden md:rounded-b-3xl">
        <img src={shop.coverImage} alt={shop.name} className="w-full h-full object-cover" />
        <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-900/40 to-black/30" />
        
        {/* Floating header tools */}
        <div className="absolute top-4 left-4 right-4 flex items-center justify-between z-10">
          <button
            onClick={() => navigate('/')}
            className="p-2.5 rounded-xl bg-black/40 text-white backdrop-blur-md hover:bg-black/60 cursor-pointer"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
        </div>

        {/* Floating status */}
        {!shop.isOpen && (
          <span className="absolute top-4 right-4 px-3.5 py-1.5 rounded-full bg-red-600 text-white text-xs font-bold uppercase tracking-wider shadow">
            Closed
          </span>
        )}

        {/* Shop logo & details overlay */}
        <div className="absolute bottom-5 left-5 right-5 flex items-end gap-4 z-10 text-white">
          <div className="h-16 w-16 rounded-2xl border border-white/20 overflow-hidden shadow-lg bg-white shrink-0">
            <img src={shop.logo} alt={shop.name} className="h-full w-full object-cover" />
          </div>
          <div className="flex-1">
            <span className="text-[9px] font-black uppercase text-blue-400 tracking-widest block mb-0.5">
              Verified Merchant
            </span>
            <h2 className="text-xl font-black leading-tight text-white drop-shadow-md">
              {shop.name}
            </h2>
            <p className="text-[10px] font-semibold text-gray-300 flex items-center gap-1 mt-0.5">
              <MapPin className="h-3 w-3 text-blue-400" />
              {shop.address.split(',')[1] || shop.address}
            </p>
          </div>
        </div>
      </div>

      {/* Info Card */}
      <div className="px-4 mt-4">
        <div className="p-4 rounded-3xl bg-white dark:bg-slate-900 border border-gray-100 dark:border-slate-800 flex items-center justify-between text-xs font-bold text-gray-700 dark:text-gray-300 shadow-sm">
          
          <div className="flex flex-col items-center gap-1 flex-1 border-r border-gray-100 dark:border-slate-800">
            <div className="flex items-center gap-1 text-amber-500 bg-amber-50 dark:bg-amber-950/20 px-2 py-0.5 rounded-md text-xs font-black">
              <Star className="h-3.5 w-3.5 fill-current" />
              <span>{shop.rating}</span>
            </div>
            <span className="text-[10px] font-semibold text-gray-400">{shop.reviewsCount}+ ratings</span>
          </div>

          <div className="flex flex-col items-center gap-1 flex-1 border-r border-gray-100 dark:border-slate-800">
            <span className="text-xs font-black text-gray-800 dark:text-gray-200">{shop.deliveryTime}</span>
            <span className="text-[10px] font-semibold text-gray-400 flex items-center gap-0.5"><Clock className="h-3 w-3" /> delivery speed</span>
          </div>

          <div className="flex flex-col items-center gap-1 flex-1">
            <span className="text-xs font-black text-gray-800 dark:text-gray-200">{shop.distance}</span>
            <span className="text-[10px] font-semibold text-gray-400">distance away</span>
          </div>

        </div>
      </div>

      {/* Special Offers list */}
      {shop.offers && shop.offers.length > 0 && (
        <div className="px-4 mt-4.5">
          <div className="flex gap-3 overflow-x-auto no-scrollbar pb-1">
            {shop.offers.map((offer, index) => (
              <div
                key={index}
                className="px-3.5 py-2 border border-orange-200/50 dark:border-orange-950/50 bg-orange-50/50 dark:bg-orange-950/10 rounded-2xl text-[10px] font-black text-orange-600 dark:text-orange-400 uppercase tracking-wider flex items-center gap-1 whitespace-nowrap shadow-sm"
              >
                <span className="text-xs">⚡</span>
                {offer}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Tabs selector */}
      <div className="px-4 mt-6">
        <div className="flex border-b border-gray-100 dark:border-slate-800 text-sm font-bold text-gray-400">
          <button
            onClick={() => setActiveTab('products')}
            className={`pb-2.5 px-4 cursor-pointer border-b-2 transition-colors
              ${activeTab === 'products' ? 'border-blue-500 text-blue-600' : 'border-transparent'}`}
          >
            Products
          </button>
          <button
            onClick={() => setActiveTab('reviews')}
            className={`pb-2.5 px-4 cursor-pointer border-b-2 transition-colors
              ${activeTab === 'reviews' ? 'border-blue-500 text-blue-600' : 'border-transparent'}`}
          >
            Reviews ({reviews.length})
          </button>
          <button
            onClick={() => setActiveTab('about')}
            className={`pb-2.5 px-4 cursor-pointer border-b-2 transition-colors
              ${activeTab === 'about' ? 'border-blue-500 text-blue-600' : 'border-transparent'}`}
          >
            Store Info
          </button>
        </div>
      </div>

      {/* Tab: Products */}
      {activeTab === 'products' && (
        <div className="px-4 mt-5 flex flex-col gap-5">
          {/* Shop Search input */}
          <div className="relative flex items-center">
            <Search className="absolute left-3.5 h-4 w-4 text-gray-400" />
            <input
              type="text"
              value={shopQuery}
              onChange={(e) => setShopQuery(e.target.value)}
              placeholder={`Search items in ${shop.name.split(' ')[0]}...`}
              className="w-full pl-10 pr-4 py-3 rounded-2xl bg-gray-50 dark:bg-slate-900 border border-gray-100 dark:border-slate-800 text-sm font-semibold text-gray-800 dark:text-gray-100 placeholder-gray-400 outline-none focus:bg-white focus:border-blue-500 transition-all"
            />
          </div>

          {/* Shop categories filtering */}
          <div className="flex gap-2 overflow-x-auto no-scrollbar pb-1">
            <button
              onClick={() => setSelectedCat('all')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold border whitespace-nowrap transition-all cursor-pointer
                ${selectedCat === 'all'
                  ? 'border-blue-500 bg-blue-50 dark:bg-emerald-950/20 text-blue-600'
                  : 'border-gray-100 dark:border-slate-850 text-gray-500'
                }`}
            >
              All Items
            </button>
            {shop.categories.map(cat => (
              <button
                key={cat}
                onClick={() => setSelectedCat(cat)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold border capitalize whitespace-nowrap transition-all cursor-pointer
                  ${selectedCat === cat
                    ? 'border-blue-500 bg-blue-50 dark:bg-emerald-950/20 text-blue-600'
                    : 'border-gray-100 dark:border-slate-850 text-gray-500'
                  }`}
              >
                {cat.replace('-', ' ')}
              </button>
            ))}
          </div>

          {/* Product Cards */}
          {displayProducts.length > 0 ? (
            <div className="grid grid-cols-2 gap-3.5">
              {displayProducts.map(product => (
                <ProductCard key={product.id} product={product} />
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-12 text-center text-gray-400">
              <span className="text-4xl mb-2">🔍</span>
              <span className="text-xs font-bold">No products match your description inside this store.</span>
            </div>
          )}
        </div>
      )}

      {/* Tab: Reviews */}
      {activeTab === 'reviews' && (
        <div className="px-4 mt-5 flex flex-col gap-4">
          <ReviewComposer
            targetId={shop.id}
            targetName={shop.name}
            shopId={shop.id}
            onSubmitted={(review) => setReviews(current => [review, ...current])}
          />
          
          {reviews.length > 0 ? (
            reviews.map(rev => (
              <div
                key={rev.id}
                className="p-4 rounded-3xl bg-white dark:bg-slate-900 border border-gray-100 dark:border-slate-800 flex flex-col gap-2.5 text-left"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="h-8 w-8 rounded-full bg-blue-500/10 text-blue-600 dark:text-blue-400 flex items-center justify-center font-bold text-xs">
                      {rev.userName.slice(0, 1)}
                    </div>
                    <span className="text-xs font-bold text-gray-800 dark:text-gray-200">{rev.userName}</span>
                  </div>
                  
                  {/* Rating star count */}
                  <div className="flex items-center gap-0.5 text-amber-500 font-bold text-xs bg-amber-50 dark:bg-amber-950/20 px-2 py-0.5 rounded">
                    <Star className="h-3 w-3 fill-current" />
                    {rev.rating}
                  </div>
                </div>

                <p className="text-xs font-medium text-gray-500 dark:text-gray-400 leading-relaxed">
                  {rev.comment}
                </p>
                <span className="text-[9px] font-bold text-gray-400 block">
                  {new Date(rev.createdAt).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })}
                </span>
              </div>
            ))
          ) : (
            <div className="flex flex-col items-center justify-center py-12 text-center text-gray-400">
              <MessageSquare className="h-10 w-10 text-gray-300 mb-2" />
              <span className="text-xs font-bold">No reviews for this shop yet. Be the first to order and review!</span>
            </div>
          )}

        </div>
      )}

      {/* Tab: About Store */}
      {activeTab === 'about' && (
        <div className="px-4 mt-5 flex flex-col gap-4">
          <div className="p-5 rounded-3xl bg-white dark:bg-slate-900 border border-gray-100 dark:border-slate-800 flex flex-col gap-4 text-left">
            <div>
              <span className="text-[10px] font-black uppercase text-gray-400 block mb-1">Store Address</span>
              <p className="text-xs font-bold text-gray-800 dark:text-gray-200 leading-relaxed flex items-start gap-1">
                <MapPin className="h-4 w-4 text-blue-500 flex-shrink-0 mt-0.5" />
                {shop.address}
              </p>
            </div>

            <div>
              <span className="text-[10px] font-black uppercase text-gray-400 block mb-1">Standard Delivery Hours</span>
              <p className="text-xs font-bold text-gray-800 dark:text-gray-200">
                07:00 AM - 11:00 PM
              </p>
            </div>

            <div className="p-3.5 rounded-2xl bg-blue-500/5 border border-blue-500/10 flex items-start gap-2.5 text-xs text-blue-600 dark:text-blue-500 font-bold">
              <ShieldCheck className="h-5 w-5 text-blue-500 flex-shrink-0" />
              <div>
                <span className="block font-black mb-0.5">Contact Contactless Support Available</span>
                <span>We guarantee 100% hygiene packing, verified rider health logs, and environment-friendly delivery packages.</span>
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
