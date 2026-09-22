export interface PreorderSlot {
  id: string;
  label: string;
  period: string;
  startHour: number;
  endHour: number;
  subTimes: string[];
}

export interface PreorderSchedule {
  date: string;
  slot: string;
  time?: string;
}

export const PREORDER_SLOTS: PreorderSlot[] = [
  { id: '09-11', label: '09:00 AM - 11:00 AM', period: 'Morning', startHour: 9, endHour: 11, subTimes: ['09:00 AM', '09:30 AM', '10:00 AM', '10:30 AM'] },
  { id: '12-02', label: '12:00 PM - 02:00 PM', period: 'Afternoon', startHour: 12, endHour: 14, subTimes: ['12:00 PM', '12:30 PM', '01:00 PM', '01:30 PM'] },
  { id: '03-05', label: '03:00 PM - 05:00 PM', period: 'Evening', startHour: 15, endHour: 17, subTimes: ['03:00 PM', '03:30 PM', '04:00 PM', '04:30 PM'] },
  { id: '06-08', label: '06:00 PM - 08:00 PM', period: 'Night', startHour: 18, endHour: 20, subTimes: ['06:00 PM', '06:30 PM', '07:00 PM', '07:30 PM'] },
];

export const toLocalDateInput = (date = new Date()): string => {
  return new Date(date.getTime()+19800000).toISOString().slice(0,10);
};

export const addLocalDays = (days: number): string => {
  return toLocalDateInput(new Date(Date.now()+days*86400000));
};

export const getAvailablePreorderSlots = (date: string, now = new Date()): PreorderSlot[] => {
  if(!/^\d{4}-\d{2}-\d{2}$/.test(date)||!Number.isFinite(Date.parse(date))||new Date(date).toISOString().slice(0,10)!==date)return [];
  return PREORDER_SLOTS.filter(slot=>Date.parse(`${date}T${String(slot.startHour).padStart(2,'0')}:00:00+05:30`)>=now.getTime()+45*60000);
};

export const getDefaultPreorderSchedule = (initial?: Partial<PreorderSchedule>): PreorderSchedule => {
  const today = toLocalDateInput();
  const requestedDate = initial?.date && initial.date >= today ? initial.date : today;
  let available = getAvailablePreorderSlots(requestedDate);
  const date = available.length ? requestedDate : addLocalDays(1);
  available = getAvailablePreorderSlots(date);

  const matchingSlot = available.find(slot => slot.label === initial?.slot) || available[0] || PREORDER_SLOTS[0];
  const time = matchingSlot.subTimes.includes(initial?.time || '')
    ? initial?.time
    : matchingSlot.subTimes[0];

  return { date, slot: matchingSlot.label, time };
};

export const isValidPreorderSchedule = (schedule: Partial<PreorderSchedule>): schedule is PreorderSchedule => {
  if (!schedule.date || !schedule.slot || schedule.date < toLocalDateInput()) return false;
  const slot = getAvailablePreorderSlots(schedule.date).find(item => item.label === schedule.slot);
  return Boolean(slot && (!schedule.time || slot.subTimes.includes(schedule.time)));
};
