const { AppError } = require('../utils/errors');
const { isAllowedAdminPhone } = require('../config/adminAccess');

module.exports = async (req, res, next) => {
  if (!req.user) {
    return next(new AppError('Please sign in to continue.', 401, 'AUTH_REQUIRED'));
  }

  const role = req.user.adminRole || req.user.role;
  const isAdmin = req.user.admin === true || role === 'admin' || role === 'super_admin' || role === 'finance';

  if (isAdmin && isAllowedAdminPhone(req.user.phone_number)) {
    return next();
  }

  return next(new AppError('Administrative privileges required.', 403, 'ADMIN_REQUIRED'));
};
