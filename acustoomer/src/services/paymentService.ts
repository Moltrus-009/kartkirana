import { auth, IS_MOCK_MODE } from '../infrastructure/firebase/firebase';
import { getSecureAppCheckToken } from './appCheckService';
import { getApiUrl } from '../config/api';

export interface RazorpayOrder {
  orderId: string;
  paymentId: string;
  attemptId?: string;
  gatewayOrderId?: string;
  amount: number;
  currency: string;
  paymentKey?: string;
  cod?: boolean;
  customerDetails?: {
    userId: string;
  };
}

export interface CouponValidation {
  valid: true;
  code: string;
  couponId: string;
  type: 'percentage' | 'fixed' | 'free_delivery';
  discount: number;
  isFreeDelivery: boolean;
  coupon: Record<string, unknown>;
}

export interface OrderPaymentStatus {
  paid: boolean;
  paymentStatus: string;
  orderStatus: string;
  reviewRequired?: boolean;
  amount?: number;
  payments?: unknown[];
  attempts?: unknown[];
  refunds?: unknown[];
}

const getAuthToken = async (forceRefresh = false): Promise<string | null> => {
  if (auth && auth.currentUser) {
    try {
      return await auth.currentUser.getIdToken(forceRefresh);
    } catch (e) {
      if (import.meta.env.DEV) console.warn('[paymentService] Failed to obtain Firebase token:', e);
    }
  }
  return null;
};

const getSecureHeaders = async (forceRefresh = false): Promise<Record<string, string>> => {
  const idToken = await withTimeout(
    getAuthToken(forceRefresh),
    10000,
    'Your sign-in session could not be refreshed in time. Please sign in again.'
  );
  if (!idToken) throw new Error('Your sign-in session is unavailable. Please sign in again.');

  let appCheckToken: string;
  try {
    appCheckToken = await withTimeout(
      getSecureAppCheckToken(forceRefresh),
      10000,
      'Secure app verification timed out.'
    );
  } catch (error) {
    if (import.meta.env.DEV) {
      console.error('[paymentService] Firebase App Check token request failed:', error);
    }
    throw new Error('Secure app verification could not be completed. Your cart has not been charged. Please use Cash on Delivery or try again later.');
  }
  return {
    'Authorization': `Bearer ${idToken}`,
    'X-Firebase-AppCheck': appCheckToken
  };
};

const isRecord = (value: unknown): value is Record<string, any> => (
  Boolean(value) && typeof value === 'object' && !Array.isArray(value)
);

const parseJsonRecord = (rawBody: string, invalidMessage: string): Record<string, any> => {
  try {
    const parsed: unknown = JSON.parse(rawBody);
    if (!isRecord(parsed)) throw new Error(invalidMessage);
    return parsed;
  } catch {
    throw new Error(invalidMessage);
  }
};

const readErrorMessage = (rawBody: string, fallback: string): string => {
  try {
    const payload = JSON.parse(rawBody);
    const message = payload?.message || payload?.error?.message;
    const safeMessage = typeof message === 'string' && message.length <= 240
      ? message
      : fallback;
    const requestId = typeof payload?.requestId === 'string' ? payload.requestId : '';
    return requestId ? `${safeMessage} Reference: ${requestId}` : safeMessage;
  } catch {
    return fallback;
  }
};

const withTimeout = async <T>(
  operation: Promise<T>,
  timeoutMs: number,
  timeoutMessage: string
): Promise<T> => {
  let timer = 0;
  const timeout = new Promise<never>((_, reject) => {
    timer = window.setTimeout(() => reject(new Error(timeoutMessage)), timeoutMs);
  });
  try {
    return await Promise.race([operation, timeout]);
  } finally {
    window.clearTimeout(timer);
  }
};

const fetchWithTimeout = async (
  input: RequestInfo | URL,
  init: RequestInit,
  timeoutMs: number,
  timeoutMessage: string,
  networkMessage: string
): Promise<Response> => {
  const controller = new AbortController();
  const timeout = window.setTimeout(() => controller.abort(), timeoutMs);

  try {
    return await fetch(input, { ...init, signal: controller.signal });
  } catch (error: any) {
    if (error?.name === 'AbortError') throw new Error(timeoutMessage);
    throw new Error(networkMessage);
  } finally {
    window.clearTimeout(timeout);
  }
};

