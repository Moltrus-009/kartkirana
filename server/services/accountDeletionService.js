const crypto = require('node:crypto');
const { AppError } = require('../utils/errors');

const TYPES = ['customer', 'shopkeeper', 'rider'];
const TERMINAL = new Set(['DELIVERED', 'COMPLETED', 'CANCELLED', 'CANCELED', 'AUTO_CANCELLED', 'SHOP_REJECTED', 'REJECTED', 'RETURNED', 'EXPIRED', 'PAYMENT_FAILED']);
const CLOSED = new Set(['COMPLETED', 'RESOLVED', 'CLOSED', 'PAID', 'SETTLED', 'PROCESSED', 'CANCELLED', 'REJECTED', 'REFUNDED']);
const PAYMENT_CLOSED = new Set(['CAPTURED', 'COD_COLLECTED', 'COMPLETED', 'REFUNDED', 'PARTIALLY_REFUNDED', 'CANCELLED', 'FAILED', 'EXPIRED']);
const RETENTION = 'Order, invoice, payment, payout, tax, dispute and security evidence is retained for reconciliation and applicable legal obligations. Operational contact/address/location data is removed from completed orders. Other KartKirana roles and their shared sign-in are preserved. Business records and shop/product history are not erased.';
const hash = value => crypto.createHash('sha256').update(value).digest('hex');
const requestKey = (uid, type) => hash(`${uid}:${type}`);
const upper = value => String(value || '').toUpperCase();
const typeOf = data => data && (['owner', 'employee'].includes(data.role) ? 'shopkeeper' : data.role === 'rider' ? 'rider' : (!data.role || data.role === 'customer') ? 'customer' : null);
const publicRequest = data => data ? Object.fromEntries(['id', 'accountType', 'phoneNumberMasked', 'status', 'requestedAt', 'processedAt', 'blockers', 'retentionNotes', 'authRetained'].filter(k => data[k] !== undefined).map(k => [k, data[k]])) : null;

function validateType(type) {
  if (!TYPES.includes(type)) throw new AppError('Choose a valid account type.', 400);
}
function verifyRecentPhone(claims, now = Date.now()) {
  const age = now / 1000 - Number(claims.auth_time);
  if (!claims.uid || !claims.phone_number || claims.firebase?.sign_in_provider !== 'phone' || !Number.isFinite(age) || age < -60 || age > 300) {
    throw new AppError('Verify your registered phone again. Verification is valid for five minutes.', 401, 'RECENT_PHONE_AUTH_REQUIRED');
  }
}

