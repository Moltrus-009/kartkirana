const { auth } = require('../config/firebase');
const env = require('../config/env');

module.exports = async (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Unauthorized', message: 'Missing or invalid Authorization header.' });
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
    return res.status(500).json({ error: 'Internal Error', message: 'Authentication service unavailable.' });
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
      return res.status(503).json({
        error: 'Authentication service unavailable',
        message: 'Firebase token verification cannot reach Google services. Check this machine’s internet connection, proxy, or firewall, then retry.',
        requestId: req.id,
      });
    }

    return res.status(401).json({
      error: 'Unauthorized',
      message: 'Invalid, revoked, or expired authentication token.',
      requestId: req.id,
    });
  }
};
