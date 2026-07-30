import React, { useState } from 'react';
import { Calendar, Clock, Check, X, Sparkles } from 'lucide-react';
import { Dialog } from './ui/Dialog';
import { Button } from './ui/Button';

interface PreorderModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (schedule: { date: string; slot: string; time: string }) => void;
  initialDate?: string;
  initialSlot?: string;
  initialTime?: string;
}

export const PREORDER_SLOTS = [
  { id: '09-11', label: '09:00 AM - 11:00 AM', period: 'Morning Slot', subTimes: ['09:00 AM', '09:30 AM', '10:00 AM', '10:30 AM'] },
  { id: '12-02', label: '12:00 PM - 02:00 PM', period: 'Afternoon Slot', subTimes: ['12:00 PM', '12:30 PM', '01:00 PM', '01:30 PM'] },
  { id: '03-05', label: '03:00 PM - 05:00 PM', period: 'Evening Slot', subTimes: ['03:00 PM', '03:30 PM', '04:00 PM', '04:30 PM'] },
  { id: '06-08', label: '06:00 PM - 08:00 PM', period: 'Night Slot', subTimes: ['06:00 PM', '06:30 PM', '07:00 PM', '07:30 PM'] }
];

export const PreorderModal: React.FC<PreorderModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  initialDate,
  initialSlot,
  initialTime
}) => {
  const todayStr = new Date().toISOString().split('T')[0];
  const tomorrowDate = new Date();
  tomorrowDate.setDate(tomorrowDate.getDate() + 1);
  const tomorrowStr = tomorrowDate.toISOString().split('T')[0];

  const dayAfterDate = new Date();
  dayAfterDate.setDate(dayAfterDate.getDate() + 2);
  const dayAfterStr = dayAfterDate.toISOString().split('T')[0];

  const [selectedDate, setSelectedDate] = useState<string>(initialDate || tomorrowStr);
  const [selectedSlot, setSelectedSlot] = useState<string>(initialSlot || '09:00 AM - 11:00 AM');
  const [selectedTime, setSelectedTime] = useState<string>(initialTime || '09:30 AM');

  const activeSlotObj = PREORDER_SLOTS.find(s => s.label === selectedSlot) || PREORDER_SLOTS[0];

  const handleSelectSlot = (slotLabel: string) => {
    setSelectedSlot(slotLabel);
    const found = PREORDER_SLOTS.find(s => s.label === slotLabel);
    if (found && found.subTimes.length > 0) {
      setSelectedTime(found.subTimes[1] || found.subTimes[0]);
    }
  };

  const handleConfirm = () => {
    onConfirm({
      date: selectedDate,
      slot: selectedSlot,
      time: selectedTime
    });
    onClose();
  };

  return (
    <Dialog isOpen={isOpen} onClose={onClose} title="📅 Schedule Pre-Order Slot">
      <div className="flex flex-col gap-5 text-left text-xs">
        
        {/* Banner */}
        <div className="bg-gradient-to-r from-[#1E88E5]/10 to-[#0B74E8]/10 border border-[#0B74E8]/20 p-3.5 rounded-2xl flex items-center gap-3 text-gray-800 dark:text-gray-200">
          <Sparkles className="h-5 w-5 text-[#FFC928] shrink-0" />
          <p className="text-[11px] font-bold leading-relaxed">
            Select a <span className="text-[#0B74E8] font-black">2-Hour Delivery Slot</span> and preferred time. Your pre-order request will be sent directly to the merchant shopkeeper.
          </p>
        </div>

        {/* 1. Date Selection */}
        <div className="space-y-2">
          <label className="text-[10px] font-black uppercase text-gray-400 dark:text-[#94A3B8] tracking-wider flex items-center gap-1.5">
            <Calendar className="h-3.5 w-3.5 text-[#0B74E8]" /> Select Delivery Date
          </label>
          <div className="grid grid-cols-3 gap-2">
            {[
              { label: 'Today', val: todayStr },
              { label: 'Tomorrow', val: tomorrowStr },
              { label: 'Day After', val: dayAfterStr }
            ].map(d => (
              <button
                key={d.val}
                type="button"
                onClick={() => setSelectedDate(d.val)}
                className={`py-2.5 px-3 rounded-xl border text-center transition-all cursor-pointer font-bold ${
                  selectedDate === d.val
                    ? 'bg-[#0B74E8] text-white border-[#0B74E8] shadow-md shadow-[#0B74E8]/20'
                    : 'bg-white dark:bg-[#1E293B] border-gray-200 dark:border-[#334155] text-gray-700 dark:text-gray-300 hover:border-[#0B74E8]'
                }`}
              >
                <div className="text-[11px] font-black">{d.label}</div>
                <div className="text-[9px] opacity-80 mt-0.5">{d.val}</div>
              </button>
            ))}
          </div>

          <div className="mt-2 flex items-center gap-2">
            <span className="text-[10px] font-bold text-gray-400">Or pick custom date:</span>
            <input
              type="date"
              value={selectedDate}
              min={todayStr}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="bg-white dark:bg-[#1E293B] border border-gray-200 dark:border-[#334155] rounded-lg px-2.5 py-1 text-xs font-bold text-gray-800 dark:text-white outline-none focus:border-[#0B74E8]"
            />
          </div>
        </div>

        {/* 2. 2-Hour Slot Selection */}
        <div className="space-y-2">
          <label className="text-[10px] font-black uppercase text-gray-400 dark:text-[#94A3B8] tracking-wider flex items-center gap-1.5">
            <Clock className="h-3.5 w-3.5 text-[#0B74E8]" /> Select 2-Hour Window Slot
          </label>
          <div className="grid grid-cols-2 gap-2.5">
            {PREORDER_SLOTS.map(slot => {
              const isSelected = selectedSlot === slot.label;
              return (
                <button
                  key={slot.id}
                  type="button"
                  onClick={() => handleSelectSlot(slot.label)}
                  className={`p-3 rounded-2xl border text-left transition-all cursor-pointer flex flex-col justify-between ${
                    isSelected
                      ? 'bg-gradient-to-br from-[#1E88E5]/15 to-[#0B74E8]/15 border-[#0B74E8] text-[#0B74E8] dark:text-[#60A5FA] ring-2 ring-[#0B74E8]/30 font-black'
                      : 'bg-white dark:bg-[#1E293B] border-gray-200 dark:border-[#334155] text-gray-700 dark:text-gray-300 hover:border-[#0B74E8]'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-[9px] font-black uppercase tracking-wider text-gray-400 dark:text-[#94A3B8]">
                      {slot.period}
                    </span>
                    {isSelected && <Check className="h-4 w-4 text-[#0B74E8] shrink-0" />}
                  </div>
                  <div className="text-xs font-black mt-1 text-gray-900 dark:text-white">
                    {slot.label}
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* 3. Specific Preferred Time Picker */}
        <div className="space-y-2">
          <label className="text-[10px] font-black uppercase text-gray-400 dark:text-[#94A3B8] tracking-wider flex items-center gap-1.5">
            ⏱️ Preferred Time inside Slot
          </label>
          <div className="flex flex-wrap gap-2">
            {activeSlotObj.subTimes.map(t => (
              <button
                key={t}
                type="button"
                onClick={() => setSelectedTime(t)}
                className={`px-3 py-1.5 rounded-xl border text-xs font-black transition-all cursor-pointer ${
                  selectedTime === t
                    ? 'bg-[#FFC928] text-slate-950 border-[#FFC928] shadow-sm'
                    : 'bg-white dark:bg-[#1E293B] border-gray-200 dark:border-[#334155] text-gray-700 dark:text-gray-300 hover:border-[#FFC928]'
                }`}
              >
                {t}
              </button>
            ))}
          </div>
        </div>

        {/* Selected Summary Card */}
        <div className="bg-[#F8FAFC] dark:bg-[#0F172A] p-3.5 rounded-2xl border border-gray-200 dark:border-[#334155] space-y-1">
          <span className="text-[9px] font-black uppercase text-gray-400 tracking-wider block">Assigned Slot Summary</span>
          <div className="text-xs font-black text-[#0B74E8] dark:text-[#60A5FA]">
            📅 {selectedDate} • 🕒 {selectedSlot} ({selectedTime})
          </div>
        </div>

        {/* Action Button */}
        <div className="pt-2">
          <Button
            variant="primary"
            fullWidth
            onClick={handleConfirm}
            className="py-3 text-xs font-black uppercase tracking-wider rounded-xl"
          >
            Confirm & Save Pre-Order Slot
          </Button>
        </div>

      </div>
    </Dialog>
  );
};
