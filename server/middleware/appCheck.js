const { getAppCheck } = require('firebase-admin/app-check');
const env = require('../config/env');
const { AppError } = require('../utils/errors');

module.exports = async (req, res, next) => {
  const isManagedRuntime = Boolean(process.env.K_SERVICE || process.env.FUNCTION_TARGET);
  const shouldEnforce = env.NODE_ENV === 'production' || isManagedRuntime;

  // Local development and explicit test mode may use emulator/debug clients.
  // Managed Firebase/Cloud Run deployments always enforce App Check.
  if (!shouldEnforce && (env.NODE_ENV === 'development' || env.NODE_ENV === 'test')) {
    return next();
  }
  
  const appCheckToken = req.header('X-Firebase-AppCheck');
  if (!appCheckToken) {
    return next(new AppError(
      'Unable to verify this app session. Please retry.',
      401,
      'APP_CHECK_REQUIRED'
    ));
  }
  
  try {
    const appCheckClaims = await getAppCheck().verifyToken(appCheckToken);
    req.appCheckClaims = appCheckClaims;
    next();
  } catch (err) {
    console.error('[APP CHECK ERROR] Verification failed:', {
      code: err?.code,
      requestId: req.id,
    });
    return next(new AppError(
      'Unable to verify this app session. Please retry.',
      401,
      'APP_CHECK_INVALID'
    ));
  }
};
