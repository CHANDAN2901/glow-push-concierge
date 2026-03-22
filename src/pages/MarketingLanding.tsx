import { useNavigate } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { supabase } from '@/integrations/supabase/client';
import { useI18n } from '@/lib/i18n';
import { Sparkles, Users, Shield, BookOpen, Wand2, Check, ChevronDown } from 'lucide-react';

import heroLogo from '@/assets/glowpush-hero-logo.png';
import heroPmuLuxury from '@/assets/hero-pmu-luxury.jpg';
import equipmentHero from '@/assets/equipment-hero.jpg';
import eyebrowHero from '@/assets/eyebrow-hero.png';

interface FaqItem {
  id: string;
  question_he: string;
  answer_he: string;
  question_en: string;
  answer_en: string;
  category: string;
}

type FaqCategory = 'אפליקציית הלקוחות' | 'שימוש שוטף' | 'תמונות וקולאז\'';

const CATEGORIES: { value: FaqCategory; he: string; en: string }[] = [
  { value: 'אפליקציית הלקוחות', he: 'אפליקציית הלקוחות', en: 'Client App' },
  { value: 'שימוש שוטף', he: 'שימוש שוטף', en: 'General Usage' },
  { value: 'תמונות וקולאז\'', he: 'תמונות וקולאז\'', en: 'Photos & Collage' },
];

const GOLD = 'linear-gradient(135deg, #735c00 0%, #d4af37 100%)';
const GOLD_SOFT = 'linear-gradient(135deg, #B8860B 0%, #D4AF37 40%, #F9F295 60%, #D4AF37 80%, #B8860B 100%)';

