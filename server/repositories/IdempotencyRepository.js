const BaseRepository = require('./BaseRepository');
const crypto = require('crypto');

class IdempotencyRepository extends BaseRepository {
  constructor() {
    super('idempotencyKeys');
  }

  documentId(key, userId) {
    return crypto.createHash('sha256').update(`${userId}:${key}`).digest('hex');
  }

  async findKey(key, userId, requestHash) {
    const record = await this.getById(this.documentId(key, userId));
    if (!record) return null;
    if (new Date(record.expiresAt).getTime() <= Date.now()) return null;
    if (record.requestHash !== requestHash) return { conflict: true };
    return record;
  }

  async saveKey(key, response, userId, requestHash) {
    const ttl = 24 * 60 * 60 * 1000; // 24 Hours
    return this.create(this.documentId(key, userId), {
      response, 
      userId,
      requestHash,
      expiresAt: new Date(Date.now() + ttl).toISOString() 
    }, userId);
  }
}

module.exports = new IdempotencyRepository();
