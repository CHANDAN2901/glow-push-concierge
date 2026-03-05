import { useState, useRef, useEffect, useCallback } from 'react';
import { useI18n } from '@/lib/i18n';
import { AnimatePresence, motion } from 'framer-motion';
import { ChevronRight, ChevronLeft, FileText, Check, ArrowLeft, Eraser, Loader2, MapPin, CalendarPlus, Bell } from 'lucide-react';
import { useHealthQuestions, type HealthQuestion } from '@/hooks/useHealthQuestions';
import equipmentHeroImg from '@/assets/equipment-hero.jpg';
import glowpushLogoImg from '@/assets/glowpush-logo.png';

export interface HealthDeclarationData {
  fullName: string;
  idNumber: string;
  phone: string;
  birthDate: string;
  answers: Record<string, boolean>;
  answerDetails: Record<string, string>;
  pregnancy: boolean;
  allergies: boolean;
  allergiesDetail: string;
  chronicDiseases: boolean;
  chronicDiseasesDetail: string;
  roaccutane: boolean;
  bloodThinners: boolean;
  otherMedications: boolean;
  otherMedicationsDetail: string;
  skinConditions: boolean;
  autoimmune: boolean;
  antibiotics: boolean;
  antibioticsDetail: string;
  botoxFiller: boolean;
  g6pd: boolean;
  eyeSensitivity: boolean;
  consent: boolean;
  legalConsent: boolean;
  legalConsentAt: string;
  medicalConsent: boolean;
  medicalConsentAt: string;
  signatureDataUrl: string;
  submittedAt: string;
  pushOptIn?: boolean;
}

interface Props {
  clientName?: string;
  clientPhone?: string;
  onComplete: (data: HealthDeclarationData) => void;
  onClose: () => void;
  readOnly?: boolean;
  existingData?: HealthDeclarationData | null;
  logoUrl?: string;
  instagramUrl?: string;
  wazeAddress?: string;
  appointmentDate?: string;
  appointmentTime?: string;
  isPreview?: boolean;
}

// Ultra-Luxury theme
const T = {
  bg: 'linear-gradient(145deg, hsl(350 50% 95%), hsl(350 50% 93%), hsl(350 45% 91%))',
  card: '#ffffff',
  cardBorder: 'rgba(212, 175, 55, 0.12)',
  cardShadow: '0 20px 60px rgba(0,0,0,0.04), 0 8px 24px rgba(212,175,55,0.06)',
  input: 'transparent',
  inputBorder: 'rgba(200, 200, 200, 0.4)',
  inputFocus: '#D4AF37',
  text: '#333333',
  textMuted: '#999999',
  textLabel: '#B8860B',
  gold: '#D4AF37',
  goldDark: '#B8860B',
  gradient: 'linear-gradient(135deg, #B8860B 0%, #D4AF37 30%, #F9F295 50%, #D4AF37 70%, #B8860B 100%)',
  radialGlow: 'radial-gradient(ellipse 80% 50% at 50% 0%, rgba(212, 175, 55, 0.05) 0%, transparent 70%)',
};

const STEPS = 3;