const fetchSecureWithTimeout = async (
  input: RequestInfo | URL,
  init: RequestInit,
  timeoutMs: number,
  timeoutMessage: string,
  networkMessage: string
): Promise<Response> => {
  const run = async (forceRefresh: boolean): Promise<Response> => {
    const secureHeaders = await getSecureHeaders(forceRefresh);
    return fetchWithTimeout(input, {
      ...init,
      headers: {
        ...(init.headers as Record<string, string> | undefined),
        ...secureHeaders
      }
    }, timeoutMs, timeoutMessage, networkMessage);
  };

  let response = await run(false);
  if (response.status !== 401) return response;

  let code = '';
  try {
    const payload = await response.clone().json();
    code = typeof payload?.code === 'string' ? payload.code : '';
  } catch { /* A non-JSON 401 is still handled by the caller. */ }

  if (!['AUTH_REQUIRED', 'AUTH_INVALID', 'APP_CHECK_REQUIRED', 'APP_CHECK_INVALID'].includes(code)) {
    return response;
  }

  // A cached Firebase token can legitimately expire between SDK refreshes. Retry
  // exactly once with fresh Auth and App Check tokens; never retry business errors.
  response = await run(true);
  return response;
};

export const paymentService = {
  async checkPaymentReadiness(): Promise<{ ready: boolean; environment?: string }> {
    const response = await fetchWithTimeout(getApiUrl('/health/payments'), {
      method: 'GET',
      cache: 'no-store'
    }, 8000,
    'The secure payment server did not respond in time. Your cart has not been charged; please use Cash on Delivery or try again later.',
    'The secure payment server cannot be reached. Your cart has not been charged; please use Cash on Delivery or try again later.');
    const rawBody = await response.text();
    if (!response.ok) {
      throw new Error(readErrorMessage(
        rawBody,
        'Online payments are temporarily unavailable. Your cart has not been charged; please use Cash on Delivery.'
      ));
    }
    const data = parseJsonRecord(
        rawBody,
        'The secure payment server returned an invalid response. Your cart has not been charged; please use Cash on Delivery.'
    );
    if (data.ready !== true) {
      throw new Error('Online payments are temporarily unavailable. Your cart has not been charged; please use Cash on Delivery.');
    }
    return {
      ready: true,
      environment: typeof data.environment === 'string' ? data.environment : undefined
    };
  },

  async validateCoupon(code: string, shopId: string, subtotal: number): Promise<CouponValidation> {
    const response = await fetchSecureWithTimeout(getApiUrl('/v1/coupons/validate'), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ code, shopId, subtotal })
    }, 12000,
    'Coupon validation timed out. Please try again.',
    'Coupon validation is unavailable. Please check your connection and try again.');
    const rawBody = await response.text();
    if (!response.ok) throw new Error(readErrorMessage(rawBody, 'Coupon could not be applied.'));
    return JSON.parse(rawBody) as CouponValidation;
  },

  loadRazorpaySDK(): Promise<boolean> {
    return new Promise((resolve) => {
      let settled = false;
      let timeout = 0;
      const finish = (loaded: boolean) => {
        if (settled) return;
        settled = true;
        window.clearTimeout(timeout);
        resolve(loaded);
      };
      timeout = window.setTimeout(() => finish(false), 10000);

      if ((window as any).Razorpay) {
        finish(true);
        return;
      }
      const existingScript = document.getElementById('razorpay-sdk');
      if (existingScript) {
        existingScript.addEventListener('load', () => finish(Boolean((window as any).Razorpay)), { once: true });
        existingScript.addEventListener('error', () => finish(false), { once: true });
        return;
      }
      const script = document.createElement('script');
      script.id = 'razorpay-sdk';
      script.src = 'https://checkout.razorpay.com/v1/checkout.js';
      script.async = true;
      script.onload = () => finish(Boolean((window as any).Razorpay));
      script.onerror = () => finish(false);
      document.body.appendChild(script);
    });
  },

  async createRazorpayOrder(
    amount: number,
    userId: string,
    shopId: string,
    items: { productId: string; quantity: number }[],
    deliveryAddress: any,
    couponCode: string | null = null,
    walletCreditsUsed: number = 0,
    referralCode: string = '',
    preorderSchedule: any = null,
    orderNotes: string = '',
    idempotencyKey?: string,
    paymentMethod: string = 'razorpay'
  ): Promise<RazorpayOrder> {
    if (IS_MOCK_MODE) {
      if (import.meta.env.DEV) console.log('[paymentService Mock] Simulating Razorpay order creation locally');
      return {
        orderId: `ord_mock_${Math.random().toString(36).substring(2, 9)}`,
        paymentId: `pay_mock_${Math.random().toString(36).substring(2, 9)}`,
        amount,
        currency: 'INR',
        paymentKey: 'rzp_test_mock_key',
        gatewayOrderId: `order_rzp_mock_${Math.random().toString(36).substring(2, 9)}`,
        cod: false
      };
    }
    const url = getApiUrl('/v1/payments/create-order');
    if (import.meta.env.DEV) console.log(`[paymentService] Request URL: ${url}`);

    const iKey = idempotencyKey || `idem_${userId}_${Date.now()}`;

    const response = await fetchSecureWithTimeout(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Idempotency-Key': iKey
      },
      body: JSON.stringify({
        amount,
        userId,
        shopId,
        items,
        deliveryAddress,
        couponCode,
        walletCreditsUsed,
        referralCode,
        preorderSchedule,
        orderNotes,
        paymentMethod
      }),
    }, 20000,
    'Payment setup timed out. Your payment status is unknown; do not pay again until the order status is checked.',
    'The payment server could not be reached. Your cart has not been charged; please check your connection and try again.');

    const rawBody = await response.text();
    if (import.meta.env.DEV) console.log(`[paymentService] Response status: ${response.status}`);

    if (!response.ok) {
      throw new Error(readErrorMessage(rawBody, response.statusText));
    }

    const data = parseJsonRecord(
      rawBody,
      'The payment server returned an invalid response. Your cart has not been charged.'
    );
    const validBase = (
      typeof data.orderId === 'string' && data.orderId.length > 0 &&
      typeof data.paymentId === 'string' && data.paymentId.length > 0 &&
      typeof data.amount === 'number' && Number.isFinite(data.amount) && data.amount > 0 &&
      typeof data.currency === 'string' && data.currency.length === 3
    );
    const validGatewaySession = data.cod === true || (
      typeof data.gatewayOrderId === 'string' && data.gatewayOrderId.length > 0 &&
      typeof data.paymentKey === 'string' && data.paymentKey.length > 0
    );
    if (!validBase || !validGatewaySession) {
      throw new Error('The payment server returned an incomplete checkout session. Your cart has not been charged.');
    }

    return data as unknown as RazorpayOrder;
  },

  async verifyPaymentSignature(
    razorpayPaymentId: string,
    razorpayOrderId: string,
    razorpaySignature: string,
    orderId: string,
    _userId: string
  ): Promise<{ verified: boolean; alreadyVerified?: boolean; orderId?: string; paymentStatus?: string }> {
    if (IS_MOCK_MODE) {
      if (import.meta.env.DEV) console.log('[paymentService Mock] Simulating signature verification locally');
      return { verified: true, orderId, paymentStatus: 'completed' };
    }
    const url = getApiUrl('/v1/payments/verify');
    if (import.meta.env.DEV) console.log(`[paymentService] Request URL: ${url}`);

    const response = await fetchSecureWithTimeout(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        razorpayPaymentId,
        razorpayOrderId,
        razorpaySignature,
        orderId
      }),
    }, 20000,
    'Payment verification timed out. Do not pay again; the app will reconcile this payment status.',
    'The connection was interrupted while verifying payment. Do not pay again; the app will reconcile this payment status.');

    const rawBody = await response.text();
    if (!response.ok) {
      throw new Error(readErrorMessage(rawBody, response.statusText));
    }

    const data = parseJsonRecord(
      rawBody,
      'The payment verification server returned an invalid response. Do not pay again.'
    );
    if (typeof data.verified !== 'boolean') {
      throw new Error('The payment verification server returned an incomplete response. Do not pay again.');
    }

    return data as unknown as { verified: boolean; alreadyVerified?: boolean; orderId?: string; paymentStatus?: string };
  },

  async getOrderPayment(orderId: string): Promise<OrderPaymentStatus> {
    if (IS_MOCK_MODE) return { paid: true, paymentStatus: 'completed', orderStatus: 'PLACED' };
    const response = await fetchSecureWithTimeout(getApiUrl(`/v1/orders/${encodeURIComponent(orderId)}/payment`), {}, 10000,
    'Payment status check timed out. Please wait before attempting another payment.',
    'Payment status is temporarily unavailable. Please wait before attempting another payment.');
    const rawBody = await response.text();
    if (!response.ok) throw new Error(readErrorMessage(rawBody, 'Payment status could not be checked.'));
    const data = parseJsonRecord(rawBody, 'The payment status server returned an invalid response.');
    if (typeof data.paid !== 'boolean' || typeof data.paymentStatus !== 'string' || typeof data.orderStatus !== 'string') {
      throw new Error('The payment status server returned an incomplete response.');
    }
    return data as unknown as OrderPaymentStatus;
  },

  async cancelOrder(orderId: string, reason: string = ''): Promise<{ success: boolean; message: string }> {
    if (IS_MOCK_MODE) {
      if (import.meta.env.DEV) console.log('[paymentService Mock] Simulating order cancellation locally for:', orderId);
      return { success: true, message: 'Mock order cancelled successfully.' };
    }

    const url = getApiUrl(`/v1/orders/${orderId}/cancel`);
    const response = await fetchSecureWithTimeout(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ reason }),
    }, 15000,
    'Cancellation timed out. Refresh the order before trying again.',
    'The cancellation service could not be reached. Refresh the order before trying again.');

    const rawBody = await response.text();
    if (!response.ok) {
      throw new Error(readErrorMessage(rawBody, response.statusText));
    }

    try {
      return JSON.parse(rawBody);
    } catch {
      return { success: true, message: 'Order cancelled successfully.' };
    }
  },
};
