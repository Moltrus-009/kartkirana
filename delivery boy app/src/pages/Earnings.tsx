import React from 'react';
import { useApp } from '../context/AppContext';
import { IndianRupee, TrendingUp, Clock } from 'lucide-react';
import { isOrderStatus } from '../types/orderStatus';

export const Earnings: React.FC = () => {
  const { todayEarnings, todayDeliveries, historyOrders } = useApp();

  const completedHistory = historyOrders.filter(o => isOrderStatus(o.status, 'DELIVERED', 'COMPLETED'));

  // Dynamic calculations from actual orders history
  const totalCompletedDeliveries = completedHistory.length;
  
  const totalWeeklyEarnings = completedHistory
    .filter(o => {
      try {
        const date = new Date(o.createdAt);
        const diffTime = Math.abs(new Date().getTime() - date.getTime());
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        return diffDays <= 7;
      } catch (e) {
        return false;
      }
    })
    .reduce((sum, o) => sum + (o.deliveryFee || 10), 0);

  const totalMonthlyEarnings = completedHistory
    .filter(o => {
      try {
        const date = new Date(o.createdAt);
        const diffTime = Math.abs(new Date().getTime() - date.getTime());
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        return diffDays <= 30;
      } catch (e) {
        return false;
      }
    })
    .reduce((sum, o) => sum + (o.deliveryFee || 10), 0);

  const formatTime = (isoString: string) => {
    try {
      const date = new Date(isoString);
      return date.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }) + ' • ' + 
             date.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });
    } catch(e) {
      return 'Today';
    }
  };

  return (
    <div className="space-y-5 animate-fade-in text-left">
      
      <div className="flex justify-between items-center pb-1">
        <h2 className="text-base font-black uppercase text-slate-800 dark:text-zinc-200 tracking-wider">
          Earnings Summary
        </h2>
        <span className="text-[10px] bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 px-2.5 py-0.5 rounded font-extrabold uppercase">
          Payout: ₹10 / Order
        </span>
      </div>

      {/* Weekly Revenue Settlement Banner */}
      <div className="bg-emerald-500/10 border border-emerald-500/20 p-3.5 rounded-2xl flex items-center space-x-3 text-emerald-700 dark:text-emerald-300">
        <div className="h-9 w-9 rounded-xl bg-emerald-500/20 flex items-center justify-center text-emerald-500 font-bold shrink-0">
          🗓️
        </div>
        <div className="space-y-0.5 text-xs font-semibold">
          <p className="font-extrabold text-[10px] uppercase tracking-wider text-emerald-600 dark:text-emerald-400">Weekly Revenue Settlement</p>
          <p className="text-[10px] text-slate-600 dark:text-zinc-300 leading-snug">
            Total accumulated revenue is calculated and paid out at the end of every 7-day weekly cycle (every Sunday midnight).
          </p>
        </div>
      </div>

      {/* Main Income cards grid */}
      <section className="space-y-4">
        
        {/* Today's Earning Highlight Card */}
        <div className="bg-slate-950 text-white border border-slate-850 p-5 rounded-2xl shadow-lg space-y-3">
          <div className="flex justify-between items-center text-[10px] font-black text-slate-400 uppercase tracking-widest">
            <span>Today's Revenue</span>
            <TrendingUp className="h-4.5 w-4.5 text-success animate-pulse" />
          </div>
          
          <div className="space-y-1">
            <h3 className="text-4xl font-black text-white flex items-baseline">
              <span className="text-xl font-bold mr-0.5">₹</span>
              <span>{todayEarnings}</span>
            </h3>
            <p className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider">
              {todayDeliveries} Orders completed today (₹10 / order)
            </p>
          </div>
        </div>

        {/* Weekly & Monthly Small Cards */}
        <div className="grid grid-cols-2 gap-4">
          <div className="bg-white dark:bg-zinc-900 border border-slate-200/60 dark:border-zinc-800 p-4.5 rounded-2xl shadow-xs space-y-1 transition-all duration-300">
            <p className="text-[9px] text-slate-400 font-bold uppercase tracking-wider">This Week (7 Days)</p>
            <p className="text-lg font-black text-slate-900 dark:text-white">₹{totalWeeklyEarnings}</p>
            <p className="text-[8px] text-emerald-500 font-bold uppercase">Weekly Settled Revenue</p>
          </div>

          <div className="bg-white dark:bg-zinc-900 border border-slate-200/60 dark:border-zinc-800 p-4.5 rounded-2xl shadow-xs space-y-1 transition-all duration-300">
            <p className="text-[9px] text-slate-400 font-bold uppercase tracking-wider">This Month</p>
            <p className="text-lg font-black text-slate-900 dark:text-white">₹{totalMonthlyEarnings}</p>
            <p className="text-[8px] text-slate-400 font-semibold uppercase">Monthly Aggregate</p>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 gap-4">
          <div className="bg-white dark:bg-zinc-900 border border-slate-200/60 dark:border-zinc-800 p-4.5 rounded-2xl shadow-xs space-y-1 transition-all duration-300">
            <p className="text-[9px] text-slate-400 font-bold uppercase tracking-wider">Total Trips</p>
            <p className="text-lg font-black text-slate-900 dark:text-white">{totalCompletedDeliveries}</p>
            <p className="text-[8px] text-slate-400 font-semibold uppercase">Completed Trips</p>
          </div>

          <div className="bg-white dark:bg-zinc-900 border border-slate-200/60 dark:border-zinc-800 p-4.5 rounded-2xl shadow-xs space-y-1 transition-all duration-300">
            <p className="text-[9px] text-slate-400 font-bold uppercase tracking-wider">Rate per order</p>
            <p className="text-lg font-black text-slate-900 dark:text-white">₹10</p>
            <p className="text-[8px] text-slate-400 font-semibold uppercase">Flat rate delivery payout</p>
          </div>
        </div>

      </section>

      {/* Transaction History Logs */}
      <section className="space-y-3.5">
        <h3 className="text-[10px] font-black uppercase text-slate-400 tracking-wider">
          Recent Delivery Revenue Logs
        </h3>

        <div className="bg-white dark:bg-zinc-900 border border-slate-200/60 dark:border-zinc-800 rounded-2xl p-2.5 shadow-xs divide-y divide-slate-100 dark:divide-zinc-800 transition-all duration-300">
          {completedHistory.length === 0 ? (
            <div className="p-6 text-center text-xs text-slate-400 space-y-2">
              <IndianRupee className="h-8 w-8 text-slate-355 dark:text-zinc-700 mx-auto" />
              <p className="font-extrabold uppercase text-[10px]">No recent payouts logged</p>
              <p className="text-[9px] font-semibold text-slate-450 dark:text-zinc-500 leading-normal max-w-xs mx-auto">
                Completed delivery payouts will show up here immediately after customer drop-off is verified.
              </p>
            </div>
          ) : (
            completedHistory.map((o) => (
              <div 
                key={o.id}
                className="py-3 px-2 flex justify-between items-center text-xs font-semibold"
              >
                <div className="space-y-1 max-w-[70%] text-left">
                  <h4 className="font-black text-slate-800 dark:text-zinc-200 leading-tight">
                    {o.shopName}
                  </h4>
                  <div className="flex items-center space-x-1.5 text-[9px] text-slate-400">
                    <Clock className="h-3 w-3" />
                    <span>{formatTime(o.createdAt)}</span>
                  </div>
                </div>
                
                <div className="text-right flex-shrink-0">
                  <span className="text-success font-black text-sm flex items-center justify-end">
                    <span>+₹</span>
                    <span>{o.deliveryFee || 10}</span>
                  </span>
                  <span className="text-[8px] text-slate-400 font-normal uppercase">
                    Weekly Payout
                  </span>
                </div>
              </div>
            ))
          )}
        </div>
      </section>

    </div>
  );
};
