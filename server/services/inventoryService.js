const ProductRepository = require('../repositories/ProductRepository');
const ReservationRepository = require('../repositories/ReservationRepository');
const crypto = require('crypto');

class InventoryService {
  /**
   * COD orders are placed immediately, so they do not need a temporary reservation.
   * Read every product before issuing writes to keep the Firestore transaction valid.
   */
  async commitCodInventory(transaction, items, userId = 'system') {
    const quantities = new Map();
    for (const item of items) {
      const productId = item.productId || item.id;
      quantities.set(productId, (quantities.get(productId) || 0) + item.quantity);
    }

    const snapshots = new Map();
    for (const productId of quantities.keys()) {
      const productRef = ProductRepository.collection.doc(productId);
      const productSnap = await transaction.get(productRef);
      if (!productSnap.exists) throw new Error(`Product ID "${productId}" no longer exists.`);
      snapshots.set(productId, { productRef, productSnap });
    }

    for (const [productId, quantity] of quantities) {
      const { productRef, productSnap } = snapshots.get(productId);
      const product = productSnap.data();
      const totalStock = product.totalStock !== undefined ? product.totalStock : (product.stock ?? 0);
      const reservedStock = product.reservedStock ?? 0;
      const availableStock = totalStock - reservedStock;

      if (availableStock < quantity) {
        throw new Error(`Insufficient stock for "${product.name}". Available: ${availableStock}, Requested: ${quantity}`);
      }

      const nextStock = totalStock - quantity;
      transaction.update(productRef, {
        totalStock: nextStock,
        stock: nextStock,
        updatedAt: new Date().toISOString(),
        updatedBy: userId,
      });
    }
  }

  async reserveInventory(transaction, orderId, items, expiresAt, userId = 'system') {
    // Pre-fetch all product snapshots to execute all reads before writes
    const snapsMap = {};
    for (const item of items) {
      const productId = item.productId || item.id;
      if (!snapsMap[productId]) {
        const productRef = ProductRepository.collection.doc(productId);
        snapsMap[productId] = await transaction.get(productRef);
      }
    }

    for (const item of items) {
      const productId = item.productId || item.id;
      const productSnap = snapsMap[productId];
      if (!productSnap.exists) {
        throw new Error(`Product ID "${productId}" no longer exists.`);
      }

      const pData = productSnap.data();
      const totalStock = pData.totalStock !== undefined ? pData.totalStock : (pData.stock ?? 0);
      const reservedStock = pData.reservedStock ?? 0;
      const availableStock = totalStock - reservedStock;

      if (availableStock < item.quantity) {
        throw new Error(`Insufficient stock for "${pData.name}". Available: ${availableStock}, Requested: ${item.quantity}`);
      }

      // Increment reservedStock atomically in transaction
      await ProductRepository.adjustStockInTransaction(transaction, productId, item.quantity, true, productSnap);

      const reservationId = `res_${crypto.randomBytes(8).toString('hex')}`;
      const reservationData = {
        reservationId,
        orderId,
        productId,
        productName: pData.name,
        quantity: item.quantity,
        expiresAt,
        status: 'ACTIVE'
      };

      const resRef = ReservationRepository.collection.doc(reservationId);
      transaction.set(resRef, {
        ...reservationData,
        schemaVersion: 1,
        createdAt: new Date().toISOString(),
        createdBy: userId,
        updatedAt: new Date().toISOString(),
        updatedBy: userId,
        isDeleted: false
      });
    }
  }

  async finalizeReservation(transaction, orderId, userId = 'system') {
    // Note: Since Firestore queries within transactions must happen before any writes, we fetch reservations via Repository first
    const reservations = await ReservationRepository.getActiveReservationsByOrderId(orderId);
    
    // Pre-fetch all product snapshots
    const snapsMap = {};
    for (const res of reservations) {
      if (!snapsMap[res.productId]) {
        const productRef = ProductRepository.collection.doc(res.productId);
        snapsMap[res.productId] = await transaction.get(productRef);
      }
    }

    for (const res of reservations) {
      const productSnap = snapsMap[res.productId];
      // Decrement totalStock and reservedStock on success
      await ProductRepository.adjustStockInTransaction(transaction, res.productId, -res.quantity, false, productSnap);

      const resRef = ReservationRepository.collection.doc(res.reservationId);
      transaction.update(resRef, {
        status: 'FINALIZED',
        updatedAt: new Date().toISOString(),
        updatedBy: userId
      });
    }
  }

  async releaseReservation(transaction, orderId, status = 'RELEASED', userId = 'system') {
    const reservations = await ReservationRepository.getActiveReservationsByOrderId(orderId);
    
    // Pre-fetch all product snapshots
    const snapsMap = {};
    for (const res of reservations) {
      if (!snapsMap[res.productId]) {
        const productRef = ProductRepository.collection.doc(res.productId);
        snapsMap[res.productId] = await transaction.get(productRef);
      }
    }

    for (const res of reservations) {
      const productSnap = snapsMap[res.productId];
      // Release reservedStock
      await ProductRepository.adjustStockInTransaction(transaction, res.productId, -res.quantity, true, productSnap);

      const resRef = ReservationRepository.collection.doc(res.reservationId);
      transaction.update(resRef, {
        status,
        updatedAt: new Date().toISOString(),
        updatedBy: userId
      });
    }
  }

  /**
   * Restore stock that was permanently deducted by commitCodInventory().
   * Used when a COD order is cancelled after placement.
   * Must run inside the caller's Firestore transaction.
   */
  async restoreCommittedStock(transaction, items, userId = 'system') {
    const quantities = new Map();
    for (const item of items) {
      const productId = item.productId || item.id || (item.product && (item.product.id || item.product.productId));
      if (!productId) continue;
      quantities.set(productId, (quantities.get(productId) || 0) + (item.quantity || 0));
    }

    // Phase 1: All reads
    const snapshots = new Map();
    for (const productId of quantities.keys()) {
      const productRef = ProductRepository.collection.doc(productId);
      const productSnap = await transaction.get(productRef);
      if (!productSnap.exists) {
        console.warn(`[restoreCommittedStock] Product ${productId} no longer exists, skipping.`);
        continue;
      }
      snapshots.set(productId, { productRef, productSnap });
    }

    // Phase 2: All writes
    for (const [productId, quantity] of quantities) {
      if (!snapshots.has(productId)) continue;
      const { productRef, productSnap } = snapshots.get(productId);
      const product = productSnap.data();
      const currentTotal = product.totalStock !== undefined ? product.totalStock : (product.stock ?? 0);
      const restoredTotal = currentTotal + quantity;

      transaction.update(productRef, {
        totalStock: restoredTotal,
        stock: restoredTotal,
        updatedAt: new Date().toISOString(),
        updatedBy: userId,
      });
    }
  }

  /**
   * Check whether an order has any ACTIVE inventory reservations.
   * Used by the cancel service to decide between releaseReservation vs restoreCommittedStock.
   */
  async hasActiveReservations(orderId) {
    const reservations = await ReservationRepository.getActiveReservationsByOrderId(orderId);
    return reservations.length > 0;
  }
}

module.exports = new InventoryService();
