const { AppError } = require('../utils/errors');
const env = require('../config/env');

module.exports = (err, req, res, next) => {
  err.statusCode = err.statusCode || 500;
  err.status = err.status || 'error';

  const logDetails = {
    timestamp: new Date().toISOString(),
    requestId: req.id || 'N/A',
    traceId: req.header('X-Trace-ID') || 'N/A',
    userId: req.user ? req.user.uid : (req.body ? req.body.userId : 'N/A'),
    orderId: req.body ? req.body.orderId : 'N/A',
    paymentAttemptId: req.body ? req.body.paymentAttemptId : 'N/A',
    environment: env.PAYMENT_ENVIRONMENT,
    statusCode: err.statusCode,
    message: err.message
  };

  console.error(`[ERROR LOG] [${logDetails.timestamp}] RequestID: ${logDetails.requestId} | Status: ${err.statusCode} | Error: ${err.message}`);
  
  if (err.statusCode === 500) {
    console.error(err.stack);
  }

  const isProd = env.NODE_ENV === 'production';
  const displayMessage = (err.statusCode === 500 && isProd)
    ? 'An unexpected system error occurred. Please contact support.'
    : err.message;

  res.status(err.statusCode).json({
    status: err.status,
    error: {
      message: displayMessage,
      statusCode: err.statusCode
    },
    message: displayMessage,
    requestId: req.id,
    stack: env.NODE_ENV === 'development' ? err.stack : undefined
  });
};

