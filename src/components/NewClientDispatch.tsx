import { useState, useEffect } from 'react';
import { useI18n } from '@/lib/i18n';
import { TREATMENT_OPTIONS } from '@/lib/treatment-options';
import { Share2, Smartphone, Copy, Clock, CheckCircle, ArrowLeft, AlertTriangle, ScrollText } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import PremiumPolicySwitch from '@/components/PremiumPolicySwitch';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

export interface DispatchPrefill {
  name?: string;
  phone?: string;
  treatment?: string;
  date?: string;
  time?: string;
}

interface NewClientDispatchProps {
  open: boolean;
  onClose: () => void;
  artistName: string;
  artistPhone: string;
  logoUrl: string;
  origin: string;
  formatPhone: (raw: string) => string;
  onClientCreated: (client: { name: string; phone: string; treatment: string; link: string }) => void;
  onFillHere: (clientName: string, treatmentType: string) => void;
  sentPhones?: string[];
  prefill?: DispatchPrefill | null;
  artistProfileId?: string;
}

const normalizePhone = (p: string) => p.replace(/[^0-9]/g, '');

const GOLD = '#D4AF37';
const GOLD_DARK = '#B8860B';
const GOLD_GRADIENT = 'linear-gradient(135deg, #B8860B 0%, #D4AF37 30%, #F9F295 50%, #D4AF37 70%, #B8860B 100%)';
const GOLD_BORDER = '2px solid #D4AF37';
const GOLD_TEXT = '#4a3636';

