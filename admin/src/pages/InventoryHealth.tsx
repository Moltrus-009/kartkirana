import { useAdmin } from '../context/AdminContext';
import { useState } from 'react';
import { db } from '../lib/firebase';
import { doc, writeBatch } from 'firebase/firestore';
import { 
  Package, 
  Trash2, 
  Check
} from 'lucide-react';

export default function InventoryHealth() {
  const { products } = useAdmin();
  const [activeTab, setActiveTab] = useState<'low' | 'out' | 'fast' | 'slow' | 'hidden' | 'disabled' | 'duplicates'>('low');
  
  // Bulk selection state
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [bulkStockVal, setBulkStockVal] = useState('');
  const [bulkPriceVal, setBulkPriceVal] = useState('');

  // 1. Filter logic
  const getFilteredProducts = () => {
    switch (activeTab) {
      case 'low':
        return products.filter(p => p.stock > 0 && p.stock <= 5);
      case 'out':
        return products.filter(p => p.stock === 0);
      case 'fast':
        return products.filter(p => p.isFastMoving || p.stock < 10); // fallback criteria
      case 'slow':
        return products.filter(p => p.isSlowMoving);
      case 'hidden':
        return products.filter(p => p.status === 'disabled');
      case 'disabled':
        return products.filter(p => p.status === 'disabled');
      case 'duplicates':
        // Search duplicate products by name
        const names = products.map(p => p.name.toLowerCase());
        const duplicatesNames = names.filter((name, index) => names.indexOf(name) !== index);
        return products.filter(p => duplicatesNames.includes(p.name.toLowerCase()));
      default:
        return products;
    }
  };

  const filteredProducts = getFilteredProducts();

  const handleSelectToggle = (id: string) => {
    setSelectedIds(prev => 
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    );
  };

  const handleSelectAll = () => {
    if (selectedIds.length === filteredProducts.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(filteredProducts.map(p => p.id));
    }
  };

  // Bulk Operations
  const handleBulkStockUpdate = async () => {
    if (selectedIds.length === 0 || !bulkStockVal) return;
    try {
      const batch = writeBatch(db!);
      const val = parseInt(bulkStockVal);
      selectedIds.forEach(id => {
        const docRef = doc(db!, 'products', id);
        batch.update(docRef, { stock: val });
      });
      await batch.commit();
      setSelectedIds([]);
      setBulkStockVal('');
      alert(`Bulk restocked ${selectedIds.length} items to ${val} units.`);
    } catch (err: any) {
      alert(`Bulk update error: ${err.message}`);
    }
  };

  const handleBulkPriceUpdate = async () => {
    if (selectedIds.length === 0 || !bulkPriceVal) return;
    try {
      const batch = writeBatch(db!);
      const price = parseFloat(bulkPriceVal);
      selectedIds.forEach(id => {
        const docRef = doc(db!, 'products', id);
        batch.update(docRef, { price });
      });
      await batch.commit();
      setSelectedIds([]);
      setBulkPriceVal('');
      alert(`Bulk updated price of ${selectedIds.length} items to ₹${price}.`);
    } catch (err: any) {
      alert(`Bulk update error: ${err.message}`);
    }
  };

  const handleBulkDelete = async () => {
    if (selectedIds.length === 0) return;
    if (!confirm(`Are you sure you want to delete ${selectedIds.length} items from the platform?`)) return;
    try {
      const batch = writeBatch(db!);
      selectedIds.forEach(id => {
        const docRef = doc(db!, 'products', id);
        batch.update(docRef, { isDeleted: true });
      });
      await batch.commit();
      setSelectedIds([]);
      alert(`Deleted ${selectedIds.length} products successfully.`);
    } catch (err: any) {
      alert(`Bulk deletion error: ${err.message}`);
    }
  };

  const handleBulkStatusChange = async (status: 'active' | 'disabled') => {
    if (selectedIds.length === 0) return;
    try {
      const batch = writeBatch(db!);
      selectedIds.forEach(id => {
        const docRef = doc(db!, 'products', id);
        batch.update(docRef, { status });
      });
      await batch.commit();
      setSelectedIds([]);
      alert(`Successfully set ${selectedIds.length} items to ${status.toUpperCase()}.`);
    } catch (err: any) {
      alert(`Bulk status error: ${err.message}`);
    }
  };

  return (
    <div className="space-y-6 text-left">
      
      {/* Header */}
      <div>
        <h1 className="text-2xl font-black text-slate-800 dark:text-white">
          📦 Inventory Health Dashboard
        </h1>
        <p className="text-[10px] text-slate-400 font-extrabold uppercase tracking-wider block mt-0.5">
          Bulk updates, stock levels audit, & duplicates management
        </p>
      </div>

      {/* Tabs */}
      <div className="grid grid-cols-4 md:grid-cols-7 bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-850 p-1 rounded-2xl text-[9px] font-black uppercase tracking-wider w-full">
        {(['low', 'out', 'fast', 'slow', 'hidden', 'disabled', 'duplicates'] as const).map(tab => (
          <button
            key={tab}
            onClick={() => { setActiveTab(tab); setSelectedIds([]); }}
            className={`px-3 py-2.5 rounded-xl cursor-pointer text-center transition ${
              activeTab === tab 
                ? 'bg-slate-100 dark:bg-slate-850 text-emerald-500 shadow-xs font-black' 
                : 'text-slate-500 dark:text-zinc-400'
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* Bulk Toolbar */}
      {selectedIds.length > 0 && (
        <div className="bg-emerald-500/5 border border-emerald-500/20 p-4 rounded-3xl flex flex-wrap gap-4 items-center justify-between text-xs">
          <div className="flex items-center gap-2">
            <span className="font-extrabold text-emerald-500">{selectedIds.length} items selected</span>
          </div>

          <div className="flex flex-wrap gap-2.5">
            {/* Stock field */}
            <div className="flex items-center bg-white dark:bg-slate-850 border border-slate-200 dark:border-slate-800 rounded-xl px-2">
              <input
                type="number"
                placeholder="StockQty"
                value={bulkStockVal}
                onChange={(e) => setBulkStockVal(e.target.value)}
                className="w-16 p-1.5 text-[10px] font-bold outline-none border-none bg-transparent"
              />
              <button 
                onClick={handleBulkStockUpdate}
                className="p-1 bg-emerald-500 text-slate-950 rounded-lg"
              >
                <Check className="h-3 w-3" />
              </button>
            </div>

            {/* Price field */}
            <div className="flex items-center bg-white dark:bg-slate-850 border border-slate-200 dark:border-slate-800 rounded-xl px-2">
              <input
                type="number"
                placeholder="Price"
                value={bulkPriceVal}
                onChange={(e) => setBulkPriceVal(e.target.value)}
                className="w-16 p-1.5 text-[10px] font-bold outline-none border-none bg-transparent"
              />
              <button 
                onClick={handleBulkPriceUpdate}
                className="p-1 bg-emerald-500 text-slate-950 rounded-lg"
              >
                <Check className="h-3 w-3" />
              </button>
            </div>

            <button
              onClick={() => handleBulkStatusChange('active')}
              className="px-3.5 py-1.5 bg-slate-100 dark:bg-slate-800 hover:text-emerald-500 rounded-xl font-black uppercase tracking-wider text-[9px] cursor-pointer"
            >
              Enable
            </button>
            <button
              onClick={() => handleBulkStatusChange('disabled')}
              className="px-3.5 py-1.5 bg-slate-100 dark:bg-slate-800 hover:text-red-500 rounded-xl font-black uppercase tracking-wider text-[9px] cursor-pointer"
            >
              Disable
            </button>
            <button
              onClick={handleBulkDelete}
              className="p-2 bg-red-550 text-white rounded-xl hover:bg-red-600 transition cursor-pointer"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}

      {/* Grid of Audited Products */}
      <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-850 rounded-[32px] overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs font-semibold">
            <thead>
              <tr className="bg-slate-50 dark:bg-slate-850 text-slate-400 font-black text-[9px] uppercase tracking-wider border-b border-slate-100 dark:border-slate-800/40">
                <th className="px-6 py-4 text-center">
                  <input
                    type="checkbox"
                    checked={selectedIds.length === filteredProducts.length && filteredProducts.length > 0}
                    onChange={handleSelectAll}
                    className="rounded text-emerald-500"
                  />
                </th>
                <th className="px-6 py-4">Product Details</th>
                <th className="px-6 py-4">Shop Name</th>
                <th className="px-6 py-4">Price</th>
                <th className="px-6 py-4">Stock Level</th>
                <th className="px-6 py-4">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50 dark:divide-slate-800/40 text-slate-700 dark:text-slate-300">
              {filteredProducts.map((p) => {
                const isSelected = selectedIds.includes(p.id);
                return (
                  <tr key={p.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-850/20 transition-colors">
                    <td className="px-6 py-4 text-center">
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => handleSelectToggle(p.id)}
                        className="rounded text-emerald-500"
                      />
                    </td>
                    <td className="px-6 py-4 flex items-center gap-3">
                      <div className="h-10 w-10 bg-slate-55 dark:bg-slate-800 rounded-xl overflow-hidden flex items-center justify-center border border-slate-200 dark:border-slate-800">
                        {p.image ? (
                          <img src={p.image} alt={p.name} className="h-full w-full object-cover" />
                        ) : (
                          <Package className="h-5 w-5 text-slate-400" />
                        )}
                      </div>
                      <div>
                        <h4 className="font-extrabold text-slate-900 dark:text-white truncate max-w-xs">{p.name}</h4>
                        <span className="text-[9px] text-slate-400 block mt-0.5">ID: {p.id}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 font-bold text-slate-800 dark:text-slate-200">
                      {p.shopName}
                    </td>
                    <td className="px-6 py-4 font-extrabold text-slate-900 dark:text-white">
                      ₹{p.price}
                    </td>
                    <td className="px-6 py-4">
                      <span className={`px-2 py-0.5 rounded-md text-[10px] font-black ${
                        p.stock === 0 
                          ? 'bg-red-500/10 text-red-500' 
                          : p.stock <= 5 
                            ? 'bg-amber-500/10 text-amber-500' 
                            : 'bg-emerald-500/10 text-emerald-500'
                      }`}>
                        {p.stock} units
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`px-2.5 py-0.5 rounded-lg text-[9px] font-black uppercase tracking-wider ${
                        p.status === 'active' ? 'bg-emerald-500/10 text-emerald-500' : 'bg-slate-500/10 text-slate-550'
                      }`}>
                        {p.status}
                      </span>
                    </td>
                  </tr>
                );
              })}
              {filteredProducts.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-6 py-16 text-center text-slate-400 font-semibold italic">
                    No items flagged in this filter category.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

    </div>
  );
}
