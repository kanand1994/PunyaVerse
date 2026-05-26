import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import LanguageDetector from "i18next-browser-languagedetector";

const resources = {
  en: {
    translation: {
      nav: {
        temples: "Temples",
        packages: "Packages",
        ai_planner: "AI Planner",
        trip_builder: "Build Trip",
        trekking: "Trekking",
        transport: "Compare Transport",
        festivals: "Festivals",
        vip_darshan: "VIP Darshan",
        login: "Login",
        begin: "Begin Yatra",
        dashboard: "Dashboard",
        my_bookings: "My Bookings",
        wishlist: "Wishlist",
        notifications: "Notifications",
        logout: "Logout",
      },
      hero: {
        kicker: "Bharat · Nepal · Kailash Mansarovar",
        title_a: "Connecting every sacred path,",
        title_b: "walked with intelligence.",
        subtitle: "AI-crafted pilgrimages, helicopter darshan, Char Dham, Kailash Parikrama and every Jyotirlinga — booked end-to-end with white-glove care.",
        plan_ai: "Plan with AI",
        explore: "Explore Packages",
      },
      common: {
        days: "days",
        per_person: "/ person",
        book_now: "Book Now",
        save: "Save",
        saved: "Saved",
        from: "From",
        try_again: "Try again",
        loading: "Loading…",
        all_regions: "All Regions",
        login_required: "Please login to continue",
        sample_fares: "Sample fares for illustration. Live train/flight integration coming soon.",
        pay_stripe: "Pay with Card (Stripe)",
        pay_razorpay: "Pay with UPI / Card (Razorpay)",
        select_gateway: "Choose payment method",
      },
      vip: {
        title: "VIP Darshan Slots",
        subtitle: "Skip-the-queue darshan at India's most revered shrines. Slots refresh daily.",
        select_temple: "Select temple",
        select_date: "Date",
        capacity_left: "{{n}} of {{total}} left",
        book_slot: "Book Slot",
        my_slots: "My VIP Bookings",
      },
    },
  },
  hi: {
    translation: {
      nav: {
        temples: "मंदिर",
        packages: "पैकेज",
        ai_planner: "एआई योजनाकार",
        trip_builder: "यात्रा बनाएँ",
        trekking: "ट्रेकिंग",
        transport: "यातायात तुलना",
        festivals: "उत्सव",
        vip_darshan: "वीआईपी दर्शन",
        login: "लॉगिन",
        begin: "यात्रा प्रारंभ",
        dashboard: "डैशबोर्ड",
        my_bookings: "मेरी बुकिंग",
        wishlist: "विशलिस्ट",
        notifications: "सूचनाएँ",
        logout: "लॉगआउट",
      },
      hero: {
        kicker: "भारत · नेपाल · कैलाश मानसरोवर",
        title_a: "हर पवित्र मार्ग को जोड़ता",
        title_b: "बुद्धिमत्ता से चलने वाला।",
        subtitle: "एआई द्वारा निर्मित तीर्थयात्राएँ, हेलीकॉप्टर दर्शन, चार धाम, कैलाश परिक्रमा और हर ज्योतिर्लिंग — पूर्ण देखभाल के साथ बुक करें।",
        plan_ai: "एआई से योजना",
        explore: "पैकेज देखें",
      },
      common: {
        days: "दिन",
        per_person: "/ प्रति यात्री",
        book_now: "अभी बुक करें",
        save: "सहेजें",
        saved: "सहेजा गया",
        from: "से",
        try_again: "पुनः प्रयास करें",
        loading: "लोड हो रहा है…",
        all_regions: "सभी क्षेत्र",
        login_required: "जारी रखने के लिए कृपया लॉगिन करें",
        sample_fares: "केवल उदाहरण किराया। शीघ्र ही लाइव रेल/फ़्लाइट जुड़ेगी।",
        pay_stripe: "कार्ड से भुगतान (Stripe)",
        pay_razorpay: "UPI / कार्ड से (Razorpay)",
        select_gateway: "भुगतान विधि चुनें",
      },
      vip: {
        title: "वीआईपी दर्शन स्लॉट",
        subtitle: "भारत के सबसे पूजनीय मंदिरों में बिना कतार के दर्शन। स्लॉट प्रतिदिन ताज़ा होते हैं।",
        select_temple: "मंदिर चुनें",
        select_date: "तारीख़",
        capacity_left: "{{n}} / {{total}} शेष",
        book_slot: "स्लॉट बुक करें",
        my_slots: "मेरी वीआईपी बुकिंग",
      },
    },
  },
};

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources,
    fallbackLng: "en",
    interpolation: { escapeValue: false },
    detection: {
      order: ["localStorage", "navigator"],
      lookupLocalStorage: "pv_lang",
      caches: ["localStorage"],
    },
  });

export default i18n;
