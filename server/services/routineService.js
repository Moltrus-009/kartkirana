const crypto = require('node:crypto');
const config = require('../config/planning');
const { AppError } = require('../utils/errors');
const { assertAccountAvailable } = require('./accountDeletionGuard');
const { validateItems, portable, coordinates, serviceable, shopOpen, stock, exact, resolveNearby } = require('./cartMatching');
const { validateSchedule, windowFor, recurrenceDays, nextOccurrence, indiaDate, dateValid } = require('./planningCalendar');
const { creationKey } = require('./sharedCartService');
const { digest, occurrenceId, actionAt, enqueue } = require('./routineExecution');
const validId = id => { if (typeof id !== 'string' || !/^[a-f0-9]{64}$/.test(id))
    throw new AppError('Routine not found.', 404); return id; };
const publicExecution = d => { const { checkoutResult, addressHash, leaseToken, ...safe } = d; return safe; };
function createRoutineService({ db, now = () => Date.now(), price, checkout }) {
    const timestamp = () => new Date(now()).toISOString();
    async function list(uid) {
        const [routines, executions] = await Promise.all([
            db.collection('routines').where('userId', '==', uid).get(),
            db.collection('routineExecutions').where('userId', '==', uid).orderBy('scheduledFor', 'desc').limit(100).get()
        ]);
        return { routines: routines.docs.map(d => ({ id: d.id, ...d.data() })), executions: executions.docs.map(d => ({ id: d.id, ...publicExecution(d.data()) })) };
    }
    async function save(uid, body, key, id = null) {
        creationKey(key);
        if (id)
            validId(id);
        if (body?.timezone && body.timezone !== config.timezone)
            throw new AppError('Choose India Standard Time.', 400);
        const items = validateItems(body?.items);
        const window = validateSchedule({ date: body.startDate, slotId: body.slotId }, now());
        const days = recurrenceDays(body.recurrenceType, body.selectedDays, window.date);
        if (body.endDate && (!dateValid(body.endDate) || body.endDate < window.date))
            throw new AppError('Choose an end date on or after the start date.', 400);
        if (!['cod', 'online'].includes(body.paymentMethod))
            throw new AppError('Choose Cash on Delivery or online payment.', 400);
        const merchantFallback = body.merchantFallback || 'SKIP', itemFallback = body.itemFallback || 'NONE';
        if (!['SKIP', 'ASK', 'AUTO_EXACT'].includes(merchantFallback) || !['NONE', 'ASK', 'SAME_ITEM'].includes(itemFallback))
            throw new AppError('Choose a valid fallback preference.', 400);
        if (typeof body.addressId !== 'string' || body.addressId.length > 128)
            throw new AppError('Choose a saved delivery address.', 400);
        const snapshots = [];
        let shopId = null;
        for (const item of items) {
            const p = await db.doc(`products/${item.productId}`).get();
            if (!p.exists)
                throw new AppError('A product is no longer available.', 409);
            const data = p.data();
            if (shopId && shopId !== data.shopId)
                throw new AppError('Choose products from one shop.', 400);
            shopId = data.shopId;
            snapshots.push(portable(data, p.id, item.quantity));
        }
        if (!shopId || !/^[-\w]{1,128}$/.test(shopId))
            throw new AppError('Choose a valid shop.', 400);
        const breakdown = await price(items, shopId, uid);
        const ref = db.collection('routines').doc(id || digest(`${uid}:${key}`));
        const fingerprint = digest(JSON.stringify({ items, name: body.name, addressId: body.addressId, startDate: window.date, slotId: window.slotId, endDate: body.endDate || null, recurrenceType: body.recurrenceType, days, paymentMethod: body.paymentMethod, merchantFallback, itemFallback }));
        return db.runTransaction(async (tx) => {
            await assertAccountAvailable(db, tx, uid, 'customer');
            const previous = (await tx.get(ref)).data();
            if (previous && previous.userId !== uid)
                throw new AppError('Routine not found.', 404);
            if (!id && previous) {
                if (previous.fingerprint !== fingerprint)
                    throw new AppError('Retry key belongs to another routine.', 409);
                return { id: ref.id, ...previous };
            }
            if (id && previous?.lastEditKey === key) {
                if (previous.fingerprint !== fingerprint)
                    throw new AppError('Retry key belongs to another edit.', 409);
                return { id: ref.id, ...previous };
            }
            if (id && (!previous || !['ACTIVE', 'PAUSED'].includes(previous.status)))
                throw new AppError('This routine cannot be edited.', 409);
            const user = (await tx.get(db.doc(`users/${uid}`))).data();
            const address = user?.addresses?.find(a => a.id === body.addressId);
            if (!address)
                throw new AppError('Save this delivery address before creating a routine.', 400);
            coordinates(address);
            const shop = (await tx.get(db.doc(`shops/${shopId}`))).data();
            if (!shop || !serviceable(shop, address))
                throw new AppError('This shop does not serve your saved address.', 409);
            if (shop.ownerId)
                await assertAccountAvailable(db, tx, shop.ownerId, 'shopkeeper');
            const existing = await tx.get(db.collection('routines').where('userId', '==', uid));
            if (!id && existing.docs.filter(d => ['ACTIVE', 'PAUSED'].includes(d.data().status)).length >= config.maxActiveRoutines)
                throw new AppError('You can have up to 20 active or paused routines.', 409);
            let priorExecution = null;
            if (previous?.nextScheduledFor)
                priorExecution = await tx.get(db.collection('routineExecutions').doc(occurrenceId(ref.id, previous.nextScheduledFor)));
            const routine = { userId: uid, name: String(body.name || 'My routine').trim().slice(0, 80), items: snapshots, shopId, shopName: String(shop.name || ''), addressId: address.id, timezone: config.timezone, startDate: window.date, endDate: body.endDate || null, slotId: window.slotId, recurrenceType: body.recurrenceType, selectedDays: days, paymentMethod: body.paymentMethod, baselineTotal: breakdown.grandTotal, priceIncreasePercent: config.priceIncreasePercent, priceIncreaseRupees: config.priceIncreaseRupees, status: 'ACTIVE', version: (previous?.version || 0) + 1, createdAt: previous?.createdAt || timestamp(), updatedAt: timestamp(), fingerprint, pausedUntil: null };
            routine.nextScheduledFor = nextOccurrence(routine, now() + config.prepareLeadMinutes * 60000 - 1);
            if (!routine.nextScheduledFor)
                throw new AppError('No future delivery falls within these dates.', 400);
            const targetExecution = await tx.get(db.collection('routineExecutions').doc(occurrenceId(ref.id, routine.nextScheduledFor)));
            if (targetExecution.data()?.checkoutResult)
                throw new AppError('An order already exists for this window. Choose another date.', 409);
            routine.lastEditKey = key;
            routine.nextActionAt = actionAt(routine.nextScheduledFor);
            routine.merchantFallback = merchantFallback;
            routine.itemFallback = itemFallback;
            if (priorExecution?.exists && !priorExecution.data().checkoutResult)
                tx.update(priorExecution.ref, { status: 'CANCELLED', reason: 'ROUTINE_EDITED', processedAt: timestamp(), leaseUntil: null });
            tx.set(ref, routine);
            return { id: ref.id, ...routine };
        });
    }
    async function action(uid, id, body) {
        validId(id);
        const action = body?.action;
        if (!['PAUSE', 'RESUME', 'SKIP', 'CANCEL'].includes(action))
            throw new AppError('Invalid routine action.', 400);
        return db.runTransaction(async (tx) => {
            await assertAccountAvailable(db, tx, uid, 'customer');
            const ref = db.collection('routines').doc(id), snap = await tx.get(ref), r = snap.data();
            if (!r || r.userId !== uid)
                throw new AppError('Routine not found.', 404);
            if (body.expectedVersion !== undefined && body.expectedVersion !== r.version)
                throw new AppError('This routine changed. Refresh before applying another action.', 409);
            if (['CANCELLED', 'COMPLETED'].includes(r.status)) {
                if (action === 'CANCEL')
                    return { status: r.status };
                throw new AppError('This routine has ended.', 409);
            }
            const executionRef = r.nextScheduledFor ? db.collection('routineExecutions').doc(occurrenceId(id, r.nextScheduledFor)) : null;
            const e = executionRef ? (await tx.get(executionRef)).data() : null;
            const patch = { updatedAt: timestamp(), version: r.version + 1 };
            if (action === 'CANCEL')
                Object.assign(patch, { status: 'CANCELLED', nextScheduledFor: null, pausedUntil: null });
            if (action === 'PAUSE') {
                const until = body.until ? Date.parse(`${body.until}T00:00:00+05:30`) : null;
                if (body.until && (!dateValid(body.until) || !Number.isFinite(until) || until <= now()))
                    throw new AppError('Choose a future resume date.', 400);
                Object.assign(patch, { status: 'PAUSED', pausedUntil: until ? new Date(until).toISOString() : null });
            }
            if (action === 'RESUME') {
                const next = nextOccurrence(r, now() + config.prepareLeadMinutes * 60000);
                Object.assign(patch, { status: next ? 'ACTIVE' : 'COMPLETED', nextScheduledFor: next, pausedUntil: null });
            }
            if (action === 'SKIP') {
                if (!r.nextScheduledFor)
                    throw new AppError('No next occurrence to skip.', 409);
                const next = nextOccurrence(r, Date.parse(r.nextScheduledFor));
                Object.assign(patch, { nextScheduledFor: next, status: next ? r.status : 'COMPLETED' });
            }
            if (executionRef && !e?.checkoutResult)
                tx.set(executionRef, { ...(e || {}), routineId: id, userId: uid, scheduledFor: r.nextScheduledFor, status: action === 'SKIP' ? 'SKIPPED' : 'CANCELLED', reason: `USER_${action}`, processedAt: timestamp(), leaseUntil: null }, { merge: true });
            patch.nextActionAt = actionAt(patch.nextScheduledFor === undefined ? r.nextScheduledFor : patch.nextScheduledFor);
            tx.update(ref, patch);
            return { id, ...r, ...patch };
        });
    }
    async function plan(uid, executionId) {
        validId(executionId);
        const e = (await db.collection('routineExecutions').doc(executionId).get()).data();
        if (!e || e.userId !== uid)
            throw new AppError('Occurrence not found.', 404);
        const r = (await db.collection('routines').doc(e.routineId).get()).data();
        if (!r || r.userId !== uid || r.status !== 'ACTIVE' || r.version !== e.routineVersion || r.nextScheduledFor !== e.scheduledFor || !['PROCESSING', 'AWAITING_CONFIRMATION'].includes(e.status))
            throw new AppError('This occurrence is no longer available.', 409);
        if (Date.parse(e.scheduledDeliveryEnd) <= now())
            throw new AppError('This delivery window has passed.', 409, 'WINDOW_EXPIRED');
        const profile = (await db.doc(`users/${uid}`).get()).data();
        const address = profile?.addresses?.find(a => a.id === r.addressId);
        if (!address)
            throw new AppError('Saved address was removed. Edit the routine.', 409, 'ADDRESS_REMOVED');
        const shop = (await db.doc(`shops/${r.shopId}`).get()).data();
        let products = [], shopId = r.shopId, fallbackRequired = false, fallbackReason = null;
        if (!shop || !shopOpen(shop) || !serviceable(shop, address))
            fallbackReason = 'SHOP_UNAVAILABLE';
        for (const item of r.items) {
            const p = (await db.doc(`products/${item.productId}`).get()).data();
            const current = p ? portable(p, item.productId, item.quantity) : null;
            if (!p || p.shopId !== r.shopId || !exact(item, current) || ['name', 'brand', 'variant', 'packSize', 'unit', 'barcode'].some(k => String(item[k] || '') !== String(current[k] || '')) || (p.status && p.status !== 'active') || stock(p) < item.quantity) {
                fallbackReason = fallbackReason || 'ITEM_UNAVAILABLE';
                continue;
            }
            products.push({ ...portable(p, item.productId, item.quantity), id: item.productId, shopId: r.shopId, shopName: r.shopName, price: Number(p.price), stock: stock(p), specifications: p.specifications || p.specs || {} });
        }
        if (fallbackReason) {
            const preference = fallbackReason === 'SHOP_UNAVAILABLE' ? (r.merchantFallback || 'SKIP') : (r.itemFallback || 'NONE');
            if (['SKIP', 'NONE'].includes(preference))
                throw new AppError('Your selected shop or item is unavailable. No replacement was authorized.', 409, fallbackReason);
            const candidates = await resolveNearby(db, r.items, address, r.shopId);
            const replacement = candidates.find(s => s.availableCount === r.items.length);
            if (!replacement)
                throw new AppError('No nearby shop has all exact items. Review other products and edit your routine.', 409, 'NO_EXACT_FALLBACK');
            products = replacement.matches.map(m => ({ ...m.product, quantity: m.requested.quantity }));
            shopId = replacement.shopId;
            fallbackRequired = preference === 'ASK';
        }
        const items = products.map(i => ({ productId: i.id, quantity: i.quantity }));
        const breakdown = await price(items, shopId, uid);
        const schedule = windowFor(indiaDate(Date.parse(e.scheduledFor)), r.slotId);
        const maxTotal = r.baselineTotal + Math.min(r.baselineTotal * r.priceIncreasePercent / 100, r.priceIncreaseRupees);
        return { routineId: e.routineId, executionId, routine: r, items, products, address, shopId, shopName: products[0]?.shopName || r.shopName, schedule, breakdown, fallbackRequired, context: { executionId, addressHash: digest(JSON.stringify(address)), shopId, maxTotal, confirmed: false } };
    }
    async function checkoutContext(uid, id, body) {
        validId(id);
        const existing = (await db.collection('routineExecutions').doc(id).get()).data();
        if (existing?.userId === uid && existing.checkoutResult) {
            const order = (await db.collection('orders').doc(existing.generatedOrderId).get()).data();
            if (!order || ['CANCELLED', 'CANCELED', 'AUTO_CANCELLED', 'SHOP_REJECTED', 'REJECTED', 'PAYMENT_FAILED', 'EXPIRED'].includes(String(order.status).toUpperCase()))
                throw new AppError('This occurrence already has a closed checkout. Review Order history.', 409);
            if (order.shopId !== body.shopId || digest(JSON.stringify(validateItems(body.items))) !== digest(JSON.stringify(order.items.map(i => ({ productId: i.productId, quantity: i.quantity })))))
                throw new AppError('An order already exists for this occurrence. Review Order history.', 409);
            return { replay: existing.checkoutResult };
        }
        const p = await plan(uid, id);
        if (!Number.isFinite(Number(body.amount)) || Math.abs(Number(body.amount) - p.breakdown.grandTotal) > 0.01)
            throw new AppError('Prices changed. Reopen this occurrence and review its current total.', 409, 'ROUTINE_PRICE_CHANGED');
        const submitted = validateItems(body.items);
        if (body.shopId !== p.shopId || digest(JSON.stringify(submitted)) !== digest(JSON.stringify(p.items)) || body.deliveryAddress?.id !== p.address.id || body.couponCode || Number(body.walletCreditsUsed) > 0 || body.referralCode)
            throw new AppError('Routine checkout changed. Reopen this occurrence to continue.', 409);
        if (['lat', 'lng', 'details', 'area', 'city', 'pinCode', 'floor', 'landmark', 'instructions'].some(k => String(body.deliveryAddress[k] ?? '') !== String(p.address[k] ?? '')))
            throw new AppError('Delivery address changed. Reopen this occurrence.', 409);
        return { ...p, context: { ...p.context, confirmed: true, maxTotal: p.breakdown.grandTotal } };
    }
    async function sweep() {
        // Feature flag is enforced by both deployed/local worker entry points.
        const paused = await db.collection('routines').where('status', '==', 'PAUSED').where('pausedUntil', '>', '').where('pausedUntil', '<=', timestamp()).limit(config.workerBatchSize).get();
        for (const d of paused.docs) {
            const r = d.data();
            if (r.pausedUntil && Date.parse(r.pausedUntil) <= now())
                await action(r.userId, d.id, { action: 'RESUME' }).catch(() => { });
        }
        const active = await db.collection('routines').where('status', '==', 'ACTIVE').where('nextActionAt', '<=', timestamp()).orderBy('nextActionAt').limit(config.workerBatchSize).get();
        for (const d of active.docs) {
            const r = d.data();
            if (!r.nextScheduledFor)
                continue;
            const due = Date.parse(r.nextScheduledFor);
            if (due - now() > config.notificationLeadHours * 3600000)
                continue;
            const id = occurrenceId(d.id, r.nextScheduledFor), ref = db.collection('routineExecutions').doc(id);
            try {
                const claimed = await db.runTransaction(async (tx) => {
                    await assertAccountAvailable(db, tx, r.userId, 'customer');
                    const fresh = (await tx.get(d.ref)).data();
                    let prior = (await tx.get(ref)).data();
                    if (!fresh || fresh.status !== 'ACTIVE' || fresh.nextScheduledFor !== r.nextScheduledFor || fresh.version !== r.version)
                        return false;
                    if (prior && prior.routineVersion !== fresh.version && !prior.checkoutResult)
                        prior = null;
                    if (prior && ['ORDER_CREATED', 'SKIPPED', 'FAILED', 'CANCELLED'].includes(prior.status))
                        return false;
                    const window = windowFor(indiaDate(due), r.slotId);
                    if (Date.parse(window.scheduledDeliveryEnd) <= now()) {
                        const next = nextOccurrence(r, now());
                        tx.set(ref, { ...(prior || {}), routineId: d.id, userId: r.userId, scheduledFor: r.nextScheduledFor, status: 'FAILED', reason: 'WINDOW_EXPIRED', processedAt: timestamp() });
                        tx.update(d.ref, { nextScheduledFor: next, nextActionAt: actionAt(next), status: next ? 'ACTIVE' : 'COMPLETED', updatedAt: timestamp() });
                        enqueue(tx, db, `${id}_expired`, r.userId, 'Routine delivery missed', 'This delivery window passed without an order. Review My Routines.', d.id, timestamp());
                        return false;
                    }
                    const execution = { routineId: d.id, userId: r.userId, routineVersion: r.version, scheduledFor: r.nextScheduledFor, scheduledDeliveryEnd: window.scheduledDeliveryEnd, createdAt: timestamp(), status: 'UPCOMING', ...prior };
                    if (!prior?.advanceNotifiedAt) {
                        execution.advanceNotifiedAt = timestamp();
                        enqueue(tx, db, `${id}_advance`, r.userId, 'Upcoming routine delivery', `Your ${r.name} delivery is planned for ${window.date}, ${window.slot}.`, d.id, timestamp());
                    }
                    if (due - now() > config.prepareLeadMinutes * 60000) {
                        tx.set(ref, execution);
                        tx.update(d.ref, { nextActionAt: new Date(due - config.prepareLeadMinutes * 60000).toISOString() });
                        return false;
                    }
                    if (execution.status === 'AWAITING_CONFIRMATION' || Date.parse(execution.leaseUntil || 0) > now()) {
                        tx.set(ref, execution);
                        return false;
                    }
                    const leaseToken = crypto.randomUUID();
                    const leaseUntil = new Date(now() + 5 * 60000).toISOString();
                    tx.set(ref, { ...execution, status: 'PROCESSING', leaseToken, leaseUntil });
                    tx.update(d.ref, { nextActionAt: leaseUntil });
                    return leaseToken;
                });
                if (!claimed)
                    continue;
                let p;
                try {
                    p = await plan(r.userId, id);
                    p.context.leaseToken = claimed;
                }
                catch (error) {
                    if (!error.statusCode || error.statusCode >= 500)
                        throw error;
                    await settle(d.id, id, 'FAILED', error.code || 'VALIDATION_FAILED', claimed);
                    continue;
                }
                if (p.fallbackRequired || r.paymentMethod !== 'cod' || p.breakdown.grandTotal > p.context.maxTotal) {
                    await settle(d.id, id, 'AWAITING_CONFIRMATION', p.fallbackRequired ? 'MERCHANT_CONFIRMATION_REQUIRED' : r.paymentMethod !== 'cod' ? 'ONLINE_PAYMENT_REQUIRED' : 'PRICE_CHANGED', claimed);
                    continue;
                }
                try {
                    await checkout(r.userId, p.shopId, p.items, p.address, null, 0, '', p.schedule, '', 'cod', p.context);
                }
                catch (error) {
                    if (!error.statusCode || error.statusCode >= 500)
                        throw error;
                    await settle(d.id, id, error.code === 'ROUTINE_PRICE_CHANGED' ? 'AWAITING_CONFIRMATION' : 'FAILED', error.code || 'CHECKOUT_FAILED', claimed);
                }
            }
            catch (error) {
                console.warn('[ROUTINE] Occurrence processing deferred', { executionId: id, code: error.code || 'DEPENDENCY_UNAVAILABLE' });
            }
        }
    }
    async function settle(routineId, id, status, reason, leaseToken) {
        await db.runTransaction(async (tx) => {
            const ref = db.collection('routineExecutions').doc(id), rr = db.collection('routines').doc(routineId);
            const e = (await tx.get(ref)).data(), r = (await tx.get(rr)).data();
            if (!e || !r || e.checkoutResult || e.status !== 'PROCESSING' || e.leaseToken !== leaseToken || r.version !== e.routineVersion || r.nextScheduledFor !== e.scheduledFor)
                return;
            await assertAccountAvailable(db, tx, r.userId, 'customer');
            tx.update(ref, { status, reason, processedAt: timestamp(), leaseUntil: null });
            if (status === 'FAILED') {
                const next = nextOccurrence(r, Date.parse(e.scheduledFor));
                tx.update(rr, { nextScheduledFor: next, nextActionAt: actionAt(next), status: next ? 'ACTIVE' : 'COMPLETED', updatedAt: timestamp() });
            }
            else
                tx.update(rr, { nextActionAt: e.scheduledDeliveryEnd, updatedAt: timestamp() });
            enqueue(tx, db, `${id}_${status}`, r.userId, status === 'FAILED' ? 'Routine order could not be placed' : 'Confirm your routine order', status === 'FAILED' ? 'Review the occurrence in My Routines. No automatic substitution was made.' : 'Review current prices and complete checkout in My Routines. No online payment has been taken.', routineId, timestamp());
        });
    }
    return { list, save, action, plan, checkoutContext, sweep };
}
module.exports = { createRoutineService };
