import React, { useEffect, useMemo, useState } from 'react';
import { Calendar, Check, Clock, Sparkles } from 'lucide-react';
import { Dialog } from './ui/Dialog';
import { Button } from './ui/Button';
import {
  PREORDER_SLOTS,
  PreorderSchedule,
  addLocalDays,
  getAvailablePreorderSlots,
  getDefaultPreorderSchedule,
  isValidPreorderSchedule,
  toLocalDateInput,
} from '../utils/preorder';

interface PreorderModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (schedule: PreorderSchedule) => void | Promise<void>;
  initialDate?: string;
  initialSlot?: string;
  initialTime?: string;
  maxDaysAhead?: number;
  confirmLabel?: string;
  isSaving?: boolean;
}

export { PREORDER_SLOTS };

export const PreorderModal: React.FC<PreorderModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  initialDate,
  initialSlot,
  initialTime,
  maxDaysAhead = 7,
  confirmLabel = 'Save delivery slot',
  isSaving = false,
}) => {
  const [schedule, setSchedule] = useState<PreorderSchedule>(() => getDefaultPreorderSchedule({
    date: initialDate,
    slot: initialSlot,
    time: initialTime,
  }));

  useEffect(() => {
    if (isOpen) setSchedule(getDefaultPreorderSchedule({ date: initialDate, slot: initialSlot, time: initialTime }));
  }, [isOpen, initialDate, initialSlot, initialTime]);

  const today = toLocalDateInput();
  const maxDate = addLocalDays(maxDaysAhead);
  const quickDates = [
    { label: 'Today', value: today },
    { label: 'Tomorrow', value: addLocalDays(1) },
    { label: 'Day after', value: addLocalDays(2) },
  ];
  const availableSlots = useMemo(() => getAvailablePreorderSlots(schedule.date), [schedule.date]);
  const activeSlot = PREORDER_SLOTS.find(slot => slot.label === schedule.slot) || availableSlots[0];

  const selectDate = (date: string) => {
    const slots = getAvailablePreorderSlots(date);
    const nextSlot = slots.find(slot => slot.label === schedule.slot) || slots[0];
    if (!nextSlot) {
      const tomorrow = addLocalDays(1);
      const firstTomorrowSlot = getAvailablePreorderSlots(tomorrow)[0];
      setSchedule({ date: tomorrow, slot: firstTomorrowSlot.label, time: firstTomorrowSlot.subTimes[0] });
      return;
    }
    setSchedule({ date, slot: nextSlot.label, time: nextSlot.subTimes[0] });
  };

  const selectSlot = (slotLabel: string) => {
    const slot = PREORDER_SLOTS.find(item => item.label === slotLabel);
    if (slot) setSchedule(current => ({ ...current, slot: slot.label, time: slot.subTimes[0] }));
  };

  const handleConfirm = async () => {
    if (!isValidPreorderSchedule(schedule) || isSaving) return;
    await onConfirm(schedule);
    onClose();
  };

  return (
    <Dialog isOpen={isOpen} onClose={onClose} title="Schedule delivery">
      <div className="flex flex-col gap-5 text-left">
        <div className="flex items-start gap-3 rounded-2xl border border-blue-100 bg-blue-50 p-3.5 text-slate-700 dark:border-blue-900/50 dark:bg-blue-950/25 dark:text-slate-200">
          <Sparkles className="mt-0.5 h-5 w-5 shrink-0 text-[#FFC928]" />
          <p className="text-[11px] font-semibold leading-relaxed">
            Pick one reliable two-hour window. We keep a short preparation buffer for same-day orders.
          </p>
        </div>

        <section className="space-y-2.5">
          <h4 className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-[0.14em] text-slate-500">
            <Calendar className="h-3.5 w-3.5 text-[#0B74E8]" /> Delivery date
          </h4>
          <div className="grid grid-cols-3 gap-2">
            {quickDates.map(date => {
              const disabled = date.value > maxDate || (date.value === today && getAvailablePreorderSlots(date.value).length === 0);
              const selected = schedule.date === date.value;
              return (
                <button
                  key={date.value}
                  type="button"
                  disabled={disabled}
                  onClick={() => selectDate(date.value)}
                  className={`min-h-14 rounded-xl border px-2 py-2 text-center transition disabled:cursor-not-allowed disabled:opacity-40 ${selected
                    ? 'border-[#0B74E8] bg-[#0B74E8] text-white shadow-sm'
                    : 'border-slate-200 bg-white text-slate-700 hover:border-blue-300 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200'}`}
                >
                  <span className="block text-[11px] font-black">{date.label}</span>
                  <span className="mt-0.5 block text-[9px] opacity-75">{date.value.slice(5)}</span>
                </button>
              );
            })}
          </div>
          <label className="flex items-center justify-between gap-3 text-[10px] font-bold text-slate-500">
            Choose another date
            <input
              aria-label="Custom delivery date"
              type="date"
              value={schedule.date}
              min={today}
              max={maxDate}
              onChange={event => selectDate(event.target.value)}
              className="min-h-10 rounded-xl border border-slate-200 bg-white px-3 text-xs font-bold text-slate-800 outline-none focus:border-[#0B74E8] focus:ring-2 focus:ring-blue-100 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
            />
          </label>
        </section>

        <section className="space-y-2.5">
          <h4 className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-[0.14em] text-slate-500">
            <Clock className="h-3.5 w-3.5 text-[#0B74E8]" /> Two-hour window
          </h4>
          <div className="grid grid-cols-2 gap-2.5">
            {availableSlots.map(slot => {
              const selected = schedule.slot === slot.label;
              return (
                <button
                  key={slot.id}
                  type="button"
                  onClick={() => selectSlot(slot.label)}
                  className={`min-h-16 rounded-2xl border p-3 text-left transition ${selected
                    ? 'border-[#0B74E8] bg-blue-50 text-[#0758C7] ring-2 ring-blue-100 dark:bg-blue-950/30 dark:text-blue-300 dark:ring-blue-900/40'
                    : 'border-slate-200 bg-white text-slate-700 hover:border-blue-300 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200'}`}
                >
                  <span className="flex items-center justify-between text-[9px] font-black uppercase tracking-wide text-slate-500">
                    {slot.period}{selected && <Check className="h-3.5 w-3.5 text-[#0B74E8]" />}
                  </span>
                  <span className="mt-1 block text-[11px] font-black">{slot.label}</span>
                </button>
              );
            })}
          </div>
        </section>

        {activeSlot && (
          <section className="space-y-2.5">
            <h4 className="text-[10px] font-black uppercase tracking-[0.14em] text-slate-500">Preferred arrival time</h4>
            <div className="flex flex-wrap gap-2">
              {activeSlot.subTimes.map(time => (
                <button
                  key={time}
                  type="button"
                  onClick={() => setSchedule(current => ({ ...current, time }))}
                  className={`min-h-9 rounded-xl border px-3 text-xs font-black transition ${schedule.time === time
                    ? 'border-[#FFC928] bg-[#FFC928] text-[#071128]'
                    : 'border-slate-200 bg-white text-slate-600 hover:border-[#FFC928] dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200'}`}
                >
                  {time}
                </button>
              ))}
            </div>
          </section>
        )}

        <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3.5 dark:border-slate-700 dark:bg-slate-950">
          <span className="block text-[9px] font-black uppercase tracking-wider text-slate-400">Your delivery window</span>
          <strong className="mt-1 block text-xs text-[#0758C7] dark:text-blue-300">
            {schedule.date} · {schedule.slot}{schedule.time ? ` · preferred ${schedule.time}` : ''}
          </strong>
        </div>

        <Button fullWidth onClick={handleConfirm} isLoading={isSaving} disabled={!isValidPreorderSchedule(schedule)} className="min-h-12">
          {confirmLabel}
        </Button>
      </div>
    </Dialog>
  );
};
