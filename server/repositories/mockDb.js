// In-memory Firestore database representation
const memoryDb = {
  products: {},
  shops: {},
  orders: {},
  payments: {},
  paymentAttempts: {},
  inventoryReservations: {},
  refunds: {},
  auditLogs: {},
  processedWebhookEvents: {},
  idempotencyKeys: {},
  notificationQueue: {},
  locks: {}
};

class MockDocumentReference {
  constructor(collectionName, docId) {
    this.collectionName = collectionName;
    this.id = docId;
  }

  async get() {
    let data = memoryDb[this.collectionName]?.[this.id];
    
    if (!data) {
      if (this.collectionName === 'products') {
        data = {
          id: this.id,
          name: 'Gourmet Organic Item',
          price: 120,
          totalStock: 99,
          reservedStock: 0,
          shopId: 'mock_shop_id',
          isDeleted: false
        };
        if (!memoryDb[this.collectionName]) memoryDb[this.collectionName] = {};
        memoryDb[this.collectionName][this.id] = data;
      } else if (this.collectionName === 'shops') {
        data = {
          id: this.id,
          name: 'Kart Kirana Gourmet Store',
          status: 'open',
          isDeleted: false
        };
        if (!memoryDb[this.collectionName]) memoryDb[this.collectionName] = {};
        memoryDb[this.collectionName][this.id] = data;
      }
    }

    return {
      exists: data !== undefined,
      id: this.id,
      data: () => data
    };
  }

  set(data) {
    if (!memoryDb[this.collectionName]) {
      memoryDb[this.collectionName] = {};
    }
    memoryDb[this.collectionName][this.id] = JSON.parse(JSON.stringify(data));
  }

  update(data) {
    if (!memoryDb[this.collectionName]) {
      memoryDb[this.collectionName] = {};
    }
    const existing = memoryDb[this.collectionName][this.id] || {};
    memoryDb[this.collectionName][this.id] = { 
      ...existing, 
      ...JSON.parse(JSON.stringify(data)) 
    };
  }

  delete() {
    if (memoryDb[this.collectionName]) {
      delete memoryDb[this.collectionName][this.id];
    }
  }
}

class MockCollectionReference {
  constructor(collectionName) {
    this.collectionName = collectionName;
    if (!memoryDb[collectionName]) {
      memoryDb[collectionName] = {};
    }
  }

  doc(id) {
    return new MockDocumentReference(this.collectionName, id);
  }

  async get() {
    const docs = [];
    const col = memoryDb[this.collectionName] || {};
    for (const [id, data] of Object.entries(col)) {
      docs.push({
        id,
        ref: new MockDocumentReference(this.collectionName, id),
        data: () => data
      });
    }
    return {
      empty: docs.length === 0,
      size: docs.length,
      docs
    };
  }

  where(field, op, value, conditions = []) {
    const newConditions = [...conditions, { field, op, value }];
    const self = this;
    const query = {
      where: function(f, o, v) {
        return self.where(f, o, v, newConditions);
      },
      limit: function(n) {
        return query;
      },
      orderBy: function(f, d) {
        return query;
      },
      get: async () => {
        const docs = [];
        const col = memoryDb[this.collectionName] || {};
        for (const [id, data] of Object.entries(col)) {
          if (data) {
            let match = true;
            for (const cond of newConditions) {
              const val = data[cond.field];
              if (cond.op === '==') {
                if (val !== cond.value) { match = false; break; }
              } else if (cond.op === '<') {
                if (!(val < cond.value)) { match = false; break; }
              } else if (cond.op === '>') {
                if (!(val > cond.value)) { match = false; break; }
              }
            }
            if (match) {
              docs.push({
                id,
                ref: new MockDocumentReference(this.collectionName, id),
                data: () => JSON.parse(JSON.stringify(data))
              });
            }
          }
        }
        return {
          empty: docs.length === 0,
          size: docs.length,
          docs
        };
      }
    };
    return query;
  }
}

const mockDb = {
  collection: (name) => new MockCollectionReference(name),
  batch: () => ({
    delete: (ref) => ref.delete(),
    commit: async () => {}
  }),
  runTransaction: async (fn) => {
    const transaction = {
      get: async (ref) => ref.get(),
      set: (ref, data) => ref.set(data),
      update: (ref, data) => ref.update(data),
      delete: (ref) => ref.delete()
    };
    return fn(transaction);
  }
};

module.exports = mockDb;
