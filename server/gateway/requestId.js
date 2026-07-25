const crypto = require('crypto');

module.exports = (req, res, next) => {
  const reqId = req.header('X-Request-ID') || crypto.randomUUID();
  req.id = reqId;
  res.setHeader('X-Request-ID', reqId);
  next();
};
