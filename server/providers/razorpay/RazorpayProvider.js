const crypto = require('crypto');
const PaymentProvider = require('../PaymentProvider');
const rzpConfig = require('../../config/razorpay');

class RazorpayProvider extends PaymentProvider {
  constructor() {
    super();
    this.client = rzpConfig.razorpayClient;
    this.keyId = rzpConfig.keyId;
    this.keySecret = rzpConfig.keySecret;
    this.webhookSecret = rzpConfig.webhookSecret;
    this.environment = rzpConfig.environment;
    this.isTestHarness = process.env.NODE_ENV === 'test' && this.environment === 'TEST';
    this.readinessCache = null;
    this.readinessProbeInFlight = null;
    this.readinessSuccessTtlMs = 60 * 1000;
    this.readinessFailureTtlMs = 15 * 1000;
    this.gatewayTimeoutMs = 8 * 1000;
  }

  async _withTimeout(operation, timeoutMessage, timeoutMs = this.gatewayTimeoutMs) {
    let timer;
    const timeout = new Promise((_, reject) => {
      timer = setTimeout(() => {
        const error = new Error(timeoutMessage);
        error.code = 'GATEWAY_TIMEOUT';
        reject(error);
      }, timeoutMs);
      timer.unref?.();
    });
    try {
      return await Promise.race([operation, timeout]);
    } finally {
      clearTimeout(timer);
    }
  }

  /**
   * Authenticates the configured key pair using a read-only Razorpay request.
   * The short cache prevents Checkout readiness calls from turning into a
   * high-volume Razorpay dependency or a credential-probe stampede.
   */
  async checkCredentialReadiness({ force = false } = {}) {
    if (!this.client || !this.keyId || !this.keySecret) {
      return { ready: false, checkedAt: new Date().toISOString(), reason: 'NOT_CONFIGURED' };
    }
    if (this.isTestHarness) {
      return { ready: true, checkedAt: new Date().toISOString(), reason: 'TEST_HARNESS' };
    }

    const now = Date.now();
    if (!force && this.readinessCache && this.readinessCache.expiresAt > now) {
      return this.readinessCache.result;
    }
    if (!force && this.readinessProbeInFlight) return this.readinessProbeInFlight;

    this.readinessProbeInFlight = (async () => {
      let result;
      try {
        await this._withTimeout(
          this.client.orders.all({ count: 1 }),
          'Razorpay credential verification timed out.',
          5000
        );
        result = { ready: true, checkedAt: new Date().toISOString(), reason: 'AUTHENTICATED' };
      } catch (error) {
        console.error('[RAZORPAY READINESS] Read-only credential probe failed:', {
          code: error?.error?.code || error?.code || error?.statusCode || 'UNKNOWN',
          environment: this.environment
        });
        result = {
          ready: false,
          checkedAt: new Date().toISOString(),
          reason: error?.code === 'GATEWAY_TIMEOUT' ? 'TIMEOUT' : 'AUTHENTICATION_FAILED'
        };
      }
      const ttl = result.ready ? this.readinessSuccessTtlMs : this.readinessFailureTtlMs;
      this.readinessCache = { result, expiresAt: Date.now() + ttl };
      return result;
    })();

    try {
      return await this.readinessProbeInFlight;
    } finally {
      this.readinessProbeInFlight = null;
    }
  }

  resetReadinessCache() {
    this.readinessCache = null;
    this.readinessProbeInFlight = null;
  }

  async createGatewayOrder(amount, currency, receipt, notes) {
    if (this.isTestHarness) {
      return {
        id: `order_mock_${Math.random().toString(36).substring(2, 11)}`,
        amount: Math.round(amount * 100), currency: currency || 'INR', receipt, status: 'created'
      };
    }
    if (!this.client) {
      throw new Error(`Razorpay is not configured for ${this.environment} payments.`);
    }
    const options = {
      amount: Math.round(amount * 100),
      currency: currency || 'INR',
      receipt: receipt,
      notes: notes || {}
    };
    return this._withTimeout(
      this.client.orders.create(options),
      'Razorpay order creation timed out.'
    );
  }

