const { auth } = require('../config/firebase');
const env = require('../config/env');
const { AppError } = require('../utils/errors');

module.exports = async (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return next(new AppError('Please sign in to continue.', 401, 'AUTH_REQUIRED'));
  }

  const token = authHeader.slice('Bearer '.length);

  // Development-only support for the local high-fidelity database mode.
  if (token.startsWith('mock_token_') && env.USE_MOCK_DB && process.env.NODE_ENV !== 'production') {
    const uid = token.replace('mock_token_', '');
    const role = uid.includes('admin') ? 'admin' : (uid.includes('owner') ? 'owner' : (uid.includes('rider') ? 'rider' : 'customer'));
    req.user = { uid, email: `${uid}@mock.com`, role };
    return next();
  }

  if (!auth) {
    return next(new AppError(
      'Authentication is temporarily unavailable. Please try again.',
      503,
      'AUTH_DEPENDENCY_UNAVAILABLE'
    ));
  }

  try {
    // Keep revocation checks enabled for every real payment request.
    req.user = await auth.verifyIdToken(token, true);
    return next();
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown Firebase Auth verification error.';
    const isConnectivityFailure = /EACCES|ECONNREFUSED|ENETUNREACH|ETIMEDOUT|network|making request/i.test(message);

    // Never log Authorization headers or raw Firebase tokens.
    console.error('[AUTH ERROR] Firebase token verification failed:', {
      code: error?.code,
      message,
      requestId: req.id,
    });

    if (isConnectivityFailure) {
      return next(new AppError(
        'Authentication is temporarily unavailable. Please try again.',
        503,
        'AUTH_DEPENDENCY_UNAVAILABLE'
      ));
    }

    return next(new AppError(
      'Your session has expired. Please sign in again.',
      401,
      'AUTH_INVALID'
    ));
  }
};
