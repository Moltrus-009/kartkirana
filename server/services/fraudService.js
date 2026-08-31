class FraudService {
  async evaluateTransactionSecurity(userId, requestPayload, req) {
    const alerts = [];
    
    const userAgent = req.header('User-Agent') || '';
    const isEmulator = userAgent.toLowerCase().includes('sdk') || userAgent.toLowerCase().includes('emulator');
    if (isEmulator) {
      alerts.push('EMULATOR_DETECTION');
    }

    if (requestPayload.metadata && requestPayload.metadata.isDeviceRooted) {
      alerts.push('ROOTED_DEVICE');
    }

    return {
      secure: alerts.length < 2,
      alerts,
      timestamp: new Date().toISOString()
    };
  }
}

module.exports = new FraudService();
