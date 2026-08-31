import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, SlidersHorizontal, ShoppingBag } from 'lucide-react';
import { dbService } from '../services/dbService';
import { Product, Shop } from '../types';
import { APP_CATEGORIES } from '../config/categories';
import { ProductCard } from '../components/product/ProductCard';
import { SkeletonCard } from '../components/layout/Skeleton';

export const Category: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [products, setProducts] = useState<Product[]>([]);
  const [shops, setShops] = useState<Shop[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedShopId, setSelectedShopId] = useState<string>('all');

  // Find Category info
  const categoryInfo = APP_CATEGORIES.find((c: any) => c.id === id);

  useEffect(() => {
    const fetchData = async () => {
      if (!id) return;
      try {
        const [productsData, shopsData] = await Promise.all([
          dbService.getProductsByCategory(id),
          dbService.getShops()
        ]);
        setProducts(productsData);
        
        // Filter shops that have this category
        const relevantShops = shopsData.filter(s => s.categories.includes(id));
        setShops(relevantShops);
      } catch (e) {
        console.error('Error fetching category data:', e);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [id]);

  const filteredProducts = selectedShopId === 'all'
    ? products
    : products.filter(p => p.shopId === selectedShopId);

  return (
    <div className="w-full max-w-full overflow-x-hidden px-3 sm:px-4 pb-24 text-left space-y-4">
      
      {/* Header */}
      <div className="sticky top-0 z-35 bg-slate-50 dark:bg-slate-950 py-3.5 flex items-center gap-3 border-b border-gray-100 dark:border-slate-900 mb-4">
        <button
          onClick={() => navigate('/')}
          className="p-2.5 rounded-xl hover:bg-gray-100 dark:hover:bg-slate-900 text-gray-500 dark:text-gray-400 cursor-pointer"
        >
          <ArrowLeft className="h-5 w-5" />
        </button>
        <div>
          <h2 className="text-lg font-black text-gray-800 dark:text-gray-100 flex items-center gap-2">
            <ShoppingBag className="h-5 w-5 text-blue-500" />
            {categoryInfo?.name || 'Category'}
          </h2>
          <span className="text-xs font-bold text-gray-400">
            {loading ? 'Counting products...' : `${filteredProducts.length} items available`}
          </span>
        </div>
      </div>

      {loading ? (
        <div className="grid grid-cols-2 gap-4 mt-4">
          <SkeletonCard />
          <SkeletonCard />
          <SkeletonCard />
          <SkeletonCard />
        </div>
      ) : (
        <div className="flex flex-col gap-6">
          
          {/* Shop/Merchant Filtering Pill List */}
          {shops.length > 0 && (
            <div>
              <span className="text-[10px] font-black uppercase text-gray-400 block mb-2.5 flex items-center gap-1">
                <SlidersHorizontal className="h-3.5 w-3.5" />
                Filter By Store
              </span>
              <div className="flex gap-2 overflow-x-auto no-scrollbar pb-1">
                <button
                  onClick={() => setSelectedShopId('all')}
                  className={`px-3.5 py-2 rounded-xl text-xs font-bold border whitespace-nowrap transition-all cursor-pointer
                    ${selectedShopId === 'all'
                      ? 'border-blue-500 bg-blue-50 dark:bg-blue-950/20 text-blue-600'
                      : 'border-gray-100 dark:border-slate-800 text-gray-500 dark:text-gray-400 bg-white dark:bg-slate-900'
                    }`}
                >
                  All Stores
                </button>
                {shops.map(shop => (
                  <button
                    key={shop.id}
                    onClick={() => setSelectedShopId(shop.id)}
                    className={`px-3.5 py-2 rounded-xl text-xs font-bold border whitespace-nowrap transition-all cursor-pointer
                      ${selectedShopId === shop.id
                        ? 'border-blue-500 bg-blue-50 dark:bg-blue-950/20 text-blue-600'
                        : 'border-gray-100 dark:border-slate-800 text-gray-500 dark:text-gray-400 bg-white dark:bg-slate-900'
                      }`}
                  >
                    {shop.name}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Product Cards Grid */}
          {filteredProducts.length > 0 ? (
            <div className="grid grid-cols-2 gap-4.5">
              {filteredProducts.map(product => (
                <ProductCard key={product.id} product={product} />
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-20 text-center">
              <span className="text-5xl mb-4">📦</span>
              <h3 className="text-base font-bold text-gray-800 dark:text-gray-150">No products here yet</h3>
              <p className="text-xs font-semibold text-gray-400 mt-2">
                We are currently onboarding partners to supply this category.
              </p>
            </div>
          )}

        </div>
      )}

    </div>
  );
};
