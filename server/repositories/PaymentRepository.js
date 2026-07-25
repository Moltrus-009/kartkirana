const BaseRepository = require('./BaseRepository');

class PaymentRepository extends BaseRepository {
  constructor() {
    super('payments');
  }
}

module.exports = new PaymentRepository();
