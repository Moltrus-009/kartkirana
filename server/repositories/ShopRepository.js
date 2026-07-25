const BaseRepository = require('./BaseRepository');

class ShopRepository extends BaseRepository {
  constructor() {
    super('shops');
  }
}

module.exports = new ShopRepository();
