import { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Phone, MessageCircle, Instagram, Facebook } from 'lucide-react';
import heroBg from '@/assets/card-hero-bg.jpg';
import roseGoldTexture from '@/assets/rose-gold-metal-texture.jpg';
import defaultLogo from '@/assets/glowpush-logo.png';
import { useI18n } from '@/lib/i18n';

const WHATSAPP_NUMBER = '972508855329';
const WHATSAPP_MESSAGE = 'היי! הגעתי דרך הכרטיס הדיגיטלי, אשמח לקבל פרטים ולתאם תור ✨';


interface DigitalCardProps {
  embedded?: boolean;
  previewName?: string;
  previewPhone?: string;
  previewLogo?: string;
  previewIg?: string;
  previewFacebook?: string;
  previewWaze?: string;
}

const DigitalCard = ({ embedded, previewName, previewPhone, previewLogo, previewIg, previewFacebook }: DigitalCardProps = {}) => {
  const [searchParams] = useSearchParams();
  const [profileError, setProfileError] = useState(false);
  const { lang } = useI18n();
  const isHe = lang === 'he';

  const name = previewName || searchParams.get('name') || 'Orit Aharoni';
  const phone = previewPhone || searchParams.get('phone') || WHATSAPP_NUMBER;
  const ig = previewIg ?? searchParams.get('ig') ?? '';
  const logo = previewLogo || searchParams.get('logo') || '';
  const facebook = previewFacebook ?? searchParams.get('facebook') ?? '';

  const cleanPhone = phone.replace(/[^0-9]/g, '');
  const intlPhone = cleanPhone.startsWith('0') ? `972${cleanPhone.slice(1)}` : cleanPhone;
  const whatsappUrl = `https://wa.me/${intlPhone}?text=${encodeURIComponent(WHATSAPP_MESSAGE)}`;
  const telUrl = `tel:${phone}`;

  const igUrl = ig ? (ig.startsWith('http') ? ig : `https://instagram.com/${ig}`) : '';
  const fbUrl = facebook ? (facebook.startsWith('http') ? facebook : `https://facebook.com/${facebook}`) : '';

  return (
    <div className="min-h-screen flex flex-col items-center" dir="rtl" style={{ backgroundColor: '#FFFFFF' }}>
      {/* ===== HERO with fade ===== */}
      <div className="relative w-full">
        <img
          src={heroBg}
          alt="Permanent Makeup"
          className="w-full h-64 object-cover"
        />
        <div className="absolute inset-0" style={{ background: 'linear-gradient(to bottom, transparent 50%, #FFFFFF 100%)' }} />
      </div>

      {/* ===== LOGO & NAME ===== */}
      <div className="relative -mt-24 z-10 flex flex-col items-center gap-0 px-6">
        {(logo || !profileError) ? (
          <div className="w-full max-w-sm overflow-hidden flex items-center justify-center">
            <img
              src={logo || defaultLogo}
              alt={name}
              className="w-full h-auto object-contain"
              onError={() => setProfileError(true)}
            />
          </div>
        ) : (
          <div className="w-full max-w-sm aspect-square rounded-full bg-transparent flex items-center justify-center shadow-[0_4px_20px_rgba(0,0,0,0.1)]">
            <span className="text-gold-gradient font-serif text-5xl font-bold">
              {name.slice(0, 2)}
            </span>
          </div>
        )}

        <div className="text-center -mt-2">
          <h1 className="text-2xl font-extralight tracking-widest text-foreground">{name}</h1>
          <h2 className="text-sm text-muted-foreground mt-0.5 tracking-wider font-light">{isHe ? 'אמנית איפור קבוע' : 'Permanent Makeup Artist'}</h2>
        </div>
      </div>

      {/* ===== 2x2 CIRCLE GRID ===== */}
      <div className="w-full max-w-sm grid grid-cols-2 gap-6 mt-10 px-6">
        <CircleButton
          href={whatsappUrl}
          icon={<MessageCircle className="w-7 h-7" />}
          label={isHe ? 'שלחי הודעה בוואטסאפ' : 'Message on WhatsApp'}
        />
        <CircleButton
          href={telUrl}
          icon={<Phone className="w-7 h-7" />}
          label={isHe ? 'התקשרי עכשיו' : 'Call Now'}
          isPhone
        />
        <CircleButton
          href={fbUrl || '#'}
          icon={<Facebook className="w-7 h-7" />}
          label={isHe ? 'פייסבוק' : 'Facebook'}
          disabled={!fbUrl}
        />
        <CircleButton
          href={igUrl || '#'}
          icon={<Instagram className="w-7 h-7" />}
          label={isHe ? 'אינסטגרם' : 'Instagram'}
          disabled={!igUrl}
        />
      </div>

      {/* ===== Share on WhatsApp Button ===== */}
      <div className="w-full max-w-sm px-6 mt-10 mb-10">
        <a
          href={`https://wa.me/?text=${encodeURIComponent(`היי אהובה! ✨ מזמינה אותך להציץ בכרטיס הדיגיטלי החדש של הסטודיו. כל הדרכים ליצור איתי קשר ולראות עבודות נמצאות כאן בקליק אחד:\n${window.location.origin}/digital-card${window.location.search}`)}`}
          target="_blank"
          rel="noopener noreferrer"
          className="w-full py-3.5 text-sm font-bold flex items-center justify-center gap-2 rounded-2xl transition-all hover:opacity-90 active:scale-[0.97] no-underline"
          style={{
            background: 'linear-gradient(135deg, #B8860B 0%, #D4AF37 30%, #F9F295 50%, #D4AF37 70%, #B8860B 100%)',
            color: '#4a3636',
          }}
        >
          <MessageCircle className="w-5 h-5" />
          {isHe ? 'שתפי בוואטסאפ' : 'Share on WhatsApp'}
        </a>
      </div>

    </div>
  );
};

/* ── Circle Button ── */
function CircleButton({
  href,
  icon,
  label,
  isPhone,
  disabled,
}: {
  href: string;
  icon: React.ReactNode;
  label: string;
  isPhone?: boolean;
  disabled?: boolean;
}) {
  const inner = (
    <div
      className="w-[130px] h-[130px] rounded-full p-[3px] shadow-[0_4px_16px_rgba(216,180,180,0.35)] transition-all duration-200 hover:shadow-[0_6px_24px_rgba(216,180,180,0.5)] active:scale-95 relative overflow-hidden"
      style={{
        background: 'linear-gradient(135deg, #d8b4b4 0%, #c9a0a0 40%, #dbc0c0 55%, #c9a0a0 100%)',
        border: '1px solid rgba(216, 180, 180, 0.5)',
      }}
    >
      {/* Subtle texture overlay */}
      <div className="absolute inset-0 rounded-full" style={{ backgroundImage: `url(${roseGoldTexture})`, backgroundSize: 'cover', backgroundPosition: 'center', opacity: 0.35 }} />
      <div className="w-full h-full rounded-full flex flex-col items-center justify-center gap-2 px-2 relative z-10">
        <span style={{ color: '#FFFFFF' }}>{icon}</span>
        <span className="text-[12px] font-bold text-center leading-tight px-1" style={{ color: '#FFFFFF', textShadow: '0 1px 2px rgba(0,0,0,0.1)' }}>{label}</span>
      </div>
    </div>
  );

  if (disabled) {
    return <div className="flex justify-center pointer-events-none">{inner}</div>;
  }

  return (
    <a
      href={href}
      target={isPhone ? '_self' : '_blank'}
      rel="noopener noreferrer"
      className="flex justify-center no-underline"
    >
      {inner}
    </a>
  );
}

export default DigitalCard;
