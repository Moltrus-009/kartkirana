import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Capacitor } from '@capacitor/core';
import { App as CapacitorApp } from '@capacitor/app';
import { Checkout as RazorpayCheckout } from 'capacitor-razorpay';
import { ArrowLeft, MapPin, CreditCard, Landmark, Coins, Wallet, CheckCircle, Clock, MessageSquare, Plus } from 'lucide-react';
import { useCart } from '../context/CartContext';
import { useAddress } from '../context/AddressContext';
import { useAuth } from '../context/AuthContext';
import { Button } from '../components/ui/Button';
import { Dialog } from '../components/ui/Dialog';
import { useAppStore } from '../core/store/useAppStore';
import { paymentService } from '../services/paymentService';
import { IS_MOCK_MODE } from '../infrastructure/firebase/firebase';
import { AddressSelectorModal } from '../components/AddressSelectorModal';
import { PreorderModal } from '../components/PreorderModal';
import { isValidPreorderSchedule } from '../utils/preorder';
import {
  CUSTOMER_STORAGE_KEYS,
  getCustomerStorageItem,
  removeCustomerStorageItem,
  setCustomerStorageItem
} from '../utils/customerStorage';

type CheckoutSessionState = 'creating' | 'checkout_ready' | 'gateway_open' | 'confirmation_pending';

interface StoredCheckoutSession {
  version: 2;
  key: string;
  fingerprint: string;
  createdAt: number;
  state: CheckoutSessionState;
  orderId?: string;
  paymentId?: string;
  attemptId?: string;
  gatewayOrderId?: string;
  amount?: number;
  currency?: string;
  shopName?: string;
  pendingReason?: 'gateway_success' | 'gateway_dismissed' | 'gateway_failed' | 'native_unknown' | 'process_interrupted';
  updatedAt?: number;
}

const readStoredCheckoutSession = (userId: string): StoredCheckoutSession | null => {
  try {
    const value = JSON.parse(getCustomerStorageItem(CUSTOMER_STORAGE_KEYS.checkoutSession, userId) || 'null');
    if (!value || typeof value !== 'object' || typeof value.key !== 'string' || typeof value.fingerprint !== 'string') {
      return null;
    }
    return value as StoredCheckoutSession;
  } catch {
    removeCustomerStorageItem(CUSTOMER_STORAGE_KEYS.checkoutSession, userId);
    return null;
  }
};

const writeStoredCheckoutSession = (userId: string, session: StoredCheckoutSession): void => {
  setCustomerStorageItem(
    CUSTOMER_STORAGE_KEYS.checkoutSession,
    userId,
    JSON.stringify({ ...session, version: 2, updatedAt: Date.now() })
  );
};

