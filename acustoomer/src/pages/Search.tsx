import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search as SearchIcon, ArrowLeft, X, Filter, SlidersHorizontal, ArrowUpDown } from 'lucide-react';
import { Product, Shop } from '../types';
import { ProductCard } from '../components/product/ProductCard';
import { ShopCard } from '../components/shop/ShopCard';
import { Button } from '../components/ui/Button';
import { useShops, useProducts } from '../hooks/useData';

export const Search: React.FC = () => {
  const navigate = useNavigate();

  const [query, setQuery] = useState('');
  const { shops: allShops } = useShops();
  const { products: allProducts } = useProducts();

  // Results
  const [filteredProducts, setFilteredProducts] = useState<Product[]>([]);
  const [filteredShops, setFilteredShops] = useState<Shop[]>([]);

  // Filters & Sorting states
  const [showFilters, setShowFilters] = useState(false);
  const [sortBy, setSortBy] = useState<'relevance' | 'priceLow' | 'priceHigh' | 'rating'>('relevance');
  const [filterPreorder, setFilterPreorder] = useState(false);
  const [storeFilters, setStoreFilters] = useState({ openNow: false, offers: false, rating: false, distance: false, fastest: false });
  const [storeCategory, setStoreCategory] = useState('');
  const [recentSearches, setRecentSearches] = useState<string[]>([]);

  // Recent/Popular searches
  const POPULAR_SEARCHES = ['Milk', 'Earbuds', 'Tomato', 'Alphonso', 'Moisturizer', 'Book'];

  useEffect(() => {
    // Load recent search terms on mount
    const saved = JSON.parse(localStorage.getItem('recent_searches') || '[]');
    setRecentSearches(saved);
  }, []);

  // Filter and sort logic
  useEffect(() => {
    if (!query.trim()) {
      setFilteredProducts([]);
      setFilteredShops([]);
      return;
    }

    const cleanQuery = query.toLowerCase().trim();

    // Match shops
    let matchedShops = allShops.filter(s =>
      s.name.toLowerCase().includes(cleanQuery) ||
      s.categories.some(c => c.toLowerCase().includes(cleanQuery))
    );

    if (storeFilters.openNow) matchedShops = matchedShops.filter(shop => shop.isOpen);
    if (storeFilters.offers) matchedShops = matchedShops.filter(shop => shop.offers.length > 0);
    if (storeFilters.rating) matchedShops = matchedShops.filter(shop => shop.rating >= 4);
    if (storeCategory) matchedShops = matchedShops.filter(shop => shop.categories.some(category => category.toLowerCase() === storeCategory.toLowerCase()));
    if (storeFilters.distance) matchedShops.sort((a, b) => parseFloat(a.distance) - parseFloat(b.distance));
    if (storeFilters.fastest) matchedShops.sort((a, b) => parseInt(a.deliveryTime, 10) - parseInt(b.deliveryTime, 10));

    // Match products
    let matchedProducts = allProducts.filter(p =>
      p.name.toLowerCase().includes(cleanQuery) ||
      p.description.toLowerCase().includes(cleanQuery) ||
      p.category.toLowerCase().includes(cleanQuery)
    );

    // Apply Filters
    if (filterPreorder) {
      matchedProducts = matchedProducts.filter(p => p.isPreorder);
    }

    // Apply Sorting
    if (sortBy === 'priceLow') {
      matchedProducts.sort((a, b) => a.price - b.price);
    } else if (sortBy === 'priceHigh') {
      matchedProducts.sort((a, b) => b.price - a.price);
    } else if (sortBy === 'rating') {
      matchedProducts.sort((a, b) => b.rating - a.rating);
      matchedShops.sort((a, b) => b.rating - a.rating);
    }

    setFilteredProducts(matchedProducts);
    setFilteredShops(matchedShops);
  }, [query, sortBy, filterPreorder, storeFilters, storeCategory, allProducts, allShops]);

  const availableStoreCategories = Array.from(new Set(allShops.flatMap(shop => shop.categories))).sort();
  const toggleStoreFilter = (filter: keyof typeof storeFilters) => setStoreFilters(current => ({ ...current, [filter]: !current[filter] }));

  const handleSearchSubmit = (searchTerm: string) => {
    if (!searchTerm.trim()) return;
    setQuery(searchTerm);

    // Save recent
    const list = JSON.parse(localStorage.getItem('recent_searches') || '[]');
    const filtered = [searchTerm, ...list.filter((s: string) => s !== searchTerm)].slice(0, 5);
    setRecentSearches(filtered);
    localStorage.setItem('recent_searches', JSON.stringify(filtered));
  };

  const clearRecent = () => {
    localStorage.setItem('recent_searches', '[]');
    setRecentSearches([]);
  };

  const hasResults = filteredProducts.length > 0 || filteredShops.length > 0;

  return (
    <div className="max-w-xl mx-auto px-4 pb-24 text-left">

      {/* Search Header Input Override */}
      <div className="sticky top-0 z-35 bg-slate-50 dark:bg-slate-950 py-3.5 flex items-center gap-3">
        <button
          onClick={() => navigate('/')}
          className="p-2.5 rounded-xl hover:bg-gray-100 dark:hover:bg-slate-900 text-gray-500 dark:text-gray-400 cursor-pointer"
        >
          <ArrowLeft className="h-5 w-5" />
        </button>

        <div className="relative flex-1 flex items-center">
          <SearchIcon className="absolute left-3.5 h-4 w-4 text-gray-400" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSearchSubmit(query)}
            placeholder="Search shops or products..."
            className="w-full pl-10 pr-10 py-3 rounded-2xl bg-white dark:bg-slate-900 border border-gray-100 dark:border-slate-800 text-sm font-semibold text-gray-850 dark:text-gray-100 outline-none focus:border-blue-500 transition-all"
            autoFocus
          />
          {query && (
            <button
              onClick={() => setQuery('')}
              className="absolute right-3.5 p-1 rounded-full bg-gray-100 dark:bg-slate-800 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 cursor-pointer"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>

        {/* Filter Toggle Button */}
        {query.trim() && (
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={`p-3.5 rounded-2xl border transition-colors cursor-pointer
              ${showFilters
                ? 'border-blue-500 bg-blue-50 dark:bg-emerald-950/30 text-blue-600'
                : 'border-gray-100 dark:border-slate-800 bg-white dark:bg-slate-900 text-gray-400'
              }`}
          >
            <Filter className="h-4.5 w-4.5" />
          </button>
        )}
      </div>

      {/* Expandable filters box */}
      {showFilters && query.trim() && (
        <div className="p-4 mb-4 rounded-3xl bg-white dark:bg-slate-900 border border-gray-100 dark:border-slate-800 flex flex-col gap-4 animate-fadeIn">
          {/* Sorting Option */}
          <div>
            <span className="text-[10px] font-black uppercase text-gray-400 block mb-2 flex items-center gap-1">
              <ArrowUpDown className="h-3.5 w-3.5" />
              Sort Products By
            </span>
            <div className="flex flex-wrap gap-2">
              {[
                { id: 'relevance', name: 'Best Match' },
                { id: 'priceLow', name: 'Price: Low to High' },
                { id: 'priceHigh', name: 'Price: High to Low' },
                { id: 'rating', name: 'Rating' }
              ].map(opt => (
                <button
                  key={opt.id}
                  onClick={() => setSortBy(opt.id as any)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all cursor-pointer
                    ${sortBy === opt.id
                      ? 'border-blue-500 bg-blue-50 dark:bg-emerald-950/20 text-blue-600'
                      : 'border-gray-100 dark:border-slate-800 text-gray-500 dark:text-gray-400'
                    }`}
                >
                  {opt.name}
                </button>
              ))}
            </div>
          </div>

          {/* Filter Option */}
          <div>
            <span className="text-[10px] font-black uppercase text-gray-400 block mb-2 flex items-center gap-1">
              <SlidersHorizontal className="h-3.5 w-3.5" />
              Filter By Availability
            </span>
            <button
              onClick={() => setFilterPreorder(!filterPreorder)}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all cursor-pointer
                ${filterPreorder
                  ? 'border-orange-500 bg-orange-50 dark:bg-orange-950/20 text-orange-600'
                  : 'border-gray-100 dark:border-slate-800 text-gray-500'
                }`}
            >
              Preorder Only
            </button>
          </div>

          <div>
            <span className="text-[10px] font-black uppercase text-gray-400 block mb-2">Store discovery</span>
            <div className="flex flex-wrap gap-2">
              {([
                ['openNow', 'Open now'], ['offers', 'Offers'], ['rating', '4.0+ rating'], ['distance', 'Nearest'], ['fastest', 'Fastest']
              ] as Array<[keyof typeof storeFilters, string]>).map(([id, label]) => <button key={id} onClick={() => toggleStoreFilter(id)} className={`px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all cursor-pointer ${storeFilters[id] ? 'border-blue-500 bg-blue-50 text-blue-600' : 'border-gray-100 dark:border-slate-800 text-gray-500 dark:text-gray-400'}`}>{label}</button>)}
            </div>
            {availableStoreCategories.length > 0 && <select aria-label="Store category" value={storeCategory} onChange={(event) => setStoreCategory(event.target.value)} className="mt-3 w-full rounded-xl border border-gray-100 dark:border-slate-800 bg-white dark:bg-slate-900 px-3 py-2 text-xs font-semibold text-gray-600 dark:text-gray-300 outline-none">
              <option value="">All store categories</option>
              {availableStoreCategories.map(category => <option key={category} value={category}>{category}</option>)}
            </select>}
          </div>
        </div>
      )}

      {/* Suggested Searches & Recent Searches */}
      {!query.trim() && (
        <div className="flex flex-col gap-6 mt-4">

          {/* Recent Searches */}
          {recentSearches.length > 0 && (
            <div>
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-black uppercase text-gray-400 tracking-wider">
                  Recent Searches
                </span>
                <button
                  onClick={clearRecent}
                  className="text-[10px] font-black text-red-500 uppercase tracking-wide cursor-pointer hover:underline"
                >
                  Clear
                </button>
              </div>
              <div className="flex flex-wrap gap-2.5">
                {recentSearches.map((term, i) => (
                  <button
                    key={i}
                    onClick={() => handleSearchSubmit(term)}
                    className="px-3.5 py-2 rounded-xl bg-gray-50 dark:bg-slate-900 border border-gray-100 dark:border-slate-800 text-xs font-bold text-gray-700 dark:text-gray-300 hover:border-blue-500 hover:text-blue-600 transition-all cursor-pointer"
                  >
                    {term}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Popular Searches */}
          <div>
            <span className="text-xs font-black uppercase text-gray-400 tracking-wider block mb-3">
              Popular Searches
            </span>
            <div className="flex flex-wrap gap-2.5">
              {POPULAR_SEARCHES.map((term, i) => (
                <button
                  key={i}
                  onClick={() => handleSearchSubmit(term)}
                  className="px-3.5 py-2 rounded-xl bg-blue-50/50 dark:bg-emerald-950/10 border border-blue-100/50 dark:border-emerald-950 text-xs font-bold text-blue-600 dark:text-blue-400 hover:bg-blue-500 hover:text-white transition-all cursor-pointer"
                >
                  {term}
                </button>
              ))}
            </div>
          </div>

        </div>
      )}

      {/* Display Results */}
      {query.trim() && (
        <div className="flex flex-col gap-6 mt-4">

          {/* Matching Shops */}
          {filteredShops.length > 0 && (
            <div>
              <span className="text-xs font-black uppercase text-gray-400 tracking-wider block mb-3">
                Matching Stores ({filteredShops.length})
              </span>
              <div className="flex md:grid md:grid-cols-2 lg:grid-cols-3 gap-4 overflow-x-auto md:overflow-x-visible no-scrollbar snap-x pb-2 md:pb-0">
                {filteredShops.map(shop => (
                  <div key={shop.id} className="min-w-[240px] max-w-[240px] md:min-w-0 md:max-w-none snap-center">
                    <ShopCard shop={shop} />
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Matching Products */}
          {filteredProducts.length > 0 && (
            <div>
              <span className="text-xs font-black uppercase text-gray-400 tracking-wider block mb-3">
                Matching Products ({filteredProducts.length})
              </span>
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3.5">
                {filteredProducts.map(product => (
                  <ProductCard key={product.id} product={product} />
                ))}
              </div>
            </div>
          )}

          {/* Empty Results Screen */}
          {!hasResults && (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <span className="text-5xl mb-4">🔍</span>
              <h3 className="text-base font-bold text-gray-800 dark:text-gray-150">
                No Results for "{query}"
              </h3>
              <p className="text-xs font-semibold text-gray-400 mt-2 max-w-[250px] leading-relaxed">
                Check spelling, try simpler terms, or try navigating categories.
              </p>
              <Button
                variant="outline"
                className="mt-6 rounded-xl"
                onClick={() => setQuery('')}
              >
                Clear Search
              </Button>
            </div>
          )}

        </div>
      )}

    </div>
  );
};
