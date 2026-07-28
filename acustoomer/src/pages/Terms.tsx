import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, ShieldCheck, FileText, CheckCircle2, AlertTriangle, Scale } from 'lucide-react';
import { Button } from '../components/ui/Button';

export const Terms: React.FC = () => {
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
            <FileText className="h-6 w-6 text-blue-600 dark:text-blue-400" />
            Terms & Conditions
          </h1>
          <p className="text-xs font-semibold text-slate-500 dark:text-slate-400">
            Last Updated: July 2026 • KartKirana Customer Platform
          </p>
        </div>
      </div>

      {/* Intro Banner */}
      <div className="p-4 rounded-2xl bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-800 text-xs font-medium text-blue-900 dark:text-blue-200 leading-relaxed flex items-start gap-3">
        <ShieldCheck className="h-5 w-5 text-blue-600 shrink-0 mt-0.5" />
        <div>
          <span className="font-bold block text-sm mb-1">Welcome to KartKirana</span>
          Please read these Terms and Conditions carefully before placing orders or using our grocery & instant delivery services. By accessing or using the KartKirana app, you agree to be bound by these terms.
        </div>
      </div>

      {/* Terms Content Sections */}
      <div className="space-y-6 text-slate-700 dark:text-slate-300 text-xs leading-relaxed">
        
        {/* Section 1 */}
        <section className="space-y-2 p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs">
          <h2 className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-wider flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 text-emerald-500" />
            1. User Account & Account Security
          </h2>
          <p>
            To place orders on KartKirana, you must register using a valid mobile number and provide accurate personal information. You are solely responsible for maintaining the confidentiality of your account credentials and OTP verification codes.
          </p>
          <ul className="list-disc list-inside space-y-1 pl-2 text-slate-500 dark:text-slate-400">
            <li>You must be at least 18 years old or under parental supervision to use this app.</li>
            <li>Multiple registrations with intent to abuse promo codes or coupons may result in account termination.</li>
          </ul>
        </section>

        {/* Section 2 */}
        <section className="space-y-2 p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs">
          <h2 className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-wider flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 text-emerald-500" />
            2. Ordering & Product Availability
          </h2>
          <p>
            All orders placed on KartKirana are subject to store acceptance and product availability at the selected partner store. Prices, items, and discounts are displayed inclusive of applicable store charges.
          </p>
          <ul className="list-disc list-inside space-y-1 pl-2 text-slate-500 dark:text-slate-400">
            <li>Product images are for illustrative purposes; actual packaging may vary.</li>
            <li>In case an item is out of stock, merchant partners may suggest replacements or issue a prompt refund for the item.</li>
          </ul>
        </section>

        {/* Section 3 */}
        <section className="space-y-2 p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs">
          <h2 className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-wider flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 text-emerald-500" />
            3. Pricing, Delivery Charges & Handling Fees
          </h2>
          <p>
            KartKirana strives to maintain transparent pricing across all items:
          </p>
          <ul className="list-disc list-inside space-y-1 pl-2 text-slate-500 dark:text-slate-400">
            <li>Standard delivery fee is ₹25 for orders below ₹149. Orders of ₹149 or above qualify for <b>FREE Delivery</b>.</li>
            <li>A flat handling fee of ₹5 applies per delivery.</li>
            <li>Product prices are displayed as shown in partner shops (no extra GST added at checkout).</li>
          </ul>
        </section>

        {/* Section 4 */}
        <section className="space-y-2 p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs">
          <h2 className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-wider flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-amber-500" />
            4. Cancellation & Refund Policy
          </h2>
          <p>
            You may cancel an order before the partner store accepts it. Once an order is prepared or out for delivery with our delivery rider partner:
          </p>
          <ul className="list-disc list-inside space-y-1 pl-2 text-slate-500 dark:text-slate-400">
            <li>Cancellations after store acceptance may incur a cancellation fee equivalent to the order value.</li>
            <li>For damaged or missing items, report within 2 hours of delivery with item photos via Support for instant resolution or refund credit.</li>
          </ul>
        </section>

        {/* Section 5 */}
        <section className="space-y-2 p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs">
          <h2 className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-wider flex items-center gap-2">
            <Scale className="h-4 w-4 text-blue-500" />
            5. Limitation of Liability & Jurisdiction
          </h2>
          <p>
            KartKirana operates as an aggregator connecting customers with local merchants and delivery partners. We are not liable for direct quality defects of third-party manufactured products, though we will assist in resolving disputes.
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
