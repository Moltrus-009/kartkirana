// Canonical settings used by APIs/workers and exposed read-only to the customer UI.
module.exports = Object.freeze({
    timezone: 'Asia/Kolkata', shareExpiryDays: 7, maxItems: 50, maxQuantity: 99,
    maxActiveRoutines: 20, maxScheduleDays: 366, prepareLeadMinutes: 45,
    dispatchLeadMinutes: 20, notificationLeadHours: 24, workerMinutes: 5, workerBatchSize: 100,
    priceIncreasePercent: 10, priceIncreaseRupees: 50, maxServiceRadiusKm: 15,
    slots: [
        { id: '09-11', label: '09:00 AM - 11:00 AM', start: '09:00', end: '11:00' },
        { id: '12-02', label: '12:00 PM - 02:00 PM', start: '12:00', end: '14:00' },
        { id: '03-05', label: '03:00 PM - 05:00 PM', start: '15:00', end: '17:00' },
        { id: '06-08', label: '06:00 PM - 08:00 PM', start: '18:00', end: '20:00' }
    ]
});
