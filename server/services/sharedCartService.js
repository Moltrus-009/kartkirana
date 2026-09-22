const crypto = require('node:crypto');
const config = require('../config/planning');
const { AppError } = require('../utils/errors');
const { portable, validateItems, resolveNearby } = require('./cartMatching');
const { assertAccountAvailable } = require('./accountDeletionGuard');
const hash = v => crypto.createHash('sha256').update(v).digest('hex');
function creationKey(value) { if (typeof value !== 'string' || !/^[\w-]{16,128}$/.test(value))
    throw new AppError('A valid Idempotency-Key is required.', 400); return value; }
function createSharedCartService({ db, now = () => Date.now() }) {
    async function create(uid, body, key) {
        creationKey(key);
        const items = validateItems(body?.items);
        const fingerprint = hash(JSON.stringify(items));
        const ref = db.collection('sharedCarts').doc(hash(`${uid}:${key}`));
        const token = crypto.randomBytes(32).toString('hex');
        return db.runTransaction(async (tx) => {
            await assertAccountAvailable(db, tx, uid, 'customer');
            const user = await tx.get(db.doc(`users/${uid}`));
            if (!user.exists)
                throw new AppError('Customer account required.', 403);
            const previous = await tx.get(ref);
            if (previous.exists) {
                if (previous.data().fingerprint !== fingerprint)
                    throw new AppError('This retry key belongs to another cart.', 409);
                return { token: previous.data().token, expiresAt: previous.data().expiresAt };
            }
            const normalized = [];
            for (const item of items) {
                const p = await tx.get(db.doc(`products/${item.productId}`));
                if (!p.exists)
                    throw new AppError('A cart product no longer exists.', 409);
                normalized.push(portable(p.data(), p.id, item.quantity));
            }
            const expiresAt = new Date(now() + config.shareExpiryDays * 86400000).toISOString();
            tx.create(ref, { creatorUserId: uid, token, tokenHash: hash(token), fingerprint, items: normalized, itemCount: items.length, createdAt: new Date(now()).toISOString(), expiresAt, status: 'ACTIVE', version: 1 });
            return { token, expiresAt };
        });
    }
    async function read(token) {
        if (typeof token !== 'string' || !/^[a-f0-9]{64}$/.test(token))
            throw new AppError('This shared cart link is invalid or expired.', 404);
        const snap = await db.collection('sharedCarts').where('tokenHash', '==', hash(token)).limit(1).get();
        const data = snap.docs[0]?.data();
        if (!data || data.status !== 'ACTIVE' || !Number.isFinite(Date.parse(data.expiresAt)) || Date.parse(data.expiresAt) <= now())
            throw new AppError('This shared cart link is invalid or expired.', 404);
        return { items: data.items, itemCount: data.itemCount, expiresAt: data.expiresAt, version: data.version };
    }
    async function match(token, address) { const cart = await read(token); return { cart, shops: await resolveNearby(db, cart.items, address) }; }
    return { create, read, match };
}
module.exports = { createSharedCartService, creationKey };