export default function HealthDeclaration({ clientName = '', clientPhone = '', onComplete, onClose, readOnly = false, existingData, logoUrl, instagramUrl, wazeAddress, appointmentDate, appointmentTime, isPreview = false }: Props) {
  const { lang } = useI18n();
  const isHe = lang === 'he';

  const { questions: dbQuestions, loading: questionsLoading } = useHealthQuestions();

  const [step, setStep] = useState(1);

  const [fullName, setFullName] = useState(existingData?.fullName || clientName);
  const [idNumber, setIdNumber] = useState(existingData?.idNumber || '');
  const [phone, setPhone] = useState(existingData?.phone || clientPhone);
  const [birthDate, setBirthDate] = useState(existingData?.birthDate || '');

  const [answers, setAnswers] = useState<Record<string, boolean>>(existingData?.answers || {});
  const [answerDetails, setAnswerDetails] = useState<Record<string, string>>(existingData?.answerDetails || {});

  const [consent, setConsent] = useState(existingData?.consent || false);
  const [legalConsent, setLegalConsent] = useState(existingData?.legalConsent || false);
  const [medicalConsent, setMedicalConsent] = useState(existingData?.medicalConsent || false);
  const [signatureDataUrl, setSignatureDataUrl] = useState(existingData?.signatureDataUrl || '');
  const [pushOptIn, setPushOptIn] = useState(false);

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showThankYou, setShowThankYou] = useState(false);
  const sigContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isDrawing) {
      document.body.style.overflow = 'hidden';
      document.body.style.touchAction = 'none';
    } else {
      document.body.style.overflow = '';
      document.body.style.touchAction = '';
    }
    return () => {
      document.body.style.overflow = '';
      document.body.style.touchAction = '';
    };
  }, [isDrawing]);

  const initCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * 2;
    canvas.height = rect.height * 2;
    ctx.scale(2, 2);
    ctx.strokeStyle = T.gold;
    ctx.lineWidth = 2.5;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    if (existingData?.signatureDataUrl) {
      const img = new Image();
      img.onload = () => {
        ctx.drawImage(img, 0, 0, rect.width, rect.height);
      };
      img.src = existingData.signatureDataUrl;
    }
  }, [existingData]);

  useEffect(() => {
    if (step === 3 && canvasRef.current) {
      setTimeout(initCanvas, 50);
    }
  }, [step, initCanvas]);

  const getPos = (e: React.TouchEvent | React.MouseEvent) => {
    const canvas = canvasRef.current!;
    const rect = canvas.getBoundingClientRect();
    if ('touches' in e) {
      return { x: e.touches[0].clientX - rect.left, y: e.touches[0].clientY - rect.top };
    }
    return { x: (e as React.MouseEvent).clientX - rect.left, y: (e as React.MouseEvent).clientY - rect.top };
  };

  const startDraw = (e: React.TouchEvent | React.MouseEvent) => {
    if (readOnly) return;
    e.preventDefault();
    setIsDrawing(true);
    const ctx = canvasRef.current?.getContext('2d');
    if (!ctx) return;
    const pos = getPos(e);
    ctx.beginPath();
    ctx.moveTo(pos.x, pos.y);
  };

  const draw = (e: React.TouchEvent | React.MouseEvent) => {
    if (!isDrawing || readOnly) return;
    e.preventDefault();
    const ctx = canvasRef.current?.getContext('2d');
    if (!ctx) return;
    const pos = getPos(e);
    ctx.strokeStyle = T.gold;
    ctx.lineWidth = 2.5;
    ctx.lineTo(pos.x, pos.y);
    ctx.stroke();
  };

  const endDraw = () => {
    if (!isDrawing) return;
    setIsDrawing(false);
    if (canvasRef.current) {
      setSignatureDataUrl(canvasRef.current.toDataURL('image/png'));
    }
  };

  const clearSignature = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const rect = canvas.getBoundingClientRect();
    ctx.clearRect(0, 0, rect.width, rect.height);
    setSignatureDataUrl('');
  };

  // Track recently toggled for spring animation
  const [justToggled, setJustToggled] = useState<string | null>(null);

  const toggleAnswer = (questionId: string) => {
    if (readOnly) return;
    if (navigator.vibrate) navigator.vibrate(30);
    setAnswers(prev => ({ ...prev, [questionId]: !prev[questionId] }));
    setJustToggled(questionId);
    setTimeout(() => setJustToggled(null), 400);
  };

  const setDetail = (questionId: string, value: string) => {
    setAnswerDetails(prev => ({ ...prev, [questionId]: value }));
  };

  const handleSubmit = async () => {
    setIsSubmitting(true);
    try {
      const data: HealthDeclarationData = {
        fullName, idNumber, phone, birthDate,
        answers, answerDetails,
        pregnancy: false, allergies: false, allergiesDetail: '',
        chronicDiseases: false, chronicDiseasesDetail: '',
        roaccutane: false, bloodThinners: false,
        otherMedications: false, otherMedicationsDetail: '',
        skinConditions: false, autoimmune: false,
        antibiotics: false, antibioticsDetail: '',
        botoxFiller: false, g6pd: false, eyeSensitivity: false,
        consent, legalConsent,
        legalConsentAt: legalConsent ? new Date().toISOString() : '',
        medicalConsent,
        medicalConsentAt: medicalConsent ? new Date().toISOString() : '',
        signatureDataUrl,
        submittedAt: new Date().toISOString(),
        pushOptIn,
      };
      await onComplete(data);
      setShowThankYou(true);
    } catch (error: any) {
      console.error('Submit error:', error);
      const { toast } = await import('sonner');
      const errorMsg = error?.message || String(error);
      toast.error(isHe ? `שגיאה: ${errorMsg}` : `Error: ${errorMsg}`, { duration: 8000 });
    } finally {
      setIsSubmitting(false);
    }
  };

  const isValidId = /^\d{9}$/.test(idNumber.trim());
  const isValidPhone = phone.trim() === '' || /^\d{10}$/.test(phone.replace(/[-\s]/g, ''));
  const canProceedStep1 = isPreview || (fullName.trim().length > 0 && isValidId && isValidPhone);
  const canProceedStep3 = isPreview || (consent && legalConsent && medicalConsent && signatureDataUrl.length > 0);

  const hasAnyRedFlag = dbQuestions.some(q => q.risk_level === 'red' && answers[q.id]);
  const hasAnyYellow = dbQuestions.some(q => q.risk_level === 'yellow' && answers[q.id]);

  // ═══════════════ THANK YOU — VIP GOLDEN TICKET ═══════════════
  if (showThankYou) {
    const handleAddToCalendar = () => {
      const dateStr = appointmentDate || new Date().toISOString().split('T')[0];
      const timeStr = appointmentTime || '10:00';
      const [year, month, day] = dateStr.split('-');
      const [hour, minute] = timeStr.split(':');
      const startDt = `${year}${month}${day}T${hour}${minute}00`;
      const endH = String(Number(hour) + 1).padStart(2, '0');
      const endDt = `${year}${month}${day}T${endH}${minute}00`;
      const icsContent = [
        'BEGIN:VCALENDAR', 'VERSION:2.0', 'BEGIN:VEVENT',
        `DTSTART:${startDt}`, `DTEND:${endDt}`,
        `SUMMARY:${isHe ? 'תור לאיפור קבוע' : 'PMU Appointment'}`,
        `DESCRIPTION:${isHe ? 'תור לטיפול איפור קבוע' : 'Permanent makeup appointment'}`,
        wazeAddress ? `LOCATION:${wazeAddress}` : '',
        'END:VEVENT', 'END:VCALENDAR',
      ].filter(Boolean).join('\n');
      const blob = new Blob([icsContent], { type: 'text/calendar;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url; a.download = 'appointment.ics'; a.click();
      URL.revokeObjectURL(url);
    };

    const handleWaze = () => {
      if (wazeAddress) window.open(`https://waze.com/ul?q=${encodeURIComponent(wazeAddress)}`, '_blank');
    };

    const prepTips = isHe
      ? [
          { icon: '☕', text: 'הימנעי מקפאין 24 שעות לפני הטיפול' },
          { icon: '🍷', text: 'הימנעי מאלכוהול 48 שעות לפני' },
          { icon: '💊', text: 'הימנעי מאספירין ומדללי דם' },
          { icon: '😴', text: 'הגיעי עם שינה טובה ואכילה קלה' },
        ]
      : [
          { icon: '☕', text: 'Avoid caffeine 24 hours before' },
          { icon: '🍷', text: 'No alcohol 48 hours before' },
          { icon: '💊', text: 'Avoid aspirin & blood thinners' },
          { icon: '😴', text: 'Get good sleep & eat a light meal' },
        ];

    return (
      <div className="fixed inset-0 z-[70] overflow-y-auto" style={{ background: T.bg }}>
        <div className="min-h-screen flex flex-col items-center justify-center px-5 py-10 hd-flip-perspective">
          {/* VIP TICKET CARD */}
          <div
            className="hd-flip-card hd-shine-overlay relative w-full max-w-sm rounded-3xl overflow-hidden"
            style={{
              backgroundColor: T.card,
              border: `3px solid ${T.gold}`,
              boxShadow: '0 16px 60px rgba(212,175,55,0.25), 0 4px 20px rgba(0,0,0,0.08)',
            }}
          >
            {/* Gold header band */}
            <div className="py-5 text-center" style={{ background: T.gradient }}>
              <div className="w-16 h-16 mx-auto rounded-full flex items-center justify-center mb-2" style={{ backgroundColor: 'rgba(255,255,255,0.2)' }}>
                <Check className="w-9 h-9 text-white" strokeWidth={2.5} />
              </div>
              <p className="text-white text-sm font-bold tracking-wider uppercase" style={{ letterSpacing: '0.15em' }}>
                {isHe ? '✨ VIP PASS ✨' : '✨ VIP PASS ✨'}
              </p>
            </div>

            {/* Ticket body */}
            <div className="px-6 py-5 text-center">
              <h2 className="font-serif text-lg font-light tracking-wide mb-1" style={{ color: T.gold }}>
                {isHe ? 'ההצהרה נקלטה בהצלחה' : 'Declaration Received'}
              </h2>
              <p className="text-sm mb-5" style={{ color: T.textMuted }}>
                {isHe
                  ? `מחכות לך בקוצר רוח, ${fullName} ✨`
                  : `We can't wait to see you, ${fullName} ✨`}
              </p>

              {/* Dashed divider */}
              <div className="border-t-2 border-dashed my-4" style={{ borderColor: 'rgba(212,175,55,0.2)' }} />

              {/* Pre-Treatment Tips */}
              <h3 className="text-xs font-bold tracking-wider uppercase mb-3" style={{ color: T.gold }}>
                {isHe ? 'הכנה לפני הטיפול' : 'Pre-Treatment Prep'}
              </h3>
              <div className="space-y-2.5 text-start mb-5">
                {prepTips.map((tip, i) => (
                  <div
                    key={i}
                    className="flex items-center gap-3 px-3 py-2.5 rounded-xl"
                    style={{ backgroundColor: '#fafaf8', animation: `hd-item-enter 0.4s ${0.6 + i * 0.1}s cubic-bezier(0.16,1,0.3,1) both` }}
                  >
                    <span className="text-lg">{tip.icon}</span>
                    <span className="text-xs font-medium" style={{ color: T.text }}>{tip.text}</span>
                  </div>
                ))}
              </div>

              {/* Action buttons */}
              <div className="space-y-2.5">
                <button
                  onClick={handleAddToCalendar}
                  className="w-full py-3 rounded-full text-sm font-bold transition-all min-h-[48px] active:scale-[0.97] flex items-center justify-center gap-2 text-white hd-shimmer-border"
                  style={{ background: T.gradient, boxShadow: '0 6px 24px rgba(212,175,55,0.3)' }}
                >
                  <CalendarPlus className="w-4 h-4" />
                  {isHe ? 'הוספה ליומן שלי' : 'Add to Calendar'}
                </button>
                {wazeAddress && (
                  <button
                    onClick={handleWaze}
                    className="w-full py-3 rounded-full text-sm font-bold transition-all min-h-[48px] active:scale-[0.97] flex items-center justify-center gap-2 text-white hd-shimmer-border"
                    style={{ background: T.gradient, boxShadow: '0 6px 24px rgba(212,175,55,0.3)' }}
                  >
                    <MapPin className="w-4 h-4" />
                    {isHe ? 'ניווט ב-Waze' : 'Navigate in Waze'}
                  </button>
                )}
                <button
                  onClick={() => window.close()}
                  className="w-full py-3 rounded-full text-sm font-medium transition-all min-h-[48px] active:scale-[0.97]"
                  style={{ border: `1px solid ${T.cardBorder}`, color: T.textMuted, backgroundColor: T.card }}
                >
                  {isHe ? 'סיום' : 'Done'}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ═══════════════ MAIN FORM ═══════════════
  return (
    <div className="fixed inset-0 z-[70] flex flex-col" style={{ background: T.bg }}>
      {/* Scrollable content area */}
      <div className="flex-1 overflow-y-auto">
      <div className="flex flex-col items-center px-4 sm:px-5 pt-6 sm:pt-10 pb-8">
        <div className="w-full max-w-lg">

          {/* ═══ Luxury Dark Equipment Header ═══ */}
          <div
            className="relative rounded-3xl overflow-hidden mb-6 sm:mb-8"
            style={{
              minHeight: '260px',
              boxShadow: '0 16px 48px rgba(0,0,0,0.25), 0 4px 16px rgba(212,175,55,0.10)',
            }}
          >
            {/* Background image – moody equipment */}
            <img
              src={equipmentHeroImg}
              alt=""
              className="absolute inset-0 w-full h-full object-cover"
              style={{ filter: 'brightness(0.55) saturate(1.1)' }}
            />
            {/* Dark chocolate/mocha → pink fade overlay */}
            <div
              className="absolute inset-0"
              style={{
                background: 'linear-gradient(180deg, hsla(20, 30%, 12%, 0.85) 0%, hsla(15, 25%, 18%, 0.78) 40%, hsla(350, 35%, 30%, 0.65) 75%, hsla(350, 50%, 93%, 0.95) 100%)',
              }}
            />
            {/* Content */}
            <div className="relative z-10 flex flex-col items-center px-5 pt-5 pb-8">
              {/* Back button + step row */}
              <div className="flex items-center justify-between w-full mb-5">
                <button
                  onClick={onClose}
                  className="w-9 h-9 rounded-full flex items-center justify-center transition-colors shrink-0 backdrop-blur-sm"
                  style={{ backgroundColor: 'rgba(255,255,255,0.15)', border: '1px solid rgba(212,175,55,0.3)', color: '#F9F295' }}
                >
                  <ArrowLeft className="w-4 h-4" />
                </button>
                <div className="flex items-center gap-1.5">
                  <FileText className="w-4 h-4" style={{ color: '#F9F295' }} />
                  <p className="text-xs font-medium" style={{ color: 'rgba(255,255,255,0.85)' }}>
                    {readOnly
                      ? (isHe ? 'צפייה בלבד' : 'View only')
                      : (isHe ? `שלב ${step} מתוך ${STEPS}` : `Step ${step} of ${STEPS}`)}
                  </p>
                </div>
              </div>

              {/* Logo */}
              <div className="mb-4">
                {instagramUrl ? (
                  <a href={instagramUrl} target="_blank" rel="noopener noreferrer">
                    <img
                      src={logoUrl && !logoUrl.includes('svg+xml') ? logoUrl : glowpushLogoImg}
                      alt="Studio Logo"
                      className="h-16 sm:h-20 w-auto object-contain"
                      style={{ filter: 'brightness(1.2) drop-shadow(0 2px 8px rgba(212,175,55,0.4))' }}
                      onError={(e) => { (e.target as HTMLImageElement).src = glowpushLogoImg; }}
                    />
                  </a>
                ) : (
                  <img
                    src={logoUrl && !logoUrl.includes('svg+xml') ? logoUrl : glowpushLogoImg}
                    alt="Studio Logo"
                    className="h-16 sm:h-20 w-auto object-contain"
                    style={{ filter: 'brightness(1.2) drop-shadow(0 2px 8px rgba(212,175,55,0.4))' }}
                    onError={(e) => { (e.target as HTMLImageElement).src = glowpushLogoImg; }}
                  />
                )}
              </div>

              {/* Title – bright glowing gold */}
              <h1
                className="text-center font-serif font-light text-xl sm:text-2xl tracking-wider mb-1.5 hd-shimmer-text"
                style={{
                  background: 'linear-gradient(135deg, #F9F295 0%, #D4AF37 40%, #F9F295 60%, #D4AF37 100%)',
                  backgroundSize: '200% 100%',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                  filter: 'drop-shadow(0 1px 6px rgba(249,242,149,0.4))',
                }}
              >
                {step === 1 && fullName.trim()
                  ? (isHe ? `שלום ${fullName}, איזה כיף שאת מגיעה אלינו ✨` : `Hello ${fullName}, so glad you're coming ✨`)
                  : (isHe ? 'הצהרת בריאות' : 'Health Declaration')}
              </h1>
              {/* Subtitle – pure white */}
              <p className="text-center text-xs font-medium tracking-wide" style={{ color: '#ffffff' }}>
                {isHe ? 'טיפול איפור קבוע' : 'Permanent Makeup Treatment'}
              </p>

              {readOnly && existingData?.submittedAt && (
                <p className="text-[11px] mt-2 font-medium" style={{ color: '#F9F295' }}>
                  {isHe ? '📅 תאריך חתימה: ' : '📅 Signed: '}
                  {new Date(existingData.submittedAt).toLocaleDateString(isHe ? 'he-IL' : 'en-US', { year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                </p>
              )}
            </div>
          </div>

          {/* Elegant Progress Bar */}
          {!readOnly && (
            <div className="mb-8 sm:mb-10">
              <div className="w-full h-[3px] rounded-full overflow-hidden" style={{ backgroundColor: 'rgba(212,175,55,0.1)' }}>
                <motion.div
                  className="h-full rounded-full"
                  style={{ background: T.gradient }}
                  initial={false}
                  animate={{ width: `${(step / STEPS) * 100}%` }}
                  transition={{ duration: 0.5, ease: [0.4, 0, 0.2, 1] }}
                />
              </div>
              <div className="flex justify-between mt-2">
                {[
                  { label: isHe ? 'פרטים' : 'Details' },
                  { label: isHe ? 'רפואי' : 'Medical' },
                  { label: isHe ? 'חתימה' : 'Signature' },
                ].map((s, i) => (
                  <span
                    key={i}
                    className="text-[10px] font-medium tracking-wider uppercase transition-colors duration-300"
                    style={{ color: i + 1 <= step ? T.gold : 'rgba(180,180,180,0.6)' }}
                  >
                    {s.label}
                  </span>
                ))}
              </div>
            </div>
          )}

          <AnimatePresence mode="wait">
          {/* STEP 1: Personal Details */}
          {step === 1 && (
             <motion.div key="step1" initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} transition={{ duration: 0.45, ease: [0.4, 0, 0.2, 1] }} className="space-y-4">
              <div className="rounded-3xl p-7 sm:p-8" style={{ backgroundColor: T.card, boxShadow: T.cardShadow }}>
                <h2 className="font-serif font-bold text-lg tracking-wide mb-6 pb-3" style={{ color: T.text, borderBottom: `1px solid rgba(212,175,55,0.12)` }}>
                  {isHe ? 'פרטים אישיים' : 'Personal Details'}
                </h2>
                <div className="space-y-6">
                  <div style={{ animation: 'hd-item-enter 0.4s 0.15s cubic-bezier(0.16, 1, 0.3, 1) both' }}>
                    <WhiteFieldInput label={isHe ? 'שם מלא' : 'Full Name'} required value={fullName} onChange={setFullName} disabled={readOnly} placeholder={isHe ? 'שם פרטי ומשפחה' : 'First and last name'} />
                  </div>
                  <div style={{ animation: 'hd-item-enter 0.4s 0.22s cubic-bezier(0.16, 1, 0.3, 1) both' }}>
                    <WhiteFieldInput label={isHe ? 'תעודת זהות' : 'ID Number'} required value={idNumber} onChange={v => setIdNumber(v.replace(/\D/g, '').slice(0, 9))} disabled={readOnly} placeholder="000000000" dir="ltr" inputMode="numeric" maxLength={9} pattern="[0-9]*" error={idNumber.length > 0 && !isValidId ? (isHe ? 'יש להזין 9 ספרות בדיוק' : 'Must be exactly 9 digits') : undefined} />
                  </div>
                  <div style={{ animation: 'hd-item-enter 0.4s 0.29s cubic-bezier(0.16, 1, 0.3, 1) both' }}>
                    <WhiteFieldInput label={isHe ? 'טלפון' : 'Phone'} value={phone} onChange={v => setPhone(v.replace(/\D/g, '').slice(0, 10))} disabled={readOnly} placeholder="0501234567" dir="ltr" inputMode="tel" maxLength={10} pattern="[0-9]*" error={phone.length > 0 && !isValidPhone ? (isHe ? 'יש להזין 10 ספרות בדיוק' : 'Must be exactly 10 digits') : undefined} />
                  </div>
                  <div style={{ animation: 'hd-item-enter 0.4s 0.36s cubic-bezier(0.16, 1, 0.3, 1) both' }}>
                    <WhiteFieldInput label={isHe ? 'תאריך לידה' : 'Date of Birth'} value={birthDate} onChange={setBirthDate} disabled={readOnly} placeholder="YYYY-MM-DD" dir="ltr" type="date" />
                  </div>
                </div>
              </div>
            </motion.div>
          )}

          {/* STEP 2: Dynamic Medical Questionnaire */}
          {step === 2 && (
            <motion.div key="step2" initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} transition={{ duration: 0.45, ease: [0.4, 0, 0.2, 1] }} className="space-y-4">
              <div className="rounded-3xl p-7 sm:p-8" style={{ backgroundColor: T.card, boxShadow: T.cardShadow }}>
                <h2 className="font-serif font-bold text-lg tracking-wide mb-2 pb-3" style={{ color: T.text, borderBottom: `1px solid rgba(212,175,55,0.12)` }}>
                  {isHe ? 'שאלון רפואי' : 'Medical Questionnaire'}
                </h2>
                <p className="text-xs mb-5" style={{ color: T.textMuted }}>
                  {isHe ? 'סמני את כל מה שרלוונטי:' : 'Check all that apply:'}
                </p>

                {/* Risk summary in readOnly */}
                {readOnly && (
                  <div
                    className="flex items-center gap-2 px-4 py-3 rounded-2xl mb-4"
                    style={{
                      backgroundColor: hasAnyRedFlag ? 'rgba(229,72,77,0.08)' : hasAnyYellow ? 'rgba(217,119,6,0.08)' : 'rgba(34,197,94,0.08)',
                      border: `1.5px solid ${hasAnyRedFlag ? '#E5484D' : hasAnyYellow ? '#D97706' : '#22c55e'}`,
                    }}
                  >
                    {hasAnyRedFlag ? (
                      <>
                        <span className="text-lg">🚨</span>
                        <span className="text-sm font-bold" style={{ color: '#E5484D' }}>
                          {isHe ? 'נמצאו שדות קריטיים — נדרשת בדיקה!' : 'Red flag fields detected — review required!'}
                        </span>
                      </>
                    ) : hasAnyYellow ? (
                      <>
                        <span className="text-lg">⚠️</span>
                        <span className="text-sm font-bold" style={{ color: '#D97706' }}>
                          {isHe ? 'יש סעיפים שדורשים תשומת לב' : 'Some items need attention'}
                        </span>
                      </>
                    ) : (
                      <>
                        <span className="text-lg">✅</span>
                        <span className="text-sm font-bold" style={{ color: '#22c55e' }}>
                          {isHe ? 'מאושר לטיפול' : 'Cleared for Treatment'}
                        </span>
                      </>
                    )}
                  </div>
                )}

                {questionsLoading ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="w-6 h-6 animate-spin" style={{ color: T.gold }} />
                  </div>
                ) : (
                  <div className="space-y-3">
                    {dbQuestions.map((q) => {
                      const isChecked = answers[q.id] || false;
                      const isRedFlagActive = readOnly && q.risk_level === 'red' && isChecked;
                      const isYellowActive = readOnly && q.risk_level === 'yellow' && isChecked;
                      const questionText = isHe ? q.question_he : (q.question_en || q.question_he);
                      const detailPlaceholder = isHe ? (q.detail_placeholder_he || 'פרטים נוספים...') : (q.detail_placeholder_en || 'Details...');

                      return (
                        <div key={q.id} className="space-y-2">
                          <button
                            type="button"
                            onClick={() => toggleAnswer(q.id)}
                            disabled={readOnly}
                            className="flex items-center gap-3 w-full text-start px-4 py-4 rounded-2xl transition-all min-h-[48px] active:scale-[0.98]"
                            style={{
                              backgroundColor: isRedFlagActive ? 'rgba(229,72,77,0.04)' : isYellowActive ? 'rgba(217,119,6,0.04)' : 'transparent',
                              borderBottom: `1px solid ${isRedFlagActive ? 'rgba(229,72,77,0.2)' : isYellowActive ? 'rgba(217,119,6,0.2)' : 'rgba(212,175,55,0.1)'}`,
                            }}
                          >
                            {/* Jewel toggle with spring bounce */}
                            <span
                              className="w-7 h-7 rounded-full flex items-center justify-center shrink-0"
                              style={{
                                border: `2px solid ${isRedFlagActive ? '#E5484D' : isChecked ? 'transparent' : 'rgba(212,175,55,0.35)'}`,
                                background: isRedFlagActive ? '#E5484D' : isChecked ? T.gradient : 'transparent',
                                boxShadow: isChecked ? '0 2px 12px rgba(212,175,55,0.4)' : 'none',
                                transform: justToggled === q.id ? 'scale(1.25)' : 'scale(1)',
                                transition: justToggled === q.id
                                  ? 'transform 0.15s cubic-bezier(0.34, 1.56, 0.64, 1), background 0.2s, box-shadow 0.2s'
                                  : 'transform 0.3s cubic-bezier(0.34, 1.56, 0.64, 1), background 0.2s, box-shadow 0.2s',
                              }}
                            >
                              {isChecked && <Check className="w-3.5 h-3.5 text-white" strokeWidth={3} />}
                            </span>
                            <div className="flex-1 min-w-0">
                              <span className={`text-sm leading-relaxed font-light ${isRedFlagActive ? 'font-bold' : ''}`} style={{ color: isRedFlagActive ? '#E5484D' : T.text, letterSpacing: '0.01em' }}>
                                {q.icon} {questionText}
                                {isRedFlagActive && <span className="ml-1 text-xs">🚨</span>}
                                {isYellowActive && <span className="ml-1 text-xs">⚠️</span>}
                              </span>
                            </div>
                          </button>
                          {q.has_detail_field && isChecked && (
                            <input
                              value={answerDetails[q.id] || ''}
                              onChange={e => setDetail(q.id, e.target.value)}
                              disabled={readOnly}
                              placeholder={detailPlaceholder}
                              className="w-full px-1 py-2 text-sm outline-none transition-all duration-300 min-h-[36px] font-sans font-light border-b-[1.5px]"
                              style={{
                                marginInlineStart: '2.25rem',
                                width: 'calc(100% - 2.25rem)',
                                backgroundColor: 'transparent',
                                borderColor: T.inputBorder,
                                color: T.text,
                              }}
                              onFocus={e => {
                                e.target.style.borderColor = T.inputFocus;
                                e.target.style.boxShadow = `0 2px 0 0 ${T.gold}`;
                                e.target.scrollIntoView({ behavior: 'smooth', block: 'center' });
                              }}
                              onBlur={e => {
                                e.target.style.borderColor = T.inputBorder;
                                e.target.style.boxShadow = 'none';
                              }}
                            />
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </motion.div>
          )}

          {/* STEP 3: Consent & Signature */}
          {step === 3 && (
            <motion.div key="step3" initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} transition={{ duration: 0.45, ease: [0.4, 0, 0.2, 1] }} className="space-y-4">
              <div className="rounded-3xl p-7 sm:p-8" style={{ backgroundColor: T.card, boxShadow: T.cardShadow }}>
                <h2 className="font-serif font-bold text-lg tracking-wide mb-6 pb-3" style={{ color: T.text, borderBottom: `1px solid rgba(212,175,55,0.12)` }}>
                  {isHe ? 'הסכמה וחתימה' : 'Consent & Signature'}
                </h2>

                <div
                  className="px-4 py-4 rounded-2xl text-sm leading-relaxed max-h-44 overflow-y-auto mb-5"
                  style={{ backgroundColor: '#fafaf8', border: `1px solid ${T.cardBorder}`, color: T.textMuted }}
                >
                  {isHe ? (
                    <>
                      <p className="mb-2 font-medium" style={{ color: T.text }}>אני, החתום/ה מטה, מצהיר/ה בזאת כי:</p>
                      <ul className="list-disc pr-4 space-y-1.5">
                        <li>כל הפרטים שמסרתי לעיל הם נכונים ומלאים.</li>
                        <li>הבנתי את מהות הטיפול של איפור קבוע (PMU) על כל שלביו.</li>
                        <li>ידוע לי כי תוצאות הטיפול עשויות להשתנות מאדם לאדם.</li>
                        <li>ידוע לי כי ייתכן צורך בטיפול טאצ׳-אפ נוסף.</li>
                        <li>אני מסכים/ה לביצוע הטיפול מרצוני החופשי.</li>
                        <li>לא אבוא בטענות בגין שינויים צפויים בצבע או בצורה במהלך תהליך הריפוי.</li>
                      </ul>
                    </>
                  ) : (
                    <>
                      <p className="mb-2 font-medium" style={{ color: T.text }}>I, the undersigned, hereby declare that:</p>
                      <ul className="list-disc pl-4 space-y-1.5">
                        <li>All information provided above is true and complete.</li>
                        <li>I understand the nature of the Permanent Makeup (PMU) procedure.</li>
                        <li>I am aware that results may vary from person to person.</li>
                        <li>I understand that a follow-up touch-up session may be needed.</li>
                        <li>I consent to this procedure of my own free will.</li>
                        <li>I will not hold claims regarding expected changes in color or shape during healing.</li>
                      </ul>
                    </>
                  )}
                </div>

                {/* Consent checkbox */}
                <button
                  type="button"
                  onClick={() => !readOnly && setConsent(!consent)}
                  disabled={readOnly}
                  className="flex items-center gap-3 w-full text-start px-4 py-3.5 rounded-2xl min-h-[48px] active:scale-[0.98] transition-transform mb-5"
                  style={{ backgroundColor: '#fafaf8', border: `1px solid ${T.inputBorder}` }}
                >
                  <span
                    className="w-6 h-6 rounded-full flex items-center justify-center shrink-0 transition-all duration-200"
                    style={{
                      border: `2px solid ${consent ? T.gold : 'rgba(212,175,55,0.35)'}`,
                      backgroundColor: consent ? T.gold : 'transparent',
                      boxShadow: consent ? '0 0 10px rgba(212,175,55,0.3)' : 'none',
                    }}
                  >
                    {consent && <Check className="w-3.5 h-3.5 text-white" strokeWidth={3} />}
                  </span>
                  <span className="text-sm font-medium" style={{ color: T.text }}>
                    {isHe ? 'קראתי, הבנתי ואני מסכים/ה לכל האמור לעיל' : 'I have read, understood and agree to the above'}
                  </span>
                </button>

                {/* Legal consent checkbox */}
                <button
                  type="button"
                  onClick={() => !readOnly && setLegalConsent(!legalConsent)}
                  disabled={readOnly}
                  className="flex items-start gap-3 w-full text-start px-4 py-3.5 rounded-2xl min-h-[48px] active:scale-[0.98] transition-transform mb-5"
                  style={{ backgroundColor: '#fafaf8', border: `1px solid ${T.inputBorder}` }}
                >
                  <span
                    className="w-6 h-6 rounded-full flex items-center justify-center shrink-0 transition-all duration-200 mt-0.5"
                    style={{
                      border: `2px solid ${legalConsent ? T.gold : 'rgba(212,175,55,0.35)'}`,
                      backgroundColor: legalConsent ? T.gold : 'transparent',
                      boxShadow: legalConsent ? '0 0 10px rgba(212,175,55,0.3)' : 'none',
                    }}
                  >
                    {legalConsent && <Check className="w-3.5 h-3.5 text-white" strokeWidth={3} />}
                  </span>
                  <span className="text-sm font-medium leading-relaxed" style={{ color: T.text }}>
                    {isHe ? (
                      <>
                        אני מאשרת כי הפרטים נמסרו מרצוני, וכי קראתי והסכמתי ל
                        <a href="/legal?tab=terms" target="_blank" rel="noopener noreferrer" className="underline font-bold" style={{ color: T.gold }} onClick={e => e.stopPropagation()}>תנאי השימוש</a>
                        {' '}ול
                        <a href="/privacy" target="_blank" rel="noopener noreferrer" className="underline font-bold" style={{ color: T.gold }} onClick={e => e.stopPropagation()}>מדיניות הפרטיות</a>
                        {' '}של Glow Push.
                      </>
                    ) : (
                      <>
                        I confirm that the information was provided voluntarily, and that I have read and agreed to the{' '}
                        <a href="/legal?tab=terms" target="_blank" rel="noopener noreferrer" className="underline font-bold" style={{ color: T.gold }} onClick={e => e.stopPropagation()}>Terms of Service</a>
                        {' '}and{' '}
                        <a href="/privacy" target="_blank" rel="noopener noreferrer" className="underline font-bold" style={{ color: T.gold }} onClick={e => e.stopPropagation()}>Privacy Policy</a>
                        {' '}of Glow Push.
                      </>
                    )}
                  </span>
                </button>

                {/* Medical data & messaging consent */}
                <button
                  type="button"
                  onClick={() => !readOnly && setMedicalConsent(!medicalConsent)}
                  disabled={readOnly}
                  className="flex items-start gap-3 w-full text-start px-4 py-3.5 rounded-2xl min-h-[48px] active:scale-[0.98] transition-transform mb-5"
                  style={{ backgroundColor: '#fafaf8', border: `1px solid ${T.inputBorder}` }}
                >
                  <span
                    className="w-6 h-6 rounded-full flex items-center justify-center shrink-0 transition-all duration-200 mt-0.5"
                    style={{
                      border: `2px solid ${medicalConsent ? T.gold : 'rgba(212,175,55,0.35)'}`,
                      backgroundColor: medicalConsent ? T.gold : 'transparent',
                      boxShadow: medicalConsent ? '0 0 10px rgba(212,175,55,0.3)' : 'none',
                    }}
                  >
                    {medicalConsent && <Check className="w-3.5 h-3.5 text-white" strokeWidth={3} />}
                  </span>
                  <span className="text-sm font-medium leading-relaxed" style={{ color: T.text }}>
                    {isHe ? (
                      <>
                        אני מסכימה לעיבוד המידע הרפואי שלי ולקבלת הודעות אוטומטיות בנוגע לטיפול האחר שלי באמצעות SMS / WhatsApp.
                      </>
                    ) : (
                      <>
                        I consent to the processing of my medical data and agree to receive automated SMS/WhatsApp notifications regarding my aftercare.
                      </>
                    )}
                  </span>
                </button>

                {/* Push Recovery Opt-in */}
                {!readOnly && (
                  <button
                    type="button"
                    onClick={() => setPushOptIn(!pushOptIn)}
                    className="flex items-start gap-3 w-full text-start px-4 py-3.5 rounded-2xl min-h-[48px] active:scale-[0.98] transition-transform mb-5"
                    style={{
                      backgroundColor: pushOptIn ? 'rgba(212,175,55,0.06)' : '#fafaf8',
                      border: `1px solid ${pushOptIn ? T.gold : T.inputBorder}`,
                    }}
                  >
                    <span
                      className="w-6 h-6 rounded-full flex items-center justify-center shrink-0 transition-all duration-200 mt-0.5"
                      style={{
                        border: `2px solid ${pushOptIn ? T.gold : 'rgba(212,175,55,0.35)'}`,
                        backgroundColor: pushOptIn ? T.gold : 'transparent',
                        boxShadow: pushOptIn ? '0 0 10px rgba(212,175,55,0.3)' : 'none',
                      }}
                    >
                      {pushOptIn && <Check className="w-3.5 h-3.5 text-white" strokeWidth={3} />}
                    </span>
                    <div className="flex-1">
                      <div className="flex items-center gap-1.5 mb-0.5">
                        <Bell className="w-3.5 h-3.5" style={{ color: T.gold }} />
                        <span className="text-sm font-semibold" style={{ color: T.text }}>
                          {isHe ? 'אשרי קבלת ליווי והסברי החלמה ישירות לנייד' : 'Receive recovery guidance directly on your phone'}
                        </span>
                      </div>
                      <span className="text-xs" style={{ color: T.textMuted }}>
                        {isHe ? 'תקבלי התראות עם טיפים מותאמים אישית לכל שלב בהחלמה' : "You'll get notifications with tips tailored to each recovery phase"}
                      </span>
                    </div>
                  </button>
                )}

                {/* Signature Pad */}
                <div className="space-y-3" ref={sigContainerRef}>
                  <label className="text-xs font-medium tracking-wide uppercase" style={{ color: T.gold }}>
                    {isHe ? 'חתמי כאן ✍️' : 'Sign Here ✍️'} *
                  </label>
                  <div
                    className="rounded-2xl overflow-hidden transition-shadow"
                    style={{
                      border: `2px dashed ${isDrawing ? T.gold : 'rgba(212,175,55,0.35)'}`,
                      boxShadow: isDrawing ? '0 0 24px rgba(212,175,55,0.15)' : 'none',
                      backgroundColor: '#fefefe',
                    }}
                  >
                    <canvas
                      ref={canvasRef}
                      className="w-full h-44 sm:h-36 touch-none cursor-crosshair"
                      onMouseDown={startDraw}
                      onMouseMove={draw}
                      onMouseUp={endDraw}
                      onMouseLeave={endDraw}
                      onTouchStart={startDraw}
                      onTouchMove={draw}
                      onTouchEnd={endDraw}
                    />
                  </div>
                  {!readOnly && (
                    <div className="flex items-center justify-between px-1">
                      <p className="text-[11px]" style={{ color: T.textMuted }}>
                        {isHe ? 'חתמי באצבע או בעט דיגיטלי' : 'Sign with your finger or stylus'}
                      </p>
                      <button
                        onClick={clearSignature}
                        className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-medium min-h-[44px] transition-colors active:scale-95"
                        style={{ color: '#E5484D', border: `1px solid rgba(229,72,77,0.3)`, backgroundColor: 'rgba(229,72,77,0.05)' }}
                      >
                        <Eraser className="w-3.5 h-3.5" />
                        {isHe ? 'ניקוי חתימה' : 'Clear'}
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </motion.div>
          )}
          </AnimatePresence>
        </div>
      </div>
      </div>

      {/* Sticky bottom navigation — always visible, never scrolled away */}
      {!readOnly && (
        <div
          className="flex-shrink-0 px-4 pb-5 pt-3 sm:pb-6"
          style={{ backgroundColor: 'rgba(228,218,217,0.95)', backdropFilter: 'blur(16px)', borderTop: `1px solid ${T.cardBorder}` }}
        >
          <div className="max-w-lg mx-auto flex gap-4 items-center">
            {step > 1 ? (
              <button
                onClick={() => setStep(s => s - 1)}
                className="py-3 px-5 rounded-full text-xs font-semibold transition-all flex items-center justify-center gap-1.5 min-h-[44px] active:scale-[0.97] shrink-0"
                style={{ border: `1.5px solid ${T.gold}`, color: T.gold, backgroundColor: 'transparent' }}
              >
                <ChevronRight className="w-3.5 h-3.5 rotate-180" />
                {isHe ? 'חזרה' : 'Back'}
              </button>
            ) : (
              <button
                onClick={onClose}
                className="py-3 px-5 rounded-full text-xs font-semibold transition-all flex items-center justify-center gap-1.5 min-h-[44px] active:scale-[0.97] shrink-0"
                style={{ border: `1.5px solid ${T.gold}`, color: T.gold, backgroundColor: 'transparent' }}
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                {isHe ? 'חזרה' : 'Back'}
              </button>
            )}
            {step < STEPS ? (
              <button
                onClick={() => setStep(s => s + 1)}
                disabled={step === 1 && !canProceedStep1}
                className="flex-1 py-3.5 rounded-full text-sm font-bold transition-all flex items-center justify-center gap-2 disabled:opacity-40 min-h-[48px] active:scale-[0.97] text-white"
                style={{ background: T.gradient, border: '1px solid rgba(92,64,51,0.3)', boxShadow: '0 6px 24px rgba(212,175,55,0.3)' }}
              >
                {isHe ? 'המשך לשלב הבא' : 'Next Step'}
                <ChevronLeft className="w-4 h-4 rotate-180" />
              </button>
            ) : (
              <button
                onClick={handleSubmit}
                disabled={!canProceedStep3 || isSubmitting}
                className="flex-1 py-4 rounded-full text-base font-bold transition-all flex items-center justify-center gap-2 disabled:opacity-40 min-h-[52px] active:scale-[0.97] text-white"
                style={{ background: T.gradient, border: '1px solid rgba(92,64,51,0.3)', boxShadow: '0 8px 32px rgba(212,175,55,0.35)' }}
              >
                {isSubmitting ? <Loader2 className="w-5 h-5 animate-spin" /> : <Check className="w-5 h-5" />}
                {isHe ? 'שליחת הצהרת בריאות' : 'Submit'}
              </button>
            )}
          </div>
        </div>
      )}

      {readOnly && (
        <div
          className="flex-shrink-0 px-4 pb-5 pt-3"
          style={{ backgroundColor: 'rgba(228,218,217,0.95)', backdropFilter: 'blur(16px)', borderTop: `1px solid ${T.cardBorder}` }}
        >
          <div className="max-w-lg mx-auto">
            <button
              onClick={onClose}
              className="w-full py-4 rounded-full text-sm font-medium transition-all min-h-[52px] active:scale-[0.97]"
              style={{ border: `1px solid ${T.cardBorder}`, color: T.textMuted, backgroundColor: T.card }}
            >
              {isHe ? 'סגירה' : 'Close'}
            </button>
          </div>
        </div>
      )}

      {/* Powered by GlowPush — viral growth watermark */}
      <div className="flex-shrink-0 py-5 text-center">
        <a
          href="/"
          target="_blank"
          rel="noopener noreferrer"
          className="inline-block group"
        >
          <p className="text-xs font-medium" style={{ color: 'rgba(169,113,66,0.45)' }}>
            נוצר באמצעות <span className="font-semibold" style={{ color: 'rgba(212,175,55,0.6)' }}>Glow Push</span> ✨
          </p>
          <p className="text-[10px] mt-0.5 group-hover:underline" style={{ color: 'rgba(169,113,66,0.3)' }}>
            המערכת החכמה לניהול קליניקות
          </p>
        </a>
      </div>
    </div>
  );
}

/* Minimalist underline input */
function WhiteFieldInput({ label, required, value, onChange, disabled, placeholder, dir, inputMode, type, maxLength, pattern, error }: {
  label: string;
  required?: boolean;
  value: string;
  onChange: (v: string) => void;
  disabled?: boolean;
  placeholder?: string;
  dir?: string;
  inputMode?: 'numeric' | 'tel' | 'text';
  type?: string;
  maxLength?: number;
  pattern?: string;
  error?: string;
}) {
  return (
    <div className="space-y-1">
      <label className="text-[11px] font-medium tracking-widest uppercase" style={{ color: T.textLabel }}>
        {label} {required && '*'}
      </label>
      <input
        type={type || 'text'}
        value={value}
        onChange={e => onChange(e.target.value)}
        disabled={disabled}
        placeholder={placeholder}
        dir={dir}
        inputMode={inputMode}
        maxLength={maxLength}
        pattern={pattern}
        className="w-full px-1 py-3 text-base outline-none transition-all duration-300 min-h-[44px] font-sans font-light disabled:opacity-60 border-b-[1.5px]"
        style={{
          backgroundColor: 'transparent',
          borderColor: error ? '#E5484D' : T.inputBorder,
          color: T.text,
          letterSpacing: '0.02em',
          lineHeight: '1.7',
        }}
        onFocus={e => {
          if (!error) {
            e.target.style.borderColor = T.inputFocus;
            e.target.style.boxShadow = `0 2px 0 0 ${T.gold}`;
          }
          e.target.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }}
        onBlur={e => {
          if (!error) {
            e.target.style.borderColor = T.inputBorder;
            e.target.style.boxShadow = 'none';
          }
        }}
      />
      {error && (
        <p className="text-[11px] font-medium mt-1" style={{ color: '#E5484D' }}>{error}</p>
      )}
    </div>
  );
}

function LogoCircle({ logoUrl }: { logoUrl?: string }) {
  const safeLogo = logoUrl && !logoUrl.includes('svg+xml') ? logoUrl : undefined;
  return (
    <div
      className="w-24 h-24 rounded-full overflow-hidden flex items-center justify-center hd-shimmer-border"
      style={{ border: `2.5px solid ${T.gold}`, backgroundColor: '#fff', boxShadow: '0 0 30px rgba(169,113,66,0.12)' }}
    >
      {safeLogo ? (
        <img src={safeLogo} alt="Studio Logo" className="w-full h-full object-cover" onError={(e) => { (e.target as HTMLImageElement).src = glowpushLogoImg; }} />
      ) : (
        <span className="font-serif text-2xl font-bold" style={{ color: T.gold }}>GP</span>
      )}
    </div>
  );
}
