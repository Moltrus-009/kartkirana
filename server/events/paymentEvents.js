const EventEmitter = require('events');
class PaymentEventEmitter extends EventEmitter {}
const paymentEmitter = new PaymentEventEmitter();
module.exports = paymentEmitter;
