import React, { useState, useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import { MessageSquare, Send, X, Bot, User, HelpCircle } from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';
import { useCart } from '../context/CartContext';

interface ChatMessage {
  sender: 'user' | 'bot';
  text: string;
  timestamp: Date;
}

export const SupportBot: React.FC = () => {
  const { language } = useLanguage();
  const { cartItems } = useCart();
  const location = useLocation();
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputVal, setInputVal] = useState('');
  const messagesEndRef = useRef<HTMLDivElement | null>(null);

  // Initialize with welcome message when opened
  useEffect(() => {
    if (isOpen && messages.length === 0) {
      const welcomeText = language === 'hi'
        ? 'नमस्ते! मैं आपका कार्टकिराना (KartKirana) सहायक हूँ। 🙏 मैं आपकी क्या मदद कर सकता हूँ? मुझसे डिलीवरी समय, प्रीऑर्डर, रिफंड, या भुगतान के बारे में पूछें!'
        : 'Hello! I am your KartKirana Assistant. 🛒 How can I help you today? Ask me about delivery speed, preorder bookings, free delivery, refunds, or payment modes!';
      
      setMessages([
        {
          sender: 'bot',
          text: welcomeText,
          timestamp: new Date()
        }
      ]);
    }
  }, [isOpen, language, messages.length]);

  // Scroll to bottom of chat
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const trainAndGetResponse = (text: string): string => {
    const q = text.toLowerCase().trim();
    const isHindi = language === 'hi' || /[\u0900-\u097F]/.test(q) || q.includes('namaste') || q.includes('help') || q.includes('maddad') || q.includes('naste');

    // Preorders
    if (q.includes('preorder') || q.includes('pre-order') || q.includes('schedule') || q.includes('प्रीऑर्डर') || q.includes('बुक') || q.includes('शेड्यूल')) {
      return isHindi
        ? '📅 **प्रीऑर्डर (Preorder)**:\nआप 7 दिन पहले तक अपनी डिलीवरी शेड्यूल कर सकते हैं। डिलीवरी स्लॉट शुरू होने से 12 घंटे पहले तक प्रीऑर्डर को कभी भी बदला या रद्द किया जा सकता है।'
        : '📅 **Preorder Bookings**:\nYou can schedule your grocery deliveries up to 7 days in advance. Preorders can be modified or cancelled up to 12 hours before the delivery slot begins.';
    }

    // Delivery charges & Free delivery
    if (q.includes('charge') || q.includes('delivery fee') || q.includes('free') || q.includes('शुल्क') || q.includes('पैसे') || q.includes('मुफ्त') || q.includes('डिलीवरी चार्ज')) {
      return isHindi
        ? '🚚 **डिलीवरी शुल्क**:\n₹199 से अधिक के सभी ऑर्डर्स पर डिलीवरी बिल्कुल **मुफ्त (FREE)** है! ₹199 से कम के ऑर्डर्स पर ₹29 का छोटा डिलीवरी शुल्क लगता है।'
        : '🚚 **Delivery Charges**:\nDelivery is completely **FREE** for all orders above ₹199! For orders below ₹199, a flat delivery charge of ₹29 applies.';
    }

    // Delivery speeds
    if (q.includes('time') || q.includes('fast') || q.includes('speed') || q.includes('mins') || q.includes('समय') || q.includes('कितनी देर') || q.includes('कब')) {
      return isHindi
        ? '⏱️ **डिलीवरी का समय**:\nत्वरित ऑर्डर आमतौर पर **15-20 मिनट** में आपके दरवाजे पर पहुंच जाते हैं। यदि आपने प्रीऑर्डर किया है, तो सामान आपके चुने हुए स्लॉट के भीतर ही डिलीवर होगा।'
        : '⏱️ **Delivery Speed**:\nInstant orders reach your doorstep in **15-20 minutes**! For preorders, items are delivered strictly within your selected calendar time slot.';
    }

    // Payment methods
    if (q.includes('payment') || q.includes('pay') || q.includes('cod') || q.includes('upi') || q.includes('card') || q.includes('पेमेंट') || q.includes('पैसे कैसे')) {
      return isHindi
        ? '💳 **भुगतान विकल्प**:\nहम UPI (GPay, PhonePe, Paytm), क्रेडिट/डेबिट कार्ड, नेट बैंकिंग, कार्टकिराना वॉलेट और डिलीवरी पर नकद (Cash on Delivery) स्वीकार करते हैं।'
        : '💳 **Payment Options**:\nWe support UPI (GPay, PhonePe, Paytm), Credit/Debit Cards, Net Banking, KartKirana Wallet, and Cash on Delivery (COD).';
    }

    // Support hotline
    if (q.includes('support') || q.includes('contact') || q.includes('call') || q.includes('number') || q.includes('help') || q.includes('मदद') || q.includes('नंबर') || q.includes('कस्टमर')) {
      return isHindi
        ? '📞 **कस्टमर केयर**:\nआप हमारे टोल-फ्री कस्टमर केयर हेल्पलाइन **1800-419-3221** पर 24/7 कभी भी कॉल कर सकते हैं, या सीधे चैट डेस्क से जुड़ सकते हैं।'
        : '📞 **Customer Support**:\nYou can reach our 24/7 toll-free Helpline at **1800-419-3221** or request an instant callback through the profile settings.';
    }

    // Refund policy
    if (q.includes('refund') || q.includes('cancel') || q.includes('return') || q.includes('रिफंड') || q.includes('कैंसिल') || q.includes('पैसे वापस')) {
      return isHindi
        ? '💰 **रिफंड और रद्दीकरण**:\nरद्द किए गए प्रीऑर्डर्स या छूटे हुए सामान का रिफंड तुरंत आपके कार्टकिराना वॉलेट में या 3-5 दिनों में आपके बैंक खाते में वापस भेज दिया जाता है।'
        : '💰 **Refunds & Cancellations**:\nCancelled preorders or refunds for missing items are credited instantly to your KartKirana Wallet, or returned to your original payment method in 3-5 business days.';
    }

    // Delivery zone
    if (q.includes('zone') || q.includes('radius') || q.includes('km') || q.includes('range') || q.includes('दूरी') || q.includes('किलोमीटर')) {
      return isHindi
        ? '📍 **डिलीवरी रेंज**:\nहम दुकानों से 15 किमी की दूरी तक डिलीवरी प्रदान करते हैं। यदि आप "आउट ऑफ़ रेंज" देखते हैं, तो कृपया डिलीवरी पता पास की लोकेशन पर बदलें।'
        : '📍 **Delivery Zone**:\nWe deliver within a 15 km radius from each merchant shop. If you receive an "Out of Range" warning, please update your delivery address to a closer location.';
    }

    // Greet responses
    if (q.includes('hello') || q.includes('hi') || q.includes('hey') || q.includes('namaste') || q.includes('राम राम') || q.includes('नमस्ते')) {
      return isHindi
        ? 'नमस्ते! मैं आपका सहायक हूँ। आप मुझसे डिलीवरी, प्रीऑर्डर, रिफंड या पेमेंट्स के बारे में कुछ भी पूछ सकते हैं!'
        : 'Hello! I am your virtual helper. Feel free to ask me anything about deliveries, preorder scheduling, refunds, or payment modes!';
    }

    // Fallback template
    return isHindi
      ? '🤔 मुझे इसके बारे में जानकारी नहीं है। क्या आप इनमें से कुछ पूछना चाहते हैं?\n1. **प्रीऑर्डर** (लिखें: preorder)\n2. **डिलीवरी चार्ज** (लिखें: charge)\n3. **डिलीवरी का समय** (लिखें: time)\n4. **कस्टमर केयर नंबर** (लिखें: support)\n5. **रिफंड नीति** (लिखें: refund)'
      : '🤔 I didn\'t quite catch that. Would you like to ask about:\n1. **Preorders** (type: preorder)\n2. **Delivery Charges** (type: charge)\n3. **Delivery Times** (type: time)\n4. **Customer Care** (type: support)\n5. **Refund Policy** (type: refund)';
  };

  const handleSendMsg = () => {
    if (!inputVal.trim()) return;

    const userMessage: ChatMessage = {
      sender: 'user',
      text: inputVal.trim(),
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    setInputVal('');

    // Generate bot reply after a small human-like delay
    setTimeout(() => {
      const botText = trainAndGetResponse(userMessage.text);
      const botMessage: ChatMessage = {
        sender: 'bot',
        text: botText,
        timestamp: new Date()
      };
      setMessages(prev => [...prev, botMessage]);
    }, 500);
  };

  const presetQueries = language === 'hi' 
    ? [
        { label: '📅 प्रीऑर्डर समय?', q: 'preorder' },
        { label: '🚚 डिलीवरी शुल्क?', q: 'charge' },
        { label: '💰 रिफंड कैसे मिलेगा?', q: 'refund' },
        { label: '📞 कस्टमर नंबर?', q: 'support' }
      ]
    : [
        { label: '📅 Preorder Slots?', q: 'preorder' },
        { label: '🚚 Free Delivery?', q: 'charge' },
        { label: '💰 Refund Policy?', q: 'refund' },
        { label: '📞 Call Support?', q: 'support' }
      ];

  const cartCount = cartItems.reduce((acc, item) => acc + item.quantity, 0);
  const showFloatingCart = cartCount > 0 && !['/cart', '/checkout', '/splash', '/onboarding', '/login'].includes(location.pathname);

  return (
    <>
      {/* Floating Action Chat Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`fixed right-4 z-40 h-13 w-13 rounded-full bg-gradient-to-br from-[#1E88E5] to-[#1565C0] text-white flex items-center justify-center shadow-xl hover:scale-105 active:scale-95 transition-all duration-300 cursor-pointer border border-[#E2E8F0]/20
          ${showFloatingCart ? 'bottom-[158px]' : 'bottom-24'}`}
      >
        <MessageSquare className="h-6 w-6" />
      </button>

      {/* Slide up chat drawer */}
      {isOpen && (
        <div className={`fixed inset-x-4 md:left-auto md:right-4 md:w-96 bg-white dark:bg-[#1E293B] border border-[#E2E8F0] dark:border-[#334155] rounded-[24px] shadow-2xl z-45 flex flex-col max-h-[450px] overflow-hidden animate-fade-in text-left transition-all duration-300
          ${showFloatingCart ? 'bottom-[222px]' : 'bottom-28'}`}>
          
          {/* Header */}
          <div className="p-4 bg-gradient-to-br from-[#1E88E5] to-[#1565C0] text-white flex items-center justify-between border-b border-[#E2E8F0]/10">
            <div className="flex items-center gap-2">
              <Bot className="h-5 w-5" />
              <div>
                <span className="text-xs font-black block tracking-wider uppercase">KartKirana Bot</span>
                <span className="text-[9px] font-semibold text-blue-100 block mt-0.5">Online Helper (EN/HI)</span>
              </div>
            </div>
            <button
              onClick={() => setIsOpen(false)}
              className="p-1.5 rounded-lg bg-white/10 hover:bg-white/20 transition-colors text-white cursor-pointer"
            >
              <X className="h-4.5 w-4.5" />
            </button>
          </div>

          {/* Messages Stream */}
          <div className="flex-1 p-4 overflow-y-auto flex flex-col gap-3.5 bg-[#F8FAFC]/30 dark:bg-[#0F172A]/20">
            {messages.map((m, idx) => (
              <div
                key={idx}
                className={`flex gap-2 max-w-[85%] ${m.sender === 'user' ? 'ml-auto flex-row-reverse' : 'mr-auto'}`}
              >
                {/* Avatar icon */}
                <div className={`h-6 w-6 rounded-full shrink-0 flex items-center justify-center border text-[10px]
                  ${m.sender === 'user' 
                    ? 'bg-[#E2E8F0] dark:bg-[#334155] border-[#90CAF9]/20 text-[#1565C0]' 
                    : 'bg-gradient-to-br from-[#1E88E5] to-[#1565C0] border-none text-white'
                  }`}
                >
                  {m.sender === 'user' ? <User className="h-3.5 w-3.5" /> : <Bot className="h-3.5 w-3.5" />}
                </div>

                <div
                  className={`p-3 rounded-2xl text-xs font-semibold leading-relaxed shadow-sm whitespace-pre-line
                    ${m.sender === 'user'
                      ? 'bg-[#1565C0] text-white rounded-tr-none'
                      : 'bg-white dark:bg-[#1E293B] text-gray-800 dark:text-gray-150 border border-[#E2E8F0] dark:border-[#334155]/50 rounded-tl-none'
                    }`}
                >
                  {m.text}
                </div>
              </div>
            ))}
            <div ref={messagesEndRef} />
          </div>

          {/* Preset Helper Quick Queries */}
          <div className="px-4 py-2 border-t border-gray-50 dark:border-[#334155]/40 flex gap-2 overflow-x-auto whitespace-nowrap scrollbar-none bg-white dark:bg-[#1E293B]">
            {presetQueries.map(p => (
              <button
                key={p.q}
                onClick={() => { setInputVal(p.q); setInputVal(p.q); }}
                className="px-3 py-1.5 border border-[#90CAF9]/30 rounded-full text-[10px] font-black text-[#1565C0] dark:text-[#1E88E5] hover:bg-[#E2E8F0]/50 transition-colors cursor-pointer bg-white dark:bg-[#1E293B]"
              >
                {p.label}
              </button>
            ))}
          </div>

          {/* Send Input Panel */}
          <div className="p-3 border-t border-[#E2E8F0] dark:border-[#334155] flex gap-2 items-center bg-white dark:bg-[#1E293B]">
            <input
              type="text"
              placeholder={language === 'hi' ? 'यहाँ संदेश लिखें...' : 'Type message here...'}
              value={inputVal}
              onChange={(e) => setInputVal(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSendMsg()}
              className="flex-1 px-4 py-2.5 rounded-xl border border-[#E2E8F0] dark:border-[#334155] bg-[#F8FAFC] dark:bg-[#1E293B] text-xs font-bold text-gray-800 dark:text-white outline-none focus:border-[#1E88E5]"
            />
            <button
              onClick={handleSendMsg}
              className="p-2.5 rounded-xl bg-gradient-to-br from-[#1E88E5] to-[#1565C0] text-white hover:scale-105 active:scale-95 transition-all cursor-pointer shadow-md"
            >
              <Send className="h-4 w-4" />
            </button>
          </div>

        </div>
      )}
    </>
  );
};
