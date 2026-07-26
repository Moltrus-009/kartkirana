import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { Package, IndianRupee, Store, MapPin } from 'lucide-react';
import type { OrderDocument } from '../services/firestoreService';
import { isOrderStatus, normalizeOrderStatus } from '../types/orderStatus';

export const Orders: React.FC = () => {
  const { activeOrders, historyOrders } = useApp();
  const [filter, setFilter] = useState<'active' | 'completed' | 'cancelled'>('active');

  const getFilteredOrders = () => {
    switch (filter) {
      case 'active':
        return activeOrders;
      case 'completed':
        return historyOrders.filter(o => isOrderStatus(o.status, 'DELIVERED', 'COMPLETED'));
      case 'cancelled':
        return historyOrders.filter(o => isOrderStatus(o.status, 'CANCELLED', 'SHOP_REJECTED'));
      default:
        return [];
    }
  };

  const filtered = getFilteredOrders();

  const getStatusBadgeColor = (status: OrderDocument['status']) => {
    switch (normalizeOrderStatus(status)) {
      case 'DELIVERED':
      case 'COMPLETED':
        return 'bg-success/10 text-success border-success/20';
      case 'SHOP_REJECTED':
      case 'CANCELLED':
        return 'bg-danger/10 text-danger border-danger/20';
      default:
        return 'bg-primary/10 text-primary border-primary/20';
    }
  };

  const formatOrderTime = (isoString: string) => {
    try {
      const date = new Date(isoString);
      return {
        date: date.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }),
        time: date.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })
      };
    } catch (e) {
      return { date: 'Today', time: 'Just now' };
    }
  };

  return (
    <div className="space-y-4.5 animate-fade-in text-left">
      
      <div className="flex justify-between items-center pb-1">
        <h2 className="text-base font-black uppercase text-slate-800 dark:text-zinc-200 tracking-wider">
          Delivery Task Logs
        </h2>
        <span className="text-[10px] text-slate-400 dark:text-zinc-550 font-extrabold">
          Total: {activeOrders.length + historyOrders.length} Trips
        </span>
      </div>

      {/* Tab Filter switchers */}
      <div className="grid grid-cols-3 bg-white dark:bg-zinc-900 border border-slate-200/60 dark:border-zinc-800 p-1.5 rounded-2xl shadow-xs">
        <button
          onClick={() => setFilter('active')}
          className={`py-2.5 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all duration-200 cursor-pointer active:scale-95 ${
            filter === 'active' 
              ? 'bg-primary text-white shadow-md' 
              : 'text-slate-500 hover:text-slate-800 dark:text-zinc-400'
          }`}
        >
          Active ({activeOrders.length})
        </button>
        
        <button
          onClick={() => setFilter('completed')}
          className={`py-2.5 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all duration-200 cursor-pointer active:scale-95 ${
            filter === 'completed' 
              ? 'bg-primary text-white shadow-md' 
              : 'text-slate-500 hover:text-slate-800 dark:text-zinc-400'
          }`}
        >
          Done ({historyOrders.filter(o => isOrderStatus(o.status, 'DELIVERED', 'COMPLETED')).length})
        </button>

        <button
          onClick={() => setFilter('cancelled')}
          className={`py-2.5 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all duration-200 cursor-pointer active:scale-95 ${
            filter === 'cancelled' 
              ? 'bg-primary text-white shadow-md' 
              : 'text-slate-500 hover:text-slate-800 dark:text-zinc-400'
          }`}
        >
          Failed ({historyOrders.filter(o => isOrderStatus(o.status, 'CANCELLED', 'SHOP_REJECTED')).length})
        </button>
      </div>

      {/* List content */}
      <div className="space-y-4">
        {filtered.length === 0 ? (
          <div className="bg-white dark:bg-zinc-900 border border-slate-200/60 dark:border-zinc-800 p-8 rounded-2xl text-center space-y-2">
            <Package className="h-10 w-10 text-slate-400 dark:text-zinc-650 mx-auto" />
            <h4 className="text-xs font-black text-slate-700 dark:text-zinc-300 uppercase tracking-wider">
              No orders found
            </h4>
            <p className="text-[9px] text-slate-500 dark:text-zinc-450 font-semibold max-w-xs mx-auto leading-normal">
              There are no orders logged in the "{filter}" ledger. Check back later when task assignments arrive.
            </p>
          </div>
        ) : (
          filtered.map(o => {
            const timeObj = formatOrderTime(o.createdAt);
            const itemsCount = Array.isArray(o.items) ? o.items.reduce((acc, curr) => acc + (curr.quantity || 1), 0) : 1;
            return (
              <div 
                key={o.id}
                className="bg-white dark:bg-zinc-900 border border-slate-200/60 dark:border-zinc-800 p-4.5 rounded-2xl shadow-xs space-y-3.5 hover:shadow-md hover:scale-[1.01] transition-all duration-300"
              >
                
                {/* Header bar */}
                <div className="flex justify-between items-center border-b border-slate-100 dark:border-zinc-800 pb-2.5">
                  <div className="space-y-0.5 text-left">
                    <span className="font-mono text-[9px] bg-slate-105 dark:bg-zinc-800 px-2 py-0.5 rounded text-slate-550 dark:text-zinc-400 font-bold uppercase border border-slate-100 dark:border-transparent">
                      ID: #{String(o.id || '').substring(0, 10).toUpperCase()}
                    </span>
                    {o.batchId && (
                      <span className="ml-1.5 text-[8px] font-black uppercase bg-warning/10 text-warning px-1.5 py-0.5 rounded border border-warning/10">
                        ⚡ Batched
                      </span>
                    )}
                  </div>
                  <span className={`px-2 py-0.5 rounded border text-[8px] font-black uppercase tracking-wider ${getStatusBadgeColor(o.status)}`}>
                    {String(o.status || '').replace('_', ' ')}
                  </span>
                </div>

                {/* Body Stop info */}
                <div className="space-y-3.5 text-xs font-semibold text-left">
                  <div className="flex items-center space-x-2.5">
                    <Store className="h-4.5 w-4.5 text-success flex-shrink-0" />
                    <div>
                      <p className="text-[8px] text-slate-400 uppercase tracking-wider">Merchant Pickup</p>
                      <h4 className="text-slate-800 dark:text-zinc-200 font-bold leading-tight mt-0.5">
                        {o.shopName || 'Partner Store'}
                      </h4>
                    </div>
                  </div>

                  <div className="flex items-center space-x-2.5">
                    <MapPin className="h-4.5 w-4.5 text-primary flex-shrink-0" />
                    <div>
                      <p className="text-[8px] text-slate-400 uppercase tracking-wider">Customer Dropoff</p>
                      <h4 className="text-slate-800 dark:text-zinc-200 font-bold leading-tight mt-0.5">
                        {o.contact?.name || 'Customer'}
                      </h4>
                    </div>
                  </div>
                </div>

                {/* Footer bar */}
                <div className="flex justify-between items-center border-t border-slate-100 dark:border-zinc-800 pt-3 text-[10px] font-extrabold uppercase text-slate-500 dark:text-zinc-400">
                  <div className="flex space-x-2 font-mono">
                    <span>{timeObj.date}</span>
                    <span>•</span>
                    <span>{timeObj.time}</span>
                  </div>
                  
                  <div className="flex items-center space-x-1.5">
                    <span className="text-[9px] font-semibold text-slate-400">{itemsCount} items</span>
                    <span className="text-slate-300 dark:text-zinc-700">|</span>
                    <span className="text-success font-black text-xs flex items-center">
                      <IndianRupee className="h-3 w-3" />
                      <span>{o.deliveryFee || 10}</span>
                    </span>
                  </div>
                </div>

              </div>
            );
          })
        )}
      </div>

    </div>
  );
};
