module.exports = async (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({ error: 'Unauthorized', message: 'User context not found.' });
  }

  const role = req.user.role;
  const isAdmin = req.user.admin === true || role === 'admin' || role === 'super_admin' || role === 'finance';

  if (isAdmin) {
    return next();
  }

  res.status(403).json({ error: 'Forbidden', message: 'Administrative privileges required.' });
};

