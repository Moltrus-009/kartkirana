const { AppError } = require('../utils/errors');

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
      return next(new AppError('Please sign in to continue.', 401, 'AUTH_REQUIRED'));
    }

    const role = req.user.role;

    if (!role) {
      return next(new AppError('Administrative privileges required.', 403, 'ADMIN_REQUIRED'));
    }

    // Super Admin has absolute permissions
    if (role === 'super_admin' || role === 'admin_super') {
      return next();
    }

    const permissions = ROLE_PERMISSIONS[role] || [];
    if (permissions.includes('all') || permissions.includes(requiredPermission)) {
      return next();
    }

    return next(new AppError('You do not have permission to perform this action.', 403, 'PERMISSION_DENIED'));
  };
};

module.exports = {
  checkPermission,
  ROLE_PERMISSIONS
};
