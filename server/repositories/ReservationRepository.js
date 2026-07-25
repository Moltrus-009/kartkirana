const BaseRepository = require('./BaseRepository');

class ReservationRepository extends BaseRepository {
  constructor() {
    super('inventoryReservations');
  }

  async getActiveReservationsByOrderId(orderId) {
    const snaps = await this.collection
      .where('orderId', '==', orderId)
      .where('status', '==', 'ACTIVE')
      .where('isDeleted', '==', false)
      .get();
    return snaps.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  }

  async getExpiredActiveReservations(nowIso) {
    const snaps = await this.collection
      .where('status', '==', 'ACTIVE')
      .get();
    return snaps.docs
      .map(doc => ({ id: doc.id, ...doc.data() }))
      .filter(res => res.isDeleted === false && res.expiresAt < nowIso);
  }
}

module.exports = new ReservationRepository();
