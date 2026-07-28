import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Lock, ShieldCheck, Eye, Database, UserCheck, BellRing } from 'lucide-react';
import { Button } from '../components/ui/Button';

export const Privacy: React.FC = () => {
  const navigate = useNavigate();

  return (
    <div className="max-w-3xl mx-auto px-4 py-6 text-left space-y-6 pb-24">
      {/* Header */}
      <div className="flex items-center gap-3 pb-4 border-b border-slate-200 dark:border-slate-800">
        <button
          onClick={() => navigate(-1)}
          className="p-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
        >
          <ArrowLeft className="h-5 w-5" />
        </button>
        <div>
          <h1 className="text-xl font-black text-slate-900 dark:text-white uppercase tracking-wider flex items-center gap-2">
            <Lock className="h-6 w-6 text-emerald-600 dark:text-emerald-400" />
            Privacy Policy
          </h1>
          <p className="text-xs font-semibold text-slate-500 dark:text-slate-400">
            Last Updated: July 2026 • KartKirana Data Protection & Privacy
          </p>
        </div>
      </div>

      {/* Intro Banner */}
      <div className="p-4 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-xs font-medium text-emerald-900 dark:text-emerald-200 leading-relaxed flex items-start gap-3">
        <ShieldCheck className="h-5 w-5 text-emerald-600 shrink-0 mt-0.5" />
        <div>
          <span className="font-bold block text-sm mb-1">Your Privacy is Our Priority</span>
          At KartKirana, we respect your privacy and are committed to protecting your personal data. This Privacy Policy explains how we collect, use, store, and safeguard your information when you use our platform.
        </div>
      </div>

      {/* Privacy Content Sections */}
      <div className="space-y-6 text-slate-700 dark:text-slate-300 text-xs leading-relaxed">
        
        {/* Section 1 */}
        <section className="space-y-2 p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs">
          <h2 className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-wider flex items-center gap-2">
            <Eye className="h-4 w-4 text-blue-500" />
            1. Information We Collect
          </h2>
          <p>
            We collect information necessary to fulfill your grocery orders and provide seamless instant delivery:
          </p>
          <ul className="list-disc list-inside space-y-1 pl-2 text-slate-500 dark:text-slate-400">
            <li><b>Personal Details:</b> Name, phone number, email address, and saved delivery addresses.</li>
            <li><b>Location Data:</b> Precise GPS coordinates when you enable location services to find nearby stores and calculate delivery ETA.</li>
            <li><b>Transaction Info:</b> Order items, payment status, and order history (payment credentials are handled securely via Razorpay/UPI gateways; we never store card numbers).</li>
          </ul>
        </section>

        {/* Section 2 */}
        <section className="space-y-2 p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs">
          <h2 className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-wider flex items-center gap-2">
            <Database className="h-4 w-4 text-emerald-500" />
            2. How We Use Your Information
          </h2>
          <p>
            Your information is strictly utilized to facilitate core services:
          </p>
          <ul className="list-disc list-inside space-y-1 pl-2 text-slate-500 dark:text-slate-400">
            <li>Processing, dispatching, and delivering your orders from partner stores.</li>
            <li>Providing live GPS order tracking and customer support updates.</li>
            <li>Improving app performance, store recommendations, and fraud prevention.</li>
          </ul>
        </section>

        {/* Section 3 */}
        <section className="space-y-2 p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs">
          <h2 className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-wider flex items-center gap-2">
            <UserCheck className="h-4 w-4 text-purple-500" />
            3. Information Sharing & Third Parties
          </h2>
          <p>
            We never sell or rent your personal data to third parties. We share data only with:
          </p>
          <ul className="list-disc list-inside space-y-1 pl-2 text-slate-500 dark:text-slate-400">
            <li><b>Delivery Riders:</b> Customer name, phone number, and delivery address to complete your delivery.</li>
            <li><b>Partner Stores:</b> Order details and delivery address label for item packing.</li>
            <li><b>Secure Payment Services:</b> Encrypted payment tokens to process payment transactions.</li>
          </ul>
        </section>

        {/* Section 4 */}
        <section className="space-y-2 p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs">
          <h2 className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-wider flex items-center gap-2">
            <BellRing className="h-4 w-4 text-amber-500" />
            4. Security & User Controls
          </h2>
          <p>
            Your data is stored using industry-standard Firebase encryption and security protocols. You can update your profile, manage saved delivery addresses, or request account deletion by contacting support.
          </p>
        </section>

      </div>

      <div className="pt-4 text-center">
        <Button variant="outline" className="rounded-xl px-6 py-2.5 text-xs font-bold" onClick={() => navigate('/')}>
          Return to Shopping
        </Button>
      </div>
    </div>
  );
};
