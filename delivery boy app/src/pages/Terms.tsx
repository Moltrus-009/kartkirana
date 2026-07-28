import React from 'react';
import { ArrowLeft, ShieldCheck, FileText, CheckCircle2, Truck, AlertTriangle, DollarSign } from 'lucide-react';

interface TermsProps {
  onBack?: () => void;
}

export const Terms: React.FC<TermsProps> = ({ onBack }) => {
  return (
    <div className="max-w-md mx-auto px-4 py-6 text-left space-y-5 pb-24">
      {/* Header */}
      <div className="flex items-center gap-3 pb-3 border-b border-slate-200 dark:border-zinc-800">
        {onBack && (
          <button
            onClick={onBack}
            className="p-2 rounded-xl bg-slate-100 dark:bg-zinc-800 text-slate-600 dark:text-zinc-300 hover:bg-slate-200 dark:hover:bg-zinc-700 transition-colors"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
        )}
        <div>
          <h1 className="text-lg font-black text-slate-900 dark:text-white uppercase tracking-wider flex items-center gap-2">
            <FileText className="h-5 w-5 text-primary" />
            Rider Terms & Code of Conduct
          </h1>
          <p className="text-[10px] font-semibold text-slate-400 dark:text-zinc-500">
            Delivery Partner Guidelines • KartKirana Partner Network
          </p>
        </div>
      </div>

      {/* Intro Banner */}
      <div className="p-4 rounded-2xl bg-blue-50 dark:bg-zinc-900/60 border border-blue-200 dark:border-zinc-800 text-xs font-medium text-blue-900 dark:text-zinc-200 leading-relaxed flex items-start gap-3">
        <ShieldCheck className="h-5 w-5 text-primary shrink-0 mt-0.5" />
        <div>
          <span className="font-bold block text-xs mb-0.5 uppercase tracking-wide text-primary">Delivery Partner Agreement</span>
          As a registered delivery partner on KartKirana, you agree to follow safety rules, fulfill accepted batches promptly, and maintain professional conduct.
        </div>
      </div>

      {/* Content */}
      <div className="space-y-4 text-slate-700 dark:text-zinc-300 text-xs leading-relaxed">
        
        <section className="space-y-1.5 p-4 rounded-2xl bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 shadow-xs">
          <h2 className="text-xs font-black text-slate-900 dark:text-white uppercase tracking-wider flex items-center gap-1.5">
            <Truck className="h-4 w-4 text-emerald-500" />
            1. Order Acceptance & Fulfillment SLA
          </h2>
          <p className="text-[11px] text-slate-500 dark:text-zinc-400">
            Once an order or smart batch is accepted, partners must proceed immediately to the store location for pickup and complete delivery within the estimated route time.
          </p>
        </section>

        <section className="space-y-1.5 p-4 rounded-2xl bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 shadow-xs">
          <h2 className="text-xs font-black text-slate-900 dark:text-white uppercase tracking-wider flex items-center gap-1.5">
            <CheckCircle2 className="h-4 w-4 text-blue-500" />
            2. Safety & Verification Compliance
          </h2>
          <p className="text-[11px] text-slate-500 dark:text-zinc-400">
            Partners must possess a valid Driving License, vehicle RC, and helmet while delivering. Verification checks (e.g. OTP at store/customer doorstep) must be strictly completed.
          </p>
        </section>

        <section className="space-y-1.5 p-4 rounded-2xl bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 shadow-xs">
          <h2 className="text-xs font-black text-slate-900 dark:text-white uppercase tracking-wider flex items-center gap-1.5">
            <DollarSign className="h-4 w-4 text-emerald-500" />
            3. Rider Earnings & Payout Structure
          </h2>
          <p className="text-[11px] text-slate-500 dark:text-zinc-400">
            Riders receive per-delivery fees plus smart batch bonuses. Payouts are credited directly to your registered bank account/UPI ID according to weekly settlement cycles.
          </p>
        </section>

        <section className="space-y-1.5 p-4 rounded-2xl bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 shadow-xs">
          <h2 className="text-xs font-black text-slate-900 dark:text-white uppercase tracking-wider flex items-center gap-1.5">
            <AlertTriangle className="h-4 w-4 text-amber-500" />
            4. Zero Tolerance Code of Conduct
          </h2>
          <p className="text-[11px] text-slate-500 dark:text-zinc-400">
            Abuse of customer contact info, tampering with goods, or unexcused batch abandonment will result in immediate partner account deactivation.
          </p>
        </section>

      </div>

      {onBack && (
        <div className="pt-2 text-center">
          <button
            onClick={onBack}
            className="px-6 py-2.5 bg-primary text-white text-xs font-black uppercase tracking-wider rounded-xl shadow-xs cursor-pointer"
          >
            Back to App
          </button>
        </div>
      )}
    </div>
  );
};
