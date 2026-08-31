import React, { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Check, ArrowRight, ShoppingBag, Home, Sparkles } from 'lucide-react';
import { Button } from '../components/ui/Button';

export const OrderSuccess: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const routeState = (location.state as { orderId?: string; shopName?: string }) || {};
  const searchParams = new URLSearchParams(location.search);
  const orderId = routeState.orderId || searchParams.get('orderId') || undefined;
  const shopName = routeState.shopName || searchParams.get('shopName') || undefined;

  const [animateState, setAnimateState] = useState<'loading' | 'success'>('loading');

  useEffect(() => {
    // Force a smooth transition delay for visual impact
    const timer = setTimeout(() => {
      setAnimateState('success');
    }, 1800);
    return () => clearTimeout(timer);
  }, []);

  if (!orderId) {
    return (
      <div className="max-w-xl mx-auto px-4 py-20 text-center flex flex-col items-center justify-center min-h-[80vh]">
        <ShoppingBag className="h-16 w-16 text-gray-300 dark:text-[#64748B] mb-4 animate-bounce" />
        <h3 className="text-sm font-black text-gray-800 dark:text-white">No Active Checkout Session</h3>
        <Button variant="primary" className="mt-6 rounded-2xl py-3 px-6" onClick={() => navigate('/')}>
          Return to Storefront
        </Button>
      </div>
    );
  }

  return (
    <div className="max-w-xl mx-auto px-4 py-8 flex flex-col items-center justify-center min-h-[90vh] text-center overflow-hidden">
      
      {animateState === 'loading' ? (
        <div className="flex flex-col items-center justify-center gap-4 animate-pulse">
          <div className="relative flex items-center justify-center">
            {/* Spinning loading indicator */}
            <div className="w-20 h-20 border-4 border-[#E2E8F0] dark:border-[#334155] border-t-[#1565C0] dark:border-t-[#1E88E5] rounded-full animate-spin" />
            <ShoppingBag className="absolute h-8 w-8 text-[#1565C0] dark:text-[#1E88E5]" />
          </div>
          <div className="flex flex-col gap-1.5 mt-2">
            <span className="text-xs font-black uppercase tracking-wider text-gray-400 animate-pulse">Processing Order...</span>
            <span className="text-[10px] font-bold text-gray-400">Verifying secure payment transaction</span>
          </div>
        </div>
      ) : (
        <div className="flex flex-col items-center w-full max-w-sm animate-fade-in">
          
          {/* Confetti & Success Banner Card */}
          <div className="relative flex items-center justify-center mb-6">
            <div className="absolute -inset-4 bg-blue-500/10 rounded-full blur-xl animate-pulse" />
            
            {/* Success Check circle */}
            <div className="relative w-24 h-24 rounded-full bg-gradient-to-br from-[#1E88E5] to-[#1565C0] text-white flex items-center justify-center shadow-lg shadow-blue-500/25 border-4 border-white dark:border-[#1E293B] scale-up-success">
              <Check className="h-12 w-12 stroke-[3.5px] animate-checkmark" />
            </div>

            {/* Sparkle icon decorations */}
            <div className="absolute -top-2 -right-2 text-[#FFB300] animate-bounce">
              <Sparkles className="h-6 w-6 fill-current" />
            </div>
          </div>

          <h2 className="text-xl font-black text-gray-800 dark:text-white uppercase tracking-wider leading-tight">
            Order Placed Successfully!
          </h2>
          
          <p className="text-xs font-semibold text-gray-500 dark:text-[#94A3B8] mt-2.5 max-w-xs leading-relaxed">
            Yay! Your items from <b className="text-[#1565C0] dark:text-[#1E88E5] font-black">{shopName || 'Merchant Store'}</b> have been booked and processed.
          </p>

          {/* Reference badge */}
          <div className="mt-4 px-4 py-2 rounded-2xl bg-[#E2E8F0] dark:bg-[#334155]/40 border border-[#90CAF9]/20 text-[#1565C0] dark:text-[#1E88E5] text-[10px] font-black tracking-widest uppercase shadow-sm">
            Ref ID: {orderId}
          </div>

          {/* Progress Timeline card (like Swiggy) */}
          <div className="w-full mt-8 p-4 rounded-3xl bg-white dark:bg-[#1E293B] border border-[#E2E8F0] dark:border-[#334155] shadow-[0_8px_24px_-20px_rgba(5,10,36,0.45)] text-left flex flex-col gap-3">
            <div className="flex items-center gap-2.5">
              <div className="w-2.5 h-2.5 rounded-full bg-[#1565C0] dark:bg-[#1E88E5] animate-ping" />
              <span className="text-[10px] font-black uppercase text-gray-400 dark:text-[#94A3B8] tracking-wider">Current Status</span>
            </div>
            
            <div className="flex items-start gap-3 mt-1">
              <div className="p-2.5 rounded-2xl bg-[#E2E8F0] dark:bg-[#334155] text-[#1565C0] shrink-0 border border-[#90CAF9]/20">
                <ShoppingBag className="h-5 w-5" />
              </div>
              <div className="text-xs font-semibold">
                <h4 className="font-extrabold text-gray-850 dark:text-white">Store Preparing Items</h4>
                <p className="text-[10px] font-bold text-gray-450 dark:text-gray-400 mt-1 leading-normal">
                  The merchant is checking item availability and packing your fresh goods now.
                </p>
              </div>
            </div>
          </div>

          {/* Action buttons */}
          <div className="w-full flex flex-col gap-3.5 mt-8">
            <Button
              variant="primary"
              fullWidth
              onClick={() => navigate(`/orders/track/${orderId}`)}
              className="rounded-2xl py-4 font-black text-xs flex items-center justify-center gap-2 bg-gradient-to-r from-[#1E88E5] to-[#1565C0] shadow-lg shadow-blue-500/10 active:scale-[0.98] transition-all"
            >
              TRACK LIVE DELIVERY
              <ArrowRight className="h-4.5 w-4.5" />
            </Button>

            <div className="flex gap-3">
              <Button
                variant="outline"
                onClick={() => navigate('/orders', { state: { placedOrderId: orderId } })}
                className="flex-1 rounded-2xl py-3.5 text-xs font-bold border-[#E2E8F0] bg-white text-gray-700 hover:bg-gray-50"
              >
                My Orders
              </Button>
              
              <Button
                variant="outline"
                onClick={() => navigate('/')}
                className="flex-1 rounded-2xl py-3.5 text-xs font-bold border-[#E2E8F0] bg-white text-gray-700 hover:bg-gray-50 flex items-center justify-center gap-1.5"
              >
                <Home className="h-4 w-4" />
                Storefront
              </Button>
            </div>
          </div>

        </div>
      )}
    </div>
  );
};
