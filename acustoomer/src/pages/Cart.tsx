import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ShoppingBag, Trash2, Plus, Minus, Ticket, MessageSquare, Clock, ArrowRight, Check } from 'lucide-react';
import { useCart } from '../context/CartContext';
import { useAuth } from '../context/AuthContext';
import { Button } from '../components/ui/Button';
import { Dialog } from '../components/ui/Dialog';
import { useLanguage } from '../context/LanguageContext';
import { useAppStore } from '../core/store/useAppStore';
import { PreorderModal } from '../components/PreorderModal';

export const Cart: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { language } = useLanguage();
  const {
    cartItems,
    cartShopName,
    coupon,
    priceBreakdown,
    updateQuantity,
    removeFromCart,
    applyCoupon,
    removeCoupon,
    preorderSchedule,
    setPreorderSchedule,
    clearCart
  } = useCart();

  const [notes, setNotes] = useState('');
  const [couponCodeInput, setCouponCodeInput] = useState('');
  const [couponMsg, setCouponMsg] = useState<{ success: boolean; text: string } | null>(null);
  
  // Preorder schedule states
  const [isPreorderScheduleModalOpen, setIsPreorderScheduleModalOpen] = useState(false);
  const [tempDate, setTempDate] = useState(preorderSchedule?.date || new Date().toISOString().split('T')[0]);
  const [tempSlot, setTempSlot] = useState(preorderSchedule?.slot || '08:00 AM - 10:00 AM');

  // Available coupons modal drawer
  const [isCouponsOpen, setIsCouponsOpen] = useState(false);

  const handleApplyCouponCode = async (code: string) => {
    setCouponMsg(null);
    const result = await applyCoupon(code);
    setCouponMsg({ success: result.success, text: result.message });
    if (result.success) {
      setCouponCodeInput(code);
      setIsCouponsOpen(false);
    }
  };

  const handleRemoveCoupon = () => {
    removeCoupon();
    setCouponCodeInput('');
    setCouponMsg(null);
  };

  const handleProceed = () => {
    if (isPreorderCart && !preorderSchedule) {
      alert('Please select a preorder delivery slot before proceeding.');
      setIsPreorderScheduleModalOpen(true);
      return;
    }
    if (!user) {
      navigate('/login');
    } else {
      // Save instructions/notes to localStorage to read in Checkout
      localStorage.setItem('checkout_order_notes', notes);
      navigate('/checkout');
    }
  };

  if (cartItems.length === 0) {
    return (
      <div className="max-w-xl mx-auto px-4 py-20 text-center flex flex-col items-center justify-center min-h-[75vh]">
        <div className="h-28 w-28 rounded-full bg-[#E2E8F0] text-[#1565C0] flex items-center justify-center mb-6">
          <ShoppingBag className="h-14 w-14" />
        </div>
        <h2 className="text-xl font-black text-gray-800 dark:text-white">Your Cart is Empty</h2>
        <p className="text-xs font-semibold text-gray-400 dark:text-[#94A3B8] mt-2 max-w-sm leading-relaxed">
          Looks like you haven't added anything to your cart. Explore nearby shops to get everything delivered instantly.
        </p>
        <Button variant="primary" className="mt-8 rounded-xl px-8 py-3" onClick={() => navigate('/')}>
          Shop Now
        </Button>
      </div>
    );
  }

  const isPreorderCart = cartItems.some(i => i.isPreorder);

  return (
    <div className="w-full max-w-full overflow-x-hidden px-3 sm:px-4 pb-[calc(10rem+env(safe-area-inset-bottom))] sm:pb-28 text-left space-y-4">
      
      {/* Title Header */}
      <div className="py-4 border-b border-[#E2E8F0] dark:border-[#334155] flex items-center justify-between mb-4">
        <div>
          <h2 className="text-lg font-black text-gray-800 dark:text-white uppercase tracking-wider">
            Shopping Cart
          </h2>
          <span className="text-xs font-bold text-gray-400 dark:text-[#94A3B8]">
            Ordering from <span className="font-black text-[#1565C0] dark:text-[#1E88E5]">{cartShopName}</span>
          </span>
        </div>
        <button
          onClick={clearCart}
          className="text-xs font-black text-red-500 hover:underline cursor-pointer"
        >
          Clear All
        </button>
      </div>

      {/* Cart Items List */}
      <div className="flex flex-col gap-4">
        {cartItems.map(item => (
          <div
            key={item.product.id}
            className="p-4 rounded-[20px] bg-white dark:bg-[#1E293B] border border-[#E2E8F0] dark:border-[#334155] flex items-start gap-3.5 shadow-[0_4px_16px_rgba(46,125,50,0.02)]"
          >
            {/* Image */}
            <div className="h-16 w-16 rounded-xl bg-[#F8FAFC] dark:bg-[#1E293B] p-1.5 overflow-hidden shrink-0 flex items-center justify-center border border-[#E2E8F0] dark:border-[#334155]">
              <img src={item.product.image} alt={item.product.name} className="h-full w-full object-contain" />
            </div>

            {/* Info */}
            <div className="flex-1 flex flex-col justify-between min-h-[64px]">
              <div>
                <h4 className="text-xs font-black text-gray-800 dark:text-white line-clamp-1 pr-6 leading-snug">
                  {item.product.name}
                </h4>
                <div className="flex items-center gap-1.5 mt-0.5">
                  <span className="text-[9px] font-black uppercase text-gray-400">
                    {item.product.specifications?.['Weight'] || item.product.specifications?.['Volume'] || item.product.specifications?.['Quantity'] || item.product.specifications?.['Count'] || item.product.specifications?.['Size'] || '1 unit'}
                  </span>
                  {item.isPreorder && (
                    <span className="px-1.5 py-0.2 rounded bg-purple-100 dark:bg-purple-950/60 text-purple-700 dark:text-purple-400 text-[8px] font-black uppercase tracking-wide">
                      Preorder Slot
                    </span>
                  )}
                </div>
              </div>

              {/* Price & Quantity adjusting */}
              <div className="mt-2.5 flex items-center justify-between">
                <span className="text-sm font-black text-gray-900 dark:text-white">
                  ₹{item.product.price * item.quantity}
                </span>

                <div className="flex items-center gap-2 border border-[#1E88E5] bg-[#E2E8F0]/50 dark:bg-[#334155]/30 rounded-xl px-1.5 py-1 shadow-sm">
                  <button
                    onClick={() => updateQuantity(item.product.id, item.quantity - 1)}
                    className="p-0.5 text-[#1565C0] dark:text-[#1E88E5] cursor-pointer hover:scale-105"
                  >
                    <Minus className="h-3.5 w-3.5" />
                  </button>
                  <span className="text-xs font-black text-[#1565C0] dark:text-[#1E88E5] w-4 text-center">
                    {item.quantity}
                  </span>
                  <button
                    onClick={() => updateQuantity(item.product.id, item.quantity + 1)}
                    className="p-0.5 text-[#1565C0] dark:text-[#1E88E5] cursor-pointer hover:scale-105"
                  >
                    <Plus className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            </div>

            {/* Trash Delete */}
            <button
              onClick={() => removeFromCart(item.product.id)}
              className="p-1.5 rounded-lg bg-gray-50 dark:bg-[#1E293B] border border-gray-100 dark:border-[#334155] text-gray-400 hover:text-red-500 transition-colors cursor-pointer"
            >
              <Trash2 className="h-4 w-4" />
            </button>

          </div>
        ))}
      </div>

      {/* Universal Delivery Mode Selector (Deliver Now vs Pre-Order Schedule) */}
      <div className="mt-5 p-4 rounded-[20px] bg-white dark:bg-[#1E293B] border border-[#E2E8F0] dark:border-[#334155] shadow-xs flex flex-col gap-3 text-left">
        <span className="text-[10px] font-black uppercase tracking-wider text-gray-400 dark:text-[#94A3B8] flex items-center gap-1.5">
          <Clock className="h-3.5 w-3.5 text-[#0B74E8]" /> Select Delivery Option
        </span>
        
        <div className="grid grid-cols-2 gap-2.5">
          {/* Option A: Instant Deliver Now */}
          <button
            type="button"
            onClick={() => setPreorderSchedule(null)}
            className={`p-3 rounded-2xl border text-left transition-all cursor-pointer flex flex-col justify-between ${
              !preorderSchedule
                ? 'bg-gradient-to-br from-[#1E88E5]/15 to-[#0B74E8]/15 border-[#0B74E8] text-[#0B74E8] dark:text-[#60A5FA] ring-2 ring-[#0B74E8]/30 font-black'
                : 'bg-white dark:bg-[#1E293B] border-gray-200 dark:border-[#334155] text-gray-700 dark:text-gray-300 hover:border-[#0B74E8]'
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-[9px] font-black uppercase tracking-wider text-emerald-600 dark:text-emerald-400">⚡ Instant</span>
              {!preorderSchedule && <Check className="h-4 w-4 text-[#0B74E8] shrink-0" />}
            </div>
            <div className="text-xs font-black mt-1.5 text-gray-900 dark:text-white">
              Deliver Now
            </div>
            <div className="text-[9px] text-gray-400 dark:text-gray-400 mt-0.5 font-bold">Standard quick dispatch</div>
          </button>

          {/* Option B: Pre-Order Schedule */}
          <button
            type="button"
            onClick={() => setIsPreorderScheduleModalOpen(true)}
            className={`p-3 rounded-2xl border text-left transition-all cursor-pointer flex flex-col justify-between ${
              preorderSchedule
                ? 'bg-gradient-to-br from-[#FFC928]/20 to-[#F59E0B]/20 border-[#FFC928] text-slate-950 dark:text-amber-300 ring-2 ring-[#FFC928]/40 font-black'
                : 'bg-white dark:bg-[#1E293B] border-gray-200 dark:border-[#334155] text-gray-700 dark:text-gray-300 hover:border-[#FFC928]'
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-[9px] font-black uppercase tracking-wider text-amber-600 dark:text-amber-400">📅 Pre-Order</span>
              {preorderSchedule && <Check className="h-4 w-4 text-amber-600 shrink-0" />}
            </div>
            <div className="text-xs font-black mt-1.5 text-gray-900 dark:text-white truncate">
              {preorderSchedule ? `📅 ${preorderSchedule.date}` : 'Schedule Date & Slot'}
            </div>
            <div className="text-[9px] text-amber-600 dark:text-amber-400 mt-0.5 font-bold truncate">
              {preorderSchedule ? `Slot: ${preorderSchedule.slot}` : 'Pick 2-Hour Slot'}
            </div>
          </button>
        </div>
      </div>

      {/* Instructions Entry */}
      <div className="mt-5">
        <span className="text-[10px] font-black uppercase text-gray-400 dark:text-[#94A3B8] block mb-2 px-1 flex items-center gap-1.5">
          <MessageSquare className="h-3.5 w-3.5 text-[#1565C0] dark:text-[#1E88E5]" />
          {language === 'hi' ? 'दुकानदार के लिए निर्देश' : 'Shop / Delivery Instructions'}
        </span>
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder={language === 'hi' ? 'उदा. नोक न करें, गेट पर छोड़ दें आदि' : 'Avoid ringing bell, leave parcel at gate, contact before arriving etc.'}
          rows={2}
          className="w-full p-4 rounded-2xl border border-[#E2E8F0] dark:border-[#334155] bg-white dark:bg-[#1E293B] text-xs font-semibold text-gray-800 dark:text-white placeholder-gray-400 dark:placeholder-[#64748B] outline-none focus:border-[#1E88E5] shadow-inner transition-all"
        />
      </div>

      {/* Coupon Segment */}
      <div className="mt-5">
        <span className="text-[10px] font-black uppercase text-gray-400 dark:text-[#94A3B8] block mb-2 px-1 flex items-center gap-1.5">
          <Ticket className="h-3.5 w-3.5 text-[#1565C0] dark:text-[#1E88E5]" />
          Offers & Coupons
        </span>
        <div className="p-4 rounded-[20px] bg-white dark:bg-[#1E293B] border border-[#E2E8F0] dark:border-[#334155] flex flex-col gap-3 shadow-[0_4px_16px_rgba(46,125,50,0.02)]">
          
          <div className="flex gap-2">
            <input
              type="text"
              placeholder="Enter Promo Code"
              value={couponCodeInput}
              onChange={(e) => setCouponCodeInput(e.target.value)}
              className="flex-1 px-4 py-2.5 rounded-xl border border-[#E2E8F0] dark:border-[#334155] text-xs font-bold uppercase text-gray-800 dark:text-white bg-white dark:bg-[#1E293B] outline-none focus:border-[#1E88E5] shadow-inner"
            />
            {coupon ? (
              <Button variant="danger" className="rounded-xl px-4 py-2.5 text-xs font-black" onClick={handleRemoveCoupon}>
                Remove
              </Button>
            ) : (
              <Button variant="primary" className="rounded-xl px-5 py-2.5 text-xs font-black" onClick={() => handleApplyCouponCode(couponCodeInput)}>
                Apply
              </Button>
            )}
          </div>

          {couponMsg && (
            <span className={`text-[10px] font-black text-left block px-1 ${couponMsg.success ? 'text-blue-500' : 'text-red-500'}`}>
              {couponMsg.text}
            </span>
          )}

          {/* Show active coupon applied */}
          {coupon && (
            <div className="p-2.5 rounded-xl bg-blue-500/5 dark:bg-[#334155]/20 border border-blue-500/10 dark:border-[#1E88E5]/20 text-blue-700 dark:text-[#1E88E5] text-[10px] font-black text-left flex items-start gap-1">
              <span>🎉 Coupon "{coupon.code}" Applied: {coupon.description}</span>
            </div>
          )}

          <button
            onClick={() => setIsCouponsOpen(true)}
            className="text-[10px] font-black text-[#1565C0] dark:text-[#1E88E5] uppercase tracking-wide flex items-center justify-center gap-1 cursor-pointer mt-1 hover:underline"
          >
            Browse Available Coupons
            <ArrowRight className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      {/* Invoice Breakdown */}
      <div className="mt-5">
        <span className="text-[10px] font-black uppercase text-gray-400 dark:text-[#94A3B8] block mb-2 px-1">
          Bill Details
        </span>
        <div className="p-5 rounded-[20px] bg-white dark:bg-[#1E293B] border border-[#E2E8F0] dark:border-[#334155] flex flex-col gap-3 text-xs font-bold text-gray-500 dark:text-[#94A3B8] shadow-[0_4px_16px_rgba(46,125,50,0.02)]">
          
          <div className="flex justify-between">
            <span>Item Subtotal</span>
            <span className="text-gray-900 dark:text-white font-extrabold">₹{priceBreakdown.subtotal}</span>
          </div>

          {priceBreakdown.discount > 0 && (
            <div className="flex justify-between text-blue-600 dark:text-[#1E88E5] font-black">
              <span>Coupon Discount</span>
              <span>-₹{priceBreakdown.discount}</span>
            </div>
          )}

          <div className="flex justify-between">
            <span>Delivery Charge</span>
            {priceBreakdown.deliveryCharge === 0 ? (
              <span className="text-blue-600 dark:text-[#1E88E5] font-black uppercase">Free</span>
            ) : (
              <span className="text-gray-900 dark:text-white font-extrabold">₹{priceBreakdown.deliveryCharge}</span>
            )}
          </div>

          {priceBreakdown.taxes > 0 && (
            <div className="flex justify-between">
              <span>Govt. Taxes (5% GST)</span>
              <span className="text-gray-900 dark:text-white font-extrabold">₹{priceBreakdown.taxes}</span>
            </div>
          )}

          <div className="flex justify-between pb-3 border-b border-[#E2E8F0] dark:border-[#334155]">
            <span>Handling Fee</span>
            <span className="text-gray-900 dark:text-white font-extrabold">₹{priceBreakdown.platformFee}</span>
          </div>

          <div className="flex justify-between text-sm font-black text-gray-900 dark:text-white pt-1">
            <span>Grand Total</span>
            <span className="text-[#1565C0] dark:text-[#1E88E5] text-base">₹{priceBreakdown.grandTotal}</span>
          </div>

          {priceBreakdown.subtotal >= 149 ? (
            <div className="mt-1 p-2 rounded-xl bg-blue-500/5 text-blue-700 dark:text-[#1E88E5] text-[10px] font-black text-center flex items-center justify-center gap-1.5">
              <Check className="h-4 w-4" />
              <span>YAY! You saved delivery charge of ₹25 on this order!</span>
            </div>
          ) : (
            <span className="text-[9px] font-semibold text-gray-400 block mt-0.5 text-center">
              Add products worth ₹{149 - priceBreakdown.subtotal} more to get Free Delivery!
            </span>
          )}

        </div>
      </div>

      {/* Sticky Proceed Button Dock */}
      <div className="fixed inset-x-0 bottom-0 z-35 border-t border-[#E2E8F0] bg-[#F8FAFC]/95 px-4 pt-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))] shadow-2xl backdrop-blur-md transition-colors dark:border-[#334155] dark:bg-[#0F172A]/95">
        <div className="max-w-xl mx-auto flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex min-w-0 items-center justify-between text-left sm:block">
            <span className="text-sm font-black text-gray-900 dark:text-white">₹{priceBreakdown.grandTotal}</span>
            <span className="text-[9px] font-bold text-gray-400 uppercase tracking-wide">Grand Total</span>
          </div>
          <Button
            onClick={handleProceed}
            fullWidth
            className="min-w-0 rounded-2xl px-4 py-3.5 font-black text-xs sm:w-auto sm:px-6 bg-gradient-to-br from-[#1E88E5] to-[#1565C0]"
          >
            <span className="truncate">PROCEED TO CHECKOUT</span>
            <ArrowRight className="h-4.5 w-4.5" />
          </Button>
        </div>
      </div>

      {/* Available Coupons Drawer Modal */}
      <Dialog isOpen={isCouponsOpen} onClose={() => setIsCouponsOpen(false)} title="Available Coupons">
        <div className="flex flex-col gap-4 text-left">
          {(useAppStore.getState().coupons || []).map(c => (
            <div
              key={c.code}
              className="p-4.5 rounded-[20px] border border-dashed border-[#90CAF9] bg-white dark:bg-[#1E293B] flex flex-col gap-2.5 relative overflow-hidden"
            >
              {/* Little circle cuts on side for coupon look */}
              <div className="absolute top-1/2 -left-2 h-4 w-4 bg-[#F8FAFC] dark:bg-[#0F172A] rounded-full border border-[#90CAF9]/20 -translate-y-1/2" />
              <div className="absolute top-1/2 -right-2 h-4 w-4 bg-[#F8FAFC] dark:bg-[#0F172A] rounded-full border border-[#90CAF9]/20 -translate-y-1/2" />

              <div className="flex items-center justify-between">
                <span className="px-3.5 py-1.5 border border-[#1565C0] rounded-xl bg-[#E2E8F0]/50 dark:bg-[#334155]/30 text-[#1565C0] dark:text-[#1E88E5] text-xs font-black uppercase tracking-wider select-all">
                  {c.code}
                </span>
                <button
                  onClick={() => handleApplyCouponCode(c.code)}
                  className="text-xs font-black text-[#1565C0] dark:text-[#1E88E5] uppercase tracking-wide cursor-pointer hover:underline"
                >
                  Apply
                </button>
              </div>
              <div>
                <p className="text-xs font-bold text-gray-800 dark:text-gray-200">{c.description}</p>
                <span className="text-[10px] font-semibold text-gray-400 block mt-1">
                  Expires {new Date(c.expiryDate).toLocaleDateString()} • Min. Order ₹{c.minOrderValue}
                </span>
              </div>
            </div>
          ))}
        </div>
      </Dialog>

      {/* Preorder Schedule Modal */}
      <PreorderModal
        isOpen={isPreorderScheduleModalOpen}
        onClose={() => setIsPreorderScheduleModalOpen(false)}
        onConfirm={(schedule) => {
          setPreorderSchedule(schedule);
        }}
        initialDate={preorderSchedule?.date}
        initialSlot={preorderSchedule?.slot}
      />
    </div>
  );
};
