const BaseRepository = require('./BaseRepository');

class PaymentAttemptRepository extends BaseRepository {
  constructor() {
    super('paymentAttempts');
  }

  async getLatestByOrderId(orderId) {
    const snaps = await this.collection
      .where('orderId', '==', orderId)
      .where('isDeleted', '==', false)
      .limit(1) // orderBy needs custom compound index in firestore, we will query all and sort in memory if needed, or filter simply.
      .get();

    if (snaps.empty) return null;
    const items = snaps.docs.map(d => ({ id: d.id, ...d.data() }));
    // Sort in-memory to avoid compound index creation delays
    items.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    return items[0];
  }

  async getByGatewayOrderId(gatewayOrderId) {
    const snaps = await this.collection
      .where('gatewayOrderId', '==', gatewayOrderId)
      .where('isDeleted', '==', false)
      .limit(1)
      .get();

    if (snaps.empty) return null;
    const doc = snaps.docs[0];
    return { id: doc.id, ...doc.data() };
  }
}

module.exports = new PaymentAttemptRepository();
