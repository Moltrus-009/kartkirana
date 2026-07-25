module.exports = {
  // Taxes and Fees
  fees: {
    platformFee: 2.00, // Platform usage fee
    packagingFee: 5.00, // Safe packaging fee
    gstRate: 0.05, // 5% Goods and Services Tax
  },
  
  // Delivery Fee Structure
  delivery: {
    freeThreshold: 500.00, // Free delivery above ₹500
    baseFee: 30.00, // Base fee for orders under threshold
    distanceChargePerKm: 5.00, // Extra fee per km
  },
  
  // Wallet Settings
  wallet: {
    allowMaxPercentage: 1.0, // Wallet can pay up to 100% of order value
  },

  // UPI Settings
  upi: {
    address: 'kartkirana@oksbi', // Merchant UPI address for mock payments
  }
};
