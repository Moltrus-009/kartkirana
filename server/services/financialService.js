const { db: firestoreDb } = require('../config/firebase');

class FinancialService {
  
  // Helper to extract numeric fields safely
  _num(val) {
    if (val === undefined || val === null) return 0;
    const n = Number(val);
    return isNaN(n) ? 0 : n;
  }

  // Check if status is a completed/successful order state
  isCompleted(status) {
    if (!status) return false;
    const s = status.toUpperCase();
    return s === 'DELIVERED' || s === 'COMPLETED';
  }

  // Check if status is a cancelled order state
  isCancelled(status) {
    if (!status) return false;
    const s = status.toUpperCase();
    return s === 'CANCELLED' || s === 'SHOP_REJECTED' || s === 'REJECTED';
  }

  // Calculate shop financials based on orders list
  calculateShopMetrics(shopId, orders) {
    const shopOrders = orders.filter(o => o.shopId === shopId);
    const completedOrders = shopOrders.filter(o => this.isCompleted(o.status));
    const cancelledOrders = shopOrders.filter(o => this.isCancelled(o.status));

    const totalOrders = shopOrders.length;
    const completedCount = completedOrders.length;
    const cancelledCount = cancelledOrders.length;

    let grossSales = 0;
    let platformCommission = 0;
    let deliveryCharges = 0;
    let refunds = 0;
    let discounts = 0;
    let pendingPayout = 0;
    let paidOut = 0;

    const now = new Date();
    const threeDaysAgo = new Date();
    threeDaysAgo.setDate(threeDaysAgo.getDate() - 3);

    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
    
    const startOfWeek = new Date(now);
    startOfWeek.setDate(now.getDate() - now.getDay());
    startOfWeek.setHours(0,0,0,0);
    const startOfWeekTime = startOfWeek.getTime();
    
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).getTime();

    let revenueToday = 0;
    let revenueThisWeek = 0;
    let revenueThisMonth = 0;

    completedOrders.forEach(o => {
      // Subtotal of the order or total
      const subtotal = this._num(o.subtotal !== undefined ? o.subtotal : o.total);
      grossSales += subtotal;

      // Platform commission (platformFee or fallback 10% of subtotal)
      const commission = o.platformFee !== undefined ? this._num(o.platformFee) : (subtotal * 0.10);
      platformCommission += commission;

      deliveryCharges += this._num(o.deliveryFee);
      discounts += this._num(o.discount);

      // Refunded check
      if (o.paymentStatus && o.paymentStatus.toLowerCase() === 'refunded') {
        refunds += subtotal;
      }

      // Net earnings of this order = subtotal - commission
      const orderNet = subtotal - commission;

      // Payout Status based on age
      const orderDate = new Date(o.createdAt || o.timestamp);
      if (orderDate.getTime() < threeDaysAgo.getTime()) {
        paidOut += orderNet;
      } else {
        pendingPayout += orderNet;
      }

      // Timeframe sums
      const orderTime = orderDate.getTime();
      if (orderTime >= startOfToday) {
        revenueToday += subtotal;
      }
      if (orderTime >= startOfWeekTime) {
        revenueThisWeek += subtotal;
      }
      if (orderTime >= startOfMonth) {
        revenueThisMonth += subtotal;
      }
    });

    const netEarnings = grossSales - platformCommission - refunds;
    const averageOrderValue = completedCount > 0 ? (grossSales / completedCount) : 0;

    return {
      shopId,
      totalOrders,
      completedOrders: completedCount,
      cancelledOrders: cancelledCount,
      grossSales: Math.round(grossSales * 100) / 100,
      platformCommission: Math.round(platformCommission * 100) / 100,
      deliveryCharges: Math.round(deliveryCharges * 100) / 100,
      refunds: Math.round(refunds * 100) / 100,
      discounts: Math.round(discounts * 100) / 100,
      netEarnings: Math.round(netEarnings * 100) / 100,
      pendingPayout: Math.round(pendingPayout * 100) / 100,
      paidOut: Math.round(paidOut * 100) / 100,
      averageOrderValue: Math.round(averageOrderValue * 100) / 100,
      revenueToday: Math.round(revenueToday * 100) / 100,
      revenueThisWeek: Math.round(revenueThisWeek * 100) / 100,
      revenueThisMonth: Math.round(revenueThisMonth * 100) / 100
    };
  }

  // Calculate rider earnings and deliveries counts
  calculateRiderMetrics(riderId, orders) {
    const riderOrders = orders.filter(o => o.rider && o.rider.uid === riderId);
    const completedOrders = riderOrders.filter(o => this.isCompleted(o.status));

    const totalOrders = riderOrders.length;
    const completedCount = completedOrders.length;

    let earningsToday = 0;
    let totalEarnings = 0;

    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();

    completedOrders.forEach(o => {
      // Rider gets the delivery fee
      const fee = this._num(o.deliveryFee);
      totalEarnings += fee;

      const orderDate = new Date(o.createdAt || o.timestamp);
      if (orderDate.getTime() >= startOfToday) {
        earningsToday += fee;
      }
    });

    return {
      riderId,
      totalDeliveries: completedCount,
      todayDeliveries: completedOrders.filter(o => new Date(o.createdAt || o.timestamp).getTime() >= startOfToday).length,
      earningsToday: Math.round(earningsToday * 100) / 100,
      totalEarnings: Math.round(totalEarnings * 100) / 100
    };
  }

  // Core retrieval of all orders
  async _getAllOrders() {
    if (!firestoreDb) throw new Error('Firestore not initialized.');
    const snap = await firestoreDb.collection('orders').get();
    return snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  }

  // Endpoint Methods
  async getShopsMetrics() {
    const orders = await this._getAllOrders();
    // Find unique shopIds from orders or shops collection
    const shopSnap = await firestoreDb.collection('shops').get();
    const shopIds = shopSnap.docs.map(doc => doc.id);

    return shopIds.map(shopId => this.calculateShopMetrics(shopId, orders));
  }

  async getShopMetricsById(shopId) {
    const orders = await this._getAllOrders();
    return this.calculateShopMetrics(shopId, orders);
  }

  async getRiderMetricsById(riderId) {
    const orders = await this._getAllOrders();
    return this.calculateRiderMetrics(riderId, orders);
  }

  async getPlatformMetrics() {
    const orders = await this._getAllOrders();
    const completedOrders = orders.filter(o => this.isCompleted(o.status));

    let grossSales = 0;
    let totalCommissions = 0;
    let refunds = 0;

    completedOrders.forEach(o => {
      const subtotal = this._num(o.subtotal !== undefined ? o.subtotal : o.total);
      grossSales += subtotal;
      
      const comm = o.platformFee !== undefined ? this._num(o.platformFee) : (subtotal * 0.10);
      totalCommissions += comm;

      if (o.paymentStatus && o.paymentStatus.toLowerCase() === 'refunded') {
        refunds += subtotal;
      }
    });

    return {
      grossSales: Math.round(grossSales * 100) / 100,
      totalCommissions: Math.round(totalCommissions * 100) / 100,
      refunds: Math.round(refunds * 100) / 100,
      netPlatformRevenue: Math.round((totalCommissions - refunds) * 100) / 100
    };
  }
}

module.exports = new FinancialService();
