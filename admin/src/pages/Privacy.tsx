import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Lock, ShieldCheck, Database, Eye, Server } from 'lucide-react';

export default function Privacy() {
  const navigate = useNavigate();

  return (
    <div className="max-w-4xl mx-auto px-4 py-8 text-left space-y-6 pb-24">
      {/* Header */}
      <div className="flex items-center gap-3 pb-4 border-b border-slate-200 dark:border-slate-800">
        <button
          onClick={() => navigate(-1)}
          className="p-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
        >
          <ArrowLeft className="h-5 w-5" />
        </button>
        <div>
          <h1 className="text-xl font-black text-slate-900 dark:text-white uppercase tracking-wider flex items-center gap-2">
            <Lock className="h-6 w-6 text-emerald-500" />
            Admin Data Protection & Privacy Policy
          </h1>
          <p className="text-xs font-semibold text-slate-500 dark:text-slate-400">
            Platform Master Privacy Standards • KartKirana Command Center
          </p>
        </div>
      </div>

      {/* Intro Banner */}
      <div className="p-5 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-xs font-medium text-emerald-900 dark:text-emerald-200 leading-relaxed flex items-start gap-3.5">
        <ShieldCheck className="h-5 w-5 text-emerald-500 shrink-0 mt-0.5" />
        <div>
          <span className="font-bold block text-sm mb-1">Confidentiality & Data Protection Standard</span>
          Administrators must strictly protect user, merchant, rider, and financial platform data. Data access is governed under strict need-to-know administrative principles.
        </div>
      </div>

      {/* Sections */}
      <div className="space-y-6 text-slate-700 dark:text-slate-300 text-xs leading-relaxed">
        
        <section className="space-y-2 p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm">
          <h2 className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-wider flex items-center gap-2">
            <Eye className="h-4.5 w-4.5 text-blue-500" />
            1. User Personal Data Protection
          </h2>
          <p>
            Customer PII (Personally Identifiable Information), location tracks, and order details accessed via the Admin console are strictly confidential and must not be exported or shared with unauthorized entities.
          </p>
        </section>

        <section className="space-y-2 p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm">
          <h2 className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-wider flex items-center gap-2">
            <Database className="h-4.5 w-4.5 text-emerald-500" />
            2. Financial & Merchant Security
          </h2>
          <p>
            Store bank details, payout transactions, platform commission analytics, and settlement ledger documents are encrypted. Access is restricted to authorized financial operations admins.
          </p>
        </section>

        <section className="space-y-2 p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm">
          <h2 className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-wider flex items-center gap-2">
            <Server className="h-4.5 w-4.5 text-purple-500" />
            3. Partner Identity Confidentiality
          </h2>
          <p>
            Rider verification documents (Aadhaar, Driving License, RC) are encrypted in Firebase storage buckets and restricted exclusively to administrative onboarding verification checks.
          </p>
        </section>

      </div>

      <div className="pt-4 text-center">
        <button
          onClick={() => navigate('/')}
          className="px-6 py-3 bg-emerald-500 text-slate-950 text-xs font-black uppercase tracking-wider rounded-xl shadow-sm hover:bg-emerald-400 transition"
        >
          Return to Command Center
        </button>
      </div>
    </div>
  );
}
