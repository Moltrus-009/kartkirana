const crypto = require('node:crypto');
const { AppError } = require('../utils/errors');
const { serviceable, shopOpen } = require('./cartMatching');
const { nextOccurrence } = require('./planningCalendar');
const digest = value => crypto.createHash('sha256').update(value).digest('hex');
const occurrenceId = (id, scheduledFor) => digest(`${id}:${scheduledFor}`);
const actionAt = scheduledFor => scheduledFor ? new Date(Date.parse(scheduledFor) - require('../config/planning').notificationLeadHours * 3600000).toISOString() : null;
function enqueue(tx, db, id, userId, title, body, referenceId, now, userType = 'customer') {
    const queueId = `routine_${id}`;
    tx.set(db.collection('notificationQueue').doc(queueId), { queueId, userId, title, body, userType, referenceId, ...(String(referenceId).startsWith('ord_') ? {} : { link: '/routines' }), status: 'PENDING', attempts: 0, createdAt: now, updatedAt: now, createdBy: 'system', updatedBy: 'system', isDeleted: false, schemaVersion: 1 });
}
async function prepare(db, tx, context, userId, shop, address, breakdown) {
    const executionRef = db.collection('routineExecutions').doc(context.executionId);
    const execution = (await tx.get(executionRef)).data();
    if (!execution || execution.userId !== userId)
        throw new AppError('Routine occurrence not found.', 404);
    if (execution.checkoutResult)
        return { replay: execution.checkoutResult };
    const routineRef = db.collection('routines').doc(execution.routineId);
    const routine = (await tx.get(routineRef)).data();
    const user = (await tx.get(db.collection('users').doc(userId))).data();
    if (!routine || routine.userId !== userId || routine.status !== 'ACTIVE' || routine.version !== execution.routineVersion || routine.nextScheduledFor !== execution.scheduledFor)
        throw new AppError('This routine changed. Review its next occurrence.', 409);
    if (!['PROCESSING', 'AWAITING_CONFIRMATION'].includes(execution.status))
        throw new AppError('This occurrence is no longer available.', 409);
    if (context.confirmed !== true && (routine.paymentMethod !== 'cod' || execution.status !== 'PROCESSING'))
        throw new AppError('Please confirm this occurrence at checkout.', 409);
    if (context.confirmed !== true && execution.leaseToken !== context.leaseToken)
        throw new AppError('This occurrence is being retried.', 409);
    if (Date.parse(execution.scheduledDeliveryEnd) <= Date.now())
        throw new AppError('This delivery window has passed.', 409);
    const saved = user?.addresses?.find(a => a.id === routine.addressId);
    if (!saved || digest(JSON.stringify(saved)) !== context.addressHash || !serviceable(shop, saved) || !shopOpen(shop))
        throw new AppError('Your address or shop availability changed. Review the routine.', 409);
    if (shop.id !== context.shopId || address.id !== saved.id)
        throw new AppError('Routine checkout details changed.', 409);
    if (breakdown.grandTotal > context.maxTotal + 0.001)
        throw new AppError('Prices changed. Confirm the current total.', 409, 'ROUTINE_PRICE_CHANGED');
    return { executionRef, execution, routineRef, routine };
}
function commit(db, tx, state, result, shop, isCod) {
    const now = new Date().toISOString();
    const next = nextOccurrence(state.routine, Date.parse(state.execution.scheduledFor));
    tx.update(state.executionRef, { status: 'ORDER_CREATED', generatedOrderId: result.orderId, checkoutResult: result, processedAt: now, leaseUntil: null });
    tx.update(state.routineRef, { nextScheduledFor: next, nextActionAt: actionAt(next), status: next ? 'ACTIVE' : 'COMPLETED', updatedAt: now });
    if (isCod) {
        enqueue(tx, db, `${state.executionRef.id}_customer`, state.routine.userId, 'Routine order placed', 'Your scheduled Cash on Delivery order has been placed.', result.orderId, now);
        if (shop.ownerId)
            enqueue(tx, db, `${state.executionRef.id}_merchant`, shop.ownerId, 'New scheduled order', 'A scheduled order is ready for preparation. Check its delivery window.', result.orderId, now, 'owner');
    }
}
module.exports = { digest, occurrenceId, actionAt, enqueue, prepare, commit };
