const blockedIps = new Set();

module.exports = (req, res, next) => {
  const clientIp = req.ip || req.connection.remoteAddress;
  if (blockedIps.has(clientIp)) {
    return res.status(403).json({
      error: 'Forbidden',
      message: 'Access denied from this network address.',
      timestamp: new Date().toISOString()
    });
  }
  req.clientIp = clientIp;
  next();
};
