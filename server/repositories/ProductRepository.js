const BaseRepository = require('./BaseRepository');
const { AppError } = require('../utils/errors');

class ProductRepository extends BaseRepository {
  constructor() {
    super('products');
  }

  async adjustStockInTransaction(transaction, productId, quantityChange, isReservedOnly = false, preFetchedSnap = null) {
    const docRef = this.collection.doc(productId);
    const docSnap = preFetchedSnap || await transaction.get(docRef);
    if (!docSnap.exists) throw new Error(`Product ${productId} not found.`);

    const currentData = docSnap.data();
    const currentTotal = currentData.totalStock !== undefined ? currentData.totalStock : (currentData.stock ?? 0);
    const currentReserved = currentData.reservedStock ?? 0;

    const updates = {};
    if (isReservedOnly) {
      const newReserved = currentReserved + quantityChange;
      if (newReserved < 0 || newReserved > currentTotal) {
        throw new AppError(`Invalid reserved stock transition for product ${productId}.`, 409);
      }
      updates.reservedStock = newReserved;
    } else {
      const newTotal = currentTotal + quantityChange;
      const newReserved = currentReserved + quantityChange;
      if (newTotal < 0 || newReserved < 0 || newReserved > newTotal) {
        throw new AppError(`Invalid committed stock transition for product ${productId}.`, 409);
      }
      updates.totalStock = newTotal;
      updates.stock = newTotal;
      updates.reservedStock = newReserved;
    }

    transaction.update(docRef, {
      ...updates,
      updatedAt: new Date().toISOString(),
      updatedBy: 'system'
    });
  }
}

module.exports = new ProductRepository();
