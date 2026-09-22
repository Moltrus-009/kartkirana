const { db } = require('../config/firebase');
const { createRoutineService } = require('./routineService');
module.exports = createRoutineService({ db,
    price: (items, shopId, uid) => require('./orderService').calculatePriceBreakdown(items, shopId, null, 0, '', uid),
    checkout: (...args) => require('./paymentService').initPayment(...args)
});
