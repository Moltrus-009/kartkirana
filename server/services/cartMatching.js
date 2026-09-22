const config = require('../config/planning');
const { AppError } = require('../utils/errors');
const norm = v => String(v || '').normalize('NFKC').toLowerCase().replace(/[^\p{L}\p{N}]+/gu, ' ').trim();
const text = (v, max = 160) => typeof v === 'string' ? v.trim().slice(0, max) : '';
const safeImage = v => typeof v === 'string' && /^https:\/\//.test(v) ? v.slice(0, 2048) : '';
function portable(product, id, quantity) {
    const specs = product.specifications || product.specs || {};
    return { productId: id, name: text(product.name), brand: text(product.brand || specs.Brand), variant: text(product.variant || specs.Variant), packSize: text(product.weight || specs.Weight || specs.Volume || specs.Quantity || specs.Count || specs.Size), unit: text(product.unit), category: text(product.category), barcode: text(product.barcode), sku: text(product.sku), quantity, image: safeImage(product.image), sourceShopId: text(product.shopId) };
}
function exact(a, b) {
    if (a.productId && a.sourceShopId && a.productId === b.productId && a.sourceShopId === b.sourceShopId)
        return ['name', 'brand', 'variant', 'packSize', 'unit', 'barcode'].every(k => norm(a[k]) === norm(b[k]));
    if (/medicin|pharmac|drug/i.test(`${a.category} ${b.category}`))
        return Boolean(a.barcode && a.barcode === b.barcode && a.packSize && norm(a.packSize) === norm(b.packSize) && norm(a.name) === norm(b.name) && norm(a.brand) === norm(b.brand));
    if (a.barcode && b.barcode)
        return a.barcode === b.barcode && norm(a.packSize) === norm(b.packSize);
    // Merchant SKUs are not necessarily globally unique. Missing pack metadata
    // is insufficient evidence for an automatic cross-shop substitution.
    return !!a.packSize && !!b.packSize && norm(a.name) === norm(b.name) && norm(a.brand) === norm(b.brand) && norm(a.variant) === norm(b.variant) && norm(a.packSize) === norm(b.packSize) && norm(a.unit) === norm(b.unit);
}
function validateItems(items) {
    if (!Array.isArray(items) || !items.length || items.length > config.maxItems)
        throw new AppError('Choose between 1 and 50 items.', 400);
    const ids = new Set();
    for (const i of items) {
        if (!i || typeof i.productId !== 'string' || !/^[-\w]{1,128}$/.test(i.productId) || ids.has(i.productId) || !Number.isInteger(i.quantity) || i.quantity < 1 || i.quantity > config.maxQuantity)
            throw new AppError('Invalid or duplicate product/quantity.', 400);
        ids.add(i.productId);
    }
    return items.map(i => ({ productId: i.productId, quantity: i.quantity }));
}
function coordinates(address) { const lat = Number(address?.lat ?? address?.coords?.lat), lng = Number(address?.lng ?? address?.coords?.lng); if (!Number.isFinite(lat) || !Number.isFinite(lng) || Math.abs(lat) > 90 || Math.abs(lng) > 180 || (lat === 0 && lng === 0))
    throw new AppError('Select a valid delivery location.', 400); return { lat, lng }; }
function distance(a, b) { const rad = x => x * Math.PI / 180; const dlat = rad(b.lat - a.lat), dlng = rad(b.lng - a.lng); const h = Math.sin(dlat / 2) ** 2 + Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(dlng / 2) ** 2; return 6371 * 2 * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h)); }
function serviceable(shop, address) {
    try {
        const km = distance(coordinates(shop), coordinates(address)) * 1.35;
        return !shop.accountDeletedAt && km <= Math.min(config.maxServiceRadiusKm, Number(shop.deliveryRadius) || config.maxServiceRadiusKm);
    }
    catch {
        return false;
    }
}
const shopOpen = s => !s.accountDeletedAt && (s.status ? String(s.status).toLowerCase() === 'open' : s.isOpen === true);
const stock = p => { const value = Number(p.totalStock ?? p.stock ?? 0) - Number(p.reservedStock || 0); return Number.isFinite(value) ? Math.max(0, value) : 0; };
const available = p => (!p.status || p.status === 'active') && stock(p) > 0;
function matchShop(items, products, shop) {
    const used = new Set();
    const matches = items.map(item => {
        const candidate = products.find(p => !used.has(p.id) && available(p) && stock(p) >= item.quantity && exact(item, portable(p, p.id, item.quantity)));
        if (candidate)
            used.add(candidate.id);
        return { requested: item, product: candidate ? { ...portable(candidate, candidate.id, item.quantity), id: candidate.id, shopId: shop.id, shopName: shop.name, price: Number(candidate.price), stock: stock(candidate), specifications: candidate.specifications || candidate.specs || {} } : null };
    });
    return { shopId: shop.id, shopName: text(shop.name), availableCount: matches.filter(m => m.product).length, matches };
}
async function resolveNearby(db, items, address, preferredShopId) {
    coordinates(address);
    const location = coordinates(address);
    const shops = (await db.collection('shops').get()).docs.map(d => ({ ...d.data(), id: d.id })).filter(s => shopOpen(s) && serviceable(s, address)).sort((a, b) => distance(coordinates(a), location) - distance(coordinates(b), location)).slice(0, 40);
    const results = [];
    for (const shop of shops) {
        const products = (await db.collection('products').where('shopId', '==', shop.id).get()).docs.map(d => ({ id: d.id, ...d.data() }));
        results.push(matchShop(items, products, shop));
    }
    return results.sort((a, b) => b.availableCount - a.availableCount || Number(b.shopId === preferredShopId) - Number(a.shopId === preferredShopId));
}
module.exports = { portable, exact, validateItems, coordinates, serviceable, shopOpen, stock, available, matchShop, resolveNearby };
