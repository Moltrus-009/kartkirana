const BaseRepository = require('./BaseRepository');

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
      const newReserved = Math.max(0, currentReserved + quantityChange);
      updates.reservedStock = newReserved;
    } else {
      const newTotal = Math.max(0, currentTotal + quantityChange);
      const newReserved = Math.max(0, currentReserved + quantityChange);
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
