import { useState } from 'react';
import { useAppStore } from '../core/store/useAppStore';
import { 
  Minus, 
  History, 
  AlertTriangle, 
  CheckCircle, 
  XCircle, 
  Search, 
  MessageSquare
} from 'lucide-react';

export default function Inventory() {
  const { products, logs, adjustStockQuantity } = useAppStore();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'healthy' | 'low' | 'out' | 'hidden'>('all');
  
  // State for manual adjustments
  const [selectedProductId, setSelectedProductId] = useState('');
  const [adjustAmount, setAdjustAmount] = useState('');
  const [adjustType, setAdjustType] = useState<'add' | 'reduce'>('add');
  const [adjustNote, setAdjustNote] = useState('');
  const [loading, setLoading] = useState(false);

  // Status aggregation
  const lowStock = products.filter(p => p.stock > 0 && p.stock <= (p.minStockAlert || 5));
  const outOfStock = products.filter(p => p.stock === 0);
  const inStock = products.filter(p => p.stock > (p.minStockAlert || 5));
  const hiddenCount = products.filter(p => p.status === 'disabled').length;

  const handleAdjust = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProductId || !adjustAmount) return;
    
    const amount = parseInt(adjustAmount);
    if (isNaN(amount) || amount <= 0) return;

    setLoading(true);
    const prod = products.find(p => p.id === selectedProductId);
    if (prod) {
      const quantityChanged = adjustType === 'add' ? amount : -amount;
      
      // Prevent stock from going below 0
      if (adjustType === 'reduce' && prod.stock < amount) {
        alert(`Cannot reduce stock by ${amount}. Current stock level is only ${prod.stock}.`);
        setLoading(false);
        return;
      }

      await adjustStockQuantity(
        selectedProductId, 
        quantityChanged, 
        'manual_adjust', 
        adjustNote || 'Manual inventory correction adjustment'
      );

      // Reset
      setAdjustAmount('');
      setAdjustNote('');
      setSelectedProductId('');
      setLoading(false);
    }
  };

  const filteredProducts = products.filter(p => {
    const matchesSearch = p.name.toLowerCase().includes(search.toLowerCase()) || 
                          (p.sku && p.sku.toLowerCase().includes(search.toLowerCase()));
    
    if (!matchesSearch) return false;

    if (statusFilter === 'healthy') return p.stock > (p.minStockAlert || 5);
    if (statusFilter === 'low') return p.stock > 0 && p.stock <= (p.minStockAlert || 5);
    if (statusFilter === 'out') return p.stock === 0;
    if (statusFilter === 'hidden') return p.status === 'disabled';
    return true;
  });

  return (
    <div className="space-y-8">
      
      {/* Action Header */}
      <div>
        <h2 className="text-xl font-black text-slate-800 dark:text-zinc-100">Inventory Management</h2>
        <p className="text-xs text-slate-400 dark:text-zinc-500 font-bold mt-0.5">Track real-time stock levels, movement logs, and adjustments</p>
      </div>

      {/* STOCK AGGREGATION CARDS */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <button
          type="button"
          onClick={() => setStatusFilter(prev => prev === 'healthy' ? 'all' : 'healthy')}
          className={`p-4.5 rounded-2xl flex items-center gap-3 border text-left transition-all cursor-pointer ${
            statusFilter === 'healthy'
              ? 'bg-emerald-50/80 border-emerald-500 text-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-200'
              : 'bg-white dark:bg-dark-card border-slate-100 dark:border-dark-border hover:bg-slate-50/50'
          }`}
        >
          <div className="w-10 h-10 rounded-xl bg-emerald-50 dark:bg-emerald-950/20 text-emerald-500 flex items-center justify-center flex-shrink-0">
            <CheckCircle className="h-5.5 w-5.5" />
          </div>
          <div>
            <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">Healthy Stock</span>
            <h4 className="text-lg font-black">{inStock.length} items</h4>
          </div>
        </button>

        <button
          type="button"
          onClick={() => setStatusFilter(prev => prev === 'low' ? 'all' : 'low')}
          className={`p-4.5 rounded-2xl flex items-center gap-3 border text-left transition-all cursor-pointer ${
            statusFilter === 'low'
              ? 'bg-amber-50/80 border-amber-500 text-amber-900 dark:bg-amber-950/40 dark:text-amber-200'
              : 'bg-white dark:bg-dark-card border-slate-100 dark:border-dark-border hover:bg-slate-50/50'
          }`}
        >
          <div className="w-10 h-10 rounded-xl bg-amber-50 dark:bg-amber-950/20 text-amber-500 flex items-center justify-center flex-shrink-0">
            <AlertTriangle className="h-5.5 w-5.5" />
          </div>
          <div>
            <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">Low Stock Alert</span>
            <h4 className="text-lg font-black text-amber-600">{lowStock.length} items</h4>
          </div>
        </button>

        <button
          type="button"
          onClick={() => setStatusFilter(prev => prev === 'out' ? 'all' : 'out')}
          className={`p-4.5 rounded-2xl flex items-center gap-3 border text-left transition-all cursor-pointer ${
            statusFilter === 'out'
              ? 'bg-red-50/80 border-red-500 text-red-900 dark:bg-red-950/40 dark:text-red-200'
              : 'bg-white dark:bg-dark-card border-slate-100 dark:border-dark-border hover:bg-slate-50/50'
          }`}
        >
          <div className="w-10 h-10 rounded-xl bg-red-50 dark:bg-red-950/20 text-red-500 flex items-center justify-center flex-shrink-0">
            <XCircle className="h-5.5 w-5.5" />
          </div>
          <div>
            <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">Out of Stock</span>
            <h4 className="text-lg font-black text-red-500">{outOfStock.length} items</h4>
          </div>
        </button>

        <button
          type="button"
          onClick={() => setStatusFilter(prev => prev === 'hidden' ? 'all' : 'hidden')}
          className={`p-4.5 rounded-2xl flex items-center gap-3 border text-left transition-all cursor-pointer ${
            statusFilter === 'hidden'
              ? 'bg-slate-100 border-slate-400 text-slate-900 dark:bg-zinc-800 dark:text-zinc-100'
              : 'bg-white dark:bg-dark-card border-slate-100 dark:border-dark-border hover:bg-slate-50/50'
          }`}
        >
          <div className="w-10 h-10 rounded-xl bg-slate-50 dark:bg-zinc-800/40 text-slate-500 flex items-center justify-center flex-shrink-0">
            <Minus className="h-5.5 w-5.5" />
          </div>
          <div>
            <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">Hidden Items</span>
            <h4 className="text-lg font-black">{hiddenCount} items</h4>
          </div>
        </button>
      </div>

      {/* DUAL WORKSPACE: ADJUSTMENTS & HISTORY LOGS */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Left Column: Manual Adjust Form & Search catalog */}
        <div className="lg:col-span-5 space-y-6">
          
          {/* Manual Adjust form Card */}
          <div className="bg-white dark:bg-dark-card border border-slate-100 dark:border-dark-border p-5 rounded-3xl shadow-xs">
            <h3 className="text-sm font-black mb-1">Manual Stock Correction</h3>
            <p className="text-[10px] text-slate-400 font-bold mb-5">Instantly increment or decrement items stock levels</p>

            <form onSubmit={handleAdjust} className="space-y-4 text-xs">
              <div>
                <label className="text-[10px] font-extrabold uppercase text-slate-400 block mb-1">Select Product</label>
                <select
                  required
                  value={selectedProductId}
                  onChange={(e) => setSelectedProductId(e.target.value)}
                  className="w-full p-2.5 bg-slate-50 dark:bg-zinc-800 border border-slate-100 dark:border-dark-border rounded-xl font-bold outline-none"
                >
                  <option value="">Choose item...</option>
                  {products.map(p => (
                    <option key={p.id} value={p.id}>
                      {p.name} ({p.stock} in stock)
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] font-extrabold uppercase text-slate-400 block mb-1">Correction Type</label>
                  <div className="flex border border-slate-100 dark:border-dark-border rounded-xl overflow-hidden font-bold">
                    <button
                      type="button"
                      onClick={() => setAdjustType('add')}
                      className={`flex-1 py-2 text-center transition-all cursor-pointer ${
                        adjustType === 'add' 
                          ? 'bg-primary text-white' 
                          : 'bg-slate-50 dark:bg-zinc-800 text-slate-500'
                      }`}
                    >
                      Add (+)
                    </button>
                    <button
                      type="button"
                      onClick={() => setAdjustType('reduce')}
                      className={`flex-1 py-2 text-center transition-all cursor-pointer ${
                        adjustType === 'reduce' 
                          ? 'bg-red-500 text-white' 
                          : 'bg-slate-50 dark:bg-zinc-800 text-slate-500'
                      }`}
                    >
                      Reduce (-)
                    </button>
                  </div>
                </div>

                <div>
                  <label className="text-[10px] font-extrabold uppercase text-slate-400 block mb-1">Quantity</label>
                  <input
                    type="number"
                    required
                    min={1}
                    value={adjustAmount}
                    onChange={(e) => setAdjustAmount(e.target.value)}
                    className="w-full p-2.5 bg-slate-50 dark:bg-zinc-900 border border-slate-100 dark:border-dark-border rounded-xl font-bold outline-none"
                    placeholder="E.g. 10"
                  />
                </div>
              </div>

              <div>
                <label className="text-[10px] font-extrabold uppercase text-slate-400 block mb-1">Correction Note</label>
                <input
                  type="text"
                  value={adjustNote}
                  onChange={(e) => setAdjustNote(e.target.value)}
                  className="w-full p-2.5 bg-slate-50 dark:bg-zinc-900 border border-slate-100 dark:border-dark-border rounded-xl font-bold outline-none"
                  placeholder="E.g., Restocked fresh batch, damaged box"
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 bg-slate-800 dark:bg-zinc-700 hover:bg-slate-900 text-white text-xs font-black rounded-xl uppercase tracking-wider transition cursor-pointer"
              >
                {loading ? 'Adjusting...' : 'Execute Stock Correction'}
              </button>
            </form>
          </div>

          {/* Quick List Reference Search */}
          <div className="bg-white dark:bg-dark-card border border-slate-100 dark:border-dark-border p-5 rounded-3xl shadow-xs">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-black">Stock Ledger Reference</h3>
              <div className="relative w-40">
                <input
                  type="text"
                  placeholder="Search item..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="w-full pl-8 pr-3 py-1.5 text-[10px] bg-slate-50 dark:bg-zinc-900 border border-slate-100 dark:border-dark-border rounded-lg outline-none font-bold"
                />
                <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-slate-400" />
              </div>
            </div>

            <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
              {filteredProducts.map(p => (
                <div key={p.id} className="flex flex-col sm:flex-row sm:items-center justify-between p-2.5 hover:bg-slate-50 dark:hover:bg-zinc-800/30 rounded-xl border border-slate-100/50 dark:border-dark-border/40 gap-2">
                  <div className="min-w-0 flex-1 pr-2">
                    <h4 className="font-extrabold text-slate-800 dark:text-zinc-200 truncate">{p.name}</h4>
                    <span className="font-mono text-[9px] text-slate-400">SKU: {p.sku || 'N/A'} • ₹{p.price}</span>
                  </div>
                  <div className="flex items-center gap-1.5 self-end sm:self-auto">
                    <span className={`px-2 py-0.5 text-[10px] font-black rounded-lg ${
                      p.stock === 0 
                        ? 'bg-red-50 text-red-500' 
                        : p.stock <= (p.minStockAlert || 5) 
                        ? 'bg-amber-50 text-amber-600' 
                        : 'bg-emerald-50 text-emerald-600'
                    }`}>
                      {p.stock} units
                    </span>

                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => adjustStockQuantity(p.id, 5, 'manual_adjust', 'Quick +5 restock')}
                        className="px-1.5 py-0.5 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-600 text-[9px] font-extrabold rounded-md cursor-pointer transition-colors"
                        title="Add 5 units"
                      >
                        +5
                      </button>
                      <button
                        type="button"
                        onClick={() => adjustStockQuantity(p.id, 10, 'manual_adjust', 'Quick +10 restock')}
                        className="px-1.5 py-0.5 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-600 text-[9px] font-extrabold rounded-md cursor-pointer transition-colors"
                        title="Add 10 units"
                      >
                        +10
                      </button>
                      {p.stock > 0 && (
                        <button
                          type="button"
                          onClick={() => adjustStockQuantity(p.id, -1, 'manual_adjust', 'Quick -1 adjustment')}
                          className="px-1.5 py-0.5 bg-red-500/10 hover:bg-red-500/20 text-red-600 text-[9px] font-extrabold rounded-md cursor-pointer transition-colors"
                          title="Reduce 1 unit"
                        >
                          -1
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

        </div>

        {/* Right Column: Logs Timeline history list */}
        <div className="lg:col-span-7 bg-white dark:bg-dark-card border border-slate-100 dark:border-dark-border p-6 rounded-3xl shadow-xs">
          <div className="flex items-center gap-2 mb-5 pb-3 border-b border-slate-50 dark:border-dark-border/40">
            <History className="h-5 w-5 text-slate-400" />
            <div>
              <h3 className="text-sm font-black">Stock Movement & Adjustment Logs</h3>
              <p className="text-[10px] text-slate-400 font-bold mt-0.5">Real-time audit history of product additions, purchases, & refills</p>
            </div>
          </div>

          <div className="space-y-4 max-h-[500px] overflow-y-auto pr-2">
            {logs.length === 0 ? (
              <div className="text-center py-16 text-slate-400 text-xs font-semibold">
                No logs recorded yet. Restocking products will populate audit logs.
              </div>
            ) : (
              logs.map((log) => {
                const isAdd = log.quantityChanged > 0;
                
                let changeBadgeColor = 'bg-emerald-50 text-emerald-600 dark:bg-emerald-950/20';
                if (!isAdd) changeBadgeColor = 'bg-red-50 text-red-500 dark:bg-red-950/20';
                if (log.changeType === 'cancel_restock') changeBadgeColor = 'bg-blue-50 text-blue-600 dark:bg-blue-950/20';
                
                return (
                  <div 
                    key={log.id} 
                    className="p-3 border.5 border-slate-100 dark:border-dark-border/50 hover:bg-slate-50/50 dark:hover:bg-zinc-800/10 rounded-2xl flex items-start justify-between gap-3 text-xs"
                  >
                    <div className="space-y-1 min-w-0 flex-1">
                      <div className="flex items-center flex-wrap gap-2">
                        <span className="font-extrabold text-slate-800 dark:text-zinc-200 truncate">{log.productName}</span>
                        <span className={`px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider ${
                          log.changeType === 'purchase'
                            ? 'bg-amber-50 text-amber-600 dark:bg-amber-950/15'
                            : log.changeType === 'cancel_restock' || log.changeType === 'return_restock'
                            ? 'bg-blue-50 text-blue-600 dark:bg-blue-950/15'
                            : 'bg-slate-100 text-slate-600 dark:bg-zinc-800'
                        }`}>
                          {log.changeType.replace('_', ' ')}
                        </span>
                      </div>
                      
                      {log.notes && (
                        <p className="text-[10px] text-slate-400 font-bold flex items-start gap-1">
                          <MessageSquare className="h-3 w-3 flex-shrink-0 mt-0.5 text-slate-300" />
                          <span>{log.notes}</span>
                        </p>
                      )}
                      
                      <div className="flex items-center gap-2 text-[9px] text-slate-400 font-bold">
                        <span>By: {log.updatedBy}</span>
                        <span>•</span>
                        <span>{new Date(log.timestamp).toLocaleString()}</span>
                      </div>
                    </div>

                    <div className="text-right space-y-1 flex-shrink-0">
                      <span className={`px-2 py-1 rounded-lg text-xs font-black inline-block ${changeBadgeColor}`}>
                        {isAdd ? '+' : ''}{log.quantityChanged}
                      </span>
                      <p className="text-[9px] text-slate-400 font-bold">Stock: {log.previousStock} → {log.newStock}</p>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

      </div>

    </div>
  );
}
