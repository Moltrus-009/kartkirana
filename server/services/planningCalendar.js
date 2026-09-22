const config = require('../config/planning');
const { AppError } = require('../utils/errors');
const DAY = 86400000;
const indiaDate = ms => new Date(ms + 19800000).toISOString().slice(0, 10);
const addDays = (date, n) => new Date(Date.parse(date + 'T00:00:00Z') + n * DAY).toISOString().slice(0, 10);
function dateValid(value) { return typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value) && Number.isFinite(Date.parse(value)) && new Date(value).toISOString().slice(0, 10) === value; }
function windowFor(date, slotId) {
    const slot = config.slots.find(s => s.id === slotId || s.label === slotId);
    if (!dateValid(date) || !slot)
        throw new AppError('Choose a valid date and delivery window.', 400);
    return { date, slotId: slot.id, slot: slot.label, scheduledDeliveryStart: new Date(`${date}T${slot.start}:00+05:30`).toISOString(), scheduledDeliveryEnd: new Date(`${date}T${slot.end}:00+05:30`).toISOString() };
}
function validateSchedule(schedule, now = Date.now()) {
    const window = windowFor(schedule?.date, schedule?.slotId || schedule?.slot);
    const start = Date.parse(window.scheduledDeliveryStart);
    if (start < now + config.prepareLeadMinutes * 60000 || start > now + config.maxScheduleDays * DAY)
        throw new AppError('Choose a future delivery window with enough preparation time.', 400);
    return window;
}
function recurrenceDays(type, days, startDate) {
    if (type === 'DAILY')
        return [0, 1, 2, 3, 4, 5, 6];
    if (type === 'WEEKDAYS')
        return [1, 2, 3, 4, 5];
    if (type === 'WEEKENDS')
        return [0, 6];
    if (type === 'ONCE')
        return [];
    if (type === 'WEEKLY')
        return [new Date(startDate + 'T00:00:00Z').getUTCDay()];
    if (type === 'SELECTED_DAYS' && Array.isArray(days) && days.length && days.length <= 7 && days.every(d => Number.isInteger(d) && d >= 0 && d <= 6))
        return [...new Set(days)];
    throw new AppError('Choose a supported recurrence and weekdays.', 400);
}
function nextOccurrence(routine, after = Date.now()) {
    let date = routine.startDate > indiaDate(after) ? routine.startDate : indiaDate(after);
    const days = recurrenceDays(routine.recurrenceType, routine.selectedDays, routine.startDate);
    for (let i = 0; i <= config.maxScheduleDays; i++, date = addDays(date, 1)) {
        if (routine.endDate && date > routine.endDate)
            return null;
        if (routine.recurrenceType === 'ONCE' && date > routine.startDate)
            return null;
        if (routine.recurrenceType !== 'ONCE' && !days.includes(new Date(date + 'T00:00:00Z').getUTCDay()))
            continue;
        const window = windowFor(date, routine.slotId);
        if (Date.parse(window.scheduledDeliveryStart) > after)
            return window.scheduledDeliveryStart;
    }
    return null;
}
function dispatchDue(order, now = Date.now()) {
    try {
        const scheduled = order.scheduledDeliveryStart || order.preorderDate || order.preorderSlot;
        if (!scheduled)
            return true;
        const start = order.scheduledDeliveryStart || windowFor(order.preorderDate, order.preorderSlot).scheduledDeliveryStart;
        return Number.isFinite(Date.parse(start)) && Date.parse(start) - config.dispatchLeadMinutes * 60000 <= now;
    }
    catch {
        return false;
    }
}
module.exports = { indiaDate, addDays, dateValid, windowFor, validateSchedule, recurrenceDays, nextOccurrence, dispatchDue };
