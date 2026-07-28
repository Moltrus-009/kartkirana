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
            <Lock className="h-6 w-6 text-emerald-600 dark:text-emerald-400" />
            Merchant Privacy Policy
          </h1>
          <p className="text-xs font-semibold text-slate-500 dark:text-slate-400">
            KartKirana Merchant Confidentiality & Privacy Standards
          </p>
        </div>
      </div>

      {/* Intro Banner */}
      <div className="p-5 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-xs font-medium text-emerald-900 dark:text-emerald-200 leading-relaxed flex items-start gap-3.5">
        <ShieldCheck className="h-5 w-5 text-emerald-600 shrink-0 mt-0.5" />
        <div>
          <span className="font-bold block text-sm mb-1">Protecting Your Business Data</span>
          KartKirana respects merchant privacy and is committed to handling store data, sales revenue analytics, and staff details securely.
        </div>
      </div>

      {/* Sections */}
      <div className="space-y-6 text-slate-700 dark:text-slate-300 text-xs leading-relaxed">
        
        <section className="space-y-2 p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm">
          <h2 className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-wider flex items-center gap-2">
            <Database className="h-4.5 w-4.5 text-blue-500" />
            1. Merchant Information We Collect
          </h2>
          <p>
            We collect store verification details including GST registration (if applicable), store owner contact info, bank account payout details, and store location coordinates.
          </p>
        </section>

        <section className="space-y-2 p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm">
          <h2 className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-wider flex items-center gap-2">
            <Eye className="h-4.5 w-4.5 text-emerald-500" />
            2. Customer Data Usage Guidelines
          </h2>
          <p>
            Customer details (name, delivery address, phone) shared on order tickets are provided exclusively for order packing and dispatch. Merchants must not store, reuse, or contact customers independently outside the platform context.
          </p>
        </section>

        <section className="space-y-2 p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm">
          <h2 className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-wider flex items-center gap-2">
            <Server className="h-4.5 w-4.5 text-purple-500" />
            3. Data Security & Analytics
          </h2>
          <p>
            All store financial transactions and sales performance metrics are protected using enterprise-grade Firebase encryption. Payout bank information is tokenized and processed via audited financial banking partners.
          </p>
        </section>

      </div>

      <div className="pt-4 text-center">
        <button
          onClick={() => navigate('/')}
          className="px-6 py-3 bg-primary text-white text-xs font-black uppercase tracking-wider rounded-xl shadow-sm"
        >
          Return to Dashboard
        </button>
      </div>
    </div>
  );
}
