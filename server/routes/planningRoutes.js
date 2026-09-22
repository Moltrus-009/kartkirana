const express = require('express');
const { rateLimit } = require('express-rate-limit');
const { db } = require('../config/firebase');
const auth = require('../middleware/auth');
const identityLimit = require('../middleware/planningRateLimit');
const appCheck = require('../middleware/appCheck');
const { AppError } = require('../utils/errors');
const config = require('../config/planning');
const { createSharedCartService } = require('../services/sharedCartService');
const router = express.Router();
const service = createSharedCartService({ db });
const routines = require('../services/routineRuntime');
const publicLimit = rateLimit({ windowMs: 60000, limit: 60, standardHeaders: true, legacyHeaders: false, message: { message: 'Too many requests. Please wait a minute and try again.' } });
const writeLimit = rateLimit({ windowMs: 60000, limit: 10, standardHeaders: true, legacyHeaders: false, message: { message: 'Too many requests. Please wait a minute and try again.' } });
const wrap = fn => async (req, res, next) => {
    res.set('Cache-Control', 'no-store');
    try {
        await fn(req, res);
    }
    catch (error) {
        next(error.statusCode ? error : new AppError('This service is temporarily unavailable. Please retry.', 503));
    }
};
router.get('/planning/config', publicLimit, (req, res) => res.json({ ...config, enabled: process.env.ROUTINE_ORDERS_ENABLED === 'true' }));
// An opaque share token grants read access only to a safe product projection.
router.get('/shared-carts/:token', publicLimit, wrap(async (req, res) => res.json(await service.read(req.params.token))));
router.post('/shared-carts', writeLimit, appCheck, auth, identityLimit, wrap(async (req, res) => {
    res.status(201).json(await service.create(req.user.uid, req.body, req.get('Idempotency-Key')));
}));
router.post('/shared-carts/:token/match', writeLimit, appCheck, auth, identityLimit, wrap(async (req, res) => {
    const profile = await db.doc(`users/${req.user.uid}`).get();
    if (!profile.exists || req.accountDeletion?.customer === 'COMPLETED')
        throw new AppError('Customer account required.', 403);
    res.json(await service.match(req.params.token, req.body?.address));
}));
router.get('/routines', publicLimit, appCheck, auth, identityLimit, wrap(async (req, res) => res.json(await routines.list(req.user.uid))));
router.post('/scheduled-orders/:id/reschedule', writeLimit, appCheck, auth, identityLimit, wrap(async (req, res) => {
    if (!/^[-\w]{1,128}$/.test(req.params.id))
        throw new AppError('Order not found.', 404);
    const schedule = require('../services/planningCalendar').validateSchedule({ date: req.body.preorderDate, slot: req.body.preorderSlot });
    await db.runTransaction(async (tx) => {
        await require('../services/accountDeletionGuard').assertAccountAvailable(db, tx, req.user.uid, 'customer');
        const ref = db.collection('orders').doc(req.params.id), order = (await tx.get(ref)).data();
        if (!order || order.userId !== req.user.uid)
            throw new AppError('Order not found.', 404);
        if (!order.preorderDate || !['PLACED', 'ORDER_PLACED', 'UPCOMING'].includes(String(order.status).toUpperCase()) || order.riderId || order.currentRiderId || order.batchId)
            throw new AppError('This order is already being prepared or dispatched. Contact support.', 409);
        tx.update(ref, { preorderDate: schedule.date, preorderSlot: schedule.slot, preorderTime: null, scheduledDeliveryStart: schedule.scheduledDeliveryStart, scheduledDeliveryEnd: schedule.scheduledDeliveryEnd, dispatchNotBefore: new Date(Date.parse(schedule.scheduledDeliveryStart) - config.dispatchLeadMinutes * 60000), estimatedDelivery: `${schedule.date} | ${schedule.slot}`, updatedAt: new Date().toISOString() });
    });
    res.json({ success: true });
}));
router.use('/routines', (req, res, next) => req.method === 'GET' || req.path.endsWith('/action') || process.env.ROUTINE_ORDERS_ENABLED === 'true' ? next() : next(new AppError('Routine ordering is not available yet.', 503)));
router.post('/routines', writeLimit, appCheck, auth, identityLimit, wrap(async (req, res) => res.status(201).json(await routines.save(req.user.uid, req.body, req.get('Idempotency-Key')))));
router.post('/routines/:id/edit', writeLimit, appCheck, auth, identityLimit, wrap(async (req, res) => res.json(await routines.save(req.user.uid, req.body, req.get('Idempotency-Key'), req.params.id))));
router.post('/routines/:id/action', writeLimit, appCheck, auth, identityLimit, wrap(async (req, res) => res.json(await routines.action(req.user.uid, req.params.id, req.body))));
router.get('/routine-executions/:id/preview', writeLimit, appCheck, auth, identityLimit, wrap(async (req, res) => {
    const { context, routine, ...preview } = await routines.plan(req.user.uid, req.params.id);
    res.json(preview);
}));
router.get('/admin/routines', publicLimit, appCheck, auth, identityLimit, require('../middleware/admin'), wrap(async (req, res) => {
    const [active, paused, failed, confirmation, latest] = await Promise.all([
        db.collection('routines').where('status', '==', 'ACTIVE').count().get(),
        db.collection('routines').where('status', '==', 'PAUSED').count().get(),
        db.collection('routineExecutions').where('status', '==', 'FAILED').count().get(),
        db.collection('routineExecutions').where('status', '==', 'AWAITING_CONFIRMATION').count().get(),
        db.collection('routineExecutions').orderBy('scheduledFor', 'desc').limit(100).get()
    ]);
    res.json({ enabled: process.env.ROUTINE_ORDERS_ENABLED === 'true', counts: { active: active.data().count, paused: paused.data().count, failed: failed.data().count, awaitingConfirmation: confirmation.data().count }, executions: latest.docs.map(d => { const e = d.data(); return { id: d.id, routineId: e.routineId, scheduledFor: e.scheduledFor, status: e.status, reason: e.reason || null, generatedOrderId: e.generatedOrderId || null }; }) });
}));
module.exports = router;