const isUnpaidTerminalStatus = (orderStatus: string, paymentStatus: string): boolean => {
  const normalizedOrder = String(orderStatus || '').toUpperCase();
  const normalizedPayment = String(paymentStatus || '').toLowerCase();
  return ['AUTO_CANCELLED', 'CANCELLED', 'REJECTED', 'EXPIRED', 'PAYMENT_FAILED', 'FAILED'].includes(normalizedOrder) ||
    ['cancelled', 'expired', 'failed'].includes(normalizedPayment);
};

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

  const [isOutOfZone, setIsOutOfZone] = useState(false);
  const [shopDistance, setShopDistance] = useState(0);

  const [showMockQRModal, setShowMockQRModal] = useState(false);
  const [isVerifyingPayment, setIsVerifyingPayment] = useState(false);
  const [createdOrderData] = useState<any>(null);
  const [qrCountdown, setQrCountdown] = useState(300);
  const [pendingPaymentOrderId, setPendingPaymentOrderId] = useState<string | null>(null);
  const reconciliationInFlight = useRef(false);
  const checkoutCompletedRef = useRef(false);

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

  const finishConfirmedOrder = useCallback((orderId: string, sessionShopName?: string) => {
    if (!user?.uid) return;
    checkoutCompletedRef.current = true;
    const resolvedShopName = sessionShopName || cartShopName || '';
    removeCustomerStorageItem(CUSTOMER_STORAGE_KEYS.checkoutNotes, user.uid);
    removeCustomerStorageItem(CUSTOMER_STORAGE_KEYS.checkoutSession, user.uid);
    setPendingPaymentOrderId(null);
    setIsPlacingOrder(false);
    setVerificationStatus('');
    clearCart();
    useAppStore.getState().subscribeOrders(user.uid);
    const search = new URLSearchParams({ orderId });
    if (resolvedShopName) search.set('shopName', resolvedShopName);
    navigate(`/order-success?${search.toString()}`, {
      replace: true,
      state: { orderId, shopName: resolvedShopName }
    });
  }, [cartShopName, clearCart, navigate, user?.uid]);

  const reconcilePendingCheckout = useCallback(async (showResult = false) => {
    if (!user?.uid || reconciliationInFlight.current) return;
    const session = readStoredCheckoutSession(user.uid);
    if (!session?.orderId || !['gateway_open', 'confirmation_pending'].includes(session.state)) {
      setPendingPaymentOrderId(null);
      return;
    }

    reconciliationInFlight.current = true;
    setPendingPaymentOrderId(session.orderId);
    setIsPlacingOrder(true);
    setVerificationStatus('Checking payment confirmation...');
    try {
      const status = await paymentService.getOrderPayment(session.orderId);
      if (status.paid === true && status.paymentStatus === 'completed') {
        finishConfirmedOrder(session.orderId, session.shopName);
        return;
      }

      if (isUnpaidTerminalStatus(status.orderStatus, status.paymentStatus)) {
        removeCustomerStorageItem(CUSTOMER_STORAGE_KEYS.checkoutSession, user.uid);
        setPendingPaymentOrderId(null);
        setVerificationStatus('');
        if (showResult) {
          alert('The previous payment session ended without a confirmed charge. Your cart is safe; you can start a new payment.');
        }
        return;
      }

      if (
        session.pendingReason === 'gateway_dismissed' &&
        status.paid === false &&
        String(status.orderStatus || '').toUpperCase() === 'DRAFT'
      ) {
        writeStoredCheckoutSession(user.uid, {
          ...session,
          state: 'checkout_ready',
          pendingReason: undefined
        });
        setPendingPaymentOrderId(null);
        setVerificationStatus('');
        if (showResult) alert('No payment was confirmed. Your cart is safe and you can reopen the same payment session.');
        return;
      }

      writeStoredCheckoutSession(user.uid, { ...session, state: 'confirmation_pending' });
      setPendingPaymentOrderId(session.orderId);
      setVerificationStatus(status.reviewRequired
        ? 'PAYMENT UNDER REVIEW — CHECK STATUS'
        : 'PAYMENT CONFIRMATION PENDING — CHECK STATUS');
      if (showResult) {
        alert(`Payment confirmation is still pending for order ${session.orderId}. Do not start another payment; we will keep checking automatically.`);
      }
    } catch {
      // Network/App Check may be temporarily unavailable after the gateway has
      // accepted payment. Preserve the session and keep retrying on resume/poll.
      writeStoredCheckoutSession(user.uid, { ...session, state: 'confirmation_pending' });
      setPendingPaymentOrderId(session.orderId);
      setVerificationStatus('PAYMENT CONFIRMATION PENDING — CHECK STATUS');
      if (showResult) {
        alert(`Payment status for order ${session.orderId} is temporarily unavailable. Do not pay again; please retry the status check shortly.`);
      }
    } finally {
      reconciliationInFlight.current = false;
      setIsPlacingOrder(false);
    }
  }, [finishConfirmedOrder, user?.uid]);

  useEffect(() => {
    if (!user?.uid) return;
    const session = readStoredCheckoutSession(user.uid);
    if (session?.orderId && ['gateway_open', 'confirmation_pending'].includes(session.state)) {
      setPendingPaymentOrderId(session.orderId);
      void reconcilePendingCheckout(false);
    }
  }, [reconcilePendingCheckout, user?.uid]);

  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return;
    let disposed = false;
    let removeListener: (() => Promise<void>) | undefined;
    void CapacitorApp.addListener('appStateChange', ({ isActive }) => {
      if (isActive) void reconcilePendingCheckout(false);
    }).then(handle => {
      if (disposed) void handle.remove();
      else removeListener = () => handle.remove();
    });
    return () => {
      disposed = true;
      if (removeListener) void removeListener();
    };
  }, [reconcilePendingCheckout]);

  useEffect(() => {
    if (!pendingPaymentOrderId) return;
    const timer = window.setInterval(() => {
      void reconcilePendingCheckout(false);
    }, 8000);
    return () => window.clearInterval(timer);
  }, [pendingPaymentOrderId, reconcilePendingCheckout]);

  const handleSimulateSuccess = async () => {
    if (!createdOrderData) return;
    setIsVerifyingPayment(true);
    setVerificationStatus('Verifying payment securely...');
    try {
      const verification = await paymentService.verifyPaymentSignature(
        'pay_mock_' + Math.random().toString(36).substring(2, 9),
        createdOrderData.gatewayOrderId || createdOrderData.orderId,
        'mock_valid_signature',
        createdOrderData.orderId,
        user!.uid
      );

      if (!verification.verified) {
        throw new Error('Payment signature verification failed.');
      }

      setShowMockQRModal(false);
      finishConfirmedOrder(createdOrderData.orderId, cartShopName || undefined);
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
      navigate('/login', { replace: true });
      return;
    }
    if (cartItems.length === 0 && !checkoutCompletedRef.current) {
      navigate('/cart', { replace: true });
      return;
    }
    const savedNotes = getCustomerStorageItem(CUSTOMER_STORAGE_KEYS.checkoutNotes, user.uid) || '';
    setOrderNotes(savedNotes);
  }, [user, cartItems, navigate]);

  const handlePlaceOrder = async () => {
    if (!user || isPlacingOrder) return;
    if (pendingPaymentOrderId) {
      await reconcilePendingCheckout(true);
      return;
    }
    const unresolvedSession = readStoredCheckoutSession(user.uid);
    if (unresolvedSession?.orderId && ['gateway_open', 'confirmation_pending'].includes(unresolvedSession.state)) {
      setPendingPaymentOrderId(unresolvedSession.orderId);
      await reconcilePendingCheckout(true);
      return;
    }
    if (!selectedAddress) return;
    if (cartItems.some(item => item.isPreorder) && (!preorderSchedule || !isValidPreorderSchedule(preorderSchedule))) {
      setPreorderSchedule(null);
      setIsPreorderModalOpen(true);
      alert('Your preorder slot is no longer available. Please choose a new slot.');
      return;
    }

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

    // Reuse one server order when Checkout is dismissed or the network retries.
    // Confirmed purchases clear this record, so buying the same cart later is new.
    const checkoutFingerprint = JSON.stringify({
      amount: priceBreakdown.grandTotal,
      userId: user.uid,
      shopId: cartShopId || '',
      items: orderItems,
      deliveryAddress,
      couponCode: coupon?.code || null,
      walletCreditsUsed: paymentMethod === 'wallet' ? priceBreakdown.grandTotal : 0,
      referralCode: '',
      preorderSchedule,
      orderNotes,
      paymentMethod
    });
    let checkoutIdempotencyKey = '';
    let existingSession = readStoredCheckoutSession(user.uid);
    const existingSessionExpired = existingSession
      ? Date.now() - Number(existingSession.createdAt) >= 9 * 60 * 1000
      : false;
    const needsReplacement = Boolean(existingSession) && (
      existingSession!.fingerprint !== checkoutFingerprint || existingSessionExpired
    );

    // A changed/aged checkout must release its old inventory reservation before
    // a fresh idempotency key can create another server order.
    if (needsReplacement) {
      if (existingSession?.orderId) {
        setIsPlacingOrder(true);
        setVerificationStatus('Refreshing secure checkout session...');
        try {
          await paymentService.cancelOrder(existingSession.orderId, 'Checkout details changed or payment session expired.');
        } catch (error: any) {
          setIsPlacingOrder(false);
          setVerificationStatus('');
          alert(error?.message || 'The previous checkout could not be closed safely. Please check My Orders before trying again.');
          return;
        }
      }
      removeCustomerStorageItem(CUSTOMER_STORAGE_KEYS.checkoutSession, user.uid);
      existingSession = null;
    }

    if (existingSession?.fingerprint === checkoutFingerprint && !existingSessionExpired) {
      checkoutIdempotencyKey = existingSession.key;
    }
    if (!checkoutIdempotencyKey) {
      checkoutIdempotencyKey = `checkout_${crypto.randomUUID().replace(/-/g, '')}`;
      writeStoredCheckoutSession(user.uid, {
        version: 2,
        key: checkoutIdempotencyKey,
        fingerprint: checkoutFingerprint,
        createdAt: Date.now(),
        state: 'creating',
        shopName: cartShopName || undefined
      });
    } else if (existingSession) {
      writeStoredCheckoutSession(user.uid, {
        ...existingSession,
        version: 2,
        state: existingSession.state || 'creating',
        shopName: existingSession.shopName || cartShopName || undefined
      });
    }

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
          checkoutIdempotencyKey,
          'cod'
        );

        if (result.cod) {
          finishConfirmedOrder(result.orderId, cartShopName || undefined);
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
            checkoutIdempotencyKey,
            paymentMethod
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
              preorderSlot: preorderSchedule?.slot,
              preorderTime: preorderSchedule?.time
            })),
            priceBreakdown: {
              subtotal: priceBreakdown.subtotal,
              discount: priceBreakdown.discount,
              taxes: priceBreakdown.taxes,
              deliveryCharge: priceBreakdown.deliveryCharge,
              platformFee: priceBreakdown.platformFee,
              packagingFee: priceBreakdown.packagingFee || 0,
              grandTotal: priceBreakdown.grandTotal,
              appliedPromotion: priceBreakdown.appliedPromotion || null
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
            shopCoords: exactShopCoords,
            preorderDate: preorderSchedule?.date,
            preorderSlot: preorderSchedule?.slot,
            preorderTime: preorderSchedule?.time,
            appliedPromotion: priceBreakdown.appliedPromotion || null
          };

          await useAppStore.getState().createOrder(mockOrder as any);

          finishConfirmedOrder(rzpOrder.orderId, cartShopName || undefined);
          return;
        }

        setVerificationStatus('Checking secure payment service...');
        await paymentService.checkPaymentReadiness();

        if (!Capacitor.isNativePlatform()) {
          const sdkLoaded = await paymentService.loadRazorpaySDK();
          if (!sdkLoaded) {
            alert('Unable to load payment gateway. Please check your internet connection and try again.');
            setIsPlacingOrder(false);
            setVerificationStatus('');
            return;
          }
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
          checkoutIdempotencyKey,
          paymentMethod
        );

        const currentSession = readStoredCheckoutSession(user.uid);
        writeStoredCheckoutSession(user.uid, {
          version: 2,
          key: checkoutIdempotencyKey,
          fingerprint: checkoutFingerprint,
          createdAt: currentSession?.createdAt || Date.now(),
          state: 'checkout_ready',
          orderId: rzpOrder.orderId,
          paymentId: rzpOrder.paymentId,
          attemptId: rzpOrder.attemptId,
          gatewayOrderId: rzpOrder.gatewayOrderId,
          amount: rzpOrder.amount,
          currency: rzpOrder.currency,
          shopName: cartShopName || undefined
        });

        try {
          const existingStatus = await paymentService.getOrderPayment(rzpOrder.orderId);
          if (existingStatus.paid === true && existingStatus.paymentStatus === 'completed') {
            finishConfirmedOrder(rzpOrder.orderId, cartShopName || undefined);
            return;
          }
          if (existingStatus.paid || existingStatus.reviewRequired) {
            const session = readStoredCheckoutSession(user.uid);
            if (session) writeStoredCheckoutSession(user.uid, { ...session, state: 'confirmation_pending' });
            setPendingPaymentOrderId(rzpOrder.orderId);
            setIsPlacingOrder(false);
            setVerificationStatus(existingStatus.reviewRequired
              ? 'PAYMENT UNDER REVIEW — CHECK STATUS'
              : 'PAYMENT CONFIRMATION PENDING — CHECK STATUS');
            return;
          }
        } catch { /* a new order is expected to be unpaid */ }

        setVerificationStatus('Launching payment window...');

        if (!rzpOrder.paymentKey || !rzpOrder.gatewayOrderId) {
          throw new Error('The payment server returned an incomplete checkout session. Your cart has not been charged.');
        }

        const handleGatewaySuccess = async (response: any) => {
          const session = readStoredCheckoutSession(user.uid);
          if (session) writeStoredCheckoutSession(user.uid, {
            ...session,
            state: 'confirmation_pending',
            pendingReason: 'gateway_success'
          });
          setPendingPaymentOrderId(rzpOrder.orderId);
          setIsPlacingOrder(true);
          setVerificationStatus('Verifying payment securely...');
          try {
            const verification = await paymentService.verifyPaymentSignature(
              response.razorpay_payment_id,
              response.razorpay_order_id,
              response.razorpay_signature,
              rzpOrder.orderId,
              user.uid
            );

            if (!verification.verified) {
              alert('Payment could not be verified. If money has been deducted, it will be reconciled automatically.');
              setIsPlacingOrder(false);
              setVerificationStatus('PAYMENT CONFIRMATION PENDING — CHECK STATUS');
              return;
            }

            finishConfirmedOrder(rzpOrder.orderId, cartShopName || undefined);
          } catch {
            let reconciled = false;
            for (let attempt = 0; attempt < 4 && !reconciled; attempt += 1) {
              if (attempt > 0) await new Promise(resolve => setTimeout(resolve, 2000));
              try {
                const status = await paymentService.getOrderPayment(rzpOrder.orderId);
                reconciled = status.paid === true && status.paymentStatus === 'completed';
              } catch { /* the signed webhook can still be arriving */ }
            }
            if (reconciled) {
              finishConfirmedOrder(rzpOrder.orderId, cartShopName || undefined);
              return;
            }
            const pendingSession = readStoredCheckoutSession(user.uid);
            if (pendingSession) writeStoredCheckoutSession(user.uid, { ...pendingSession, state: 'confirmation_pending' });
            setPendingPaymentOrderId(rzpOrder.orderId);
            alert(`Payment confirmation is pending for order ${rzpOrder.orderId}. Do not pay again; check My Orders shortly or contact support with this order ID.`);
            setIsPlacingOrder(false);
            setVerificationStatus('PAYMENT CONFIRMATION PENDING — CHECK STATUS');
          }
        };

        const options = {
          key: rzpOrder.paymentKey,
          amount: String(Math.round(rzpOrder.amount * 100)),
          currency: rzpOrder.currency || 'INR',
          name: 'Kart Kirana',
          description: `Order #${rzpOrder.orderId}`,
          order_id: rzpOrder.gatewayOrderId,
          prefill: {
            name: verifiedProfile?.name || user.name || '',
            contact: verifiedProfile?.phone || user.phone || ''
          },
          theme: { color: '#1565C0' },
          retry: { enabled: true, max_count: 3 }
        };

        const readySession = readStoredCheckoutSession(user.uid);
        if (readySession) writeStoredCheckoutSession(user.uid, {
          ...readySession,
          state: 'gateway_open',
          pendingReason: 'process_interrupted'
        });

        if (Capacitor.isNativePlatform()) {
          try {
            const result = await RazorpayCheckout.open(options);
            const rawResponse: any = result.response;
            const response = typeof rawResponse === 'string' ? JSON.parse(rawResponse) : rawResponse;
            if (!response?.razorpay_payment_id || !response?.razorpay_order_id || !response?.razorpay_signature) {
              throw new Error('Razorpay returned an incomplete payment confirmation.');
            }
            await handleGatewaySuccess(response);
          } catch (error: any) {
            let description = error?.description || error?.error?.description || '';
            for (const candidate of [error?.message, error?.code]) {
              if (description || typeof candidate !== 'string') continue;
              try {
                const parsed = JSON.parse(candidate);
                description = parsed?.description || parsed?.error?.description || '';
              } catch { /* Razorpay may return a plain-text native error. */ }
            }
            if (!description) description = error?.message || 'The payment was not completed.';
            const cancelled = /cancel|dismiss|closed by user/i.test(description);
            const failedAtGateway = /declin|failed|bad_request|payment error/i.test(description);
            const nativeSession = readStoredCheckoutSession(user.uid);
            if (nativeSession) {
              writeStoredCheckoutSession(user.uid, {
                ...nativeSession,
                state: 'confirmation_pending',
                pendingReason: cancelled ? 'gateway_dismissed' : failedAtGateway ? 'gateway_failed' : 'native_unknown'
              });
            }
            setPendingPaymentOrderId(rzpOrder.orderId);
            if (!cancelled) {
              alert(failedAtGateway
                ? `Payment was not completed: ${description}. We are confirming the failed status before enabling another attempt.`
                : `Payment status is uncertain for order ${rzpOrder.orderId}. Do not pay again until confirmation is checked.`);
            }
            setIsPlacingOrder(false);
            setVerificationStatus('PAYMENT CONFIRMATION PENDING — CHECK STATUS');
            void reconcilePendingCheckout(false);
          }
          return;
        }

        const webOptions = {
          ...options,
          handler: handleGatewaySuccess,
          modal: {
            ondismiss: () => {
              if (import.meta.env.DEV) console.log('[Razorpay Checkout] User dismissed payment window.');
              const dismissedSession = readStoredCheckoutSession(user.uid);
              if (dismissedSession) writeStoredCheckoutSession(user.uid, {
                ...dismissedSession,
                state: 'confirmation_pending',
                pendingReason: 'gateway_dismissed'
              });
              setPendingPaymentOrderId(rzpOrder.orderId);
              setIsPlacingOrder(false);
              setVerificationStatus('PAYMENT CONFIRMATION PENDING — CHECK STATUS');
              void reconcilePendingCheckout(false);
            }
          }
        };

        const rzp = new (window as any).Razorpay(webOptions);
        rzp.on('payment.failed', (response: any) => {
          if (import.meta.env.DEV) console.warn('[Razorpay Checkout] Payment failed on gateway:', response.error);
          const failedSession = readStoredCheckoutSession(user.uid);
          if (failedSession) writeStoredCheckoutSession(user.uid, {
            ...failedSession,
            state: 'confirmation_pending',
            pendingReason: 'gateway_failed'
          });
          setPendingPaymentOrderId(rzpOrder.orderId);
          alert(`Payment failed: ${response.error?.description || 'Transaction declined by bank.'} We are confirming the failed status before enabling another attempt.`);
          setIsPlacingOrder(false);
          setVerificationStatus('PAYMENT CONFIRMATION PENDING — CHECK STATUS');
          void reconcilePendingCheckout(false);
        });
        rzp.open();
      } catch (err: any) {
        if (import.meta.env.DEV) console.error('[Razorpay Checkout] Initialization failed:', err);
        const failedSession = readStoredCheckoutSession(user.uid);
        if (failedSession?.state === 'gateway_open') {
          writeStoredCheckoutSession(user.uid, {
            ...failedSession,
            state: 'checkout_ready',
            pendingReason: undefined
          });
        }
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
    { id: 'wallet' as const, name: 'Kart Kirana Wallet (coming soon)', icon: Wallet, disabled: true }
  ];

  return (
    <div className="app-flow-page w-full overflow-x-hidden pb-[calc(10rem+env(safe-area-inset-bottom))] sm:pb-28 text-left space-y-4">
      {/* Header bar */}
      <div className="app-page-header sticky top-0 z-30 -mx-3 px-3 py-3.5 flex items-center gap-3 mb-4">
        <button
          onClick={() => navigate('/cart')}
          aria-label="Back to cart"
          className="app-icon-button bg-white shadow-sm dark:bg-[#1E293B]"
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

          <div className="surface-card p-4 flex flex-col gap-3">
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
        <div className="p-4 rounded-[20px] border border-[#90CAF9]/30 dark:border-[#334155] bg-white dark:bg-[#1E293B] flex items-center justify-between gap-3 shadow-sm">
          <div className="flex items-start gap-3">
            <Clock className="h-5 w-5 text-[#0B74E8] flex-shrink-0 mt-0.5" />
            <div className="text-xs font-bold text-gray-700 dark:text-[#94A3B8] text-left">
              <span className="block font-black mb-0.5 text-[#0B74E8] dark:text-[#60A5FA]">
                {preorderSchedule ? '📅 Pre-Order Scheduled Delivery' : '⚡ Instant Deliver Now'}
              </span>
              <span className="text-[11px] font-semibold text-gray-600 dark:text-gray-300">
                {preorderSchedule
                  ? `Delivering on ${preorderSchedule.date} during ${preorderSchedule.slot}${preorderSchedule.time ? ` (preferred ${preorderSchedule.time})` : ''}`
                  : 'Order will be prepared & dispatched immediately upon shop approval.'}
              </span>
            </div>
          </div>
          <button
            onClick={() => {
              setIsPreorderModalOpen(true);
            }}
            className="text-[10px] font-black uppercase tracking-wider text-[#0B74E8] border border-[#0B74E8]/30 px-3 py-1.5 rounded-xl hover:bg-[#0B74E8]/10 cursor-pointer transition-colors shrink-0"
          >
            {preorderSchedule ? 'Edit Slot' : 'Schedule'}
          </button>
        </div>

        {/* Payment Methods */}
        <div>
          <span className="text-[10px] font-black uppercase text-gray-400 dark:text-[#94A3B8] block mb-2 px-1 flex items-center gap-1.5">
            <CreditCard className="h-4 w-4 text-[#1565C0] dark:text-[#1E88E5]" />
            Choose Payment Method
          </span>
          <div className="surface-card p-4 flex flex-col gap-3">
            {paymentOptions.map(opt => {
              const Icon = opt.icon;
              return (
                <div
                  key={opt.id}
                  onClick={() => !pendingPaymentOrderId && !('disabled' in opt && opt.disabled) && setPaymentMethod(opt.id)}
                  className={`p-3 rounded-2xl border transition-all flex items-center justify-between
                    ${'disabled' in opt && opt.disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
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
                    onChange={() => !pendingPaymentOrderId && !('disabled' in opt && opt.disabled) && setPaymentMethod(opt.id)}
                    disabled={Boolean(pendingPaymentOrderId) || ('disabled' in opt && opt.disabled)}
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
          <div className="surface-card p-4.5 flex flex-col gap-3 text-xs font-bold text-gray-500 dark:text-[#94A3B8]">
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
                  <span>{priceBreakdown.appliedPromotion?.title || 'Promo discount'}:</span>
                  <span>-₹{priceBreakdown.discount}</span>
                </div>
              )}
              {priceBreakdown.appliedPromotion && (
                <div className="rounded-xl bg-blue-50 p-2.5 text-[10px] font-semibold leading-relaxed text-blue-800 dark:bg-blue-950/20 dark:text-blue-200">
                  <strong className="block font-black">Shop special verified again during payment</strong>
                  {priceBreakdown.appliedPromotion.description}
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
      <div className="app-flow-dock fixed inset-x-0 bottom-0 z-35 border-t border-[#E2E8F0] bg-[#F8FAFC]/95 pt-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))] shadow-2xl backdrop-blur-md transition-colors dark:border-[#334155] dark:bg-[#0F172A]/95">
        <div className="app-flow-dock-content flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex min-w-0 items-center justify-between text-left sm:block">
            <span className="text-sm font-black text-gray-900 dark:text-white">₹{priceBreakdown.grandTotal}</span>
            <span className="text-[9px] font-bold text-gray-400 uppercase tracking-wide">using {paymentMethod.toUpperCase()}</span>
          </div>
          <Button
            onClick={handlePlaceOrder}
            isLoading={isPlacingOrder}
            disabled={isOutOfZone && !pendingPaymentOrderId}
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

      <PreorderModal
        isOpen={isPreorderModalOpen}
        onClose={() => setIsPreorderModalOpen(false)}
        onConfirm={setPreorderSchedule}
        initialDate={preorderSchedule?.date}
        initialSlot={preorderSchedule?.slot}
        initialTime={preorderSchedule?.time}
      />

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
              className="w-full rounded-2xl py-3.5 font-black text-xs bg-[#0B74E8] hover:bg-[#0758C7] text-white shadow-lg shadow-blue-500/20"
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
