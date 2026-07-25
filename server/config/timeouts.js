module.exports = {
  // Inventory Reservation Lock TTL (10 minutes)
  reservationExpiryMs: 10 * 60 * 1000, 
  
  // Distributed Lock TTL for Checkout (30 seconds)
  lockExpiryMs: 30 * 1000,
  
  // API Timeout
  apiTimeoutMs: 15 * 1000,
  
  // Idempotency Key TTL (24 Hours)
  idempotencyTtlMs: 24 * 60 * 60 * 1000,
  
  // Retention for Webhook logs and Queue tasks (7 Days)
  retentionPeriodMs: 7 * 24 * 60 * 60 * 1000,
};