const MarketingLanding = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { lang, setLang } = useI18n();
  const isHe = lang === 'he';
  const dir = isHe ? 'rtl' : 'ltr';
  const [faqs, setFaqs] = useState<FaqItem[]>([]);
  const [activeTab, setActiveTab] = useState<FaqCategory | null>(null);
  const filteredFaqs = activeTab ? faqs.filter((faq) => faq.category === activeTab) : [];
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    supabase
      .from('faqs')
      .select('id, question_he, answer_he, question_en, answer_en, category')
      .eq('is_active', true)
      .order('sort_order', { ascending: true })
      .then(({ data }) => {
        if (data) setFaqs(data as FaqItem[]);
      });
  }, []);

  const scrollTo = (id: string) => {
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' });
    setMobileMenuOpen(false);
  };

  const navLinks = isHe
    ? [{ label: 'יתרונות', id: 'features' }, { label: 'מחירים', id: 'pricing' }, { label: 'שאלות נפוצות', id: 'faq' }]
    : [{ label: 'Features', id: 'features' }, { label: 'Pricing', id: 'pricing' }, { label: 'FAQ', id: 'faq' }];

  const plans = [
    {
      slug: 'pro',
      name: isHe ? 'פרו – בסיסי' : 'Pro – Basic',
      price: isHe ? 'חינם' : 'Free',
      priceSub: '',
      popular: false,
      features: isHe
        ? ['ניהול לקוחות', 'יומן חכם', 'הודעות אוטומטיות', 'ליווי החלמה']
        : ['Client Management', 'Smart Calendar', 'Auto-Messages', 'Aftercare Journey'],
    },
    {
      slug: 'elite',
      name: isHe ? 'אליט – מקצועי' : 'Elite – Professional',
      price: '₪79',
      priceSub: isHe ? '/חודש' : '/mo',
      popular: true,
      features: isHe
        ? ['הכל בפרו +', 'הצהרת בריאות', 'כלי AI קסומים', 'גלריה ופורטפוליו', 'כרטיס דיגיטלי', 'תיעוד קולי']
        : ['Everything in Pro +', 'Health Declaration', 'AI Magic Tools', 'Gallery & Portfolio', 'Digital Business Card', 'Voice Treatment Notes'],
    },
    {
      slug: 'vip',
      name: isHe ? 'VIP – מייסדים' : 'VIP – Founders',
      price: '₪149',
      priceSub: isHe ? '/חודש' : '/mo',
      popular: false,
      features: isHe
        ? ['הכל באליט +', 'אוטומציה לוואטסאפ', 'White Label', 'ייצוא CSV', 'מנוע צמיחה', 'מערכת הפניות']
        : ['Everything in Elite +', 'WhatsApp Automation', 'White Label', 'CSV Export', 'Growth Engine', 'Referral System'],
    },
  ];

  return (
    <div
      dir={dir}
      className="min-h-screen scroll-smooth"
      style={{ background: '#fcf9f8', color: '#1c1b1b', fontFamily: "'Manrope', sans-serif" }}
    >
      {/* ── NAVIGATION ── */}
      <nav
        className="fixed top-0 w-full z-50 backdrop-blur-xl"
        style={{ background: 'rgba(252,249,248,0.85)', boxShadow: '0 8px 32px rgba(28,27,27,0.04)', borderBottom: '1px solid rgba(212,175,55,0.15)' }}
      >
        <div className="flex justify-between items-center px-6 py-4 max-w-7xl mx-auto w-full">
          {/* Logo */}
          <img src={heroLogo} alt="GlowPush" style={{ height: 38, filter: 'drop-shadow(0 1px 4px rgba(212,175,55,0.3))' }} />

          {/* Desktop nav links */}
          <div className="hidden md:flex gap-8 items-center">
            {navLinks.map((link) => (
              <button
                key={link.id}
                onClick={() => scrollTo(link.id)}
                className="text-sm font-semibold uppercase tracking-wider transition-colors duration-200 hover:opacity-70"
                style={{ fontFamily: "'Manrope', sans-serif", color: '#735c00', letterSpacing: '0.1em' }}
              >
                {link.label}
              </button>
            ))}
          </div>

          {/* Right controls */}
          <div className="flex items-center gap-3">
            {/* Language toggle */}
            <button
              onClick={() => setLang(isHe ? 'en' : 'he')}
              className="w-9 h-9 rounded-full flex items-center justify-center text-[11px] font-extrabold tracking-wide transition-all hover:scale-105 active:scale-95 shadow-md"
              style={{ background: GOLD_SOFT, color: '#4a3636' }}
            >
              {isHe ? 'EN' : 'עב'}
            </button>

            {/* Auth / CTA */}
            <button
              onClick={() => navigate(user ? '/artist' : '/auth?mode=signup')}
              className="hidden sm:block px-5 py-2 rounded-lg text-sm font-bold transition-all hover:opacity-90 active:scale-95"
              style={{ background: GOLD, color: '#fff', boxShadow: '0 4px 14px rgba(115,92,0,0.3)' }}
            >
              {user ? (isHe ? 'לקליניקה שלי' : 'My Clinic') : (isHe ? 'התחילי עכשיו' : 'Get Started')}
            </button>

            {/* Mobile hamburger */}
            <button
              className="md:hidden p-2 rounded-lg"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              style={{ color: '#735c00' }}
            >
              <div className="w-5 h-0.5 mb-1" style={{ background: '#735c00' }} />
              <div className="w-5 h-0.5 mb-1" style={{ background: '#735c00' }} />
              <div className="w-5 h-0.5" style={{ background: '#735c00' }} />
            </button>
          </div>
        </div>

        {/* Mobile menu */}
        {mobileMenuOpen && (
          <div className="md:hidden px-6 pb-4 flex flex-col gap-3" style={{ borderTop: '1px solid rgba(212,175,55,0.15)' }}>
            {navLinks.map((link) => (
              <button
                key={link.id}
                onClick={() => scrollTo(link.id)}
                className="text-sm font-semibold text-start py-2 uppercase tracking-wider"
                style={{ color: '#735c00' }}
              >
                {link.label}
              </button>
            ))}
            <button
              onClick={() => navigate(user ? '/artist' : '/auth?mode=signup')}
              className="mt-2 px-5 py-3 rounded-lg text-sm font-bold text-white"
              style={{ background: GOLD }}
            >
              {user ? (isHe ? 'לקליניקה שלי' : 'My Clinic') : (isHe ? 'התחילי עכשיו' : 'Get Started')}
            </button>
          </div>
        )}
      </nav>

      {/* ── HERO ── */}
      <section className="relative min-h-screen flex items-center pt-20 px-6 lg:px-20 overflow-hidden">
        {/* Background glow */}
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          <div className="absolute -top-32 -right-32 w-[500px] h-[500px] rounded-full opacity-10 blur-3xl" style={{ background: '#d4af37' }} />
          <div className="absolute bottom-0 -left-20 w-[400px] h-[400px] rounded-full opacity-5 blur-3xl" style={{ background: '#735c00' }} />
        </div>

        <div className="max-w-7xl mx-auto w-full grid lg:grid-cols-2 gap-8 lg:gap-12 items-center">
          {/* Text */}
          <div className={`z-10 ${isHe ? 'text-right' : 'text-left'}`}>
            <div
              className="inline-flex items-center gap-2 px-3 py-1 rounded-full mb-6 text-[10px] uppercase tracking-widest font-bold"
              style={{ background: 'rgba(212,175,55,0.12)', color: '#735c00', border: '1px solid rgba(212,175,55,0.25)' }}
            >
              <Sparkles size={12} />
              {isHe ? 'הסטודיו הדיגיטלי' : 'The Digital Atelier'}
            </div>

            <h1
              className="text-4xl lg:text-6xl mb-4 font-bold"
              style={{ color: '#1c1b1b' }}
            >
              {isHe ? (
                <span className="flex flex-col gap-1.5 lg:gap-2">
                  <span>מסע החלמה חכם</span>
                  <span>ללקוחות <span style={{ color: '#d4af37' }}>האיפור הקבוע</span></span>
                  <span>שלך</span>
                </span>
              ) : (
                <span className="flex flex-col gap-1.5 lg:gap-2">
                  <span>A Smart Healing Journey</span>
                  <span>for Your <span style={{ color: '#d4af37' }}>PMU</span></span>
                  <span>Clients</span>
                </span>
              )}
            </h1>

            <p className="text-lg lg:text-xl font-light mb-10 max-w-xl leading-relaxed" style={{ color: '#5f5e5e' }}>
              {isHe
                ? 'הפכי את הסטודיו שלך ליצירת מופת דיגיטלית. ניהול לקוחות חכם, אוטומציה של החלמה וכלי בינה מלאכותית המותאמים לאמנות האיפור הקבוע.'
                : 'Transform your studio into a digital masterpiece. Smart client management, automated healing journeys, and AI tools built for PMU artists.'}
            </p>

            <div className={`flex gap-3 ${isHe ? 'justify-end' : 'justify-start'}`}>
              <button
                onClick={() => navigate(user ? '/artist' : '/auth?mode=signup')}
                className="flex-1 sm:flex-none px-6 sm:px-8 py-3.5 rounded-xl text-sm sm:text-base font-bold transition-all hover:opacity-90 active:scale-95 shadow-xl"
                style={{ background: GOLD, color: '#fff', boxShadow: '0 8px 24px rgba(115,92,0,0.3)' }}
              >
                {user ? (isHe ? 'לקליניקה שלי →' : 'My Clinic →') : (isHe ? 'התחילי עכשיו ←' : 'Get Started →')}
              </button>
              <button
                onClick={() => scrollTo('pricing')}
                className="flex-1 sm:flex-none px-6 sm:px-8 py-3.5 rounded-xl text-sm sm:text-base font-bold transition-all hover:opacity-80"
                style={{ background: 'rgba(212,175,55,0.1)', color: '#735c00', border: '1.5px solid rgba(212,175,55,0.3)' }}
              >
                {isHe ? 'צפי במחירים' : 'View Pricing'}
              </button>
            </div>
          </div>

          {/* Image – visible on all screens */}
          <div className="relative flex justify-center lg:block">
            <div
              className="w-64 h-80 sm:w-72 sm:h-96 lg:w-full lg:aspect-[4/5] lg:h-auto rounded-full overflow-hidden relative z-10"
              style={{ border: '10px solid rgba(212,175,55,0.18)', boxShadow: '0 24px 64px rgba(0,0,0,0.12)' }}
            >
              <img
                src={heroPmuLuxury}
                alt="PMU Artist"
                className="w-full h-full object-cover"
              />
            </div>
            <div className="absolute -top-10 -right-10 w-48 h-48 lg:w-64 lg:h-64 rounded-full blur-3xl opacity-20" style={{ background: '#d4af37' }} />
            <div className="absolute -bottom-10 -left-10 w-56 h-56 lg:w-80 lg:h-80 rounded-full blur-3xl opacity-10" style={{ background: '#735c00' }} />
          </div>
        </div>

        {/* Scroll hint */}
        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex flex-col items-center gap-1 opacity-40">
          <ChevronDown size={20} style={{ color: '#735c00' }} className="animate-bounce" />
        </div>
      </section>

      {/* ── FEATURES BENTO ── */}
      <section id="features" className="py-24 px-6 lg:px-20" style={{ background: '#f6f3f2' }}>
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2
              className="text-4xl mb-3"
              style={{ fontFamily: "'Noto Serif', serif", fontStyle: 'italic', color: '#1c1b1b' }}
            >
              {isHe ? 'דיוק של אמן, טכנולוגיה של העתיד' : 'Artist Precision, Future Technology'}
            </h2>
            <p className="text-xs uppercase tracking-widest" style={{ color: '#5f5e5e' }}>
              {isHe ? 'תכונות שנבנו במיוחד עבורך' : 'Features curated for the elite'}
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-6 md:auto-rows-[280px]">
            {/* AI Magic Tools – large */}
            <div
              className="md:col-span-2 md:row-span-2 rounded-2xl flex flex-col group overflow-hidden relative"
              style={{ background: '#fff', boxShadow: '0 4px 24px rgba(0,0,0,0.05)' }}
            >
              {/* Visible image at top */}
              <div className="w-full h-44 md:h-56 overflow-hidden shrink-0 relative">
                <img
                  src={equipmentHero}
                  alt="AI Tools"
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
                />
                <div
                  className="absolute inset-0"
                  style={{ background: 'linear-gradient(to bottom, rgba(0,0,0,0.05), rgba(252,249,248,0.6))' }}
                />
              </div>
              <div className="p-6 flex flex-col flex-1 justify-between">
                <div>
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0" style={{ background: 'rgba(212,175,55,0.12)' }}>
                      <Wand2 size={20} style={{ color: '#735c00' }} />
                    </div>
                    <h3 className="text-2xl" style={{ fontFamily: "'Noto Serif', serif", color: '#1c1b1b' }}>AI Magic Tools</h3>
                  </div>
                  <p className="text-sm leading-relaxed" style={{ color: '#5f5e5e' }}>
                    {isHe
                      ? 'כלי בינה מלאכותית ליצירת כיתובים לסושיאל, השוואת לפני ואחרי, קולאז׳ ממותג, ותיעוד קולי של הטיפול.'
                      : 'AI tools for social captions, before/after comparison, branded collages, and voice-recorded treatment notes.'}
                  </p>
                </div>
                <div className="mt-4">
                  <button
                    onClick={() => navigate(user ? '/artist' : '/auth?mode=signup')}
                    className="text-sm font-bold flex items-center gap-2 hover:opacity-70 transition-opacity"
                    style={{ color: '#735c00' }}
                  >
                    {isHe ? 'גלי עוד ←' : 'Learn more →'}
                  </button>
                </div>
              </div>
            </div>

            {/* Client Management */}
            <div
              className="rounded-2xl p-6 flex flex-col justify-center text-center"
              style={{ background: '#fff', boxShadow: '0 4px 24px rgba(0,0,0,0.04)' }}
            >
              <div className="w-10 h-10 rounded-xl flex items-center justify-center mb-4 mx-auto" style={{ background: 'rgba(212,175,55,0.12)' }}>
                <Users size={20} style={{ color: '#d4af37' }} />
              </div>
              <h4 className="font-bold text-lg mb-2" style={{ fontFamily: "'Manrope', sans-serif" }}>
                {isHe ? 'ניהול לקוחות' : 'Client Management'}
              </h4>
              <p className="text-sm" style={{ color: '#5f5e5e' }}>
                {isHe
                  ? 'תיקי לקוח מלאים עם היסטוריה, תמונות ו-WhatsApp בלחיצה.'
                  : 'Full client records with history, photos, and one-tap WhatsApp.'}
              </p>
            </div>

            {/* Health Declaration */}
            <div
              className="rounded-2xl p-6 flex flex-col items-center justify-center text-center group"
              style={{ background: 'rgba(212,175,55,0.07)', border: '1.5px solid rgba(212,175,55,0.2)' }}
            >
              <div className="w-10 h-10 rounded-xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform" style={{ background: GOLD }}>
                <Shield size={20} color="#fff" />
              </div>
              <h4 className="font-bold text-lg mb-2 uppercase tracking-tight" style={{ fontFamily: "'Manrope', sans-serif" }}>
                {isHe ? 'הצהרת בריאות' : 'Health Declaration'}
              </h4>
              <p className="text-sm" style={{ color: '#5f5e5e' }}>
                {isHe
                  ? 'טפסים דיגיטליים עם חתימה, עמידה בתקני משרד הבריאות.'
                  : 'Digital forms with e-signature, Ministry of Health compliant.'}
              </p>
            </div>

            {/* Healing Journey */}
            <div
              className="md:col-span-2 rounded-2xl p-8 flex items-center gap-6 group"
              style={{ background: '#fff', boxShadow: '0 4px 24px rgba(0,0,0,0.04)' }}
            >
              <div className="hidden lg:block w-40 h-32 rounded-xl overflow-hidden shrink-0">
                <img src={eyebrowHero} alt="Healing" className="w-full h-full object-cover" />
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-2">
                  <BookOpen size={20} style={{ color: '#735c00' }} />
                  <h4 className="font-bold text-lg" style={{ fontFamily: "'Manrope', sans-serif" }}>
                    {isHe ? 'מסע החלמה חכם' : 'Smart Healing Journey'}
                  </h4>
                </div>
                <p className="text-sm" style={{ color: '#5f5e5e' }}>
                  {isHe
                    ? 'הודעות אישיות אוטומטיות לכל שלבי ההחלמה — כאילו את איתה 24/7.'
                    : 'Automated personal messages for every healing stage — as if you\'re with her 24/7.'}
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── PRICING ── */}
      <section id="pricing" className="py-24 px-6 lg:px-20" style={{ background: '#fcf9f8' }}>
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-16">
            <h2
              className="text-4xl mb-3"
              style={{ fontFamily: "'Noto Serif', serif", fontStyle: 'italic', color: '#1c1b1b' }}
            >
              {isHe ? 'בחרי את מסלול ההצלחה שלך' : 'Choose Your Success Plan'}
            </h2>
            <p className="text-xs uppercase tracking-widest" style={{ color: '#5f5e5e' }}>
              {isHe ? '30 יום ניסיון חינם, ללא כרטיס אשראי' : '30-day free trial · No credit card required'}
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-6">
            {plans.map((plan) => (
              <div
                key={plan.slug}
                className="p-8 rounded-2xl flex flex-col relative transition-all duration-300 hover:-translate-y-1"
                style={plan.popular ? {
                  border: '2px solid transparent',
                  backgroundImage: 'linear-gradient(#fff, #fff), linear-gradient(135deg, #B8860B, #D4AF37, #F9F295, #D4AF37, #B8860B)',
                  backgroundOrigin: 'border-box',
                  backgroundClip: 'padding-box, border-box',
                  boxShadow: '0 12px 36px rgba(212,175,55,0.25)',
                } : {
                  background: '#f6f3f2',
                  border: '1px solid rgba(212,175,55,0.15)',
                }}
              >
                {plan.popular && (
                  <div
                    className="absolute -top-3.5 left-1/2 -translate-x-1/2 px-4 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider text-white"
                    style={{ background: GOLD }}
                  >
                    {isHe ? 'הכי פופולרי' : 'Most Popular'}
                  </div>
                )}

                <p className="text-xs font-bold uppercase tracking-widest mb-1" style={{ color: '#B8860B' }}>{plan.name}</p>
                <div className="mb-6 mt-2">
                  <span className="text-4xl font-bold" style={{ color: '#1c1b1b' }}>{plan.price}</span>
                  {plan.priceSub && <span className="text-sm ml-1" style={{ color: '#5f5e5e' }}>{plan.priceSub}</span>}
                </div>

                <ul className="space-y-3 flex-1 mb-8">
                  {plan.features.map((f, i) => (
                    <li key={i} className="flex items-start gap-2 text-sm" style={{ color: '#3a3a3a' }}>
                      <Check size={15} className="shrink-0 mt-0.5" style={{ color: '#d4af37' }} />
                      {f}
                    </li>
                  ))}
                </ul>

                <button
                  onClick={() => navigate(user ? '/artist' : '/auth?mode=signup')}
                  className="w-full py-3 rounded-xl text-sm font-bold transition-all hover:opacity-90 active:scale-95"
                  style={plan.popular ? {
                    background: GOLD,
                    color: '#fff',
                    boxShadow: '0 6px 18px rgba(115,92,0,0.3)',
                  } : {
                    border: '1.5px solid rgba(212,175,55,0.5)',
                    color: '#735c00',
                    background: 'transparent',
                  }}
                >
                  {isHe ? `בחרי ב-${plan.name.split(' – ')[0]}` : `Choose ${plan.name.split(' – ')[0]}`}
                </button>
              </div>
            ))}
          </div>

          <div className="text-center mt-8">
            <button
              onClick={() => navigate('/pricing')}
              className="text-sm font-semibold underline underline-offset-4 hover:opacity-70 transition-opacity"
              style={{ color: '#B8860B' }}
            >
              {isHe ? 'לפרטי כל התוכניות ←' : 'See full plan details →'}
            </button>
          </div>
        </div>
      </section>

      {/* ── FAQ ── */}
      <section id="faq" className="py-24 px-6 lg:px-20" style={{ background: '#f6f3f2' }}>
        <div className="max-w-3xl mx-auto">
          <div className="text-center mb-12">
            <h2
              className="text-4xl mb-3"
              style={{ fontFamily: "'Noto Serif', serif", fontStyle: 'italic', color: '#1c1b1b' }}
            >
              {isHe ? 'שאלות ותשובות' : 'Frequently Asked Questions'}
            </h2>
            <p className="text-xs uppercase tracking-widest" style={{ color: '#5f5e5e' }}>
              {isHe ? 'כל מה שרצית לדעת' : 'Everything you need to know'}
            </p>
          </div>

          {/* Category tabs */}
          <div className="flex items-center justify-center gap-3 flex-wrap mb-8" role="tablist">
            {CATEGORIES.map((cat) => {
              const isActive = activeTab === cat.value;
              return (
                <button
                  key={cat.value}
                  type="button"
                  role="tab"
                  aria-selected={isActive}
                  onClick={() => setActiveTab(prev => prev === cat.value ? null : cat.value)}
                  className="min-h-10 px-5 rounded-full text-sm font-bold border transition-all duration-300 active:scale-95"
                  style={isActive ? {
                    background: GOLD,
                    color: '#fff',
                    border: '1px solid transparent',
                    boxShadow: '0 4px 14px rgba(115,92,0,0.25)',
                  } : {
                    background: 'transparent',
                    color: '#D4AF37',
                    border: '1.5px solid rgba(212,175,55,0.4)',
                  }}
                >
                  {isHe ? cat.he : cat.en}
                </button>
              );
            })}
          </div>

          <Accordion type="single" collapsible className="w-full space-y-3">
            {filteredFaqs.map((faq) => (
              <AccordionItem
                key={faq.id}
                value={faq.id}
                className="border-0 rounded-2xl overflow-hidden transition-all duration-300 hover:-translate-y-0.5 group data-[state=open]:shadow-[0_8px_32px_-8px_rgba(212,175,55,0.2)]"
                style={{
                  background: '#fff',
                  border: '1px solid rgba(212,175,55,0.15)',
                }}
              >
                <AccordionTrigger
                  className="px-6 py-4 text-sm font-semibold hover:no-underline text-start [&[data-state=open]]:text-[#735c00] [&>svg]:hidden transition-colors"
                  style={{ fontFamily: "'Noto Serif', serif", color: '#1c1b1b' }}
                >
                  <div className="flex items-center gap-3 w-full">
                    <div
                      className="shrink-0 w-7 h-7 rounded-full border flex items-center justify-center transition-all duration-300 group-data-[state=open]:rotate-45 group-data-[state=open]:border-transparent"
                      style={{ borderColor: 'rgba(212,175,55,0.4)' }}
                    >
                      <span className="text-sm font-light" style={{ color: '#D4AF37' }}>+</span>
                    </div>
                    <span className="flex-1">{isHe ? faq.question_he : faq.question_en}</span>
                  </div>
                </AccordionTrigger>
                <AccordionContent className="px-6 pb-5 text-sm leading-relaxed" style={{ color: '#5f5e5e' }}>
                  <div className="pt-3 border-t" style={{ borderColor: 'rgba(212,175,55,0.12)' }}>
                    {isHe ? faq.answer_he : faq.answer_en}
                  </div>
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>

          {filteredFaqs.length === 0 && (
            <p className="text-center text-sm py-6" style={{ color: '#5f5e5e' }}>
              {activeTab
                ? (isHe ? 'אין שאלות בקטגוריה זו' : 'No questions in this category')
                : (isHe ? 'בחרי קטגוריה לצפייה בשאלות' : 'Select a category to view questions')}
            </p>
          )}
        </div>
      </section>

      {/* ── FINAL CTA ── */}
      <section className="py-24 px-6 lg:px-20" style={{ background: '#fcf9f8' }}>
        <div
          className="max-w-5xl mx-auto rounded-3xl p-12 lg:p-20 text-center relative overflow-hidden"
          style={{ background: GOLD, boxShadow: '0 24px 64px rgba(115,92,0,0.3)' }}
        >
          <div className="absolute inset-0 bg-black/10 pointer-events-none rounded-3xl" />
          <div className="relative z-10">
            <h2
              className="text-4xl lg:text-5xl mb-6 leading-tight"
              style={{ fontFamily: "'Noto Serif', serif", color: '#fff' }}
            >
              {isHe
                ? <>הצטרפי לדור הבא של<br />אמניות ה-PMU</>
                : <>Join the Next Generation<br />of PMU Artists</>}
            </h2>
            <p className="text-lg mb-10 font-light max-w-2xl mx-auto" style={{ color: 'rgba(255,255,255,0.88)' }}>
              {isHe
                ? 'אל תתני לבירוקרטיה לעכב את האמנות שלך. תני ל-GlowPush לנהל את הסטודיו בזמן שאת יוצרת יופי.'
                : "Don't let admin work slow down your art. Let GlowPush run your studio while you create beauty."}
            </p>
            <button
              onClick={() => navigate(user ? '/artist' : '/auth?mode=signup')}
              className="px-10 py-4 rounded-xl text-lg font-bold transition-all hover:scale-[1.03] active:scale-95 shadow-xl"
              style={{ background: '#fff', color: '#735c00' }}
            >
              {user ? (isHe ? 'לקליניקה שלי →' : 'My Clinic →') : (isHe ? 'התחלה ללא התחייבות ←' : 'Start Free — No Commitment →')}
            </button>
          </div>
        </div>
      </section>

      {/* ── FOOTER ── */}
      <footer
        className="py-10 px-6 flex flex-col items-center gap-5"
        style={{ background: '#fcf9f8', borderTop: '1px solid rgba(212,175,55,0.15)' }}
      >
        <img src={heroLogo} alt="GlowPush" style={{ height: 32, opacity: 0.5 }} />

        <div className="flex flex-wrap justify-center gap-6">
          {[
            { label: isHe ? 'מדיניות פרטיות' : 'Privacy Policy', path: '/privacy' },
            { label: isHe ? 'תנאי שימוש' : 'Terms of Service', path: '/terms' },
            { label: isHe ? 'מדיניות ביטולים' : 'Refund Policy', path: '/refund-policy' },
            { label: isHe ? 'משפטי' : 'Legal', path: '/legal' },
          ].map((link) => (
            <button
              key={link.path}
              onClick={() => navigate(link.path)}
              className="text-xs uppercase tracking-widest font-medium transition-colors hover:opacity-100"
              style={{ color: 'rgba(28,27,27,0.4)', fontFamily: "'Manrope', sans-serif", letterSpacing: '0.1em' }}
            >
              {link.label}
            </button>
          ))}
        </div>

        <p className="text-xs uppercase tracking-widest" style={{ color: 'rgba(28,27,27,0.35)', fontFamily: "'Manrope', sans-serif" }}>
          © 2025 GlowPush. {isHe ? 'מצוינות PMU מוגדרת מחדש.' : 'PMU Excellence Redefined.'}
        </p>
      </footer>
    </div>
  );
};

export default MarketingLanding;
