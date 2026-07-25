const { db } = require('../config/firebase');

// Role hierarchy / permissions mappings
const ROLE_PERMISSIONS = {
  super_admin: ['all'],
  admin: [
    'refund_payment', 'approve_shop', 'change_settings', 'view_financials', 
    'broadcast_notifications', 'manage_banners', 'edit_users', 'edit_riders',
    'view_users', 'view_shops', 'view_products'
  ],
  operations: [
    'approve_shop', 'broadcast_notifications', 'manage_banners', 'edit_users', 'edit_riders',
    'view_users', 'view_shops', 'view_products'
  ],
  logistics: [
    'edit_riders', 'assign_riders', 'view_riders', 'view_shops'
  ],
  merchant_success: [
    'approve_shop', 'edit_products', 'view_shops', 'view_products'
  ],
  support: [
    'view_users', 'view_riders', 'resolve_complaints', 'view_shops', 'view_products'
  ],
  finance: [
    'refund_payment', 'view_financials', 'view_shops', 'view_products'
  ],
  marketing: [
    'manage_banners', 'manage_coupons', 'view_products'
  ],
  analyst: [
    'view_dashboard', 'view_users', 'view_shops', 'view_products'
  ]
};

const checkPermission = (requiredPermission) => {
  return async (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Unauthorized', message: 'User context not found.' });
    }

    const role = req.user.role;

    if (!role) {
      return res.status(403).json({ error: 'Forbidden', message: 'No administrative role assigned.' });
    }

    // Super Admin has absolute permissions
    if (role === 'super_admin' || role === 'admin_super') {
      return next();
    }

    const permissions = ROLE_PERMISSIONS[role] || [];
    if (permissions.includes('all') || permissions.includes(requiredPermission)) {
      return next();
    }

    return res.status(403).json({
      error: 'Forbidden',
      message: `Role '${role}' does not have the required permission: '${requiredPermission}'`
    });
  };
};

module.exports = {
  checkPermission,
  ROLE_PERMISSIONS
};
