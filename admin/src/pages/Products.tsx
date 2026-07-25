import { useState } from 'react';
import { useAdmin } from '../context/AdminContext';
import { Package, Search, Trash2 } from 'lucide-react';

export default function Products() {
  const { products, deleteProduct } = useAdmin();
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [shopFilter, setShopFilter] = useState('');

  // Lists for dropdown filters
  const categories = Array.from(new Set(products.map(p => p.category)));
  const shops = Array.from(new Set(products.map(p => p.shopName)));

  // Filter products
  const filteredProducts = products.filter(p => {
    const matchSearch = p.name.toLowerCase().includes(search.toLowerCase());
    const matchCat = categoryFilter ? p.category === categoryFilter : true;
    const matchShop = shopFilter ? p.shopName === shopFilter : true;
    return matchSearch && matchCat && matchShop;
  });

  const handleDelete = async (id: string) => {
    if (window.confirm("Are you sure you want to delete this product from the platform?")) {
      try {
        await deleteProduct(id);
      } catch (err) {
        alert("Failed to delete product.");
      }
    }
  };

  return (
    <div className="space-y-6 text-left">
      
      {/* Header */}
      <div>
        <h1 className="text-2xl font-black text-slate-800 dark:text-white">
          📦 Global Product Catalog
        </h1>
        <p className="text-[10px] text-slate-400 font-extrabold uppercase tracking-wider block mt-0.5">
          Global Inventory & Stock Auditing
        </p>
      </div>

      {/* Filter Toolbar */}
      <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-850 p-4.5 rounded-[24px] shadow-xs flex flex-col md:flex-row gap-4 items-center">
        {/* Search */}
        <div className="relative flex-1 w-full">
          <Search className="absolute left-3.5 top-3.5 h-4 w-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search products by name..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl pl-10 pr-4 py-3 text-xs focus:outline-none font-bold"
          />
        </div>

        {/* Dropdowns */}
        <div className="flex gap-3 w-full md:w-auto">
          {/* Shop */}
          <div className="relative flex-1 md:flex-initial">
            <select
              value={shopFilter}
              onChange={(e) => setShopFilter(e.target.value)}
              className="w-full md:w-44 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-3 text-xs focus:outline-none font-bold appearance-none cursor-pointer"
            >
              <option value="">All Shops</option>
              {shops.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>

          {/* Category */}
          <div className="relative flex-1 md:flex-initial">
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="w-full md:w-44 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-3 text-xs focus:outline-none font-bold appearance-none cursor-pointer"
            >
              <option value="">All Categories</option>
              {categories.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
        </div>
      </div>

      {/* Grid of Catalog */}
      <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-850 rounded-[32px] overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs font-semibold">
            <thead>
              <tr className="bg-slate-50 dark:bg-slate-850 text-slate-400 font-black text-[9px] uppercase tracking-wider border-b border-slate-100 dark:border-slate-800/40">
                <th className="px-6 py-4">Item Details</th>
                <th className="px-6 py-4">Shop Name</th>
                <th className="px-6 py-4">Category</th>
                <th className="px-6 py-4">Price / MRP</th>
                <th className="px-6 py-4">Stock Level</th>
                <th className="px-6 py-4 text-center">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50 dark:divide-slate-800/40 text-slate-700 dark:text-slate-300">
              {filteredProducts.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-slate-400 font-semibold">
                    No products matching filter criteria.
                  </td>
                </tr>
              ) : (
                filteredProducts.map((p) => {
                  const isLow = p.stock > 0 && p.stock <= 5;
                  const isOut = p.stock === 0;

                  return (
                    <tr key={p.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-850/20 transition-colors">
                      <td className="px-6 py-4 flex items-center gap-3">
                        <div className="h-10 w-10 bg-slate-50 dark:bg-slate-800 rounded-xl overflow-hidden flex items-center justify-center border border-slate-150 dark:border-slate-750 shrink-0">
                          {p.image ? (
                            <img src={p.image} alt={p.name} className="h-full w-full object-cover" />
                          ) : (
                            <Package className="h-5 w-5 text-slate-400" />
                          )}
                        </div>
                        <div className="min-w-0">
                          <h4 className="font-extrabold text-slate-900 dark:text-white truncate max-w-xs">{p.name}</h4>
                          <span className="text-[9px] text-slate-400 block mt-0.5">ID: {p.id}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 font-bold text-slate-800 dark:text-slate-200">
                        {p.shopName}
                      </td>
                      <td className="px-6 py-4">
                        <span className="px-2.5 py-1 rounded-lg bg-indigo-500/5 text-indigo-500 text-[10px] font-black uppercase tracking-wider">
                          {p.category}
                        </span>
                      </td>
                      <td className="px-6 py-4 font-bold">
                        <span className="text-slate-900 dark:text-white font-extrabold">₹{p.price}</span>
                        {p.mrp && p.mrp > p.price && (
                          <span className="text-slate-400 line-through ml-1.5 font-semibold">₹{p.mrp}</span>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        {isOut ? (
                          <span className="px-2 py-0.5 rounded-md bg-red-500/10 text-red-500 font-extrabold text-[10px]">
                            Out of Stock
                          </span>
                        ) : isLow ? (
                          <span className="px-2 py-0.5 rounded-md bg-amber-500/10 text-amber-600 dark:text-amber-400 font-extrabold text-[10px]">
                            Low Stock ({p.stock})
                          </span>
                        ) : (
                          <span className="text-slate-800 dark:text-white font-extrabold">{p.stock} units</span>
                        )}
                      </td>
                      <td className="px-6 py-4 text-center">
                        <button
                          onClick={() => handleDelete(p.id)}
                          className="p-2 hover:bg-red-500/10 text-slate-400 hover:text-red-500 rounded-xl cursor-pointer transition-colors"
                          title="Delete Product"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

    </div>
  );
}
