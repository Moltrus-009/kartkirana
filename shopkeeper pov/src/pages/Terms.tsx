import { useNavigate } from 'react-router-dom';
import { ArrowLeft, ShieldCheck, FileText, CheckCircle2, Store, DollarSign, Scale } from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';

export default function Terms() {
  const navigate = useNavigate();
  const { language, t } = useLanguage();
  const copy = language === 'hi' ? {
    subtitle: 'KartKirana मर्चेंट पार्टनर समझौता • जुलाई 2026 से प्रभावी',
    introTitle: 'पार्टनर दुकान समझौता',
    intro: 'यह समझौता KartKirana हाइपरलोकल डिलीवरी नेटवर्क पर पंजीकृत मर्चेंट पार्टनर के रूप में आपके ऑनबोर्डिंग, कैटलॉग प्रबंधन, ऑर्डर पूर्ति समय और वित्तीय भुगतान को नियंत्रित करता है।',
    s1: '1. मर्चेंट ऑनबोर्डिंग और कैटलॉग की शुद्धता',
    s1p: 'मर्चेंट KartKirana पोर्टल पर सही और अपडेटेड स्टॉक, मूल्य और उत्पाद विवरण बनाए रखने के लिए सहमत हैं:',
    s1a: 'दिखाए गए मूल्य ऑफलाइन एमआरपी के समान या प्रतिस्पर्धी होने चाहिए।',
    s1b: 'स्टॉक समाप्त होने पर उत्पाद को तुरंत चिह्नित करना होगा ताकि ऑर्डर अस्वीकृति से बचा जा सके।',
    s1c: 'FSSAI मानकों और खाद्य/किराना सुरक्षा कानूनों का पालन करना मर्चेंट की जिम्मेदारी है।',
    s2: '2. ऑर्डर प्रक्रिया और पूर्ति समय',
    s2p: 'ऑर्डर सूचना मिलने पर मर्चेंट को 3 मिनट के भीतर ऑर्डर स्वीकार करना और 7–10 मिनट में डिलीवरी पार्टनर के लिए पैक करके तैयार रखना होगा।',
    s2a: 'गलत स्टॉक गणना के कारण बार-बार ऑर्डर रद्द होने पर दुकान अस्थायी रूप से निलंबित हो सकती है।',
    s2b: 'जल्दी खराब होने वाला सामान साफ और सुरक्षित बैग में पैक होना चाहिए।',
    s3: '3. कमीशन, भुगतान और निपटान चक्र',
    s3p: 'पूरे हुए ऑर्डर का भुगतान सहमत प्लेटफ़ॉर्म कमीशन काटने के बाद तय होता है और मानक दैनिक/साप्ताहिक चक्र के अनुसार पंजीकृत बैंक खाते में भेजा जाता है।',
    s4: '4. समाप्ति और नीति अपडेट',
    s4p: 'बार-बार गुणवत्ता शिकायत, धोखाधड़ी या सुरक्षा नीति उल्लंघन होने पर KartKirana मर्चेंट एक्सेस समाप्त कर सकता है।'
  } : {
    subtitle: 'KartKirana Merchant Partner Agreement • Effective July 2026', introTitle: 'Partner Store Agreement',
    intro: 'This agreement governs onboarding, catalog management, order fulfilment timelines and financial payouts for registered merchant partners on the KartKirana hyperlocal delivery network.',
    s1: '1. Merchant Onboarding & Catalog Accuracy', s1p: 'Merchants agree to maintain correct, updated stock, prices and product details on the KartKirana portal:',
    s1a: 'Displayed prices must match or be competitive with offline MRPs.', s1b: 'Out-of-stock items must be marked immediately to prevent avoidable order rejection.', s1c: 'Merchants are responsible for FSSAI compliance and applicable food and grocery safety laws.',
    s2: '2. Order Processing & Fulfilment Timelines', s2p: 'After an order notification, merchants must accept within 3 minutes and keep items packed for rider pickup within 7–10 minutes.',
    s2a: 'Frequent cancellations caused by inaccurate inventory may lead to temporary store suspension.', s2b: 'Perishable goods must be packed securely in clean bags.',
    s3: '3. Commission, Payouts & Settlement Cycle', s3p: 'Payouts for fulfilled orders are calculated after agreed platform commission and sent to the registered bank account under the standard daily or weekly settlement cycle.',
    s4: '4. Termination & Policy Updates', s4p: 'KartKirana may terminate merchant access after repeated quality complaints, fraudulent transactions or security-policy violations.'
  };

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
            {t('merchant_terms_conditions')}
          </h1>
          <p className="text-xs font-semibold text-slate-500 dark:text-slate-400">
            {copy.subtitle}
          </p>
        </div>
      </div>

      {/* Intro Banner */}
      <div className="p-5 rounded-2xl bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-800 text-xs font-medium text-blue-900 dark:text-blue-200 leading-relaxed flex items-start gap-3.5">
        <ShieldCheck className="h-5 w-5 text-primary shrink-0 mt-0.5" />
        <div>
          <span className="font-bold block text-sm mb-1">{copy.introTitle}</span>
          {copy.intro}
        </div>
      </div>

      {/* Sections */}
      <div className="space-y-6 text-slate-700 dark:text-slate-300 text-xs leading-relaxed">
        
        {/* Section 1 */}
        <section className="space-y-2 p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm">
          <h2 className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-wider flex items-center gap-2">
            <Store className="h-4.5 w-4.5 text-emerald-500" />
            {copy.s1}
          </h2>
          <p>
            {copy.s1p}
          </p>
          <ul className="list-disc list-inside space-y-1 pl-2 text-slate-500 dark:text-slate-400">
            <li>{copy.s1a}</li><li>{copy.s1b}</li><li>{copy.s1c}</li>
          </ul>
        </section>

        {/* Section 2 */}
        <section className="space-y-2 p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm">
          <h2 className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-wider flex items-center gap-2">
            <CheckCircle2 className="h-4.5 w-4.5 text-emerald-500" />
            {copy.s2}
          </h2>
          <p>
            {copy.s2p}
          </p>
          <ul className="list-disc list-inside space-y-1 pl-2 text-slate-500 dark:text-slate-400">
            <li>{copy.s2a}</li><li>{copy.s2b}</li>
          </ul>
        </section>

        {/* Section 3 */}
        <section className="space-y-2 p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm">
          <h2 className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-wider flex items-center gap-2">
            <DollarSign className="h-4.5 w-4.5 text-blue-500" />
            {copy.s3}
          </h2>
          <p>
            {copy.s3p}
          </p>
        </section>

        {/* Section 4 */}
        <section className="space-y-2 p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm">
          <h2 className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-wider flex items-center gap-2">
            <Scale className="h-4.5 w-4.5 text-purple-500" />
            {copy.s4}
          </h2>
          <p>
            {copy.s4p}
          </p>
        </section>

      </div>

      <div className="pt-4 text-center">
        <button
          onClick={() => navigate('/')}
          className="px-6 py-3 bg-primary text-white text-xs font-black uppercase tracking-wider rounded-xl shadow-sm"
        >
          {t('return_dashboard')}
        </button>
      </div>
    </div>
  );
}
