import React, { createContext, useContext, useState } from 'react';

type Language = 'en' | 'hi';

export const translations = {
  en: {
    home: "Home",
    orders: "Orders",
    products: "Products",
    customers: "Customers",
    profile: "Profile",
    active_partner: "Active Partner",
    logout: "Log Out",
    change_language: "Change Language",
    english: "English",
    hindi: "हिन्दी",
    greeting_morning: "Good morning",
    greeting_afternoon: "Good afternoon",
    greeting_evening: "Good evening",
    cat_fruits_vegetables: "Fruits & Vegetables",
    cat_bakery_bread: "Bakery & Bread",
    cat_dairy_eggs: "Dairy & Eggs",
    cat_beverages: "Beverages",
    cat_snacks_munchies: "Snacks & Munchies",
    cat_staples_atta: "Staples & Atta",
    cat_household_items: "Household Items",
    cat_personal_care: "Personal Care",
    today_sales: "Today's Sales",
    active_orders: "Active Orders",
    low_stock_alerts: "Low Stock Alerts",
    out_of_stock: "Out of Stock",
    store_status: "Store Status",
    open: "Open",
    closed: "Closed",
    placed: "Placed",
    shop_accepted: "Accepted",
    rider_assigned: "Rider Assigned",
    delivered: "Delivered",
    cancelled: "Cancelled",
    tab_new: "New",
    tab_preparing: "Preparing",
    tab_ready: "Ready",
    tab_completed: "Past",
    dispatch_order: "Dispatch Order",
    route_compat: "Locality Compatibility",
    recent_orders: "Recent Orders",
    sales_trend: "Sales Trend (Last 7 Days)",
    no_recent_orders: "No recent orders",
    all_items: "All Items",
    my_items: "My Items",
    add_product: "Add Product",
    search_items: "Search items...",
    edit_product: "Edit Product",
    edit: "Edit",
    save_changes: "Save Changes",
    cancel: "Cancel",
    name: "Product Name",
    category: "Category",
    price: "Sale Price (₹)",
    mrp: "MRP (₹)",
    stock: "Stock Level",
    description: "Description",
    image: "Image URL",
    upload: "Upload",
    delete: "Delete",
    order_id: "Order ID",
    items: "Items",
    delivery_address: "Delivery Address",
    instructions: "Instructions",
    accept: "Accept",
    reject: "Reject",
    mark_ready: "Mark Ready",
    no_orders: "No orders in this section",
    order_details: "Order Details",
    store_timings: "Store Timings",
    store_details: "Store Details",
    phone: "Phone",
    email: "Email",
    address: "Address",
    save_store_details: "Save Store Details",
    saving: "Saving...",
    total_spent: "Total Spent",
    customer_since: "Customer Since",
    no_customers: "No customers found.",
    loading_sessions: "Loading session credentials...",
    store_review_pending: "Store Review Pending",
    review_pending_message: "Your merchant profile is currently awaiting platform verification. You can configure your store catalogs, timings, and custom settings, but customer order placements will remain restricted until approval."
  },
  hi: {
    home: "मुख्य पृष्ठ",
    orders: "ऑर्डर सूची",
    products: "मेरे उत्पाद",
    customers: "ग्राहक",
    profile: "प्रोफ़ाइल",
    active_partner: "सक्रिय पार्टनर",
    logout: "लॉगआउट",
    change_language: "भाषा बदलें",
    english: "English",
    hindi: "हिन्दी",
    greeting_morning: "सुप्रभात",
    greeting_afternoon: "नमस्कार",
    greeting_evening: "शुभ संध्या",
    cat_fruits_vegetables: "फल और सब्जियां",
    cat_bakery_bread: "बेकरी और ब्रेड",
    cat_dairy_eggs: "डेयरी और अंडे",
    cat_beverages: "पेय पदार्थ",
    cat_snacks_munchies: "स्नैक्स और नमकीन",
    cat_staples_atta: "दालें और आटा",
    cat_household_items: "घरेलू सामान",
    cat_personal_care: "व्यक्तिगत देखभाल",
    today_sales: "आज की बिक्री",
    active_orders: "सक्रिय ऑर्डर",
    low_stock_alerts: "कम स्टॉक चेतावनी",
    out_of_stock: "स्टॉक समाप्त",
    store_status: "दुकान की स्थिति",
    open: "खुली है",
    closed: "बंद है",
    placed: "ऑर्डर प्राप्त",
    shop_accepted: "स्वीकार किया गया",
    rider_assigned: "राइडर असाइन किया गया",
    delivered: "वितरित",
    cancelled: "रद्द",
    tab_new: "नया",
    tab_preparing: "तैयारी",
    tab_ready: "तैयार",
    tab_completed: "पुराने",
    dispatch_order: "ऑर्डर भेजें",
    route_compat: "इलाका अनुकूलता",
    recent_orders: "हाल के ऑर्डर",
    sales_trend: "बिक्री का रुझान (पिछले 7 दिन)",
    no_recent_orders: "कोई हाल का ऑर्डर नहीं",
    all_items: "सभी उत्पाद",
    my_items: "मेरे उत्पाद",
    add_product: "नया उत्पाद जोड़ें",
    search_items: "उत्पाद खोजें...",
    edit_product: "उत्पाद संपादित करें",
    edit: "संपादित करें",
    save_changes: "बदलाव सहेजें",
    cancel: "रद्द करें",
    name: "उत्पाद का नाम",
    category: "श्रेणी",
    price: "बिक्री मूल्य (₹)",
    mrp: "एमआरपी (₹)",
    stock: "स्टॉक स्तर",
    description: "विवरण",
    image: "छवि यूआरएल",
    upload: "अपलोड",
    delete: "हटाएं",
    order_id: "ऑर्डर आईडी",
    items: "उत्पाद",
    delivery_address: "डिलीवरी का पता",
    instructions: "निर्देश",
    accept: "स्वीकार करें",
    reject: "अस्वीकार करें",
    mark_ready: "तैयार चिह्नित करें",
    no_orders: "इस खंड में कोई ऑर्डर नहीं है",
    order_details: "ऑर्डर विवरण",
    store_timings: "दुकान का समय",
    store_details: "दुकान का विवरण",
    phone: "फ़ोन",
    email: "ईमेल",
    address: "पता",
    save_store_details: "विवरण सहेजें",
    saving: "सहेजा जा रहा है...",
    total_spent: "कुल खर्च",
    customer_since: "ग्राहक तिथि",
    no_customers: "कोई ग्राहक नहीं मिला।",
    loading_sessions: "सत्र क्रेडेंशियल लोड हो रहे हैं...",
    store_review_pending: "स्टोर समीक्षा लंबित",
    review_pending_message: "आपका मर्चेंट प्रोफ़ाइल वर्तमान में प्लेटफ़ॉर्म सत्यापन की प्रतीक्षा कर रहा है। आप अपने स्टोर कैटलॉग, समय और कस्टम सेटिंग्स को कॉन्फ़िगर कर सकते हैं, लेकिन स्वीकृति मिलने तक ग्राहकों के ऑर्डर प्लेसमेंट प्रतिबंधित रहेंगे।"
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
