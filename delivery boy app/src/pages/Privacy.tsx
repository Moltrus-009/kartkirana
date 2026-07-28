import React from 'react';
import { ArrowLeft, Lock, ShieldCheck, Navigation, Eye, Key } from 'lucide-react';

interface PrivacyProps {
  onBack?: () => void;
}

export const Privacy: React.FC<PrivacyProps> = ({ onBack }) => {
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
            <Lock className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
            Rider Privacy Policy
          </h1>
          <p className="text-[10px] font-semibold text-slate-400 dark:text-zinc-500">
            Location & Data Privacy Policy • KartKirana Partner Network
          </p>
        </div>
      </div>

      {/* Intro Banner */}
      <div className="p-4 rounded-2xl bg-emerald-50 dark:bg-zinc-900/60 border border-emerald-200 dark:border-zinc-800 text-xs font-medium text-emerald-900 dark:text-zinc-200 leading-relaxed flex items-start gap-3">
        <ShieldCheck className="h-5 w-5 text-emerald-600 shrink-0 mt-0.5" />
        <div>
          <span className="font-bold block text-xs mb-0.5 uppercase tracking-wide text-emerald-600">Partner Privacy Rights</span>
          KartKirana respects delivery partner privacy. We collect location and identity data solely for route optimization, order matching, and payout calculations.
        </div>
      </div>

      {/* Content */}
      <div className="space-y-4 text-slate-700 dark:text-zinc-300 text-xs leading-relaxed">
        
        <section className="space-y-1.5 p-4 rounded-2xl bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 shadow-xs">
          <h2 className="text-xs font-black text-slate-900 dark:text-white uppercase tracking-wider flex items-center gap-1.5">
            <Navigation className="h-4 w-4 text-blue-500" />
            1. Background & Real-Time Location Access
          </h2>
          <p className="text-[11px] text-slate-500 dark:text-zinc-400">
            While you are marked <b>ONLINE</b>, our app tracks precise background GPS location to assign nearest order pickups and allow live tracking for customers. Location tracking stops when you go <b>OFFLINE</b>.
          </p>
        </section>

        <section className="space-y-1.5 p-4 rounded-2xl bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 shadow-xs">
          <h2 className="text-xs font-black text-slate-900 dark:text-white uppercase tracking-wider flex items-center gap-1.5">
            <Eye className="h-4 w-4 text-emerald-500" />
            2. Customer & Store Contact Privacy
          </h2>
          <p className="text-[11px] text-slate-500 dark:text-zinc-400">
            Customer phone numbers and delivery addresses are provided exclusively for order fulfillment. Rider contact details are masked during voice and chat communications.
          </p>
        </section>

        <section className="space-y-1.5 p-4 rounded-2xl bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 shadow-xs">
          <h2 className="text-xs font-black text-slate-900 dark:text-white uppercase tracking-wider flex items-center gap-1.5">
            <Key className="h-4 w-4 text-purple-500" />
            3. Document Protection & Bank Payout Data
          </h2>
          <p className="text-[11px] text-slate-500 dark:text-zinc-400">
            Uploaded identification documents (Aadhaar, Driving License, RC) are encrypted and accessed solely for partner verification. Payout bank details are protected via secure payment gateways.
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
