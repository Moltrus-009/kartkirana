class PaymentProvider {
  async createGatewayOrder(amount, currency, receipt, notes) {
    throw new Error('createGatewayOrder method not implemented.');
  }

  async verifySignature(params) {
    throw new Error('verifySignature method not implemented.');
  }

  async createRefund(gatewayPaymentId, amount, reason) {
    throw new Error('createRefund method not implemented.');
  }
}

module.exports = PaymentProvider;
