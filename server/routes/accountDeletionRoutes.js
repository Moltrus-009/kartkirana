const express = require('express');
const { rateLimit } = require('express-rate-limit');
const { getAuth } = require('firebase-admin/auth');
const { db } = require('../config/firebase');
const appCheck = require('../middleware/appCheck');
const admin = require('../middleware/admin');
const service = require('../services/accountDeletionRuntime');
const { publicRequest } = require('../services/accountDeletionService');
const { AppError } = require('../utils/errors');
const router = express.Router();
const limited = rateLimit({ windowMs: 60 * 1000, limit: 20, standardHeaders: true, legacyHeaders: false });
// Deliberately bypass the legacy Auth proxy's mock-token compatibility. Also
// explicitly check revocation here, independently of the shared Auth proxy.
async function verified(req, res, next) {
  try {
    const h = req.headers.authorization || '';
    if (!h.startsWith('Bearer ')) throw new Error('missing');
    req.user = await getAuth().verifyIdToken(h.slice(7), true);
    res.set('Cache-Control', 'no-store'); next();
  } catch { next(new AppError('Please verify your phone again.', 401, 'AUTH_INVALID')); }
}
const wrap = fn => async (req, res, next) => { try { await fn(req, res); } catch (e) { next(e.statusCode ? e : new AppError('Account deletion is temporarily unavailable. Please retry or contact support.', 503)); } };
router.get('/account-deletion/:type', limited, appCheck, verified, wrap(async (req,res) => res.json(await service.status(req.user, req.params.type))));
router.post('/account-deletion/:type', limited, appCheck, verified, wrap(async (req,res) => res.status(202).json({ request: await service.request(req.user, req.params.type, req.body) })));
router.get('/admin/account-deletion', limited, appCheck, verified, admin, wrap(async (req,res) => {
  const snap = await db.collection('accountDeletionRequests').where('status', 'in', ['PENDING_REVIEW', 'BLOCKED', 'APPROVED', 'PROCESSING']).limit(100).get();
  res.json({ requests: snap.docs.map(d => ({ ...publicRequest(d.data()), uid: d.data().uid, lastErrorCode: d.data().lastErrorCode || null })), limit: 100 });
}));
router.get('/admin/account-deletion/:id', limited, appCheck, verified, admin, wrap(async (req,res) => {
  if (!/^[a-f0-9]{64}$/.test(req.params.id)) throw new AppError('Invalid request.',400);
  const snap = await db.collection('accountDeletionRequests').doc(req.params.id).get();
  if (!snap.exists) throw new AppError('Request not found.',404);
  const r = snap.data(), p = await service.inspect(r.uid,r.accountType);
  res.json({ request: publicRequest(r), uid:r.uid, blockers:p.blockers,
    orders:p.orders.map(d=>({id:d.id,status:d.data().status})), shops:p.shops.map(d=>({id:d.id,status:d.data().status})),
    financialRecords:p.financial.map(d=>({path:d.ref.path,status:d.data().status || null})),
    reviewWarning:'Payout display estimates are not proof of settlement. Verify payment provider/bank records, legal holds, identity documents and disputes before approving.' });
}));
router.post('/admin/account-deletion/:id/approve', limited, appCheck, verified, admin, wrap(async(req,res)=>res.json(await service.review(req.params.id,req.user.uid,req.body))));
module.exports = router;
