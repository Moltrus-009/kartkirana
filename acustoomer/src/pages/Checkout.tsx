import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, MapPin, CreditCard, Landmark, Coins, Wallet, CheckCircle, Clock, MessageSquare, Ticket, Plus } from 'lucide-react';
import { useCart } from '../context/CartContext';
import { useAddress } from '../context/AddressContext';
import { useAuth } from '../context/AuthContext';
import { dbService } from '../services/dbService';
import { Button } from '../components/ui/Button';
import { Dialog } from '../components/ui/Dialog';
import { useAppStore } from '../core/store/useAppStore';
import { paymentService } from '../services/paymentService';
import { IS_MOCK_MODE } from '../infrastructure/firebase/firebase';
import { AddressSelectorModal } from '../components/AddressSelectorModal';

export const Checkout: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { cartItems, cartShopId, cartShopName, coupon, priceBreakdown, clearCart, preorderSchedule, setPreorderSchedule } = useCart();
  const { addresses, selectedAddress, selectAddress, addAddress } = useAddress();

  const [paymentMethod, setPaymentMethod] = useState<'upi' | 'card' | 'net_banking' | 'cod' | 'wallet'>('upi');
  const [orderNotes, setOrderNotes] = useState('');
  const [isPlacingOrder, setIsPlacingOrder] = useState(false);
  const [verificationStatus, setVerificationStatus] = useState('');
  const [isAddressModalOpen, setIsAddressModalOpen] = useState(false);

  const [isPreorderModalOpen, setIsPreorderModalOpen] = useState(false);
  const [tempDate, setTempDate] = useState(preorderSchedule?.date || new Date().toISOString().split('T')[0]);
  const [tempSlot, setTempSlot] = useState(preorderSchedule?.slot || '08:00 AM - 10:00 AM');

  const [isOutOfZone, setIsOutOfZone] = useState(false);
  const [shopDistance, setShopDistance] = useState(0);

  const [showMockQRModal, setShowMockQRModal] = useState(false);
  const [isVerifyingPayment, setIsVerifyingPayment] = useState(false);
  const [createdOrderData, setCreatedOrderData] = useState<any>(null);
  const [qrCountdown, setQrCountdown] = useState(300);

  useEffect(() => {
    let timer: any;
    if (showMockQRModal && qrCountdown > 0) {
      timer = setInterval(() => {
        setQrCountdown(prev => prev - 1);
      }, 1000);
    } else if (qrCountdown === 0) {
      setShowMockQRModal(false);
      setIsPlacingOrder(false);
      setVerificationStatus('');
    }
    return () => clearInterval(timer);
  }, [showMockQRModal, qrCountdown]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const handleSimulateSuccess = async () => {
    if (!createdOrderData) return;
    setIsVerifyingPayment(true);
    setVerificationStatus('Verifying payment securely...');
    try {
      const verified = await paymentService.verifyPaymentSignature(
        'pay_mock_' + Math.random().toString(36).substring(2, 9),
        createdOrderData.gatewayOrderId || createdOrderData.orderId,
        'mock_valid_signature',
        createdOrderData.orderId,
        user!.uid
      );

      if (!verified) {
        throw new Error('Payment signature verification failed.');
      }

      localStorage.removeItem('checkout_order_notes');
      clearCart();
      useAppStore.getState().subscribeOrders(user!.uid);
      setShowMockQRModal(false);
      navigate('/orders', { state: { placedOrderId: createdOrderData.orderId } });
    } catch (err: any) {
      alert(err.message || 'Payment verification failed. Please contact support.');
    } finally {
      setIsVerifyingPayment(false);
      setIsPlacingOrder(false);
      setVerificationStatus('');
    }
  };

  // Check if coordinates fall within the supported delivery zone
  useEffect(() => {
    if (!selectedAddress || !cartShopId) {
      setIsOutOfZone(false);
      return;
    }

    const shops = useAppStore.getState().shops;
    const shop = shops?.find(s => s.id === cartShopId);

    // Haversine calculator with road traffic modifier factor (1.35x)
    const getHaversine = (lat1: number, lon1: number, lat2: number, lon2: number): number => {
      const R = 6371;
      const dLat = (lat2 - lat1) * Math.PI / 180;
      const dLon = (lon2 - lon1) * Math.PI / 180;
      const a =
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
        Math.sin(dLon / 2) * Math.sin(dLon / 2);
      const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
      return R * c * 1.35;
    };

    if (shop) {
      const hasCoords = selectedAddress.lat && selectedAddress.lng && shop.lat && shop.lng;
      const dist = hasCoords
        ? getHaversine(selectedAddress.lat, selectedAddress.lng, shop.lat, shop.lng)
        : (parseFloat(shop.distance) || 0);
      setShopDistance(dist);
      setIsOutOfZone(dist > 15.0);
    }
  }, [selectedAddress, cartShopId]);

  useEffect(() => {
    // Read saved notes and check login state
    if (!user) {
      navigate('/login');
      return;
    }
    if (cartItems.length === 0) {
      navigate('/cart');
      return;
    }
    const savedNotes = localStorage.getItem('checkout_order_notes') || '';
    setOrderNotes(savedNotes);
  }, [user, cartItems, navigate]);

  const handlePlaceOrder = async () => {
    if (!user || !selectedAddress || isPlacingOrder) return;

    const deliveryAddress = {
      ...selectedAddress,
      label: selectedAddress.label || selectedAddress.name,
      address: [selectedAddress.details, selectedAddress.area, selectedAddress.city, selectedAddress.pinCode]
        .filter(Boolean)
        .join(', '),
      coords: { lat: selectedAddress.lat, lng: selectedAddress.lng }
    };

    const orderItems = cartItems.map(i => ({
      productId: i.product.id,
      name: i.product.name,
      price: i.product.price,
      quantity: i.quantity
    }));

    const cartHash = orderItems.map(i => `${i.productId}:${i.quantity}`).sort().join('_');
    const deterministicIdempotencyKey = `idem_${user.uid}_${cartShopId}_${priceBreakdown.grandTotal}_${cartHash}`;

    setIsPlacingOrder(true);
    setVerificationStatus('Creating secure payment session...');

    if (paymentMethod === 'cod') {
      try {
        const result = await paymentService.createRazorpayOrder(
          priceBreakdown.grandTotal,
          user.uid,
          cartShopId || '',
          orderItems,
          deliveryAddress,
          coupon?.code || null,
          0,
          '',
          preorderSchedule,
          orderNotes,
          deterministicIdempotencyKey,
          'cod'
        );

        if (result.cod) {
          localStorage.removeItem('checkout_order_notes');
          clearCart();
          useAppStore.getState().subscribeOrders(user.uid);
          navigate('/orders', { state: { placedOrderId: result.orderId } });
        } else {
          throw new Error('Expected Cash on Delivery response from server.');
        }
      } catch (err: any) {
        alert(err.message || 'Failed to place Cash on Delivery order. Please try again.');
      } finally {
        setIsPlacingOrder(false);
        setVerificationStatus('');
      }
    } else {
      try {
        const verifiedProfile = useAppStore.getState().userProfile;

        if (IS_MOCK_MODE) {
          const rzpOrder = await paymentService.createRazorpayOrder(
            priceBreakdown.grandTotal,
            user.uid,
            cartShopId || '',
            orderItems,
            deliveryAddress,
            coupon?.code || null,
            paymentMethod === 'wallet' ? priceBreakdown.grandTotal : 0,
            '',
            preorderSchedule,
            orderNotes,
            deterministicIdempotencyKey
          );

          const selectedShop = useAppStore.getState().shops?.find(s => s.id === (cartShopId || ''));
          const exactShopCoords = selectedShop && selectedShop.lat && selectedShop.lng
            ? { lat: selectedShop.lat, lng: selectedShop.lng }
            : { lat: 28.5835, lng: 77.3142 };
          const exactShopName = selectedShop?.name || cartShopName || 'Partner Store';
          const exactShopAddress = selectedShop?.address || 'Store Location';

          const mockOrder = {
            id: rzpOrder.orderId,
            userId: user.uid,
            shopId: cartShopId || '',
            shopName: exactShopName,
            shopAddress: exactShopAddress,
            items: cartItems.map(i => ({
              product: i.product,
              quantity: i.quantity,
              isPreorder: i.product.isPreorder,
              preorderDate: preorderSchedule?.date,
              preorderSlot: preorderSchedule?.slot
            })),
            priceBreakdown: {
              subtotal: priceBreakdown.subtotal,
              discount: priceBreakdown.discount,
              taxes: priceBreakdown.taxes,
              deliveryCharge: priceBreakdown.deliveryCharge,
              platformFee: priceBreakdown.platformFee,
              packagingFee: priceBreakdown.packagingFee || 0,
              grandTotal: priceBreakdown.grandTotal
            },
            status: 'PLACED' as const,
            paymentMethod: paymentMethod,
            paymentStatus: 'completed' as const,
            deliveryAddress,
            contact: { name: verifiedProfile?.name || user.name || 'Customer Name', phone: verifiedProfile?.phone || user.phone || '9999911111' },
            instructions: orderNotes,
            estimatedDelivery: '15-20 min',
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            timeline: [
              { status: 'PLACED' as const, timestamp: new Date().toISOString(), title: 'Order Confirmed', description: 'Payment succeeded and order is placed.' }
            ],
            rider: null,
            shopCoords: exactShopCoords
          };

          await useAppStore.getState().createOrder(mockOrder as any);

          localStorage.removeItem('checkout_order_notes');
          clearCart();
          useAppStore.getState().subscribeOrders(user.uid);
          navigate('/orders', { state: { placedOrderId: rzpOrder.orderId } });
          return;
        }

        const sdkLoaded = await paymentService.loadRazorpaySDK();
        if (!sdkLoaded) {
          alert('Unable to load payment gateway. Please check your internet connection and try again.');
          setIsPlacingOrder(false);
          setVerificationStatus('');
          return;
        }

        const rzpOrder = await paymentService.createRazorpayOrder(
          priceBreakdown.grandTotal,
          user.uid,
          cartShopId || '',
          orderItems,
          deliveryAddress,
          coupon?.code || null,
          paymentMethod === 'wallet' ? priceBreakdown.grandTotal : 0,
          '',
          preorderSchedule,
          orderNotes,
          deterministicIdempotencyKey
        );

        setVerificationStatus('Launching payment window...');

        const options = {
          key: rzpOrder.paymentKey,
          amount: Math.round(priceBreakdown.grandTotal * 100),
          currency: rzpOrder.currency || 'INR',
          name: 'Kart Kirana',
          description: `Order #${rzpOrder.orderId}`,
          order_id: rzpOrder.gatewayOrderId,
          prefill: {
            name: verifiedProfile?.name || user.name || '',
            contact: verifiedProfile?.phone || user.phone || ''
          },
          theme: { color: '#1565C0' },
          handler: async (response: any) => {
            setIsPlacingOrder(true);
            setVerificationStatus('Verifying payment securely...');
            try {
              const verified = await paymentService.verifyPaymentSignature(
                response.razorpay_payment_id,
                response.razorpay_order_id,
                response.razorpay_signature,
                rzpOrder.orderId,
                user.uid
              );

              if (!verified) {
                alert('Payment could not be verified. If money has been deducted, it will be reconciled automatically.');
                setIsPlacingOrder(false);
                setVerificationStatus('');
                return;
              }

              localStorage.removeItem('checkout_order_notes');
              clearCart();
              useAppStore.getState().subscribeOrders(user.uid);
              navigate('/orders', { state: { placedOrderId: rzpOrder.orderId } });
            } catch (err: any) {
              alert('Payment could not be verified. If money has been deducted, it will be reconciled automatically.');
              setIsPlacingOrder(false);
              setVerificationStatus('');
            }
          },
          modal: {
            ondismiss: () => {
              console.log('[Razorpay Checkout] User dismissed payment window.');
              setIsPlacingOrder(false);
              setVerificationStatus('');
            }
          }
        };

        const rzp = new (window as any).Razorpay(options);
        rzp.on('payment.failed', (response: any) => {
          console.warn('[Razorpay Checkout] Payment failed on gateway:', response.error);
          alert(`Payment failed: ${response.error?.description || 'Transaction declined by bank.'}`);
          setIsPlacingOrder(false);
          setVerificationStatus('');
        });
        rzp.open();
      } catch (err: any) {
        alert(err.message || 'Failed to initialize payment. Please try again.');
        setIsPlacingOrder(false);
        setVerificationStatus('');
      }
    }
  };

  const paymentOptions = [
    { id: 'upi' as const, name: 'UPI (GPay / PhonePe / Paytm)', icon: Wallet },
    { id: 'card' as const, name: 'Credit / Debit Cards', icon: CreditCard },
    { id: 'net_banking' as const, name: 'Net Banking', icon: Landmark },
    { id: 'cod' as const, name: 'Cash on Delivery (COD)', icon: Coins },
    { id: 'wallet' as const, name: 'Kart Kirana Wallet', icon: Wallet }
  ];

  return (
    <div className="max-w-xl mx-auto w-full px-4 pb-[calc(10rem+env(safe-area-inset-bottom))] sm:pb-28 text-left">
      {/* Header bar */}
      <div className="sticky top-0 z-35 bg-[#F8FAFC]/90 dark:bg-[#0F172A]/90 backdrop-blur-md py-3.5 flex items-center gap-3 border-b border-[#E2E8F0] dark:border-[#334155] mb-4">
        <button
          onClick={() => navigate('/cart')}
          className="p-2.5 rounded-xl hover:bg-gray-150 dark:hover:bg-[#1E293B] text-gray-500 dark:text-gray-400 cursor-pointer border border-[#E2E8F0] dark:border-[#334155] shadow-sm bg-white dark:bg-[#1E293B]"
        >
          <ArrowLeft className="h-5 w-5" />
        </button>
        <h2 className="text-lg font-black text-gray-800 dark:text-white uppercase tracking-wider">
          Verify Checkout
        </h2>
      </div>

      <div className="flex flex-col gap-5">

        {/* Address selection */}
        <div>
          <div className="flex items-center justify-between mb-2 px-1">
            <span className="text-[10px] font-black uppercase text-gray-400 dark:text-[#94A3B8] flex items-center gap-1.5">
              <MapPin className="h-4 w-4 text-[#1565C0] dark:text-[#1E88E5]" />
              Deliver To Address
            </span>
            <button
              type="button"
              onClick={() => setIsAddressModalOpen(true)}
              className="text-[10px] font-black uppercase text-blue-600 dark:text-blue-400 flex items-center gap-1 hover:underline cursor-pointer"
            >
              <Plus className="h-3.5 w-3.5" />
              <span>Add New</span>
            </button>
          </div>

          <div className="p-4 rounded-[20px] bg-white dark:bg-[#1E293B] border border-[#E2E8F0] dark:border-[#334155] flex flex-col gap-3 shadow-[0_4px_16px_rgba(46,125,50,0.02)]">
            {addresses.length === 0 ? (
              <div className="text-center py-4">
                <p className="text-xs text-gray-500 mb-2 font-medium">No address saved yet</p>
                <button
                  type="button"
                  onClick={() => setIsAddressModalOpen(true)}
                  className="px-4 py-2 bg-blue-500 text-white rounded-xl text-xs font-bold uppercase tracking-wider cursor-pointer"
                >
                  Add Delivery Address
                </button>
              </div>
            ) : (
              addresses.map(addr => (
                <div
                  key={addr.id}
                  onClick={() => selectAddress(addr.id)}
                  className={`p-3 rounded-2xl border transition-all cursor-pointer flex items-start gap-3
                    ${addr.id === selectedAddress?.id
                      ? 'border-[#1565C0] bg-[#E2E8F0]/20 dark:bg-[#334155]/20'
                      : 'border-gray-50 dark:border-[#334155] hover:bg-gray-50 dark:hover:bg-[#1E293B]'
                    }`}
                >
                  <input
                    type="radio"
                    name="delivery_address"
                    checked={addr.id === selectedAddress?.id}
                    onChange={() => selectAddress(addr.id)}
                    className="mt-1 cursor-pointer accent-[#1565C0] dark:accent-[#1E88E5]"
                  />
                  <div>
                    <span className="text-xs font-bold text-gray-800 dark:text-white">{addr.name}</span>
                    <span className="text-[10px] font-semibold text-gray-400 dark:text-[#94A3B8] block mt-0.5">
                      {addr.details}, {addr.area}, {addr.city}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Preorder/Delivery speed estimate */}
        <div className="p-4 rounded-[20px] border border-[#90CAF9]/30 dark:border-[#334155] bg-[#E2E8F0]/30 dark:bg-[#1E293B]/20 flex items-center justify-between gap-3 shadow-sm">
          <div className="flex items-start gap-3">
            <Clock className="h-5 w-5 text-[#1565C0] dark:text-[#1E88E5] flex-shrink-0 mt-0.5" />
            <div className="text-xs font-bold text-gray-700 dark:text-[#94A3B8]">
              <span className="block font-black mb-0.5 text-[#1565C0] dark:text-[#1E88E5]">Estimated Delivery</span>
              <span>
                {cartItems.some(i => i.isPreorder)
                  ? `Preorder Schedule: ${preorderSchedule?.date} (${preorderSchedule?.slot})`
                  : 'Items arriving in 15-20 Mins from order approval.'}
              </span>
            </div>
          </div>
          {cartItems.some(i => i.isPreorder) && (
            <button
              onClick={() => {
                setTempDate(preorderSchedule?.date || new Date().toISOString().split('T')[0]);
                setTempSlot(preorderSchedule?.slot || '08:00 AM - 10:00 AM');
                setIsPreorderModalOpen(true);
              }}
              className="text-[10px] font-black uppercase tracking-wider text-[#1565C0] dark:text-[#1E88E5] border border-[#1565C0]/25 px-2.5 py-1 rounded-xl hover:bg-[#E2E8F0] cursor-pointer transition-colors"
            >
              Change
            </button>
          )}
        </div>

        {/* Payment Methods */}
        <div>
          <span className="text-[10px] font-black uppercase text-gray-400 dark:text-[#94A3B8] block mb-2 px-1 flex items-center gap-1.5">
            <CreditCard className="h-4 w-4 text-[#1565C0] dark:text-[#1E88E5]" />
            Choose Payment Method
          </span>
          <div className="p-4 rounded-[20px] bg-white dark:bg-[#1E293B] border border-[#E2E8F0] dark:border-[#334155] flex flex-col gap-3 shadow-[0_4px_16px_rgba(46,125,50,0.02)]">
            {paymentOptions.map(opt => {
              const Icon = opt.icon;
              return (
                <div
                  key={opt.id}
                  onClick={() => setPaymentMethod(opt.id)}
                  className={`p-3 rounded-2xl border transition-all cursor-pointer flex items-center justify-between
                    ${paymentMethod === opt.id
                      ? 'border-[#1565C0] bg-[#E2E8F0]/20 dark:bg-[#334155]/20'
                      : 'border-gray-50 dark:border-[#334155] hover:bg-gray-50 dark:hover:bg-[#1E293B]'
                    }`}
                >
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-xl bg-gray-50 dark:bg-[#1E293B] text-[#1565C0] dark:text-[#1E88E5] border border-[#E2E8F0] dark:border-[#334155]">
                      <Icon className="h-4 w-4" />
                    </div>
                    <span className="text-xs font-bold text-gray-800 dark:text-white">{opt.name}</span>
                  </div>
                  <input
                    type="radio"
                    name="payment_method"
                    checked={paymentMethod === opt.id}
                    onChange={() => setPaymentMethod(opt.id)}
                    className="cursor-pointer accent-[#1565C0] dark:accent-[#1E88E5]"
                  />
                </div>
              );
            })}
          </div>
        </div>
        {/* Order Notes */}
        {orderNotes && (
          <div>
            <span className="text-[10px] font-black uppercase text-gray-400 dark:text-[#94A3B8] block mb-2 px-1 flex items-center gap-1.5">
              <MessageSquare className="h-4 w-4 text-[#1565C0] dark:text-[#1E88E5]" />
              Instructions for Shop
            </span>
            <div className="p-4 rounded-[20px] bg-white dark:bg-[#1E293B] border border-[#E2E8F0] dark:border-[#334155] text-xs font-semibold text-gray-850 dark:text-gray-250 italic">
              "{orderNotes}"
            </div>
          </div>
        )}


        {/* Out of zone warning banner */}
        {isOutOfZone && (
          <div className="p-4.5 rounded-[20px] bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-900/40 text-red-700 dark:text-red-400 text-xs font-bold flex flex-col gap-1.5 animate-shake">
            <span className="font-black uppercase text-red-800 dark:text-red-300 text-[10px] tracking-wider">Out of Delivery Range</span>
            <span>Your delivery address is {shopDistance.toFixed(1)} km away. Maximum serviceable radius is 15.0 km.</span>
            <span className="text-[10px] text-gray-400 dark:text-[#94A3B8] font-semibold leading-normal">Suggest nearest location: please choose or edit your delivery address to select a location closer to {cartShopName}.</span>
          </div>
        )}

        {/* Order Summary Details */}
        <div>
          <span className="text-[10px] font-black uppercase text-gray-400 dark:text-[#94A3B8] block mb-2 px-1">
            Order Summary
          </span>
          <div className="p-4.5 rounded-[20px] bg-white dark:bg-[#1E293B] border border-[#E2E8F0] dark:border-[#334155] flex flex-col gap-3 text-xs font-bold text-gray-500 dark:text-[#94A3B8] shadow-[0_4px_16px_rgba(46,125,50,0.02)]">
            {cartItems.map(item => (
              <div key={item.product.id} className="flex justify-between">
                <span className="text-gray-850 dark:text-gray-200 truncate max-w-[70%] text-left">
                  {item.product.name} <span className="text-gray-400 font-semibold">x{item.quantity}</span>
                </span>
                <span className="text-gray-900 dark:text-white font-extrabold">₹{item.product.price * item.quantity}</span>
              </div>
            ))}
            {/* Detailed price breakdown */}
            <div className="flex flex-col gap-2 pt-2.5 border-t border-[#E2E8F0]/60 dark:border-[#334155]/60 text-[11px] font-bold text-gray-400 dark:text-[#94A3B8]">
              <div className="flex justify-between">
                <span>Item Subtotal:</span>
                <span className="text-gray-800 dark:text-white">₹{priceBreakdown.subtotal}</span>
              </div>
              {priceBreakdown.discount > 0 && (
                <div className="flex justify-between text-blue-600 dark:text-[#1E88E5]">
                  <span>Promo Discount:</span>
                  <span>-₹{priceBreakdown.discount}</span>
                </div>
              )}
              {priceBreakdown.taxes > 0 && (
                <div className="flex justify-between">
                  <span>GST & Taxes (5%):</span>
                  <span className="text-gray-800 dark:text-white">₹{priceBreakdown.taxes}</span>
                </div>
              )}
              <div className="flex justify-between">
                <span>Delivery Partner Fee:</span>
                <span className="text-gray-800 dark:text-white">
                  {priceBreakdown.deliveryCharge === 0 ? (
                    <span className="text-blue-600 dark:text-[#1E88E5] font-black uppercase text-[10px]">FREE</span>
                  ) : (
                    `₹${priceBreakdown.deliveryCharge}`
                  )}
                </span>
              </div>
              {priceBreakdown.packagingFee !== undefined && priceBreakdown.packagingFee > 0 && (
                <div className="flex justify-between">
                  <span>Safety Packaging Fee:</span>
                  <span className="text-gray-800 dark:text-white">₹{priceBreakdown.packagingFee}</span>
                </div>
              )}
              <div className="flex justify-between">
                <span>Handling Fee:</span>
                <span className="text-gray-800 dark:text-white">₹{priceBreakdown.platformFee}</span>
              </div>
            </div>

            <div className="flex justify-between text-gray-900 dark:text-white pt-2.5 border-t border-[#E2E8F0] dark:border-[#334155] font-black text-sm">
              <span>Total Payable</span>
              <span className="text-[#1565C0] dark:text-[#1E88E5] text-base">₹{priceBreakdown.grandTotal}</span>
            </div>
          </div>
        </div>

      </div>

      {/* Place Order bottom dock */}
      <div className="fixed inset-x-0 bottom-0 z-35 border-t border-[#E2E8F0] bg-[#F8FAFC]/95 px-4 pt-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))] shadow-2xl backdrop-blur-md transition-colors dark:border-[#334155] dark:bg-[#0F172A]/95">
        <div className="max-w-xl mx-auto flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex min-w-0 items-center justify-between text-left sm:block">
            <span className="text-sm font-black text-gray-900 dark:text-white">₹{priceBreakdown.grandTotal}</span>
            <span className="text-[9px] font-bold text-gray-400 uppercase tracking-wide">using {paymentMethod.toUpperCase()}</span>
          </div>
          <Button
            onClick={handlePlaceOrder}
            isLoading={isPlacingOrder}
            disabled={isOutOfZone}
            fullWidth
            className={`min-w-0 rounded-2xl px-4 py-3.5 font-black text-xs shadow-lg sm:w-auto sm:px-8 bg-gradient-to-br from-[#1E88E5] to-[#1565C0]
              ${isOutOfZone
                ? 'from-red-500 to-red-700 hover:from-red-600 text-white cursor-not-allowed shadow-red-500/20'
                : 'shadow-[#1565C0]/20'
              }`}
          >
            <span className="truncate">{isOutOfZone ? 'OUT OF RANGE' : (verificationStatus || 'PAY & PLACE ORDER')}</span>
            <CheckCircle className="h-4.5 w-4.5" />
          </Button>
        </div>
      </div>

      {/* Preorder Slot Selection Modal */}
      <Dialog
        isOpen={isPreorderModalOpen}
        onClose={() => setIsPreorderModalOpen(false)}
        title="Schedule Preorder Delivery"
      >
        <div className="flex flex-col gap-4 text-xs font-bold text-gray-650 dark:text-gray-400 text-left">
          <p className="text-[11px] font-semibold text-gray-400">
            Choose when you would like this order to be prepared and delivered. You can cancel any preorder before confirmation.
          </p>

          <div className="flex flex-col gap-1.5">
            <label className="font-extrabold uppercase text-[10px] text-gray-400">Delivery Date</label>
            <input
              type="date"
              value={tempDate}
              min={new Date().toISOString().split('T')[0]}
              max={(() => {
                const maxDate = new Date();
                maxDate.setDate(maxDate.getDate() + 7);
                return maxDate.toISOString().split('T')[0];
              })()}
              onChange={(e) => setTempDate(e.target.value)}
              className="px-3.5 py-3 rounded-2xl border border-[#E2E8F0] dark:border-[#334155] bg-[#F8FAFC] dark:bg-[#1E293B] font-bold text-gray-800 dark:text-gray-250 outline-none focus:border-[#1E88E5]"
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="font-extrabold uppercase text-[10px] text-gray-400">Delivery Time Slot</label>
            <select
              value={tempSlot}
              onChange={(e) => setTempSlot(e.target.value)}
              className="px-3.5 py-3 rounded-2xl border border-[#E2E8F0] dark:border-[#334155] bg-[#F8FAFC] dark:bg-[#1E293B] font-bold text-gray-850 dark:text-gray-255 outline-none focus:border-[#1E88E5]"
            >
              {[
                '08:00 AM - 10:00 AM',
                '10:00 AM - 12:00 PM',
                '12:00 PM - 02:00 PM',
                '04:00 PM - 06:00 PM',
                '06:00 PM - 08:00 PM',
                '08:00 PM - 10:00 PM'
              ].map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>

          <Button
            onClick={() => {
              setPreorderSchedule({ date: tempDate, slot: tempSlot });
              setIsPreorderModalOpen(false);
            }}
            fullWidth
            className="rounded-2xl py-3.5 font-black mt-2 text-xs"
          >
            CONFIRM SCHEDULE
          </Button>
        </div>
      </Dialog>

      {/* Swiggy-Style Mock QR Payment Dialog */}
      <Dialog
        isOpen={showMockQRModal}
        onClose={() => {
          setShowMockQRModal(false);
          setIsPlacingOrder(false);
          setVerificationStatus('');
        }}
        title="UPI Scan QR Payment"
      >
        <div className="flex flex-col items-center text-center gap-4 text-xs font-bold text-gray-700 dark:text-gray-300">
          <div className="bg-[#1565C0]/5 dark:bg-[#1E88E5]/5 border border-[#1565C0]/10 p-3 rounded-2xl w-full">
            <span className="text-[10px] text-gray-400 dark:text-[#94A3B8] uppercase block tracking-wider mb-1">Total Amount Payable</span>
            <span className="text-2xl font-black text-[#1565C0] dark:text-[#1E88E5]">₹{priceBreakdown.grandTotal}</span>
            <span className="text-[10px] text-gray-400 dark:text-[#94A3B8] block mt-1">for order to {cartShopName || 'Merchant'}</span>
          </div>

          <div className="relative p-4 rounded-3xl bg-white border border-[#E2E8F0] dark:border-[#334155] shadow-md flex items-center justify-center w-56 h-56 mx-auto">
            <img
              src={`https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=upi://pay?pa=${createdOrderData?.upiAddress || 'kartkirana@oksbi'}%26pn=Kart%2520Kirana%26am=${priceBreakdown.grandTotal}%26cu=INR`}
              alt="Scan QR code to pay"
              className="w-full h-full object-contain"
              onError={(e) => {
                (e.target as HTMLImageElement).src = `data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="200" height="200" viewBox="0 0 24 24" fill="none" stroke="%231565C0" stroke-width="2"><rect x="3" y="3" width="18" height="18" rx="2"/><rect x="7" y="7" width="3" height="3"/><rect x="14" y="7" width="3" height="3"/><rect x="7" y="14" width="3" height="3"/><path d="M14 14h3v3h-3z"/></svg>`;
              }}
            />
          </div>

          <div className="flex items-center gap-2 bg-yellow-500/10 dark:bg-yellow-500/5 text-yellow-600 dark:text-yellow-400 px-3.5 py-2 rounded-2xl text-[10px]">
            <span className="animate-pulse">⏳</span>
            <span>QR Code expires in <b className="font-mono text-xs">{formatTime(qrCountdown)}</b></span>
          </div>

          <div className="text-[10px] leading-relaxed text-gray-400 font-semibold max-w-xs">
            Open GPay, PhonePe, Paytm, or any UPI app on your phone and scan the QR code to simulate payment.
          </div>

          <div className="w-full flex flex-col gap-2 mt-2">
            <Button
              onClick={handleSimulateSuccess}
              isLoading={isVerifyingPayment}
              className="w-full rounded-2xl py-3.5 font-black text-xs bg-gradient-to-br from-green-500 to-green-700 hover:from-green-600 text-white shadow-lg shadow-green-500/20"
            >
              SIMULATE PAYMENT SUCCESS
            </Button>
            <Button
              variant="outline"
              onClick={() => {
                setShowMockQRModal(false);
                setIsPlacingOrder(false);
                setVerificationStatus('');
              }}
              className="w-full rounded-2xl py-3 text-xs font-bold border-gray-200 text-gray-500"
            >
              Cancel
            </Button>
          </div>
        </div>
      </Dialog>

      <AddressSelectorModal
        isOpen={isAddressModalOpen}
        onClose={() => setIsAddressModalOpen(false)}
        onSave={async (addrData) => {
          const newAddr = await addAddress(addrData);
          selectAddress(newAddr.id);
        }}
      />
    </div>
  );
};
