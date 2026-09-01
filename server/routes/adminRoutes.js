const express = require('express');
const router = express.Router();
const adminController = require('../controllers/adminController');
const authMiddleware = require('../middleware/auth');
const { checkPermission } = require('../middleware/rbac');
const { complaintsLimiter } = require('../gateway/rateLimiter');
const appCheckMiddleware = require('../middleware/appCheck');

// Mount App Check middleware router-wide
router.use(appCheckMiddleware);


// User Management (Protected with claims-based checks)
router.get(
  '/admin/users',
  authMiddleware,
  checkPermission('view_users'),
  adminController.getUsers
);
router.get(
  '/admin/shops',
  authMiddleware,
  checkPermission('view_shops'),
  adminController.getShops
);
router.get(
  '/admin/products',
  authMiddleware,
  checkPermission('view_products'),
  adminController.getProducts
);

router.post(
  '/admin/users/:uid/status',
  authMiddleware,
  checkPermission('edit_users'),
  adminController.updateUserStatus
);
router.post(
  '/admin/users/:uid/reset-password',
  authMiddleware,
  checkPermission('edit_users'),
  adminController.resetUserPassword
);
router.delete(
  '/admin/users/:uid',
  authMiddleware,
  checkPermission('all'),
  adminController.deleteUserAccount
);

// Notifications & Marketing
router.post(
  '/admin/notifications/send',
  authMiddleware,
  checkPermission('broadcast_notifications'),
  adminController.sendNotifications
);

// Complaints Ticketing
router.get(
  '/support/tickets',
  authMiddleware,
  adminController.getOwnComplaints
);
router.post(
  '/support/tickets',
  authMiddleware,
  complaintsLimiter,
  adminController.createComplaint
);
router.post(
  '/support/tickets/:id/messages',
  authMiddleware,
  complaintsLimiter,
  adminController.addComplaintMessage
);
router.get(
  '/admin/complaints',
  authMiddleware,
  checkPermission('resolve_complaints'),
  adminController.getComplaints
);
router.post(
  '/admin/complaints',
  authMiddleware,
  complaintsLimiter, // Enforce rate limit
  adminController.createComplaint
);
router.put(
  '/admin/complaints/:id',
  authMiddleware,
  checkPermission('resolve_complaints'),
  adminController.updateComplaint
);

// Zone Geofencing
router.get(
  '/admin/zones',
  authMiddleware,
  checkPermission('view_shops'), // Restrict zone view
  adminController.getZones
);
router.post(
  '/admin/zones',
  authMiddleware,
  checkPermission('change_settings'),
  adminController.saveZone
);
router.delete(
  '/admin/zones/:id',
  authMiddleware,
  checkPermission('change_settings'),
  adminController.deleteZone
);

// Settings, Feature Flags, and Versions
router.get(
  '/admin/settings',
  authMiddleware,
  checkPermission('change_settings'), // Restrict settings view
  adminController.getSettings
);
router.post(
  '/admin/settings',
  authMiddleware,
  checkPermission('change_settings'),
  adminController.saveSettings
);

// Audit Trail Logs
router.get(
  '/admin/logs',
  authMiddleware,
  checkPermission('all'),
  adminController.getAuditLogs
);

// System Performance Diagnostics
router.get(
  '/admin/health',
  authMiddleware,
  checkPermission('all'), // Restrict system metrics access
  adminController.getSystemHealth
);

// Risk & Fraud Logs
router.get(
  '/admin/fraud',
  authMiddleware,
  checkPermission('all'),
  adminController.getFraudEvents
);
router.post(
  '/admin/fraud',
  authMiddleware,
  checkPermission('all'), // Restrict reporting fraud events to admins
  adminController.recordFraudEvent
);

// Financial Ledger Reconciliations
router.get(
  '/admin/financials',
  authMiddleware,
  checkPermission('view_financials'),
  adminController.getFinancialSummary
);

// Internal Chat
router.get(
  '/admin/chats',
  authMiddleware,
  checkPermission('view_users'), // Restrict chat list
  adminController.getInternalChats
);
router.post(
  '/admin/chats',
  authMiddleware,
  checkPermission('view_users'), // Restrict sending chats
  adminController.sendChatMessage
);

// Disaster Recovery triggers
router.post(
  '/admin/backup',
  authMiddleware,
  checkPermission('all'),
  adminController.backupData
);
router.post(
  '/admin/restore',
  authMiddleware,
  checkPermission('all'),
  adminController.restoreData
);
// Admin Management (Restricted to super_admin)
router.get(
  '/admin/admins',
  authMiddleware,
  checkPermission('all'),
  adminController.getAdministrators
);
router.post(
  '/admin/admins/assign',
  authMiddleware,
  checkPermission('all'),
  adminController.assignAdminRole
);
router.post(
  '/admin/admins/change-role',
  authMiddleware,
  checkPermission('all'),
  adminController.changeAdminRole
);
router.post(
  '/admin/admins/remove',
  authMiddleware,
  checkPermission('all'),
  adminController.removeAdminAccess
);

// Centralized Financial Endpoints
router.get(
  '/admin/financials/shops',
  authMiddleware,
  checkPermission('view_financials'),
  adminController.getShopsFinancials
);
router.get(
  '/admin/financials/shops/:shopId',
  authMiddleware,
  checkPermission('view_financials'),
  adminController.getShopFinancialsById
);
router.get(
  '/admin/financials/riders/:riderId',
  authMiddleware,
  checkPermission('view_financials'),
  adminController.getRiderFinancialsById
);
router.get(
  '/admin/financials/platform',
  authMiddleware,
  checkPermission('view_financials'),
  adminController.getPlatformFinancials
);

module.exports = router;
