const { db } = require('../config/firebase');

class BaseRepository {
  constructor(collectionName) {
    this.collectionName = collectionName;
  }

  get collection() {
    if (!db) throw new Error('Firestore database connection is unavailable.');
    return db.collection(this.collectionName);
  }

  _prepareDoc(data, userId = 'system', isNew = false) {
    const timestamp = new Date().toISOString();
    const doc = {
      ...data,
      schemaVersion: 1,
      updatedAt: timestamp,
      updatedBy: userId
    };
    if (isNew) {
      doc.createdAt = timestamp;
      doc.createdBy = userId;
      doc.isDeleted = false;
    }
    return doc;
  }

  async getById(id) {
    const docSnap = await this.collection.doc(id).get();
    if (!docSnap.exists || docSnap.data().isDeleted) return null;
    return { id: docSnap.id, ...docSnap.data() };
  }

  async create(id, data, userId) {
    const preparedData = this._prepareDoc(data, userId, true);
    await this.collection.doc(id).set(preparedData);
    return { id, ...preparedData };
  }

  async update(id, data, userId) {
    const preparedData = this._prepareDoc(data, userId, false);
    await this.collection.doc(id).update(preparedData);
    return { id, ...preparedData };
  }

  async softDelete(id, userId) {
    return this.update(id, { isDeleted: true, deletedAt: new Date().toISOString(), deletedBy: userId }, userId);
  }
}

module.exports = BaseRepository;
