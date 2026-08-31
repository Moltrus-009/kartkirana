const crypto = require('crypto');

module.exports = (req, res, next) => {
  const suppliedId = req.header('X-Request-ID');
  const reqId = typeof suppliedId === 'string' && /^[A-Za-z0-9._:-]{1,100}$/.test(suppliedId)
    ? suppliedId
    : crypto.randomUUID();
  req.id = reqId;
  res.setHeader('X-Request-ID', reqId);
  next();
};
