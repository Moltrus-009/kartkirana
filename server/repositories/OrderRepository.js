const BaseRepository = require('./BaseRepository');

class OrderRepository extends BaseRepository {
  constructor() {
    super('orders');
  }

  async updateStatusInTransaction(transaction, orderId, status, timelineEntry, userId = 'system') {
    const timestamp = new Date().toISOString();
    const docRef = this.collection.doc(orderId);
    const docSnap = await transaction.get(docRef);
    if (!docSnap.exists) throw new Error(`Order ${orderId} not found.`);

    const currentTimeline = docSnap.data().timeline || [];
    const updatedTimeline = [...currentTimeline, timelineEntry];

    transaction.update(docRef, {
      status,
      timeline: updatedTimeline,
      updatedAt: timestamp,
      updatedBy: userId
    });
  }
}

module.exports = new OrderRepository();
