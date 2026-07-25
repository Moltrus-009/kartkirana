import React, { createContext, useContext, useState } from 'react';

type Language = 'en' | 'hi';

export const translations = {
  en: {
    // General / Navigation
    home: "Home",
    orders: "Orders",
    cart: "Cart",
    profile: "Profile",
    wishlist: "Wishlist",
    preorders: "Preorders",
    logout: "LOGOUT FROM ACCOUNT",
    
    // Welcome / Splash
    welcome_tagline: "Everything you need, delivered in minutes.",
    continue_phone: "Continue with Phone Number",
    privacy_policy: "By continuing, you agree to our Terms of Service & Privacy Policy.",
    
    // Login
    phone_title: "Enter Mobile Number",
    phone_sub: "We will send a 6-digit OTP to verify your mobile number",
    otp_title: "Verify Mobile Number",
    otp_sub: "Enter the 6-digit verification code sent to your phone",
    verify_code: "Verify Code",
    resend_code: "Resend Code",
    resend_in: "Resend OTP in",
    sending_otp: "Sending OTP...",
    send_otp: "Send OTP Verification",
    
    // Permissions
    location_title: "Enable Location Access",
    location_sub: "We need your precise location to show nearby shops and deliver your packages safely.",
    location_btn: "Allow Location Access",
    location_skip: "Select Manually",
    notif_title: "Enable Push Notifications",
    notif_sub: "Never miss an update about your order status, delivery progress, and exclusive discount coupons.",
    notif_btn: "Enable Notifications",
    notif_skip: "Not Now",
    
    // Home Header & Search
    search_placeholder: "Search groceries, veggies, bakery...",
    select_location: "Select Address",
    detect_gps: "Detect Current Location via GPS",
    saved_addresses: "Saved Addresses",
    add_address_manually: "Add New Address Manually",
    shops_nearby: "Shops Nearby",
    trending_items: "Trending Items",
    closed: "Closed",
    delivered_in: "Delivered in",
    
    // Cart & Checkout
    checkout_summary: "Checkout Summary",
    total_payable: "Total Payable",
    pay_place_order: "Pay & Place Order",
    address_out_range: "Address Out of Range",
    out_of_delivery_range: "Out of Delivery Range",
    max_radius_limit: "Maximum serviceable radius is 15.0 km.",
    suggest_nearest: "Suggest nearest location: please choose or edit your delivery address to select a location closer to",
    
    // Profile
    profile_settings: "Profile Settings",
    manage_account: "Manage Account Details",
    saved_delivery_locations: "Saved Delivery Locations",
    add: "Add",
    edit: "Edit",
    change_language: "Change Language",
    preferred_language: "Preferred Language",
    english: "English",
    hindi: "हिन्दी",
    saved_payment_methods: "Saved Payment Methods",
    my_favorite_items: "My Favorite Items",
    app_notifications: "App Notifications",
    support_helpdesk_faqs: "Support Helpdesk & FAQs",
    terms_of_service: "Terms of Service",
    about_kart_kirana: "About Kart Kirana"
  },
  hi: {
    // General / Navigation
    home: "मुख्य पृष्ठ",
    orders: "ऑर्डर",
    cart: "कार्ट",
    profile: "प्रोफ़ाइल",
    wishlist: "पसंदीदा",
    preorders: "प्रीऑर्डर",
    logout: "अकाउंट से लॉगआउट करें",
    
    // Welcome / Splash
    welcome_tagline: "आपकी ज़रूरत का सब कुछ, मिनटों में डिलीवर।",
    continue_phone: "फ़ोन नंबर के साथ आगे बढ़ें",
    privacy_policy: "आगे बढ़कर, आप हमारी सेवा की शर्तों और गोपनीयता नीति से सहमत होते हैं।",
    
    // Login
    phone_title: "मोबाइल नंबर दर्ज करें",
    phone_sub: "हम आपके मोबाइल नंबर को सत्यापित करने के लिए 6-अंकीय ओटीपी भेजेंगे",
    otp_title: "मोबाइल नंबर सत्यापित करें",
    otp_sub: "आपके फ़ोन पर भेजा गया 6-अंकीय सत्यापन कोड दर्ज करें",
    verify_code: "कोड सत्यापित करें",
    resend_code: "कोड पुनः भेजें",
    resend_in: "ओटीपी पुनः भेजें",
    sending_otp: "ओटीपी भेजा जा रहा है...",
    send_otp: "ओटीपी भेजें",
    
    // Permissions
    location_title: "स्थान अनुमति सक्षम करें",
    location_sub: "हमें आस-पास की दुकानों को दिखाने और आपके पैकेजों को सुरक्षित रूप से वितरित करने के लिए आपके सटीक स्थान की आवश्यकता है।",
    location_btn: "स्थान अनुमति दें",
    location_skip: "मैन्युअल रूप से चुनें",
    notif_title: "पुश सूचनाएं सक्षम करें",
    notif_sub: "अपने ऑर्डर की स्थिति, डिलीवरी प्रगति और विशेष डिस्काउंट कूपन के बारे में कोई अपडेट न चूकें।",
    notif_btn: "सूचनाएं सक्षम करें",
    notif_skip: "अभी नहीं",
    
    // Home Header & Search
    search_placeholder: "किराना, सब्जियां, बेकरी खोजें...",
    select_location: "पता चुनें",
    detect_gps: "जीपीएस के माध्यम से वर्तमान स्थान का पता लगाएं",
    saved_addresses: "सहेजे गए पते",
    add_address_manually: "नया पता मैन्युअल रूप से जोड़ें",
    shops_nearby: "आस-पास की दुकानें",
    trending_items: "ट्रेंडिंग उत्पाद",
    closed: "बंद है",
    delivered_in: "डिलीवरी समय",
    
    // Cart & Checkout
    checkout_summary: "ऑर्डर सारांश",
    total_payable: "कुल देय राशि",
    pay_place_order: "भुगतान करें और ऑर्डर दें",
    address_out_range: "डिलीवरी क्षेत्र से बाहर",
    out_of_delivery_range: "डिलीवरी क्षेत्र से बाहर",
    max_radius_limit: "अधिकतम डिलीवरी दूरी 15.0 किमी है।",
    suggest_nearest: "निकटतम स्थान का सुझाव: कृपया इस दुकान के पास का कोई डिलीवरी पता चुनें या संपादित करें",
    
    // Profile
    profile_settings: "प्रोफ़ाइल सेटिंग्स",
    manage_account: "खाता विवरण प्रबंधित करें",
    saved_delivery_locations: "सहेजे गए डिलीवरी पते",
    add: "जोड़ें",
    edit: "संपादित करें",
    change_language: "भाषा बदलें",
    preferred_language: "पसंदीदा भाषा",
    english: "English",
    hindi: "हिन्दी",
    saved_payment_methods: "सहेजे गए भुगतान विकल्प",
    my_favorite_items: "मेरे पसंदीदा उत्पाद",
    app_notifications: "ऐप नोटिफिकेशन",
    support_helpdesk_faqs: "सहायता डेस्क और एफएक्यू",
    terms_of_service: "सेवा की शर्तें",
    about_kart_kirana: "कार्ट किराना के बारे में"
  }
};

interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: (key: keyof typeof translations['en']) => string;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export const LanguageProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [language, setLanguageState] = useState<Language>(() => {
    const saved = localStorage.getItem('shop_app_preferred_language');
    return (saved === 'hi' ? 'hi' : 'en') as Language;
  });

  const setLanguage = (lang: Language) => {
    setLanguageState(lang);
    localStorage.setItem('shop_app_preferred_language', lang);
  };

  const t = (key: keyof typeof translations['en']) => {
    return translations[language][key] || translations['en'][key] || String(key);
  };

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  );
};

export const useLanguage = () => {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
};
