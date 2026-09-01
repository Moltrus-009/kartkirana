const { db: firestoreDb, auth: firebaseAuth } = require('../config/firebase');
const { dbRun, dbGet, dbAll } = require('../config/db');
const financialService = require('../services/financialService');
const crypto = require('crypto');
const os = require('os');
const { FieldValue } = require('firebase-admin/firestore');

// Helper to write audit log to SQLite
async function writeAuditLog(operatorId, operatorPhone, action, entityType, entityId, oldValue, newValue, reason, ip, device, browser) {
  try {
    const sql = `
      INSERT INTO audit_logs (operator_id, operator_phone, action, entity_type, entity_id, old_value, new_value, reason, ip_address, device, browser)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;
    await dbRun(sql, [
      operatorId,
      operatorPhone || '',
      action,
      entityType,
      entityId || '',
      oldValue ? JSON.stringify(oldValue) : '',
      newValue ? JSON.stringify(newValue) : '',
      reason || '',
      ip || '',
      device || '',
      browser || ''
    ]);
  } catch (err) {
    console.error('[AUDIT LOG ERROR] Failed to write audit log:', err.message);
  }
}

class AdminController {

  // --- USER MANAGEMENT ---

  async updateUserStatus(req, res, next) {
    const { uid } = req.params;
    const { disabled, ban, reason } = req.body;
    const operator = req.user;

    try {
      let oldValue = null;
      if (firestoreDb) {
        const userSnap = await firestoreDb.collection('users').doc(uid).get();
        if (userSnap.exists) {
          oldValue = userSnap.data();
        }
      }

      // Update in Firebase Authentication
      if (firebaseAuth) {
        await firebaseAuth.updateUser(uid, { disabled: !!disabled });
        if (disabled || ban) {
          await firebaseAuth.revokeRefreshTokens(uid);
          console.log(`[REVOCATION] Revoked active sessions for user: ${uid}`);
        }
      }

      // Update in Firestore
      const status = ban ? 'banned' : (disabled ? 'disabled' : 'active');
      if (firestoreDb) {
        await firestoreDb.collection('users').doc(uid).update({
          status,
          updatedAt: new Date().toISOString(),
          updatedBy: operator.uid
        });
      }

      const newValue = { ...oldValue, status, disabled };
      await writeAuditLog(
        operator.uid,
        operator.phone || operator.email,
        'UPDATE_USER_STATUS',
        'users',
        uid,
        oldValue,
        newValue,
        reason,
        req.ip || req.clientIp,
        req.headers['user-agent'],
        'Express Controller'
      );

      res.status(200).json({ status: 'success', message: 'User status updated successfully.' });
    } catch (err) {
      console.error('[ADMIN CONTROLLER ERROR] updateUserStatus:', err.message);
      res.status(500).json({ error: 'Internal Server Error', message: err.message });
    }
  }

  async resetUserPassword(req, res, next) {
    const { uid } = req.params;
    const { newPassword, reason } = req.body;
    const operator = req.user;

    try {
      if (!newPassword || newPassword.length < 6) {
        return res.status(400).json({ error: 'Validation Error', message: 'Password must be at least 6 characters.' });
      }

      if (firebaseAuth) {
        await firebaseAuth.updateUser(uid, { password: newPassword });
      }

      await writeAuditLog(
        operator.uid,
        operator.phone || operator.email,
        'RESET_USER_PASSWORD',
        'users',
        uid,
        { redact: 'password_reset_triggered' },
        { success: true },
        reason,
        req.ip || req.clientIp,
        req.headers['user-agent'],
        'Express Controller'
      );

      res.status(200).json({ status: 'success', message: 'User password reset successfully.' });
    } catch (err) {
      res.status(500).json({ error: 'Internal Server Error', message: err.message });
    }
  }

  async deleteUserAccount(req, res, next) {
    const { uid } = req.params;
    const { reason } = req.query;
    const operator = req.user;

    try {
      let oldValue = null;
      if (firestoreDb) {
        const docRef = firestoreDb.collection('users').doc(uid);
        const snap = await docRef.get();
        if (snap.exists) {
          oldValue = snap.data();
          // Soft delete in Firestore
          await docRef.update({
            isDeleted: true,
            deletedAt: new Date().toISOString(),
            deletedBy: operator.uid
          });
        }
      }

      // Delete from Firebase Auth
      if (firebaseAuth) {
        await firebaseAuth.deleteUser(uid);
      }

      await writeAuditLog(
        operator.uid,
        operator.phone || operator.email,
        'DELETE_USER_ACCOUNT',
        'users',
        uid,
        oldValue,
        { isDeleted: true },
        reason,
        req.ip || req.clientIp,
        req.headers['user-agent'],
        'Express Controller'
      );

      res.status(200).json({ status: 'success', message: 'User account permanently deleted.' });
    } catch (err) {
      res.status(500).json({ error: 'Internal Server Error', message: err.message });
    }
  }

  // --- NOTIFICATIONS ---

  async sendNotifications(req, res, next) {
    const { target, title, body, areaId } = req.body;
    const operator = req.user;

    try {
      if (!firestoreDb) throw new Error('Firestore not initialized.');

      // Enqueue as a background job in SQLite
      const jobSql = `
        INSERT INTO jobs_queue (job_type, payload, status)
        VALUES (?, ?, 'PENDING')
      `;
      const payloadObj = { target, title, body, areaId, triggeredBy: operator.uid };
      const jobResult = await dbRun(jobSql, ['BROADCAST_NOTIFICATION', JSON.stringify(payloadObj)]);

      // Write notification queue item directly in Firestore to let worker process it if online
      const queueId = `qnotif_${crypto.randomBytes(6).toString('hex')}`;
      await firestoreDb.collection('notificationQueue').doc(queueId).set({
        queueId,
        target,
        title,
        body,
        areaId: areaId || '',
        status: 'PENDING',
        attempts: 0,
        createdAt: new Date().toISOString(),
        createdBy: operator.uid,
        isDeleted: false
      });

      await writeAuditLog(
        operator.uid,
        operator.phone || operator.email,
        'BROADCAST_NOTIFICATION_ENQUEUED',
        'jobs',
        jobResult.id.toString(),
        null,
        payloadObj,
        'Broadcast marketing notification',
        req.ip || req.clientIp,
        req.headers['user-agent'],
        'Express Controller'
      );

      res.status(200).json({ status: 'success', jobId: jobResult.id, message: 'Notification enqueued successfully.' });
    } catch (err) {
      res.status(500).json({ error: 'Internal Server Error', message: err.message });
    }
  }

  // --- COMPLAINTS MANAGEMENT ---

  async getComplaints(req, res, next) {
    try {
      if (!firestoreDb) throw new Error('Firestore not connected.');
      const snap = await firestoreDb.collection('complaints').orderBy('createdAt', 'desc').get();
      const list = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      res.status(200).json(list);
    } catch (err) {
      res.status(500).json({ error: 'Internal Server Error', message: err.message });
    }
  }

  async createComplaint(req, res, next) {
    // Derive identity strictly from token context to prevent mass assignment/faking
    const userId = req.user.uid;
    const userType = req.user.role || 'customer';
    const { userName, orderId, subject, message, category } = req.body;
    try {
      if (!firestoreDb) throw new Error('Firestore not connected.');
      const cleanSubject = String(subject || '').trim().slice(0, 120);
      const cleanMessage = String(message || '').trim().slice(0, 2000);
      const cleanOrderId = String(orderId || '').trim().slice(0, 100);
      const cleanCategory = ['general', 'refund', 'callback'].includes(category) ? category : 'general';
      if (!cleanSubject || !cleanMessage) {
        return res.status(400).json({ error: 'Bad Request', message: 'Subject and message are required.' });
      }

      const complaintId = `comp_${crypto.randomBytes(6).toString('hex')}`;
      const createdAt = new Date().toISOString();
      const acknowledgement = cleanCategory === 'callback'
        ? 'Sorry for the wait. We have received your callback request and will make sure a support team member contacts you within 24 hours.'
        : cleanCategory === 'refund'
          ? 'Your refund review request has been received. Our support team will check the linked order and reply here. Submitting a request does not automatically approve or process a refund.'
          : 'Thank you for contacting Kart Kirana Support. We have received your request and an admin will reply in this chat.';
      const payload = {
        complaintId,
        userId,
        userName: userName || req.user.name || 'Registered User',
        contactPhone: cleanCategory === 'callback' ? (req.user.phone_number || req.user.phoneNumber || '') : '',
        userType,
        orderId: cleanOrderId,
        subject: cleanSubject,
        message: cleanMessage,
        category: cleanCategory,
        status: 'OPEN',
        assignedTo: null,
        reply: '',
        callbackRequested: cleanCategory === 'callback',
        callbackStatus: cleanCategory === 'callback' ? 'REQUESTED' : null,
        callbackDueAt: cleanCategory === 'callback' ? new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString() : null,
        messages: [
          { id: `msg_${crypto.randomBytes(6).toString('hex')}`, senderId: userId, senderRole: 'customer', senderName: userName || req.user.name || 'Customer', text: cleanMessage, createdAt },
          { id: `msg_${crypto.randomBytes(6).toString('hex')}`, senderId: 'system', senderRole: 'system', senderName: 'Kart Kirana Support', text: acknowledgement, createdAt }
        ],
        createdAt,
        updatedAt: createdAt
      };
      await firestoreDb.collection('complaints').doc(complaintId).set(payload);
      res.status(200).json({ status: 'success', id: complaintId, acknowledgement });
    } catch (err) {
      res.status(500).json({ error: 'Internal Server Error', message: err.message });
    }
  }

  async getOwnComplaints(req, res, next) {
    try {
      if (!firestoreDb) throw new Error('Firestore not connected.');
      const snap = await firestoreDb.collection('complaints').where('userId', '==', req.user.uid).get();
      const list = snap.docs
        .map(d => ({ id: d.id, ...d.data() }))
        .sort((a, b) => String(b.updatedAt || b.createdAt).localeCompare(String(a.updatedAt || a.createdAt)));
      res.status(200).json(list);
    } catch (err) {
      res.status(500).json({ error: 'Internal Server Error', message: err.message });
    }
  }

  async addComplaintMessage(req, res, next) {
    const { id } = req.params;
    const cleanMessage = String(req.body?.message || '').trim().slice(0, 2000);
    if (!cleanMessage) return res.status(400).json({ error: 'Bad Request', message: 'Message is required.' });

    try {
      if (!firestoreDb) throw new Error('Firestore not connected.');
      const docRef = firestoreDb.collection('complaints').doc(id);
      await firestoreDb.runTransaction(async transaction => {
        const snap = await transaction.get(docRef);
        if (!snap.exists) throw Object.assign(new Error('Support ticket not found.'), { statusCode: 404 });
        const ticket = snap.data();
        if (ticket.userId !== req.user.uid) throw Object.assign(new Error('You cannot access this support ticket.'), { statusCode: 403 });
        if (ticket.status === 'CLOSED') throw Object.assign(new Error('This support ticket is closed.'), { statusCode: 409 });

        const messages = Array.isArray(ticket.messages) ? ticket.messages.slice(-199) : [];
        messages.push({
          id: `msg_${crypto.randomBytes(6).toString('hex')}`,
          senderId: req.user.uid,
          senderRole: 'customer',
          senderName: ticket.userName || req.user.name || 'Customer',
          text: cleanMessage,
          createdAt: new Date().toISOString()
        });
        transaction.update(docRef, { messages, message: ticket.message || cleanMessage, status: ticket.status === 'RESOLVED' ? 'OPEN' : ticket.status, updatedAt: new Date().toISOString() });
      });
      res.status(200).json({ status: 'success', message: 'Message sent.' });
    } catch (err) {
      res.status(err.statusCode || 500).json({ error: 'Support Error', message: err.message });
    }
  }


  async updateComplaint(req, res, next) {
    const { id } = req.params;
    const { status, reply, assignedTo } = req.body;
    const operator = req.user;

    try {
      if (!firestoreDb) throw new Error('Firestore not connected.');
      const docRef = firestoreDb.collection('complaints').doc(id);
      const snap = await docRef.get();
      if (!snap.exists) {
        return res.status(404).json({ error: 'Not Found', message: 'Complaint not found.' });
      }

      const cleanReply = String(reply || '').trim().slice(0, 2000);
      let adminMessage = null;
      if (cleanReply) {
        adminMessage = {
          id: `msg_${crypto.randomBytes(6).toString('hex')}`,
          senderId: operator.uid,
          senderRole: 'admin',
          senderName: operator.name || 'Kart Kirana Support',
          text: cleanReply,
          createdAt: new Date().toISOString()
        };
      }
      const updates = {
        status: status || snap.data().status,
        reply: cleanReply || snap.data().reply,
        assignedTo: assignedTo || snap.data().assignedTo,
        callbackStatus: snap.data().callbackRequested && (status === 'RESOLVED' || status === 'CLOSED') ? 'COMPLETED' : snap.data().callbackStatus,
        updatedAt: new Date().toISOString()
      };
      if (adminMessage) updates.messages = FieldValue.arrayUnion(adminMessage);

      await docRef.update(updates);

      if (cleanReply && snap.data().userId) {
        const notificationRef = firestoreDb.collection('users').doc(snap.data().userId).collection('notifications').doc();
        await notificationRef.set({
          id: notificationRef.id,
          title: 'Support replied',
          body: cleanReply.slice(0, 180),
          type: 'system',
          read: false,
          link: `/support?ticket=${encodeURIComponent(id)}`,
          createdAt: new Date().toISOString()
        });
      }

      await writeAuditLog(
        operator.uid,
        operator.phone || operator.email,
        'RESOLVE_COMPLAINT',
        'complaints',
        id,
        snap.data(),
        { ...snap.data(), status: updates.status, reply: updates.reply, assignedTo: updates.assignedTo, callbackStatus: updates.callbackStatus, updatedAt: updates.updatedAt },
        'Complaint ticket status update',
        req.ip || req.clientIp,
        req.headers['user-agent'],
        'Express Controller'
      );

      res.status(200).json({ status: 'success', message: 'Complaint ticket updated.' });
    } catch (err) {
      res.status(500).json({ error: 'Internal Server Error', message: err.message });
    }
  }

  // --- ZONE GEOFENCING ---

  async getZones(req, res, next) {
    try {
      if (!firestoreDb) throw new Error('Firestore not connected.');
      const snap = await firestoreDb.collection('zones').get();
      const list = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      res.status(200).json(list);
    } catch (err) {
      res.status(500).json({ error: 'Internal Server Error', message: err.message });
    }
  }

  async saveZone(req, res, next) {
    const { id, name, polygon, pricing, isActive } = req.body;
    const operator = req.user;

    try {
      if (!firestoreDb) throw new Error('Firestore not connected.');
      const zoneId = id || `zone_${crypto.randomBytes(6).toString('hex')}`;
      const docRef = firestoreDb.collection('zones').doc(zoneId);
      
      const payload = {
        id: zoneId,
        name,
        polygon,
        pricing: pricing || { minOrder: 100, deliveryFee: 20 },
        isActive: isActive !== undefined ? isActive : true,
        updatedAt: new Date().toISOString(),
        updatedBy: operator.uid
      };

      await docRef.set(payload);
      res.status(200).json({ status: 'success', zone: payload });
    } catch (err) {
      res.status(500).json({ error: 'Internal Server Error', message: err.message });
    }
  }

  async deleteZone(req, res, next) {
    const { id } = req.params;
    try {
      if (!firestoreDb) throw new Error('Firestore not connected.');
      await firestoreDb.collection('zones').doc(id).delete();
      res.status(200).json({ status: 'success', message: 'Zone deleted successfully.' });
    } catch (err) {
      res.status(500).json({ error: 'Internal Server Error', message: err.message });
    }
  }

  // --- SETTINGS & CONFIGS ---

  async getSettings(req, res, next) {
    try {
      if (!firestoreDb) throw new Error('Firestore not connected.');
      const docSnap = await firestoreDb.collection('settings').doc('globalSettings').get();
      if (docSnap.exists) {
        res.status(200).json(docSnap.data());
      } else {
        const defaults = {
          featureFlags: {
            cod: true,
            upi: true,
            wallet: true,
            delivery: true,
            maintenance: false,
            registration: true
          },
          versionControl: {
            androidMinVersion: '1.0.0',
            androidLatestVersion: '1.0.0',
            iosMinVersion: '1.0.0',
            iosLatestVersion: '1.0.0',
            maintenanceMessage: 'System is currently undergoing minor upgrades.'
          }
        };
        await firestoreDb.collection('settings').doc('globalSettings').set(defaults);
        res.status(200).json(defaults);
      }
    } catch (err) {
      res.status(500).json({ error: 'Internal Server Error', message: err.message });
    }
  }

  async saveSettings(req, res, next) {
    const { featureFlags, versionControl } = req.body;
    const operator = req.user;

    try {
      if (!firestoreDb) throw new Error('Firestore not connected.');
      const docRef = firestoreDb.collection('settings').doc('globalSettings');
      const snap = await docRef.get();
      const current = snap.exists ? snap.data() : {};

      const updates = {
        featureFlags: featureFlags || current.featureFlags || {},
        versionControl: versionControl || current.versionControl || {},
        updatedAt: new Date().toISOString(),
        updatedBy: operator.uid
      };

      await docRef.set(updates);

      await writeAuditLog(
        operator.uid,
        operator.phone || operator.email,
        'UPDATE_PLATFORM_SETTINGS',
        'settings',
        'globalSettings',
        current,
        updates,
        'Configured feature flags/version targets',
        req.ip || req.clientIp,
        req.headers['user-agent'],
        'Express Controller'
      );

      res.status(200).json({ status: 'success', data: updates });
    } catch (err) {
      res.status(500).json({ error: 'Internal Server Error', message: err.message });
    }
  }

  // --- SQLITE AUDIT LOGS ---

  async getAuditLogs(req, res, next) {
    try {
      const logs = await dbAll('SELECT * FROM audit_logs ORDER BY timestamp DESC LIMIT 500');
      res.status(200).json(logs);
    } catch (err) {
      res.status(500).json({ error: 'Internal Server Error', message: err.message });
    }
  }

  // --- SQLITE SYSTEM HEALTH ---

  async getSystemHealth(req, res, next) {
    try {
      const metrics = await dbAll('SELECT * FROM system_health ORDER BY timestamp DESC LIMIT 50');
      
      const freemem = os.freemem();
      const totalmem = os.totalmem();
      const memoryUsagePct = ((totalmem - freemem) / totalmem) * 100;
      
      const healthData = {
        api_uptime: Math.round(process.uptime()),
        cpu_model: os.cpus()[0]?.model || 'Generic Core',
        memory: {
          free: freemem,
          total: totalmem,
          usagePercentage: memoryUsagePct
        },
        sqlite_logs_count: (await dbGet('SELECT count(*) as count FROM audit_logs')).count,
        background_jobs_queue: (await dbAll('SELECT status, count(*) as count FROM jobs_queue GROUP BY status')),
        historical_metrics: metrics
      };
      
      res.status(200).json(healthData);
    } catch (err) {
      res.status(500).json({ error: 'Internal Server Error', message: err.message });
    }
  }

  // --- FRAUD DETECTION REGISTRY ---

  async getFraudEvents(req, res, next) {
    try {
      const list = await dbAll('SELECT * FROM fraud_events ORDER BY timestamp DESC');
      res.status(200).json(list);
    } catch (err) {
      res.status(500).json({ error: 'Internal Server Error', message: err.message });
    }
  }

  async recordFraudEvent(req, res, next) {
    const { userId, riderId, shopId, orderId, eventType, details, severity } = req.body;
    try {
      const sql = `
        INSERT INTO fraud_events (user_id, rider_id, shop_id, order_id, event_type, details, severity)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `;
      await dbRun(sql, [
        userId || '',
        riderId || '',
        shopId || '',
        orderId || '',
        eventType,
        details || '',
        severity || 'MEDIUM'
      ]);
      res.status(200).json({ status: 'success' });
    } catch (err) {
      res.status(500).json({ error: 'Internal Server Error', message: err.message });
    }
  }

  // --- FINANCIAL LEDGERS ---

  async getFinancialSummary(req, res, next) {
    try {
      if (!firestoreDb) throw new Error('Firestore not initialized.');
      const paymentsSnap = await firestoreDb.collection('payments').get();
      const paidPayments = paymentsSnap.docs
        .map(doc => ({ id: doc.id, ...doc.data() }))
        .filter(payment => !payment.isDeleted && ['CAPTURED', 'CAPTURED_REVIEW', 'COD_COLLECTED', 'PARTIALLY_REFUNDED', 'REFUNDED'].includes(payment.status));
      const orderSnaps = await Promise.all(paidPayments.map(payment => firestoreDb.collection('orders').doc(payment.orderId).get()));
      
      let platformEarnings = 0;
      let taxCollection = 0;
      let deliveryEarnings = 0;
      let totalCaptured = 0;
      let totalRefunded = 0;
      let unmatchedCount = 0;
      
      const details = [];

      paidPayments.forEach((payment, index) => {
        const orderSnap = orderSnaps[index];
        const order = orderSnap.exists ? orderSnap.data() : null;
        const paymentAmount = Number(payment.amount || 0);
        const expectedAmount = Number(order?.total || 0);
        const amountMatches = order && Math.round(paymentAmount * 100) === Math.round(expectedAmount * 100);
        const orderPaid = order && ['completed', 'partially_refunded', 'refunded'].includes(order.paymentStatus);
        const reconciliationStatus = !order ? 'ORDER_MISSING' : !amountMatches ? 'AMOUNT_MISMATCH' : !orderPaid ? 'ORDER_NOT_PAID' : 'MATCHED';
        if (reconciliationStatus !== 'MATCHED') unmatchedCount += 1;

        const refundedAmount = Number(payment.refundedAmount || 0);
        totalCaptured += paymentAmount;
        totalRefunded += refundedAmount;
        if (order && reconciliationStatus === 'MATCHED') {
          platformEarnings += Number(order.platformFee || 0);
          taxCollection += Number(order.tax || 0);
          deliveryEarnings += Number(order.deliveryFee || 0);
        }
        details.push({
          paymentId: payment.id,
          transactionId: payment.gatewayPaymentId || (payment.gateway === 'cod' ? `cod_${payment.orderId}` : null),
          orderId: payment.orderId,
          paymentMethod: payment.paymentMethod || payment.gateway,
          paymentRecordStatus: payment.status,
          reconciliationStatus,
          amount: paymentAmount,
          refundedAmount,
          netAmount: paymentAmount - refundedAmount,
          subtotal: Number(order?.subtotal || 0),
          platformFee: Number(order?.platformFee || 0),
          tax: Number(order?.tax || 0),
          deliveryFee: Number(order?.deliveryFee || 0),
          createdAt: payment.capturedAt || payment.collectedAt || payment.createdAt
        });
      });

      res.status(200).json({
        reconciliation: {
          platformEarnings,
          taxCollection,
          deliveryEarnings,
          totalRevenue: platformEarnings + taxCollection + deliveryEarnings,
          totalCaptured,
          totalRefunded,
          netCollected: totalCaptured - totalRefunded,
          unmatchedCount
        },
        orders: details
      });
    } catch (err) {
      res.status(500).json({ error: 'Internal Server Error', message: err.message });
    }
  }

  // --- INTERNAL COMMUNICATION ---

  async getInternalChats(req, res, next) {
    const { userId } = req.query;
    try {
      const sql = `
        SELECT * FROM internal_chats 
        WHERE sender_id = ? OR receiver_id = ? 
        ORDER BY timestamp ASC
      `;
      const messages = await dbAll(sql, [userId, userId]);
      res.status(200).json(messages);
    } catch (err) {
      res.status(500).json({ error: 'Internal Server Error', message: err.message });
    }
  }

  async sendChatMessage(req, res, next) {
    const { senderId, senderRole, receiverId, receiverRole, message } = req.body;
    try {
      const sql = `
        INSERT INTO internal_chats (sender_id, sender_role, receiver_id, receiver_role, message)
        VALUES (?, ?, ?, ?, ?)
      `;
      await dbRun(sql, [senderId, senderRole, receiverId, receiverRole, message]);
      res.status(200).json({ status: 'success' });
    } catch (err) {
      res.status(500).json({ error: 'Internal Server Error', message: err.message });
    }
  }

  // --- DISASTER RECOVERY ---

  async backupData(req, res, next) {
    try {
      if (!firestoreDb) throw new Error('Firestore not initialized.');
      // Simple configuration state backup export
      const docSnap = await firestoreDb.collection('settings').doc('globalSettings').get();
      const settings = docSnap.exists ? docSnap.data() : {};
      
      const backupPayload = {
        backupId: `bkp_${Date.now()}`,
        settings,
        timestamp: new Date().toISOString()
      };
      
      res.status(200).json({ status: 'success', backupPayload });
    } catch (err) {
      res.status(500).json({ error: 'Internal Server Error', message: err.message });
    }
  }

  async restoreData(req, res, next) {
    const { settings } = req.body;
    try {
      if (!firestoreDb) throw new Error('Firestore not initialized.');
      if (!settings) return res.status(400).json({ error: 'Bad Request', message: 'Settings missing from restore payload.' });
      
      await firestoreDb.collection('settings').doc('globalSettings').set(settings);
      res.status(200).json({ status: 'success', message: 'Configurations successfully restored.' });
    } catch (err) {
      res.status(500).json({ error: 'Internal Server Error', message: err.message });
    }
  }

  async getUsers(req, res, next) {
    try {
      if (!firestoreDb) throw new Error('Firestore not initialized.');
      const snap = await firestoreDb.collection('users').get();
      const list = snap.docs.map(doc => ({ uid: doc.id, ...doc.data() }));
      res.status(200).json(list);
    } catch (err) {
      res.status(500).json({ error: 'Internal Server Error', message: err.message });
    }
  }

  async getShops(req, res, next) {
    try {
      if (!firestoreDb) throw new Error('Firestore not initialized.');
      const snap = await firestoreDb.collection('shops').get();
      const list = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      res.status(200).json(list);
    } catch (err) {
      res.status(500).json({ error: 'Internal Server Error', message: err.message });
    }
  }

  async getProducts(req, res, next) {
    try {
      if (!firestoreDb) throw new Error('Firestore not initialized.');
      const snap = await firestoreDb.collection('products').get();
      const list = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      res.status(200).json(list);
    } catch (err) {
      res.status(500).json({ error: 'Internal Server Error', message: err.message });
    }
  }

  async getAdministrators(req, res, next) {
    try {
      if (!firebaseAuth) throw new Error('Auth not initialized.');
      
      const admins = [];
      let nextPageToken;
      do {
        const listUsersResult = await firebaseAuth.listUsers(1000, nextPageToken);
        listUsersResult.users.forEach((userRecord) => {
          const claims = userRecord.customClaims || {};
          if (claims.admin || claims.role) {
            admins.push({
              uid: userRecord.uid,
              phone: userRecord.phoneNumber || '',
              role: claims.role || 'admin',
              claims: claims
            });
          }
        });
        nextPageToken = listUsersResult.pageToken;
      } while (nextPageToken);
      
      res.status(200).json(admins);
    } catch (err) {
      res.status(500).json({ error: 'Internal Server Error', message: err.message });
    }
  }

  async assignAdminRole(req, res, next) {
    const { phone, uid, role } = req.body;
    const actor = req.user;

    try {
      if (!firebaseAuth) throw new Error('Auth not initialized.');
      if (!role) return res.status(400).json({ error: 'Bad Request', message: 'Role parameter is required.' });

      let targetUser;
      if (uid) {
        targetUser = await firebaseAuth.getUser(uid);
      } else if (phone) {
        const cleanPhone = phone.replace(/\s+/g, '');
        targetUser = await firebaseAuth.getUserByPhoneNumber(cleanPhone);
      } else {
        return res.status(400).json({ error: 'Bad Request', message: 'Either phone or uid is required.' });
      }

      const prevClaims = targetUser.customClaims || {};

      // Update claims on Auth
      await firebaseAuth.setCustomUserClaims(targetUser.uid, {
        admin: true,
        role: role
      });

      // SQLite Audit Log
      await writeAuditLog(
        actor.uid,
        actor.phone_number || actor.phoneNumber || '',
        'PROMOTE_ADMIN',
        'admin_user',
        targetUser.uid,
        prevClaims,
        { admin: true, role },
        `Promoted user to ${role}`,
        req.ip,
        req.headers['user-agent']
      );

      res.status(200).json({ status: 'success', message: `Successfully assigned role ${role} to user ${targetUser.uid}.` });
    } catch (err) {
      res.status(500).json({ error: 'Internal Server Error', message: err.message });
    }
  }

  async changeAdminRole(req, res, next) {
    const { uid, role } = req.body;
    const actor = req.user;

    try {
      if (!firebaseAuth) throw new Error('Auth not initialized.');
      if (!uid || !role) return res.status(400).json({ error: 'Bad Request', message: 'UID and Role are required.' });

      const targetUser = await firebaseAuth.getUser(uid);
      const prevClaims = targetUser.customClaims || {};

      // Check if demoting the last Super Admin
      if (prevClaims.role === 'super_admin' && role !== 'super_admin') {
        const allAdmins = [];
        let nextPageToken;
        do {
          const listUsersResult = await firebaseAuth.listUsers(1000, nextPageToken);
          listUsersResult.users.forEach((u) => {
            if (u.customClaims?.role === 'super_admin') {
              allAdmins.push(u.uid);
            }
          });
          nextPageToken = listUsersResult.pageToken;
        } while (nextPageToken);

        if (allAdmins.length <= 1 && allAdmins.includes(uid)) {
          return res.status(403).json({
            error: 'Forbidden',
            message: 'Cannot demote the last remaining Super Admin.'
          });
        }
      }

      // Update Claims
      await firebaseAuth.setCustomUserClaims(uid, {
        admin: true,
        role: role
      });

      // Audit Log
      await writeAuditLog(
        actor.uid,
        actor.phone_number || actor.phoneNumber || '',
        'CHANGE_ROLE',
        'admin_user',
        uid,
        prevClaims,
        { admin: true, role },
        `Changed role from ${prevClaims.role || 'admin'} to ${role}`,
        req.ip,
        req.headers['user-agent']
      );

      res.status(200).json({ status: 'success', message: 'Admin role updated.' });
    } catch (err) {
      res.status(500).json({ error: 'Internal Server Error', message: err.message });
    }
  }

  async removeAdminAccess(req, res, next) {
    const { uid } = req.body;
    const actor = req.user;

    try {
      if (!firebaseAuth) throw new Error('Auth not initialized.');
      if (!uid) return res.status(400).json({ error: 'Bad Request', message: 'UID parameter is required.' });

      const targetUser = await firebaseAuth.getUser(uid);
      const prevClaims = targetUser.customClaims || {};

      // Verify if target is super_admin
      if (prevClaims.role === 'super_admin') {
        const superAdmins = [];
        let nextPageToken;
        do {
          const listUsersResult = await firebaseAuth.listUsers(1000, nextPageToken);
          listUsersResult.users.forEach((u) => {
            if (u.customClaims?.role === 'super_admin') {
              superAdmins.push(u.uid);
            }
          });
          nextPageToken = listUsersResult.pageToken;
        } while (nextPageToken);

        if (superAdmins.length <= 1 && superAdmins.includes(uid)) {
          return res.status(403).json({
            error: 'Forbidden',
            message: 'Cannot revoke administrative permissions from the last remaining Super Admin.'
          });
        }
      }

      // Update Custom Claims to null
      await firebaseAuth.setCustomUserClaims(uid, null);

      // Audit Log
      await writeAuditLog(
        actor.uid,
        actor.phone_number || actor.phoneNumber || '',
        'REMOVE_ADMIN',
        'admin_user',
        uid,
        prevClaims,
        null,
        'Revoked admin permissions and cleared Custom Claims.',
        req.ip,
        req.headers['user-agent']
      );

      res.status(200).json({ status: 'success', message: 'Administrative access revoked successfully.' });
    } catch (err) {
      res.status(500).json({ error: 'Internal Server Error', message: err.message });
    }
  }

  async getShopsFinancials(req, res, next) {
    try {
      const data = await financialService.getShopsMetrics();
      res.status(200).json(data);
    } catch (err) {
      res.status(500).json({ error: 'Internal Server Error', message: err.message });
    }
  }

  async getShopFinancialsById(req, res, next) {
    const { shopId } = req.params;
    try {
      const data = await financialService.getShopMetricsById(shopId);
      res.status(200).json(data);
    } catch (err) {
      res.status(500).json({ error: 'Internal Server Error', message: err.message });
    }
  }

  async getRiderFinancialsById(req, res, next) {
    const { riderId } = req.params;
    try {
      const data = await financialService.getRiderMetricsById(riderId);
      res.status(200).json(data);
    } catch (err) {
      res.status(500).json({ error: 'Internal Server Error', message: err.message });
    }
  }

  async getPlatformFinancials(req, res, next) {
    try {
      const data = await financialService.getPlatformMetrics();
      res.status(200).json(data);
    } catch (err) {
      res.status(500).json({ error: 'Internal Server Error', message: err.message });
    }
  }
}

module.exports = new AdminController();
