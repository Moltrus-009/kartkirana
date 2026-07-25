const BaseRepository = require('./BaseRepository');

class RefundRepository extends BaseRepository {
  constructor() {
    super('refunds');
  }
}

module.exports = new RefundRepository();
