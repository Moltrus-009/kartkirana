const BaseRepository = require('./BaseRepository');

class WebhookRepository extends BaseRepository {
  constructor() {
    super('processedWebhookEvents');
  }

  async isProcessed(eventId) {
    const doc = await this.getById(eventId);
    return !!doc;
  }

  async markProcessed(eventId, details, userId = 'system') {
    return this.create(eventId, { 
      processedAt: new Date().toISOString(), 
      details 
    }, userId);
  }
}

module.exports = new WebhookRepository();
