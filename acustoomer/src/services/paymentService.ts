import { Capacitor } from '@capacitor/core';
import { auth, IS_MOCK_MODE } from '../infrastructure/firebase/firebase';

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

const getApiUrl = (path: string): string => {
  if (Capacitor.isNativePlatform()) {
    const isProd = import.meta.env.PROD || import.meta.env.MODE === 'production';
    const baseUrl = import.meta.env.VITE_API_BASE_URL || (isProd ? 'https://api.kartkirana.com' : 'http://10.0.2.2:5000');
    return `${baseUrl}${path}`;
  }
  return path;
};

const getAuthToken = async (forceRefresh = false): Promise<string | null> => {
  if (auth && auth.currentUser) {
    try {
      return await auth.currentUser.getIdToken(forceRefresh);
    } catch (e) {
      console.warn('[paymentService] Failed to obtain Firebase token:', e);
    }
  }
  return null;
};

const readErrorMessage = (rawBody: string, fallback: string): string => {
  try {
    const payload = JSON.parse(rawBody);
    return payload?.message || payload?.error?.message || fallback;
  } catch {
    return rawBody || fallback;
  }
};

export const paymentService = {
  loadRazorpaySDK(): Promise<boolean> {
    return new Promise((resolve) => {
      if ((window as any).Razorpay) {
        resolve(true);
        return;
      }
      const existingScript = document.getElementById('razorpay-sdk');
      if (existingScript) {
        existingScript.addEventListener('load', () => resolve(true));
        existingScript.addEventListener('error', () => resolve(false));
        return;
      }
      const script = document.createElement('script');
      script.id = 'razorpay-sdk';
      script.src = 'https://checkout.razorpay.com/v1/checkout.js';
      script.async = true;
      script.onload = () => resolve(true);
      script.onerror = () => resolve(false);
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
      console.log('[paymentService Mock] Simulating Razorpay order creation locally');
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
    console.log(`[paymentService] Request URL: ${url}`);

    const idToken = await getAuthToken(true);
    if (!idToken) throw new Error('Your sign-in session is unavailable. Please sign in again before placing an order.');
    const iKey = idempotencyKey || `idem_${userId}_${Date.now()}`;

    let response: Response;
    try {
      response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${idToken}`,
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
      });
    } catch (networkError: any) {
      console.error(`[paymentService] Fetch failed for URL: ${url}`, networkError);
      throw new Error(`Failed to connect to backend server. Error: ${networkError.message}`);
    }

    const rawBody = await response.text();
    console.log(`[paymentService] Response status: ${response.status}`);

    if (!response.ok) {
      throw new Error(readErrorMessage(rawBody, response.statusText));
    }

    let data: any;
    try {
      data = JSON.parse(rawBody);
    } catch (parseError: any) {
      throw new Error(`Failed to parse create-order response JSON: ${parseError.message}`);
    }

    return data;
  },

  async verifyPaymentSignature(
    razorpayPaymentId: string,
    razorpayOrderId: string,
    razorpaySignature: string,
    orderId: string,
    userId: string
  ): Promise<boolean> {
    if (IS_MOCK_MODE) {
      console.log('[paymentService Mock] Simulating signature verification locally');
      return true;
    }
    const url = getApiUrl('/v1/payments/verify');
    console.log(`[paymentService] Request URL: ${url}`);

    const idToken = await getAuthToken(true);
    if (!idToken) throw new Error('Your sign-in session is unavailable. Please sign in again before verifying payment.');

    let response: Response;
    try {
      response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${idToken}`
        },
        body: JSON.stringify({
          razorpayPaymentId,
          razorpayOrderId,
          razorpaySignature,
          orderId
        }),
      });
    } catch (networkError: any) {
      console.error(`[paymentService] Fetch failed for URL: ${url}`, networkError);
      throw new Error(`Failed to verify payment with backend. Error: ${networkError.message}`);
    }

    const rawBody = await response.text();
    if (!response.ok) {
      throw new Error(readErrorMessage(rawBody, response.statusText));
    }

    let data: any;
    try {
      data = JSON.parse(rawBody);
    } catch (parseError: any) {
      throw new Error(`Failed to parse verify response JSON: ${parseError.message}`);
    }

    return !!data.verified;
  },

  async cancelOrder(orderId: string, reason: string = ''): Promise<{ success: boolean; message: string }> {
    if (IS_MOCK_MODE) {
      console.log('[paymentService Mock] Simulating order cancellation locally for:', orderId);
      return { success: true, message: 'Mock order cancelled successfully.' };
    }

    const url = getApiUrl(`/v1/orders/${orderId}/cancel`);
    const idToken = await getAuthToken(true);
    if (!idToken) throw new Error('Your sign-in session is unavailable. Please sign in again before cancelling the order.');

    let response: Response;
    try {
      response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${idToken}`
        },
        body: JSON.stringify({ reason }),
      });
    } catch (networkError: any) {
      console.error(`[paymentService] Fetch failed for cancel URL: ${url}`, networkError);
      throw new Error(`Failed to connect to backend server. Error: ${networkError.message}`);
    }

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

