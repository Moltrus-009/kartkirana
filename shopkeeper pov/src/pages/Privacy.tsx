import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Lock, ShieldCheck, Database, Eye, Server } from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';

export default function Privacy() {
  const navigate = useNavigate();
  const { language, t } = useLanguage();
  const copy = language === 'hi' ? {
    subtitle: 'KartKirana मर्चेंट गोपनीयता और डेटा सुरक्षा मानक', title: 'आपके व्यावसायिक डेटा की सुरक्षा',
    intro: 'KartKirana मर्चेंट की गोपनीयता का सम्मान करता है और दुकान, बिक्री विश्लेषण तथा कर्मचारियों का डेटा सुरक्षित रूप से संभालता है।',
    s1: '1. मर्चेंट की जानकारी जो हम एकत्र करते हैं', s1p: 'हम दुकान सत्यापन विवरण, लागू होने पर GST पंजीकरण, मालिक की संपर्क जानकारी, भुगतान बैंक विवरण और दुकान के स्थान निर्देशांक एकत्र करते हैं।',
    s2: '2. ग्राहक डेटा उपयोग दिशानिर्देश', s2p: 'ऑर्डर टिकट पर दिया गया ग्राहक नाम, पता और फ़ोन केवल पैकिंग और डिस्पैच के लिए है। मर्चेंट इस डेटा को प्लेटफ़ॉर्म के बाहर संग्रहीत, पुनः उपयोग या स्वतंत्र संपर्क के लिए उपयोग नहीं कर सकते।',
    s3: '3. डेटा सुरक्षा और विश्लेषण', s3p: 'दुकान के वित्तीय लेन-देन और बिक्री आँकड़े एंटरप्राइज़-स्तरीय Firebase सुरक्षा से सुरक्षित हैं। बैंक भुगतान जानकारी टोकनाइज़ होकर ऑडिट किए गए वित्तीय भागीदारों से संसाधित होती है।'
  } : {
    subtitle: 'KartKirana Merchant Confidentiality & Privacy Standards', title: 'Protecting Your Business Data',
    intro: 'KartKirana respects merchant privacy and securely handles store data, sales analytics and staff details.',
    s1: '1. Merchant Information We Collect', s1p: 'We collect store verification details, GST registration where applicable, owner contact information, payout bank details and store location coordinates.',
    s2: '2. Customer Data Usage Guidelines', s2p: 'Customer names, delivery addresses and phone numbers shown on order tickets are provided only for packing and dispatch. Merchants must not retain, reuse or independently contact customers outside the platform.',
    s3: '3. Data Security & Analytics', s3p: 'Store transactions and sales metrics are protected using enterprise-grade Firebase security. Payout bank information is tokenized and handled through audited financial partners.'
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
            <Lock className="h-6 w-6 text-emerald-600 dark:text-emerald-400" />
            {t('merchant_privacy_policy')}
          </h1>
          <p className="text-xs font-semibold text-slate-500 dark:text-slate-400">
            {copy.subtitle}
          </p>
        </div>
      </div>

      {/* Intro Banner */}
      <div className="p-5 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-xs font-medium text-emerald-900 dark:text-emerald-200 leading-relaxed flex items-start gap-3.5">
        <ShieldCheck className="h-5 w-5 text-emerald-600 shrink-0 mt-0.5" />
        <div>
          <span className="font-bold block text-sm mb-1">{copy.title}</span>
          {copy.intro}
        </div>
      </div>

      {/* Sections */}
      <div className="space-y-6 text-slate-700 dark:text-slate-300 text-xs leading-relaxed">
        
        <section className="space-y-2 p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm">
          <h2 className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-wider flex items-center gap-2">
            <Database className="h-4.5 w-4.5 text-blue-500" />
            {copy.s1}
          </h2>
          <p>
            {copy.s1p}
          </p>
        </section>

        <section className="space-y-2 p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm">
          <h2 className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-wider flex items-center gap-2">
            <Eye className="h-4.5 w-4.5 text-emerald-500" />
            {copy.s2}
          </h2>
          <p>
            {copy.s2p}
          </p>
        </section>

        <section className="space-y-2 p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm">
          <h2 className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-wider flex items-center gap-2">
            <Server className="h-4.5 w-4.5 text-purple-500" />
            {copy.s3}
          </h2>
          <p>
            {copy.s3p}
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
