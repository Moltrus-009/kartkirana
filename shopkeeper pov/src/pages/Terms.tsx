import { useNavigate } from 'react-router-dom';
import { ArrowLeft, ShieldCheck, FileText, CheckCircle2, Store, DollarSign, Scale } from 'lucide-react';

export default function Terms() {
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
            <FileText className="h-6 w-6 text-primary" />
            Merchant Terms & Conditions
          </h1>
          <p className="text-xs font-semibold text-slate-500 dark:text-slate-400">
            KartKirana Merchant Partner Agreement • Effective July 2026
          </p>
        </div>
      </div>

      {/* Intro Banner */}
      <div className="p-5 rounded-2xl bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-800 text-xs font-medium text-blue-900 dark:text-blue-200 leading-relaxed flex items-start gap-3.5">
        <ShieldCheck className="h-5 w-5 text-primary shrink-0 mt-0.5" />
        <div>
          <span className="font-bold block text-sm mb-1">Partner Store Agreement</span>
          This agreement governs your onboarding, catalog management, order fulfillment SLAs, and financial payouts as a registered merchant partner on the KartKirana hyper-local delivery network.
        </div>
      </div>

      {/* Sections */}
      <div className="space-y-6 text-slate-700 dark:text-slate-300 text-xs leading-relaxed">
        
        {/* Section 1 */}
        <section className="space-y-2 p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm">
          <h2 className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-wider flex items-center gap-2">
            <Store className="h-4.5 w-4.5 text-emerald-500" />
            1. Merchant Onboarding & Catalog Accuracy
          </h2>
          <p>
            Merchants agree to maintain true, updated stock levels, correct prices, and accurate product details on the KartKirana merchant portal:
          </p>
          <ul className="list-disc list-inside space-y-1 pl-2 text-slate-500 dark:text-slate-400">
            <li>Display prices must match or be competitive with offline MRPs.</li>
            <li>Out-of-stock items must be marked immediately to prevent order rejection fees.</li>
            <li>Merchants are responsible for complying with FSSAI standards and food/grocery safety laws.</li>
          </ul>
        </section>

        {/* Section 2 */}
        <section className="space-y-2 p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm">
          <h2 className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-wider flex items-center gap-2">
            <CheckCircle2 className="h-4.5 w-4.5 text-emerald-500" />
            2. Order Processing & Fulfillment SLAs
          </h2>
          <p>
            Upon receiving an order notification, merchant partners must accept the order within <b>3 minutes</b> and have items packed and ready for delivery partner pickup within <b>7-10 minutes</b>.
          </p>
          <ul className="list-disc list-inside space-y-1 pl-2 text-slate-500 dark:text-slate-400">
            <li>Frequent order cancellations by merchant due to inventory miscounts may lead to temporary store suspension.</li>
            <li>Perishable goods must be packed securely in sanitized bags.</li>
          </ul>
        </section>

        {/* Section 3 */}
        <section className="space-y-2 p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm">
          <h2 className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-wider flex items-center gap-2">
            <DollarSign className="h-4.5 w-4.5 text-blue-500" />
            3. Commission, Payouts & Settlement Cycle
          </h2>
          <p>
            Payouts for fulfilled orders are calculated after deducting agreed platform commission fees. Settled earnings are disbursed directly into your registered bank account per the standard settlement cycle (daily/weekly).
          </p>
        </section>

        {/* Section 4 */}
        <section className="space-y-2 p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm">
          <h2 className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-wider flex items-center gap-2">
            <Scale className="h-4.5 w-4.5 text-purple-500" />
            4. Termination & Policy Updates
          </h2>
          <p>
            KartKirana reserves the right to terminate merchant access in cases of repeated quality complaints, fraudulent transactions, or breach of security policies.
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