const NewClientDispatch = ({
  open, onClose, artistName, artistPhone, logoUrl, origin,
  formatPhone, onClientCreated, onFillHere, sentPhones = [], prefill, artistProfileId,
}: NewClientDispatchProps) => {
  const { lang } = useI18n();
  const { toast } = useToast();

  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [treatment, setTreatment] = useState('');
  const [dispatched, setDispatched] = useState(false);
  const [generatedLink, setGeneratedLink] = useState('');
  const [copied, setCopied] = useState(false);
  const [duplicateAck, setDuplicateAck] = useState(false);
  const [includePolicy, setIncludePolicy] = useState(true);

  useEffect(() => {
    if (open && prefill) {
      if (prefill.name) setName(prefill.name);
      if (prefill.phone) setPhone(prefill.phone);
      if (prefill.treatment) setTreatment(prefill.treatment);
    }
  }, [open, prefill]);

  const treatmentOptions = TREATMENT_OPTIONS;

  const isDuplicate = phone.trim().length >= 7 && sentPhones.some(p => {
    const norm = normalizePhone(phone);
    const sentNorm = normalizePhone(p);
    return norm.length >= 7 && sentNorm.length >= 7 && (sentNorm.endsWith(norm) || norm.endsWith(sentNorm));
  });

  /** Insert client to DB and return the new ID */
  const ensureClientInDb = async (): Promise<string | undefined> => {
    if (!artistProfileId) return undefined;
    try {
      const treatLabel = treatmentOptions.find(o => o.value === treatment);
      const { data, error } = await supabase.from('clients').insert({
        artist_id: artistProfileId,
        full_name: name,
        phone: phone || null,
        treatment_type: treatLabel ? (lang === 'en' ? treatLabel.en : treatLabel.he) : treatment,
        treatment_date: new Date().toISOString().split('T')[0],
      }).select('id').single();
      if (error) throw error;
      return data?.id;
    } catch (err) {
      console.error('Failed to save client to DB:', err);
      return undefined;
    }
  };

  /** Create a short form_link and return the short URL */
  const buildShortLink = async (clientId?: string): Promise<string> => {
    if (!artistProfileId) {
      // Fallback: no artist profile, use inline params
      const params = new URLSearchParams({ name, treatment });
      return `${origin}/health-declaration?${params.toString()}`;
    }
    try {
      const { data, error } = await supabase.from('form_links').insert({
        artist_id: artistProfileId,
        client_name: name,
        client_phone: phone || null,
        logo_url: logoUrl || null,
        artist_phone: artistPhone ? formatPhone(artistPhone) : null,
        treatment_type: treatment,
        include_policy: includePolicy,
        client_id: clientId || null,
        artist_name: artistName || '',
      } as any).select('code').single();
      if (error) throw error;
      return `${origin}/f/${data.code}`;
    } catch (err) {
      console.error('Failed to create short link:', err);
      // Fallback to long URL
      const params = new URLSearchParams({ name, treatment });
      if (artistProfileId) params.set('artist_id', artistProfileId);
      if (includePolicy) params.set('include_policy', 'true');
      return `${origin}/health-declaration?${params.toString()}`;
    }
  };

  const isValid = name.trim().length >= 2 && !!treatment;

  const buildMessage = (link: string) => {
    const firstName = name.trim().split(/\s+/)[0];
    const senderName = artistName || (lang === 'en' ? 'Your artist' : 'המטפלת שלך');
    if (lang === 'en') {
      return includePolicy
        ? `Hello ${firstName}! Can't wait to see you! ✨\n\nHere's your personal link that includes our clinic policy and health declaration form:\n\n${link}\n\nSee you soon!\n\n${senderName} 💖`
        : `Hello ${firstName}! Can't wait to see you! ✨\n\nFor your treatment, please fill out the health declaration form at the link below:\n\n${link}\n\nSee you soon!\n\n${senderName} 💖`;
    }
    return includePolicy
      ? `שלום ${firstName} יקירה, מחכה לראותך! ✨\n\nמצורף קישור אישי הכולל את מדיניות הקליניקה וטופס הצהרת בריאות:\n\n${link}\n\nנתראה בקרוב!\n\n${senderName} 💖`
      : `שלום ${firstName} יקירה, מחכה לראותך! ✨\n\nלצורך הטיפול, אנא מילאי הצהרת בריאות בקישור:\n\n${link}\n\nנתראה בקרוב!\n\n${senderName} 💖`;
  };

  const markDispatched = (link: string) => {
    setGeneratedLink(link);
    setDispatched(true);
    const treatLabel = treatmentOptions.find(o => o.value === treatment);
    onClientCreated({
      name,
      phone,
      treatment: treatLabel ? (lang === 'en' ? treatLabel.en : treatLabel.he) : treatment,
      link,
    });
  };

  const handleSendWhatsApp = async () => {
    if (!isValid) return;
    if (isDuplicate && !duplicateAck) return;
    const clientId = await ensureClientInDb();
    const link = buildLink(clientId);
    const msg = buildMessage(link);

    // Try native Web Share API first
    if (navigator.share) {
      try {
        await navigator.share({
          title: lang === 'en' ? 'Health Declaration Form' : 'הצהרת בריאות לטיפול',
          text: msg,
        });
        markDispatched(link);
        return;
      } catch (err: any) {
        // User cancelled share — that's fine, don't fallback
        if (err?.name === 'AbortError') return;
      }
    }

    // Fallback: open WhatsApp directly
    const encoded = encodeURIComponent(msg);
    const cleanPhone = phone.trim() ? formatPhone(phone) : '';
    const url = cleanPhone
      ? `https://wa.me/${cleanPhone}?text=${encoded}`
      : `https://wa.me/?text=${encoded}`;
    window.open(url, '_blank');
    markDispatched(link);
  };

  const handleFillHere = async () => {
    if (!isValid) return;
    await ensureClientInDb();
    const treatLabel = treatmentOptions.find(o => o.value === treatment);
    onClientCreated({
      name,
      phone,
      treatment: treatLabel ? (lang === 'en' ? treatLabel.en : treatLabel.he) : treatment,
      link: '',
    });
    onFillHere(name, treatment);
    handleClose();
  };

  const handleCopyLink = async () => {
    if (!isValid) return;
    if (isDuplicate && !duplicateAck) return;
    let link = generatedLink;
    if (!link) {
      const clientId = await ensureClientInDb();
      link = buildLink(clientId);
      markDispatched(link);
    }
    await navigator.clipboard.writeText(link);
    setCopied(true);
    toast({ title: lang === 'en' ? 'Link copied!' : 'הקישור הועתק!' });
    setTimeout(() => setCopied(false), 2000);
  };

  const handleClose = () => {
    setName('');
    setPhone('');
    setTreatment('');
    setDispatched(false);
    setGeneratedLink('');
    setCopied(false);
    setDuplicateAck(false);
    setIncludePolicy(true);
    onClose();
  };

  if (!open) return null;

  const inputStyle = "h-12 rounded-full bg-white text-base px-5 focus:ring-2 focus:ring-accent/40 focus:outline-none transition-shadow";

  return (
    <div className="fixed inset-0 z-[60] flex flex-col bg-background">
      {/* Header bar */}
      <div className="flex-shrink-0 px-4 py-3.5 flex items-center gap-3" style={{ borderBottom: `1px solid ${GOLD}30` }}>
        <button
          onClick={handleClose}
          className="p-2 rounded-full transition-colors"
          style={{ color: GOLD_DARK }}
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <h2 className="font-sans font-bold text-lg flex-1" style={{ color: '#2a2a2a' }}>
          {lang === 'en' ? 'Add Client & Send Form' : 'הוספת לקוחה ושליחת טופס'}
        </h2>
      </div>

      {/* Scrollable content */}
      <div className="flex-1 overflow-y-auto">
        <div className="p-5 space-y-5 max-w-md mx-auto">
          {/* Input Fields */}
          <div className="space-y-4">
            <div>
              <Label className="text-xs font-bold mb-1.5 block" style={{ color: GOLD_DARK }}>
                {lang === 'en' ? 'Client Name' : 'שם הלקוחה'}
              </Label>
              <Input
                value={name}
                onChange={e => setName(e.target.value)}
                placeholder={lang === 'en' ? 'e.g. Dana Cohen' : 'למשל דנה כהן'}
                className={inputStyle}
                style={{ border: GOLD_BORDER }}
              />
            </div>
            <div>
              <Label className="text-xs font-bold mb-1.5 block" style={{ color: GOLD_DARK }}>
                {lang === 'en' ? 'Phone Number' : 'מספר טלפון'}
              </Label>
              <Input
                value={phone}
                onChange={e => { setPhone(e.target.value); setDuplicateAck(false); }}
                placeholder="050-1234567"
                type="tel"
                className={inputStyle}
                style={{ border: GOLD_BORDER }}
                dir="ltr"
              />
            </div>
            <div>
              <Label className="text-xs font-bold mb-1.5 block" style={{ color: GOLD_DARK }}>
                {lang === 'en' ? 'Treatment Type' : 'סוג הטיפול'}
              </Label>
              <Select value={treatment} onValueChange={setTreatment}>
                <SelectTrigger
                  className="h-12 rounded-full bg-white text-base px-5"
                  style={{ border: GOLD_BORDER }}
                >
                  <SelectValue placeholder={lang === 'en' ? 'Select treatment...' : 'בחרי סוג טיפול...'} />
                </SelectTrigger>
                <SelectContent className="z-[70]">
                  {treatmentOptions.map(opt => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {opt.value === 'eyebrows' ? '✍️ ' : opt.value === 'lips' ? '👄 ' : '👁️ '}
                      {lang === 'en' ? opt.en : opt.he}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Policy Toggle */}
          <div
            className="flex items-center justify-between gap-3 p-4 rounded-2xl"
            style={{ background: `${GOLD}08`, border: `1px solid ${GOLD}25` }}
          >
            <div className="flex items-center gap-2.5 flex-1 min-w-0">
              <ScrollText className="w-4.5 h-4.5 flex-shrink-0" style={{ color: GOLD_DARK }} />
              <label htmlFor="include-policy" className="text-xs font-bold leading-snug cursor-pointer" style={{ color: GOLD_DARK }}>
                {lang === 'en' ? 'Include Clinic Policy & Treatment Agreement' : 'צרפי גם את מדיניות הקליניקה והסכם הטיפול'}
              </label>
            </div>
            <PremiumPolicySwitch
              id="include-policy"
              checked={includePolicy}
              onCheckedChange={setIncludePolicy}
            />
          </div>

          {/* Duplicate Warning */}
          {isDuplicate && !duplicateAck && (
            <div className="p-4 rounded-2xl animate-fade-up" style={{ background: `${GOLD}12`, border: `1px solid ${GOLD}35` }}>
              <div className="flex items-start gap-3">
                <AlertTriangle className="w-5 h-5 flex-shrink-0 mt-0.5" style={{ color: GOLD_DARK }} />
                <div className="flex-1">
                  <p className="text-sm font-bold" style={{ color: GOLD_DARK }}>
                    {lang === 'en' ? 'A link was already sent to this client.' : 'כבר נשלח לינק ללקוחה זו.'}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {lang === 'en' ? 'Would you like to resend or fill here instead?' : 'האם תרצי לשלוח שוב או למלא במקום?'}
                  </p>
                  <div className="flex gap-2 mt-3">
                    <button onClick={() => setDuplicateAck(true)}
                      className="flex-1 py-2 rounded-full text-xs font-bold text-white transition-all active:scale-95"
                      style={{ background: GOLD_GRADIENT }}>
                      {lang === 'en' ? 'Resend Anyway' : 'שלחי שוב'}
                    </button>
                    <button onClick={handleFillHere}
                      className="flex-1 py-2 rounded-full text-xs font-bold transition-all active:scale-95"
                      style={{ border: GOLD_BORDER, color: GOLD_TEXT, background: 'transparent' }}>
                      {lang === 'en' ? 'Fill Here' : 'מלאי כאן'}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Save Client Only */}
          <div className="pt-2">
            <button onClick={async () => {
              if (!isValid) return;
              await ensureClientInDb();
              const treatLabel = treatmentOptions.find(o => o.value === treatment);
              onClientCreated({
                name,
                phone,
                treatment: treatLabel ? (lang === 'en' ? treatLabel.en : treatLabel.he) : treatment,
                link: '',
              });
              toast({ title: lang === 'en' ? 'Client saved successfully ✨' : 'הלקוחה נשמרה בהצלחה ✨' });
              handleClose();
            }} disabled={!isValid}
              className="w-full py-3.5 rounded-full font-bold text-sm flex items-center justify-center gap-2.5 transition-all active:scale-[0.97] disabled:opacity-40 disabled:pointer-events-none"
              style={{ border: '2px solid #D4AF37', color: isValid ? '#4a3636' : '#aaa', background: isValid ? GOLD_GRADIENT : '#f0f0f0', boxShadow: isValid ? '0 2px 8px rgba(212, 175, 55, 0.15)' : 'none' }}>
              <CheckCircle className="w-5 h-5" />
              {lang === 'en' ? 'Save Client Only' : 'שמירת לקוחה בלבד'}
            </button>
          </div>

          {/* Action Buttons */}
          <div className="space-y-3">
            {/* Primary: WhatsApp */}
            <button onClick={handleSendWhatsApp} disabled={!isValid || (isDuplicate && !duplicateAck)}
              className="w-full py-3.5 rounded-full font-bold text-sm flex items-center justify-center gap-2.5 transition-all active:scale-[0.97] disabled:opacity-40 disabled:pointer-events-none"
              style={{ background: GOLD_GRADIENT, color: GOLD_TEXT, boxShadow: '0 4px 18px rgba(212, 175, 55, 0.35)', border: 'none' }}>
              <Share2 className="w-5 h-5" />
              {lang === 'en' ? 'Save & Send Link' : 'שמירה ושליחת לינק'}
            </button>

            {/* Secondary: Fill Here */}
            <button onClick={handleFillHere} disabled={!isValid}
              className="w-full py-3.5 rounded-full font-bold text-sm flex items-center justify-center gap-2.5 transition-all active:scale-[0.97] disabled:opacity-40 disabled:pointer-events-none"
              style={{ border: GOLD_BORDER, color: GOLD_TEXT, background: 'transparent', boxShadow: '0 2px 8px rgba(212, 175, 55, 0.15)' }}>
              <Smartphone className="w-5 h-5" />
              {lang === 'en' ? 'Save & Fill Here' : 'שמירה ומילוי במקום'}
            </button>

            {/* Tertiary: Copy Link */}
            <button onClick={handleCopyLink} disabled={!isValid || (isDuplicate && !duplicateAck)}
              className="w-full py-3.5 rounded-full font-bold text-sm flex items-center justify-center gap-2.5 transition-all active:scale-[0.97] disabled:opacity-40 disabled:pointer-events-none"
              style={{ border: GOLD_BORDER, color: GOLD_TEXT, background: 'transparent', boxShadow: '0 2px 8px rgba(212, 175, 55, 0.15)' }}>
              {copied ? <CheckCircle className="w-5 h-5" style={{ color: '#22c55e' }} /> : <Copy className="w-5 h-5" />}
              {copied ? (lang === 'en' ? 'Copied!' : 'הועתק!') : (lang === 'en' ? 'Save & Copy Link' : 'שמירה והעתקת לינק')}
            </button>
          </div>

          {/* Status Tracker */}
          {dispatched && (
            <div className="flex items-center gap-3 p-3.5 rounded-2xl animate-fade-up" style={{ background: `${GOLD}12`, border: `1px solid ${GOLD}30` }}>
              <Clock className="w-4 h-4 flex-shrink-0 animate-pulse" style={{ color: GOLD }} />
              <div className="flex-1">
                <p className="text-sm font-bold" style={{ color: GOLD_DARK }}>
                  {lang === 'en' ? 'Pending...' : 'מחכה למילוי הטופס...'}
                </p>
                <p className="text-[10px] text-muted-foreground mt-0.5">
                  {lang === 'en' ? `Link sent to ${name}. Waiting for form completion.` : `הלינק נשלח ל${name}. ממתינה למילוי.`}
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default NewClientDispatch;
