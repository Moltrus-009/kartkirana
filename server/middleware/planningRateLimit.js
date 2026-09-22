const { db } = require('../config/firebase');
const { AppError } = require('../utils/errors');

// The IP limiter controls anonymous traffic; this account bucket also survives
// Cloud Run scaling and cannot be bypassed simply by changing IP addresses.
module.exports = async (req, res, next) => {
  try {
    const ref = db.collection('planningRateLimits').doc(req.user.uid);
    await db.runTransaction(async transaction => {
      const state = (await transaction.get(db.collection('accountDeletionState').doc(req.user.uid))).data() || {};
      if (state.processing || state.authDeleted || (state.customer === 'COMPLETED' && !req.path.startsWith('/admin/'))) {
        throw new AppError('This account is unavailable.', 409);
      }
      const previous = (await transaction.get(ref)).data();
      const now = Date.now();
      const active = previous && Number(previous.resetAt) > now;
      const count = active ? Number(previous.count) || 0 : 0;
      if (count >= 20) throw new AppError('Too many requests. Please wait a minute and try again.', 429);
      transaction.set(ref, {
        userId: req.user.uid,
        count: count + 1,
        resetAt: active ? previous.resetAt : now + 60000,
        expiresAt: new Date(now + 86400000).toISOString()
      });
    });
    next();
  } catch (error) {
    next(error.statusCode ? error : new AppError('Please retry when account verification is available.', 503));
  }
};