  verifySignature(serverOrderId, razorpayPaymentId, razorpaySignature) {
    
    // For automated test verification when client is mock
    if (this.isTestHarness && (razorpaySignature === 'mock_valid_signature' || razorpaySignature.startsWith('mock_sig_'))) {
      return true;
    }

    if (!this.keySecret || !serverOrderId || !razorpayPaymentId || !/^[a-f0-9]{64}$/i.test(razorpaySignature || '')) {
      return false;
    }

    const text = serverOrderId + '|' + razorpayPaymentId;
    const generatedSignature = crypto
      .createHmac('sha256', this.keySecret)
      .update(text)
      .digest('hex');

    const expected = Buffer.from(generatedSignature, 'hex');
    const received = Buffer.from(razorpaySignature, 'hex');
    return expected.length === received.length && crypto.timingSafeEqual(expected, received);
  }

  async fetchPayment(paymentId, testFallback = {}) {
    if (this.isTestHarness) {
      return {
        id: paymentId, order_id: testFallback.orderId, amount: testFallback.amountPaise,
        currency: testFallback.currency || 'INR', status: 'captured', captured: true,
        method: testFallback.method || 'upi'
      };
    }
    if (!this.client) {
      throw new Error('Razorpay payment lookup is unavailable.');
    }
    return this._withTimeout(
      this.client.payments.fetch(paymentId),
      'Razorpay payment lookup timed out.'
    );
  }

  async capturePayment(paymentId, amountPaise, currency = 'INR') {
    if (this.isTestHarness) {
      return {
        id: paymentId,
        amount: Number(amountPaise),
        currency,
        status: 'captured',
        captured: true,
        method: 'upi'
      };
    }
    if (!this.client) throw new Error('Razorpay payment capture is unavailable.');
    return this._withTimeout(
      this.client.payments.capture(paymentId, Number(amountPaise), currency),
      'Razorpay payment capture timed out.'
    );
  }

  async fetchPaymentsForOrder(gatewayOrderId) {
    if (this.isTestHarness) return { items: [] };
    if (!this.client) throw new Error('Razorpay order payment lookup is unavailable.');
    return this._withTimeout(
      this.client.orders.fetchPayments(gatewayOrderId),
      'Razorpay order payment lookup timed out.'
    );
  }

  async fetchRefund(gatewayRefundId) {
    if (this.isTestHarness) {
      return { id: gatewayRefundId, status: 'processed' };
    }
    if (!this.client) throw new Error('Razorpay refund lookup is unavailable.');
    return this._withTimeout(
      this.client.refunds.fetch(gatewayRefundId),
      'Razorpay refund lookup timed out.'
    );
  }

  async fetchRefundsForPayment(gatewayPaymentId) {
    if (this.isTestHarness) return { items: [] };
    if (!this.client) throw new Error('Razorpay payment refund lookup is unavailable.');
    return this._withTimeout(
      this.client.refunds.all({ payment_id: gatewayPaymentId, count: 100 }),
      'Razorpay payment refund lookup timed out.'
    );
  }

  verifyWebhookSignature(rawBody, signatureHeader) {
    if (this.isTestHarness && signatureHeader === 'mock_valid_webhook_signature') {
      return true;
    }
    
    if (!signatureHeader || !this.webhookSecret) {
      return false;
    }

    const generatedSignature = crypto
      .createHmac('sha256', this.webhookSecret)
      .update(rawBody)
      .digest('hex');
    if (!/^[a-f0-9]{64}$/i.test(signatureHeader)) return false;
    const expected = Buffer.from(generatedSignature, 'hex');
    const received = Buffer.from(signatureHeader, 'hex');
    return expected.length === received.length && crypto.timingSafeEqual(expected, received);
  }

  async createRefund(gatewayPaymentId, amount, reason, refundId) {
    if (this.isTestHarness) {
      return {
        id: `rfnd_mock_${Math.random().toString(36).substring(2, 11)}`,
        payment_id: gatewayPaymentId, amount: Math.round(amount * 100), status: 'processed'
      };
    }
    if (!this.client) {
      throw new Error('Razorpay refund service is unavailable.');
    }
    return this._withTimeout(
      this.client.payments.refund(gatewayPaymentId, {
        amount: Math.round(amount * 100),
        speed: 'normal',
        receipt: refundId,
        notes: { reason, internalRefundId: refundId }
      }),
      'Razorpay refund request timed out.'
    );
  }
}

module.exports = new RazorpayProvider();
