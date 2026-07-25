const BaseRepository = require('./BaseRepository');

class IdempotencyRepository extends BaseRepository {
  constructor() {
    super('idempotencyKeys');
  }

  async findKey(key) {
    return this.getById(key);
  }

  async saveKey(key, response, userId) {
    const ttl = 24 * 60 * 60 * 1000; // 24 Hours
    return this.create(key, { 
      response, 
      expiresAt: new Date(Date.now() + ttl).toISOString() 
    }, userId);
  }
}

module.exports = new IdempotencyRepository();