// Dependencies are injected so destructive tests cannot accidentally use production.
function createAccountDeletionService({ db, auth, bucket, now = () => Date.now() }) {
  const stamp = () => new Date(now()).toISOString();
  const stateRef = uid => db.collection('accountDeletionState').doc(uid);
  const requestRef = (uid, type) => db.collection('accountDeletionRequests').doc(requestKey(uid, type));
  const query = async (collection, field, value) => (await db.collection(collection).where(field, '==', value).get()).docs;
  const union = docs => [...new Map(docs.map(d => [d.ref.path, d])).values()];
  async function limitedMap(items, work) {
    const output = [];
    for (let i=0; i<items.length; i+=12) output.push(...await Promise.all(items.slice(i,i+12).map(work)));
    return output;
  }
  async function profiles(uid) {
    const snaps = await Promise.all(['users', 'merchants', 'riders'].map(c => db.collection(c).doc(uid).get()));
    return snaps.filter(d => d.exists).map(d => ({ snap: d, type: d.ref.parent.id === 'users' ? typeOf(d.data()) : d.ref.parent.id === 'merchants' ? 'shopkeeper' : 'rider' }));
  }
  async function limit(uid) {
    const ref = db.collection('accountDeletionRateLimits').doc(hash(uid));
    await db.runTransaction(async tx => {
      const snap = await tx.get(ref), data = snap.data() || {};
      const fresh = Number(data.resetAt || 0) <= now();
      if (!fresh && data.count >= 20) throw new AppError('Too many requests. Please try again in an hour.', 429);
      tx.set(ref, { count: fresh ? 1 : data.count + 1, resetAt: fresh ? now() + 3600000 : data.resetAt });
    });
  }
  async function inspect(uid, type) {
    validateType(type);
    const roles = await profiles(uid);
    const ownProfiles = roles.filter(p => p.type === type);
    const shops = union((await Promise.all([
      query('shops', 'ownerId', uid),
      ...roles.filter(p => p.type === 'shopkeeper' && p.snap.data().shopId).map(async p => {
        const d = await db.collection('shops').doc(p.snap.data().shopId).get(); return d.exists ? [d] : [];
      })
    ])).flat());
    // Inspect all roles before the brief identity-wide cleanup lock; an active
    // delivery in another app must not lose access while a customer is removed.
    const orders = union((await Promise.all([
      ...['userId', 'customerId', 'riderId', 'currentRiderId', 'rider.uid'].map(f => query('orders', f, uid)),
      ...shops.map(s => query('orders', 'shopId', s.id))
    ])).flat());
    const batches = union((await Promise.all([query('batches', 'riderId', uid), ...shops.map(s => query('batches', 'shopId', s.id))])).flat());
    const financialQueries = ['payments', 'refunds', 'payouts', 'disputes', 'complaints'].flatMap(c =>
      ['uid', 'userId', 'customerId', 'riderId', 'merchantId', 'shopkeeperId'].map(f => [c, f, uid])
        .concat(shops.map(s => [c, 'shopId', s.id]))
        .concat(orders.map(o => [c, 'orderId', o.id])));
    const financial = union((await limitedMap(financialQueries, ([c,f,value]) => query(c,f,value))).flat());
    const blockers = [];
    if (orders.some(o => !TERMINAL.has(upper(o.data().status)))) blockers.push('ACTIVE_ORDER_OR_DELIVERY');
    if (batches.some(b => !['COMPLETED', 'REJECTED', 'CANCELLED', 'EXPIRED'].includes(upper(b.data().status)))) blockers.push('ACTIVE_DELIVERY_BATCH');
    if (financial.some(d => ['payouts', 'refunds', 'disputes', 'complaints'].includes(d.ref.parent.id) && !CLOSED.has(upper(d.data().status)))) blockers.push('UNRESOLVED_PAYOUT_REFUND_OR_DISPUTE');
    if (financial.some(d => d.ref.parent.id === 'payments' && (Number(d.data().pendingRefundAmount || 0) > 0 || !PAYMENT_CLOSED.has(upper(d.data().status))))) blockers.push('PAYMENT_RECONCILIATION_PENDING');
    if (roles.some(p => ['walletBalance', 'pendingPayout', 'unsettledEarnings', 'cashToDeposit'].some(k => Number(p.snap.data()[k] || 0) !== 0))) blockers.push('UNSETTLED_BALANCE');
    if (type === 'shopkeeper' && shops.some(s => s.data().ownerId === uid && (s.data().isOpen === true || upper(s.data().status) === 'OPEN'))) blockers.push('CLOSE_SHOP_FIRST');
    const activeDispatch = await query('dispatchRequests', 'riderId', uid);
    if (activeDispatch.some(d => upper(d.data().status) === 'PENDING' && new Date(d.data().expiresAt || 0).getTime() > now())) blockers.push('ACTIVE_DISPATCH_OFFER');
    // Every financial/history change invalidates a prior human clearance.
    const fingerprint = hash(JSON.stringify(union([...orders, ...batches, ...financial, ...shops]).sort((a,b) => a.ref.path.localeCompare(b.ref.path)).map(d => [d.ref.path, d.updateTime?.toMillis?.() || d.data()])));
    return { roles, ownProfiles, shops, orders, batches, financial, blockers: [...new Set(blockers)], fingerprint };
  }
  async function status(claims, type) {
    validateType(type); verifyRecentPhone(claims, now()); await limit(claims.uid);
    const existing = await requestRef(claims.uid, type).get();
    if (existing.exists) return { request: publicRequest(existing.data()), exists: true };
    const plan = await inspect(claims.uid, type);
    return { request: null, exists: plan.ownProfiles.length > 0, blockers: plan.blockers };
  }
  async function request(claims, type, body) {
    validateType(type); verifyRecentPhone(claims, now()); await limit(claims.uid);
    if (!body || body.confirm !== 'DELETE' || Object.keys(body).some(k => k !== 'confirm')) throw new AppError('Confirm account deletion. No account identifiers are accepted.', 400);
    const ref = requestRef(claims.uid, type);
    const old = await ref.get();
    if (old.exists) return publicRequest(old.data());
    const user = await auth.getUser(claims.uid);
    if (user.customClaims?.admin || user.customClaims?.adminRole || ['admin', 'super_admin', 'finance'].includes(user.customClaims?.role)) throw new AppError('Administrative accounts require a separate access review. Contact support.', 409);
    const plan = await inspect(claims.uid, type);
    if (!plan.ownProfiles.length) throw new AppError('No account of this type exists for your verified sign-in.', 404, 'ACCOUNT_NOT_FOUND');
    const data = { id: ref.id, uid: claims.uid, accountType: type, phoneNumberMasked: `••••${String(claims.phone_number).slice(-4)}`, verified: true,
      requestedAt: stamp(), status: plan.blockers.length ? 'BLOCKED' : 'PENDING_REVIEW', blockers: plan.blockers, retentionNotes: RETENTION, updatedAt: stamp() };
    return db.runTransaction(async tx => {
      const current = await tx.get(ref);
      if (current.exists) return publicRequest(current.data());
      tx.create(ref, data);
      tx.create(ref.collection('audit').doc(), { event: 'REQUEST_VERIFIED', at: stamp() });
      return publicRequest(data);
    });
  }
  async function review(id, reviewerUid, body) {
    if (!/^[a-f0-9]{64}$/.test(id)) throw new AppError('Invalid request.', 400);
    if (body?.obligationsCleared !== true || body?.retentionReviewed !== true || typeof body?.evidenceReference !== 'string' || !/^[a-zA-Z0-9 _./:#-]{5,160}$/.test(body.evidenceReference)) throw new AppError('Document settlement, dispute and retention review with a non-sensitive evidence reference.', 400);
    const ref = db.collection('accountDeletionRequests').doc(id), snap = await ref.get();
    if (!snap.exists) throw new AppError('Request not found.', 404);
    const data = snap.data();
    if (['PROCESSING', 'COMPLETED'].includes(data.status)) throw new AppError('Request already processing or completed.', 409);
    const plan = await inspect(data.uid, data.accountType);
    if (plan.blockers.length) {
      await ref.update({ status: 'BLOCKED', blockers: plan.blockers, updatedAt: stamp() });
      throw new AppError(`Resolve these obligations first: ${plan.blockers.join(', ')}.`, 409);
    }
    await db.runTransaction(async tx => {
      const current = (await tx.get(ref)).data();
      if (['PROCESSING', 'COMPLETED'].includes(current.status)) throw new AppError('Request already processing.', 409);
      tx.update(ref, { status: 'APPROVED', blockers: [], approvedFingerprint: plan.fingerprint, reviewedBy: reviewerUid, reviewedAt: stamp(), evidenceReference: body.evidenceReference, updatedAt: stamp() });
      tx.create(ref.collection('audit').doc(), { event: 'REVIEW_APPROVED', actor: reviewerUid, at: stamp(), evidenceReference: body.evidenceReference });
    });
    return { success: true };
  }
  async function removeDocs(docs) { for (const d of union(docs)) await db.recursiveDelete(d.ref); }
  async function cleanOrders(plan, uid, type, alias, ref, completed, deadline) {
    for (const d of plan.orders) {
      if (completed.has(d.ref.path)) continue;
      if (now() > deadline) throw Object.assign(new Error('Continue cleanup in next run'), {code:'CLEANUP_TIME_SLICE'});
      const o = d.data();
      const applies = type === 'customer' ? (o.userId === uid || o.customerId === uid) : type === 'rider' ? (o.riderId === uid || o.currentRiderId === uid || o.rider?.uid === uid) : plan.shops.some(s => s.id === o.shopId && s.data().ownerId === uid);
      if (!applies) continue;
      const patch = { accountDeletionRedacted: true };
      // Keep pseudonymous role identifiers for settlement joins and retries.
      // A deleted role cannot read these records through Rules.
      if (type === 'customer') Object.assign(patch, { customerName: 'Deleted customer', customerPhone: '', phoneNumber: '', deliveryAddress: null, address: null, customer: null, orderNotes: '', notes: '', createdBy: alias, updatedBy: 'account_deletion' });
      if (type === 'rider') Object.assign(patch, { currentRiderId: null, rider: null, riderName: 'Deleted rider', riderPhone: '' });
      if (type === 'shopkeeper') Object.assign(patch, { merchantId: alias, shopkeeperId: alias, shopPhone: '', merchantPhone: '' });
      // Free-text timelines/chat/signalling may contain contact details and GPS.
      patch.timeline = (o.timeline || []).map(e => ({ status: e.status || '', timestamp: e.timestamp || '', title: 'Order status updated' }));
      await removeDocs((await d.ref.collection('messages').get()).docs);
      for (const c of ['calls', 'videoCalls']) await db.recursiveDelete(db.collection(c).doc(d.id));
      await d.ref.update(patch);
      await ref.collection('targets').doc(hash(d.ref.path)).set({path:d.ref.path, cleaned:true});
    }
  }
  async function process(id) {
    const ref = db.collection('accountDeletionRequests').doc(id);
    const snapshot = await ref.get(); if (!snapshot.exists) return;
    let data = snapshot.data();
    if (!['APPROVED', 'PROCESSING'].includes(data.status)) return;
    const lease = crypto.randomUUID();
    const claimed = await db.runTransaction(async tx => {
      const r = (await tx.get(ref)).data();
      if (!['APPROVED', 'PROCESSING'].includes(r.status) || Number(r.leaseUntil || 0) > now()) return false;
      tx.update(ref, { lease, leaseUntil: now() + 900000 }); data = r; return true;
    });
    if (!claimed) return;
    const uid = data.uid, type = data.accountType, lock = stateRef(uid);
    const deadline = now() + 420000;
    try {
      let plan = await inspect(uid, type);
      if (!data.cleanupStarted) {
        const authUser = await auth.getUser(uid);
        if (authUser.customClaims?.admin || authUser.customClaims?.adminRole || ['admin', 'super_admin', 'finance'].includes(authUser.customClaims?.role)) {
          await db.runTransaction(async tx => {
            const s = (await tx.get(lock)).data();
            if (s?.requestId === id) tx.set(lock, {processing:false}, {merge:true});
            tx.update(ref, {status:'BLOCKED',blockers:['ADMIN_ACCESS_REVIEW'],leaseUntil:0});
          }); return;
        }
        if (plan.blockers.length || data.approvedFingerprint !== plan.fingerprint) {
          await db.runTransaction(async tx => {
            const s = (await tx.get(lock)).data();
            if (s?.requestId === id) tx.set(lock,{processing:false},{merge:true});
            tx.update(ref,{ status: plan.blockers.length ? 'BLOCKED' : 'PENDING_REVIEW', blockers: plan.blockers, leaseUntil: 0, updatedAt: stamp() });
          }); return;
        }
        // Serialize deletions across roles of the same Firebase identity.
        const locked = await db.runTransaction(async tx => {
          const s = (await tx.get(lock)).data() || {};
          const r = (await tx.get(ref)).data();
          if (r.lease !== lease || (s.processing && s.requestId !== id)) return false;
          tx.set(lock, { ...s, processing: true, requestId: id });
          tx.update(ref, { status: 'PROCESSING', startedAt: stamp() }); return true;
        });
        if (!locked) { await ref.update({ leaseUntil: 0 }); return; }
        // Recheck after the lock. All order creation/dispatch paths read this
        // lock in the SAME transaction as their writes, closing the TOCTOU gap.
        plan = await inspect(uid, type);
        if (plan.blockers.length || data.approvedFingerprint !== plan.fingerprint) {
          const batch = db.batch();
          batch.set(lock,{processing:false},{merge:true});
          batch.update(ref,{ status: plan.blockers.length ? 'BLOCKED' : 'PENDING_REVIEW', blockers: plan.blockers, leaseUntil: 0 });
          await batch.commit(); return;
        }
        // Persist an ID-only manifest before any erasure. Retrying must still
        // find an order/shop after ownership fields have been anonymized.
        const targets = union([...plan.orders, ...plan.shops, ...plan.batches, ...plan.ownProfiles.map(p=>p.snap)]);
        for (let i=0;i<targets.length;i+=400) {
          const batch = db.batch();
          for (const d of targets.slice(i,i+400)) batch.set(ref.collection('targets').doc(hash(d.ref.path)), {path:d.ref.path});
          await batch.commit();
        }
        await ref.update({cleanupStarted:true});
      }
      const targetSnaps = (await ref.collection('targets').get()).docs;
      const completed = new Set(targetSnaps.filter(d=>d.data().cleaned).map(d=>d.data().path));
      const targets = (await limitedMap(targetSnaps,d=>db.doc(d.data().path).get())).filter(d=>d.exists);
      plan.orders = union([...plan.orders,...targets.filter(d=>d.ref.parent.id==='orders')]);
      plan.shops = union([...plan.shops,...targets.filter(d=>d.ref.parent.id==='shops')]);
      plan.batches = union([...plan.batches,...targets.filter(d=>d.ref.parent.id==='batches')]);
      const alias = `deleted_${id.slice(0,24)}`;
      // Storage cleanup precedes profile removal so a storage failure is retryable.
      // Shared users/ files belong to all apps and survive while another role exists.
      const otherRoles = plan.roles.filter(p => p.type !== type);
      const prefixes = type === 'rider' ? [`riders/${uid}/`] : [];
      if (!otherRoles.length) prefixes.push(`users/${uid}/`, `temp/${uid}/`);
      for (const prefix of prefixes) await bucket.deleteFiles({ prefix });
      await cleanOrders(plan, uid, type, alias, ref, completed, deadline);
      for (const d of plan.financial.filter(d => d.ref.parent.id === 'complaints' && d.data().userId === uid)) {
        const complaintRole = ['owner', 'employee'].includes(d.data().userType) ? 'shopkeeper' : d.data().userType || 'customer';
        if (complaintRole === type) await d.ref.update({contactPhone:'', userName:'Deleted account', callbackRequested:false, accountDeletedAt:stamp()});
      }
      if (type === 'customer') {
        await removeDocs(await query('routines', 'userId', uid));
        await removeDocs(await query('routineExecutions', 'userId', uid));
        await removeDocs(await query('sharedCarts', 'creatorUserId', uid));
        await db.collection('planningRateLimits').doc(uid).delete();
        await removeDocs(await query('idempotencyKeys', 'userId', uid));
        await removeDocs((await Promise.all(['reviews', 'offerTargets'].map(c => query(c, 'userId', uid)))).flat());
        for (const d of await query('shopSubscriptions', 'userId', uid)) await d.ref.update({ userId: alias, status: 'cancelled', accountDeletedAt: stamp() });
      }
      if (type === 'rider') {
        for (const d of plan.batches.filter(d => d.data().riderId === uid)) await d.ref.update({ rider: null, stops: [], accountDeletedAt: stamp() });
        await removeDocs(await query('dispatchRequests', 'riderId', uid));
      }
      if (type === 'shopkeeper') {
        for (const shop of plan.shops.filter(s => s.data().ownerId === uid || s.data().ownerId === alias)) {
          await shop.ref.update({ ownerId: alias, ownerName: '', ownerPhone: '', phone: '', email: '', isOpen: false, status: 'closed', accountDeletedAt: stamp() });
        }
      }
      for (const q of await query('notificationQueue', 'userId', uid)) {
        if (!otherRoles.length || q.data().userType === type || (type === 'shopkeeper' && q.data().userType === 'owner')) await q.ref.delete();
      }
      for (const p of plan.ownProfiles) {
        if (p.snap.ref.parent.id === 'users' && otherRoles.length) {
          // Legacy notifications for every role share users/{uid}/notifications.
          // Preserve the remaining role's inbox, but remove customer-order notices.
          const customerOrderIds = new Set(plan.orders.filter(o => o.data().userId === uid || o.data().customerId === uid).map(o=>o.id));
          const inbox = await p.snap.ref.collection('notifications').get();
          await removeDocs(inbox.docs.filter(d => customerOrderIds.has(d.data().orderId || d.data().referenceId)));
          await p.snap.ref.delete();
        } else await db.recursiveDelete(p.snap.ref);
      }
      const remaining = await profiles(uid);
      let authRetained = remaining.length > 0;
      if (!authRetained) {
        // Idempotent after a crash between Auth deletion and completion write.
        try { await auth.deleteUser(uid); } catch (e) { if (e.code !== 'auth/user-not-found') throw e; }
        await removeDocs(await query('notificationQueue', 'userId', uid));
        await db.recursiveDelete(db.collection('users').doc(uid));
      }
      await db.runTransaction(async tx => {
        const s = (await tx.get(lock)).data() || {};
        tx.set(lock, { ...s, processing: false, [type]: 'COMPLETED', authDeleted: !authRetained });
        tx.update(ref, { status: 'COMPLETED', processedAt: stamp(), updatedAt: stamp(), authRetained, blockers: [], leaseUntil: 0, phoneNumberMasked: null, lastErrorCode: null });
        tx.create(ref.collection('audit').doc(), { event: 'COMPLETED', at: stamp(), authRetained });
      });
    } catch (e) {
      // Never report success or unlock partially deleted data after a failure.
      await ref.update({ leaseUntil: 0, lastErrorCode: 'CLEANUP_RETRY_REQUIRED', updatedAt: stamp() });
      console.error('[ACCOUNT DELETION] Cleanup requires retry', { requestId: id, code: e.code || 'DEPENDENCY_ERROR' });
      throw e;
    }
  }
  async function sweep() {
    const jobs = await db.collection('accountDeletionRequests').where('status', 'in', ['APPROVED', 'PROCESSING']).limit(10).get();
    for (const d of jobs.docs) { try { await process(d.id); } catch { /* next schedule retries durable job */ } }
  }
  return { request, status, inspect, review, process, sweep };
}

module.exports = { createAccountDeletionService, verifyRecentPhone, validateType, requestKey, publicRequest, TERMINAL, RETENTION };
