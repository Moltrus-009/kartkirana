const BaseRepository = require('./BaseRepository');

class PaymentRepository extends BaseRepository {
  constructor() {
    super('payments');
  }

  async getByOrderId(orderId) {
    const snapshot = await this.collection.where('orderId', '==', orderId).where('isDeleted', '==', false).limit(1).get();
    if (snapshot.empty) return null;
    const document = snapshot.docs[0];
    return { id: document.id, ...document.data() };
  }
}

module.exports = new PaymentRepository();
