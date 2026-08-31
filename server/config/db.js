const { DatabaseSync } = require('node:sqlite');
const path = require('path');

// Cloud Functions only permits runtime writes under /tmp. The authoritative
// payment and order records remain in Firestore; this SQLite file contains
// disposable operational/audit cache data only.
const isServerless = Boolean(process.env.FUNCTION_TARGET || process.env.K_SERVICE);
const dbPath = isServerless
  ? path.join(require('os').tmpdir(), 'kartkirana_admin_storage.db')
  : path.join(__dirname, '..', 'admin_storage.db');

// Node's built-in SQLite binding works on both local Node and Google Functions
// without shipping a platform-specific native addon.
const database = new DatabaseSync(dbPath);

const normalizeArgs = (params, callback) => {
  if (typeof params === 'function') return { params: [], callback: params };
  return { params: Array.isArray(params) ? params : [], callback };
};

// Small sqlite3-compatible callback facade retained for existing callers.
const db = {
  serialize(callback) {
    callback();
  },
  run(sql, params = [], callback) {
    const args = normalizeArgs(params, callback);
    try {
      const result = database.prepare(sql).run(...args.params);
      args.callback?.call({
        lastID: Number(result.lastInsertRowid || 0),
        changes: Number(result.changes || 0)
      }, null);
    } catch (error) {
      args.callback?.(error);
      if (!args.callback) throw error;
    }
    return this;
  },
  get(sql, params = [], callback) {
    const args = normalizeArgs(params, callback);
    try {
      args.callback?.(null, database.prepare(sql).get(...args.params));
    } catch (error) {
      args.callback?.(error);
      if (!args.callback) throw error;
    }
    return this;
  },
  all(sql, params = [], callback) {
    const args = normalizeArgs(params, callback);
    try {
      args.callback?.(null, database.prepare(sql).all(...args.params));
    } catch (error) {
      args.callback?.(error);
      if (!args.callback) throw error;
    }
    return this;
  },
  close(callback) {
    try {
      database.close();
      callback?.(null);
    } catch (error) {
      callback?.(error);
      if (!callback) throw error;
    }
  }
};

console.log('[SQLITE] Connected to admin_storage.db using Node built-in SQLite.');
initializeTables();

function initializeTables() {
  db.serialize(() => {
    // 1. Audit Logs Table
    db.run(`
      CREATE TABLE IF NOT EXISTS audit_logs (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        operator_id TEXT NOT NULL,
        operator_phone TEXT,
        action TEXT NOT NULL,
        entity_type TEXT NOT NULL,
        entity_id TEXT,
        old_value TEXT,
        new_value TEXT,
        reason TEXT,
        ip_address TEXT,
        device TEXT,
        browser TEXT,
        timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // 2. Background Jobs Queue
    db.run(`
      CREATE TABLE IF NOT EXISTS jobs_queue (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        job_type TEXT NOT NULL,
        payload TEXT,
        status TEXT DEFAULT 'PENDING', -- PENDING, PROCESSING, COMPLETED, FAILED
        attempts INTEGER DEFAULT 0,
        last_error TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // 3. System Metrics Logs
    db.run(`
      CREATE TABLE IF NOT EXISTS system_health (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        api_latency INTEGER, -- ms
        firestore_latency INTEGER, -- ms
        cpu_usage REAL, -- %
        memory_usage REAL, -- %
        uptime INTEGER, -- seconds
        timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // 4. Fraud Events Logs
    db.run(`
      CREATE TABLE IF NOT EXISTS fraud_events (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id TEXT,
        rider_id TEXT,
        shop_id TEXT,
        order_id TEXT,
        event_type TEXT NOT NULL, -- GPS_SPOOF, SPEED_IMPOSSIBLE, DEVICE_CLONE, REFUND_ABUSE, CANCEL_SPAM
        details TEXT,
        severity TEXT DEFAULT 'MEDIUM', -- LOW, MEDIUM, HIGH
        status TEXT DEFAULT 'OPEN', -- OPEN, INVESTIGATING, RESOLVED
        timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // 5. Internal Communications Chat
    db.run(`
      CREATE TABLE IF NOT EXISTS internal_chats (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        sender_id TEXT NOT NULL,
        sender_role TEXT NOT NULL,
        receiver_id TEXT NOT NULL,
        receiver_role TEXT NOT NULL,
        message TEXT NOT NULL,
        timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);
  });
}

const dbRun = (sql, params = []) => {
  return new Promise((resolve, reject) => {
    db.run(sql, params, function (err) {
      if (err) reject(err);
      else resolve({ id: this.lastID, changes: this.changes });
    });
  });
};

const dbGet = (sql, params = []) => {
  return new Promise((resolve, reject) => {
    db.get(sql, params, (err, row) => {
      if (err) reject(err);
      else resolve(row);
    });
  });
};

const dbAll = (sql, params = []) => {
  return new Promise((resolve, reject) => {
    db.all(sql, params, (err, rows) => {
      if (err) reject(err);
      else resolve(rows);
    });
  });
};

module.exports = {
  db,
  dbRun,
  dbGet,
  dbAll
};
