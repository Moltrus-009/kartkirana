const sanitizeString = (str) => {
  if (typeof str !== 'string') return str;
  // Strip HTML / Script tags to prevent XSS / HTML Injection
  return str.replace(/<[^>]*>/g, '').trim();
};

const sanitizeObject = (obj) => {
  if (obj === null || obj === undefined) return obj;
  
  if (Array.isArray(obj)) {
    return obj.map(item => typeof item === 'object' ? sanitizeObject(item) : sanitizeString(item));
  }
  
  if (typeof obj === 'object') {
    const sanitized = {};
    for (const key in obj) {
      if (Object.prototype.hasOwnProperty.call(obj, key)) {
        if (typeof obj[key] === 'object') {
          sanitized[key] = sanitizeObject(obj[key]);
        } else {
          sanitized[key] = sanitizeString(obj[key]);
        }
      }
    }
    return sanitized;
  }
  
  return sanitizeString(obj);
};

module.exports = (req, res, next) => {
  if (req.body) {
    req.body = sanitizeObject(req.body);
  }
  if (req.query) {
    req.query = sanitizeObject(req.query);
  }
  if (req.params) {
    req.params = sanitizeObject(req.params);
  }
  next();
};
