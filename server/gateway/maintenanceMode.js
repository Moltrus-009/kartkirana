const env = require('../config/env');

module.exports = (req, res, next) => {
  if (env.MAINTENANCE_MODE) {
    return res.status(503).json({
      error: 'Maintenance Mode Active',
      message: 'Kart Kirana payment services are temporarily down for maintenance. Please check back shortly.',
      timestamp: new Date().toISOString()
    });
  }
  next();
};
