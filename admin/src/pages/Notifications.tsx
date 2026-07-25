import { useState } from 'react';
import { adminService } from '../services/adminService';
import { 
  Send, 
  CheckCircle
} from 'lucide-react';

export default function Notifications() {
  const [target, setTarget] = useState('everyone'); // everyone, users, riders, shops, area
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [areaId, setAreaId] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !body.trim()) return;

    setLoading(true);
    setSuccess(false);

    try {
      await adminService.sendNotification({
        target,
        title: title.trim(),
        body: body.trim(),
        areaId: target === 'area' ? areaId : undefined
      });
      setTitle('');
      setBody('');
      setSuccess(true);
    } catch (err: any) {
      alert(`Dispatch failed: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6 text-left select-none max-w-xl">
      
      {/* Header */}
      <div>
        <h1 className="text-2xl font-black text-slate-800 dark:text-white">
          📢 Broadcaster Notification Center
        </h1>
        <p className="text-[10px] text-slate-400 font-extrabold uppercase tracking-wider block mt-0.5">
          Broadcast push notifications, SMS alerts, & email campaigns
        </p>
      </div>

      {success && (
        <div className="p-4 bg-emerald-500/10 border border-emerald-500/20 text-emerald-500 rounded-3xl flex items-center gap-2 font-extrabold text-xs">
          <CheckCircle className="h-4.5 w-4.5" /> Broadcast enqueued in asynchronous background job queue.
        </div>
      )}

      {/* Form */}
      <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-850 p-6 rounded-[32px] shadow-xs">
        <form onSubmit={handleSend} className="space-y-4 text-xs font-bold text-slate-700 dark:text-zinc-350">
          
          {/* Target Group */}
          <div className="space-y-1">
            <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest pl-1">Target Audience Group *</label>
            <select
              value={target}
              onChange={(e) => setTarget(e.target.value)}
              className="w-full bg-slate-50 dark:bg-zinc-800 border border-slate-200 dark:border-slate-850 rounded-xl px-3 py-2.5 outline-none cursor-pointer text-slate-900 dark:text-white"
            >
              <option value="everyone">Everyone (All Registers)</option>
              <option value="users">Customers Only</option>
              <option value="riders">Riders Fleet Only</option>
              <option value="shops">Merchant Stores Only</option>
              <option value="area">Specific Geofenced Zone</option>
            </select>
          </div>

          {/* Area selector */}
          {target === 'area' && (
            <div className="space-y-1 animate-in slide-in-from-top-2 duration-150">
              <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest pl-1">Select Target Zone *</label>
              <select
                value={areaId}
                required
                onChange={(e) => setAreaId(e.target.value)}
                className="w-full bg-slate-50 dark:bg-zinc-800 border border-slate-200 dark:border-slate-850 rounded-xl px-3 py-2.5 outline-none cursor-pointer text-slate-900 dark:text-white"
              >
                <option value="">Choose geofenced boundary...</option>
                {/* Fallback mock list if zones empty */}
                <option value="zone-noida-15">Noida Sector 15 Zone</option>
                <option value="zone-delhi-main">Delhi Central Zone</option>
              </select>
            </div>
          )}

          {/* Title */}
          <div className="space-y-1">
            <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest pl-1">Notification Title *</label>
            <input
              type="text"
              required
              placeholder="e.g. Flash Sunday Sale!"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full bg-slate-50 dark:bg-zinc-800 border border-slate-200 dark:border-slate-850 rounded-xl px-3.5 py-2.5 font-bold outline-none text-slate-900 dark:text-white"
            />
          </div>

          {/* Body */}
          <div className="space-y-1">
            <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest pl-1">Alert Message Body *</label>
            <textarea
              required
              rows={4}
              placeholder="Compile campaign message payload body..."
              value={body}
              onChange={(e) => setBody(e.target.value)}
              className="w-full bg-slate-50 dark:bg-zinc-800 border border-slate-200 dark:border-slate-855 rounded-xl px-3.5 py-2.5 font-bold outline-none leading-relaxed text-slate-900 dark:text-white"
            />
          </div>

          {/* Trigger */}
          <div className="pt-2">
            <button
              type="submit"
              disabled={loading || !title.trim() || !body.trim()}
              className="w-full py-3 bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-black rounded-xl uppercase tracking-wider flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <Send className="h-4 w-4" /> Dispatch Broadcast Alert
            </button>
          </div>

        </form>
      </div>

    </div>
  );
}
