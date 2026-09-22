const { AppError } = require('../utils/errors');

// Read inside the caller's transaction, before any writes. Absence preserves
// behavior for every existing account. Admin SDK callers cannot rely on Rules.
async function assertAccountAvailable(db, transaction, uid, type) {
  if (!uid || String(uid).startsWith('deleted_')) throw new AppError('This account is unavailable.', 409);
  const snap = await transaction.get(db.collection('accountDeletionState').doc(uid));
  const state = snap.data() || {};
  if (state.processing || state.authDeleted || state[type] === 'COMPLETED') throw new AppError('This account is being deleted or has been deleted.', 409, 'ACCOUNT_DELETION_PENDING');
}
module.exports = { assertAccountAvailable };
