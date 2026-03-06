import { createContext, useContext } from 'react';

export type Language = 'en' | 'he';

export interface I18nContextType {
  lang: Language;
  setLang: (lang: Language) => void;
  t: (key: string) => string;
  dir: 'ltr' | 'rtl';
}

export const translations: Record<string, Record<Language, string>> = {
  // Navigation
  'nav.home': { en: 'Home', he: 'בית' },
  'nav.dashboard': { en: 'Dashboard', he: 'לוח בקרה' },
  'nav.pricing': { en: 'Pricing', he: 'מחירים' },
  'nav.client': { en: 'My Recovery', he: 'ההחלמה שלי' },
  'nav.login': { en: 'Log In', he: 'התחברות' },
  'nav.signup': { en: 'Start Free Trial', he: 'התחילי תקופת ניסיון' },

  // Landing
  'landing.hero.title': { en: 'The New Standard in PMU Client Care', he: 'הסטנדרט החדש בליווי לקוחות PMU' },
  'landing.hero.subtitle': { en: 'A personalized recovery app in your branding that saves you hours of WhatsApp replies and ensures your client a perfect healing.', he: 'אפליקציית ליווי אישית במיתוג שלך, שחוסכת לך שעות של מענה בוואטסאפ ומבטיחה ללקוחה החלמה מושלמת.' },
  'landing.hero.cta': { en: 'Start 30-Day Free Trial', he: 'התחילי 30 יום ניסיון חינם' },
  'landing.features.title': { en: 'Everything Your Studio Needs', he: 'כל מה שהסטודיו שלך צריך' },
  'landing.features.timeline': { en: '30-Day Recovery Timeline', he: 'ציר זמן החלמה של 30 יום' },
  'landing.features.timeline.desc': { en: 'Automated daily care instructions sent directly to your clients', he: 'הוראות טיפול יומיות אוטומטיות הנשלחות ישירות ללקוחות' },
  'landing.features.notifications': { en: 'Smart Notifications', he: 'התראות חכמות' },
  'landing.features.notifications.desc': { en: 'Push notifications keep clients engaged throughout their healing journey', he: 'התראות פוש שומרות על מעורבות הלקוחות לאורך מסע ההחלמה' },
  'landing.features.branding': { en: 'Your Brand, Your Way', he: 'המותג שלך, בדרך שלך' },
  'landing.features.branding.desc': { en: 'Custom logo, colors, and store links for a fully branded experience', he: 'לוגו, צבעים וקישורי חנות מותאמים לחוויה ממותגת לחלוטין' },
  'landing.features.bilingual': { en: 'Bilingual Support', he: 'תמיכה דו-לשונית' },
  'landing.features.bilingual.desc': { en: 'Seamless Hebrew and English support with RTL layout', he: 'תמיכה חלקה בעברית ובאנגלית עם פריסה מימין לשמאל' },

  // Client
  'client.greeting': { en: 'Welcome back, Beautiful', he: 'ברוכה השבה, יפהפייה' },
  'client.day': { en: 'Day', he: 'יום' },
  'client.of': { en: 'of', he: 'מתוך' },
  'client.healing': { en: 'Healing Progress', he: 'התקדמות ריפוי' },
  'client.today': { en: "Today's Care", he: 'הטיפול של היום' },
  'client.shop': { en: 'Recommended Products', he: 'מוצרים מומלצים' },
  'client.shop.subtitle': { en: 'Curated by your artist', he: 'נבחרו על ידי האמנית שלך' },

  // Artist Dashboard
  'artist.welcome': { en: 'Welcome back', he: 'ברוכה השבה' },
  'artist.clients': { en: 'Active Clients', he: 'לקוחות פעילים' },
  'artist.treatments': { en: 'Treatments This Month', he: 'טיפולים החודש' },
  'artist.revenue': { en: 'Monthly Revenue', he: 'הכנסה חודשית' },
  'artist.features': { en: 'Feature Marketplace', he: 'חנות תכונות' },
  'artist.settings': { en: 'Studio Settings', he: 'הגדרות' },
  'artist.medical': { en: 'Medical Declaration', he: 'הצהרה רפואית' },
  'artist.medical.desc': { en: 'Show medical form before treatment', he: 'הצג טופס רפואי לפני טיפול' },
  'nav.signout': { en: 'Sign Out', he: 'התנתקות' },

  // Pricing
  'pricing.title': { en: 'Choose Your Plan', he: 'בחרי את התוכנית שלך' },
  'pricing.subtitle': { en: 'Start with a 30-day free trial. No credit card required.', he: 'התחילי עם 30 יום ניסיון חינם. ללא כרטיס אשראי.' },
  'pricing.basic': { en: 'Basic', he: 'בסיסי' },
  'pricing.custom': { en: 'Custom', he: 'מותאם' },
  'pricing.empire': { en: 'Empire', he: 'אימפריה' },
  'pricing.popular': { en: 'Most Popular', he: 'הכי פופולרי' },
  'pricing.cta': { en: 'Start Free Trial', he: 'התחילי ניסיון חינם' },
  'pricing.month': { en: '/month', he: '/חודש' },

  // General
  'general.learnMore': { en: 'Learn More', he: 'למדי עוד' },
  'general.getStarted': { en: 'Get Started', he: 'התחילי עכשיו' },

  // FAQ
  'faq.title': { en: 'Frequently Asked Questions', he: 'שאלות ותשובות' },
  'faq.subtitle': { en: 'Find answers to the most common questions', he: 'מצאי תשובות לשאלות הנפוצות ביותר' },
  'faq.search': { en: 'Search questions...', he: 'חיפוש שאלה...' },
  'faq.noResults': { en: 'No results found for', he: 'לא נמצאו תוצאות עבור' },
  'faq.cat.client_app': { en: 'Client App', he: 'אפליקציית הלקוחות' },
  'faq.cat.general': { en: 'General Usage', he: 'שימוש שוטף' },
  'faq.cat.photos': { en: 'Photos & Collage', he: "תמונות וקולאז'" },

  // Payment History
  'payment.title': { en: 'Payment History & Receipts', he: 'היסטוריית תשלומים וקבלות' },
  'payment.header': { en: 'Payment History', he: 'היסטוריית תשלומים' },
  'payment.paid': { en: 'Paid', he: 'שולם' },
  'payment.viewInvoice': { en: 'View & Download Invoice', he: 'צפייה והורדת חשבונית' },

  // Subscription status
  'sub.greeting': { en: 'Hey {name}, glad to have you! ✨', he: 'היי {name}, איזה כיף שאת איתנו! ✨' },
  'sub.currentPlan': { en: 'Current Plan: {plan}', he: 'חבילה נוכחית: {plan}' },
  'sub.validUntil': { en: 'Valid until: —', he: 'בתוקף עד לתאריך: —' },
  'sub.paymentHistory': { en: 'Payment History & Receipts', he: 'היסטוריית תשלומים וקבלות' },
};

export function translate(key: string, lang: Language): string {
  return translations[key]?.[lang] || key;
}

export const I18nContext = createContext<I18nContextType>({
  lang: 'en',
  setLang: () => {},
  t: (key: string) => key,
  dir: 'ltr',
});

export const useI18n = () => useContext(I18nContext);
