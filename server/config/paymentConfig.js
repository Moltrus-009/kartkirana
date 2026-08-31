module.exports = {
  // Taxes and Fees
  fees: {
    // Keep these values identical to the customer bill preview. Product prices
    // are tax-inclusive, so checkout must not add GST a second time.
    platformFee: 5.00,
    packagingFee: 0.00,
    gstRate: 0.00,
  },
  
  // Delivery Fee Structure
  delivery: {
    freeThreshold: 149.00,
    baseFee: 25.00,
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
