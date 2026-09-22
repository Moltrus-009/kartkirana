const BaseRepository = require('./BaseRepository');

class OrderRepository extends BaseRepository {
  constructor() {
    super('orders');
  }

  async create(id, data, userId) {
    const { db } = require('../config/firebase');
    const { assertAccountAvailable } = require('../services/accountDeletionGuard');
    const prepared = this._prepareDoc(data, userId, true);
    await db.runTransaction(async tx => {
      await assertAccountAvailable(db, tx, data.userId, 'customer');
      const shop = await tx.get(db.collection('shops').doc(data.shopId));
      if (shop.data()?.ownerId) await assertAccountAvailable(db, tx, shop.data().ownerId, 'shopkeeper');
      tx.set(this.collection.doc(id), prepared);
    });
    return { id, ...prepared };
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
