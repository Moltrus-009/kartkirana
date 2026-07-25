const { getAppCheck } = require('firebase-admin/app-check');
const env = require('../config/env');

module.exports = async (req, res, next) => {
  // Skip App Check verification in development/testing
  if (process.env.NODE_ENV !== 'production' || env.USE_MOCK_DB) {
    return next();
  }
  
  const appCheckToken = req.header('X-Firebase-AppCheck');
  if (!appCheckToken) {
    return res.status(401).json({ 
      error: 'Unauthorized', 
      message: 'Missing Firebase App Check token. Requests must come from an authorized client app.' 
    });
  }
  
  try {
    const appCheckClaims = await getAppCheck().verifyToken(appCheckToken);
    req.appCheckClaims = appCheckClaims;
    next();
  } catch (err) {
    console.error('[APP CHECK ERROR] Verification failed:', err.message);
    return res.status(401).json({ 
      error: 'Unauthorized', 
      message: 'Invalid, revoked, or expired App Check token.' 
    });
  }
};
