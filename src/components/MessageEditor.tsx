import { useState, useCallback, useRef, useEffect } from 'react';
import { MessageSquareText, Save, RotateCcw, Plus, Trash2, Clock, Bell, MessageCircle, Eye, Loader2, Check } from 'lucide-react';
import MessagePreviewModal from '@/components/MessagePreviewModal';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { useI18n } from '@/lib/i18n';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

type SendType = 'push' | 'whatsapp';
type TreatmentCategory = 'eyebrows' | 'lips';

interface MessageTemplate {
  id: string;
  labelHe: string;
  labelEn: string;
  icon: string;
  defaultTextHe: string;
  defaultTextEn: string;
  day: number | null;
  placeholdersHe: string[];
  placeholdersEn: string[];
  isCustom?: boolean;
  category?: TreatmentCategory;
}

/* ── Shared (category-less) templates ── */
const SHARED_TEMPLATES: MessageTemplate[] = [
  {
    id: 'welcome',
    labelHe: 'הודעת פתיחה ושאלון',
    labelEn: 'Welcome Message & Form',
    icon: '👋',
    day: null,
    defaultTextHe: 'היי {שם_לקוחה} אהובה, מתרגשת לקראת התור שלנו! ✨\n\nכדי שנוכל להתחיל את הטיפול ברוגע ולוודא שהכל מותאם עבורך בצורה מושלמת, אשמח שתקדישי דקה למילוי הצהרת הבריאות בלינק כאן למטה:\n\n{קישור_לשאלון}\n\nמחכה לראותך בקליניקה ולעשות לך הכי יפה שיש,\n\nאורית 💖',
    defaultTextEn: 'Hi {Client_Name}, we are so excited for your appointment! To ensure we are fully prepared, please complete your health declaration form here: {Form_Link}. Can\'t wait to see you!',
    placeholdersHe: ['{שם_לקוחה}', '{קישור_לשאלון}'],
    placeholdersEn: ['{Client_Name}', '{Form_Link}'],
  },
];

/* ── Brows templates ── */
const BROWS_TEMPLATES: MessageTemplate[] = [
  {
    id: 'brows_day1',
    labelHe: 'ליווי החלמה — יום 1',
    labelEn: 'Recovery Follow-up — Day 1',
    icon: '🌅',
    day: 1,
    category: 'eyebrows',
    defaultTextHe: 'בוקר טוב {שם_לקוחה}, איך הגבות החדשות שלך? רק מזכירה למרוח את המשחה. הצבע עשוי להיראות כהה היום וזה טבעי לגמרי!',
    defaultTextEn: 'Good morning {Client_Name}, how are your new brows? Just a reminder to apply the ointment. The color may look dark today — that\'s completely normal!',
    placeholdersHe: ['{שם_לקוחה}'],
    placeholdersEn: ['{Client_Name}'],
  },
  {
    id: 'brows_day4',
    labelHe: 'ליווי החלמה — יום 4',
    labelEn: 'Recovery Follow-up — Day 4',
    icon: '🛡️',
    day: 4,
    category: 'eyebrows',
    defaultTextHe: 'היי {שם_לקוחה}, שלב הקילוף אולי התחיל. נא לא לגעת ולא לקלף! תני לזה לנשור לבד כדי לשמור על הפיגמנט.',
    defaultTextEn: 'Hi {Client_Name}, the peeling stage may have started. Please don\'t touch or pick! Let it flake off naturally to preserve the pigment.',
    placeholdersHe: ['{שם_לקוחה}'],
    placeholdersEn: ['{Client_Name}'],
  },
  {
    id: 'brows_day10',
    labelHe: 'ליווי החלמה — יום 10',
    labelEn: 'Recovery Follow-up — Day 10',
    icon: '✨',
    day: 10,
    category: 'eyebrows',
    defaultTextHe: 'תתחדשי {שם_לקוחה}! ההחלמה החיצונית הסתיימה. איך התוצאה נראית לך? אשמח לראות תמונה!',
    defaultTextEn: 'Looking great {Client_Name}! The external healing is complete. How does the result look? I\'d love to see a photo!',
    placeholdersHe: ['{שם_לקוחה}'],
    placeholdersEn: ['{Client_Name}'],
  },
];

/* ── Lips templates ── */
const LIPS_TEMPLATES: MessageTemplate[] = [
  {
    id: 'lips_day1',
    labelHe: 'ליווי החלמה — יום 1',
    labelEn: 'Recovery Follow-up — Day 1',
    icon: '💋',
    day: 1,
    category: 'lips',
    defaultTextHe: 'היי {שם_לקוחה}, איך השפתיים החדשות? זכרי לשתות בקש ביומיים הקרובים ולהימנע מאוכל חריף/חם מדי. אל תשכחי למרוח את המשחה!',
    defaultTextEn: 'Hi {Client_Name}, how are your new lips? Remember to drink with a straw for the next couple of days and avoid spicy/hot food. Don\'t forget to apply the ointment!',
    placeholdersHe: ['{שם_לקוחה}'],
    placeholdersEn: ['{Client_Name}'],
  },
  {
    id: 'lips_day3',
    labelHe: 'ליווי החלמה — יום 3',
    labelEn: 'Recovery Follow-up — Day 3',
    icon: '🛡️',
    day: 3,
    category: 'lips',
    defaultTextHe: 'בוקר טוב! השפתיים עשויות להרגיש יבשות או להתחיל להתקלף. זה הזמן להקפיד על לחות מקסימלית ולא לקלף!',
    defaultTextEn: 'Good morning! Your lips may feel dry or start peeling. Now is the time to keep them well-moisturized and avoid picking!',
    placeholdersHe: ['{שם_לקוחה}'],
    placeholdersEn: ['{Client_Name}'],
  },
  {
    id: 'lips_day10',
    labelHe: 'ליווי החלמה — יום 10',
    labelEn: 'Recovery Follow-up — Day 10',
    icon: '✨',
    day: 10,
    category: 'lips',
    defaultTextHe: 'תתחדשי! הצבע של השפתיים עשוי להיראות בהיר כרגע, הוא יתייצב בשבועות הקרובים. איך התחושה?',
    defaultTextEn: 'Looking great! The lip color may appear lighter right now — it will settle in the coming weeks. How does it feel?',
    placeholdersHe: ['{שם_לקוחה}'],
    placeholdersEn: ['{Client_Name}'],
  },
];

// Keep old IDs mapped for backward compat
const LEGACY_ID_MAP: Record<string, string> = {
  healing_day1: 'brows_day1',
  healing_day4: 'brows_day4',
  healing_day10: 'brows_day10',
};

const STORAGE_KEY = 'gp-message-templates-v2';

type AppLanguage = 'he' | 'en';

const getLanguageDraftKey = (templateId: string, language: AppLanguage) => `${templateId}__${language}`;

const getLegacyDraftFallback = (draftMap: Record<string, string>, templateId: string): string | undefined => {
  return draftMap[templateId];
};

const getTemplateDefaultText = (template: MessageTemplate, language: AppLanguage): string => {
  return language === 'en' ? template.defaultTextEn : template.defaultTextHe;
};

interface SavedState {
  drafts: Record<string, string>;
  days: Record<string, number | null>;
  sendTypes: Record<string, SendType>;
  customTemplates: MessageTemplate[];
}

function loadSavedLocal(): SavedState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      const migrated = { ...parsed };
      for (const [oldId, newId] of Object.entries(LEGACY_ID_MAP)) {
        if (migrated.drafts?.[oldId] && !migrated.drafts[newId]) {
          migrated.drafts[newId] = migrated.drafts[oldId];
          delete migrated.drafts[oldId];
        }
        if (migrated.days?.[oldId] !== undefined && migrated.days[newId] === undefined) {
          migrated.days[newId] = migrated.days[oldId];
          delete migrated.days[oldId];
        }
      }
      return migrated;
    }
  } catch {}
  return { drafts: {}, days: {}, sendTypes: {}, customTemplates: [] };
}

/* ── SVG icons ── */
const BrowIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" className="w-5 h-5">
    <path d="M3 12c2-4 6-7 10-7s7 3 8 7" />
    <path d="M3 12c2-2 5-3 8-3" />
  </svg>
);
const LipIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5">
    <path d="M12 18c-4 0-7-2-7-5 0-1.5 1.5-3 3-4l4-3 4 3c1.5 1 3 2.5 3 4 0 3-3 5-7 5z" />
    <path d="M5 13h14" />
  </svg>
);

/* ── Helper to get label/text by lang ── */
function tpl(template: MessageTemplate, field: 'label' | 'defaultText' | 'placeholders', lang: string) {
  if (field === 'label') return lang === 'en' ? template.labelEn : template.labelHe;
  if (field === 'defaultText') return lang === 'en' ? template.defaultTextEn : template.defaultTextHe;
  return lang === 'en' ? template.placeholdersEn : template.placeholdersHe;
}

/* ── Stable day input that only commits on blur ── */
function DayInput({ value, onChange }: { value: number; onChange: (v: number) => void }) {
  const [local, setLocal] = useState(String(value));
  useEffect(() => { setLocal(String(value)); }, [value]);
  return (
    <Input
      type="number"
      inputMode="numeric"
      pattern="[0-9]*"
      min={1}
      max={60}
      value={local}
      onChange={(e) => setLocal(e.target.value)}
      onBlur={() => {
        const parsed = parseInt(local) || 1;
        const clamped = Math.max(1, Math.min(60, parsed));
        setLocal(String(clamped));
        onChange(clamped);
      }}
      className="w-16 h-7 text-center text-xs bg-card border-accent/25 rounded-lg"
      dir="ltr"
      style={{ fontSize: '16px' }}
    />
  );
}

export default function MessageEditor() {
  const { toast } = useToast();
  const { lang } = useI18n();
  const { user } = useAuth();
  const isEn = lang === 'en';
  const currentLanguage: AppLanguage = isEn ? 'en' : 'he';
  const localSaved = loadSavedLocal();
  const [previewId, setPreviewId] = useState<string | null>(null);
  const textareaRefs = useRef<Record<string, HTMLTextAreaElement | null>>({});
  const [saving, setSaving] = useState(false);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [savedIds, setSavedIds] = useState<Set<string>>(new Set());
  const [profileId, setProfileId] = useState<string | null>(null);
  const [dbLoaded, setDbLoaded] = useState(false);

  const [activeCategory, setActiveCategory] = useState<TreatmentCategory>('eyebrows');
  const [customTemplates, setCustomTemplates] = useState<MessageTemplate[]>(localSaved.customTemplates || []);

  const getCategoryTemplates = (category: TreatmentCategory) => {
    const builtIn = category === 'eyebrows' ? BROWS_TEMPLATES : LIPS_TEMPLATES;
    const custom = customTemplates.filter(t => (t.category || 'eyebrows') === category);
    return [...SHARED_TEMPLATES, ...builtIn, ...custom];
  };

  const allTemplatesForInit = [...SHARED_TEMPLATES, ...BROWS_TEMPLATES, ...LIPS_TEMPLATES, ...customTemplates];

  const getDefaultText = (template: MessageTemplate, language: AppLanguage = currentLanguage) => getTemplateDefaultText(template, language);

  const [drafts, setDrafts] = useState<Record<string, string>>(() => {
    const savedDrafts = localSaved.drafts ?? {};
    const initial: Record<string, string> = { ...savedDrafts };

    allTemplatesForInit.forEach((template) => {
      const heKey = getLanguageDraftKey(template.id, 'he');
      const enKey = getLanguageDraftKey(template.id, 'en');
      initial[heKey] = savedDrafts[heKey] ?? getLegacyDraftFallback(savedDrafts, template.id) ?? template.defaultTextHe;
      initial[enKey] = savedDrafts[enKey] ?? template.defaultTextEn;
    });

    return initial;
  });

  const [days, setDays] = useState<Record<string, number | null>>(() => {
    const initial: Record<string, number | null> = {};
    allTemplatesForInit.forEach(t => {
      initial[t.id] = localSaved.days[t.id] !== undefined ? localSaved.days[t.id] : t.day;
    });
    return initial;
  });

  const [sendTypes, setSendTypes] = useState<Record<string, SendType>>(() => {
    const initial: Record<string, SendType> = {};
    allTemplatesForInit.forEach(t => {
      initial[t.id] = localSaved.sendTypes?.[t.id] || 'push';
    });
    return initial;
  });

  // Load profile ID + DB settings on mount
  useEffect(() => {
    if (!user) return;
    (async () => {
      const { data: profile } = await supabase
        .from('profiles')
        .select('id')
        .eq('user_id', user.id)
        .single();
      if (!profile) return;
      setProfileId(profile.id);

      const { data: settingsRow } = await (supabase as any)
        .from('artist_message_settings')
        .select('settings')
        .eq('artist_profile_id', profile.id)
        .single();

      if (settingsRow?.settings) {
        const s = settingsRow.settings as SavedState;
        if (s.customTemplates?.length) setCustomTemplates(s.customTemplates);
        if (s.drafts) {
          const allTemplates = [...SHARED_TEMPLATES, ...BROWS_TEMPLATES, ...LIPS_TEMPLATES, ...(s.customTemplates ?? [])];
          setDrafts((prev) => {
            const next = { ...prev, ...s.drafts };
            allTemplates.forEach((template) => {
              const heKey = getLanguageDraftKey(template.id, 'he');
              const enKey = getLanguageDraftKey(template.id, 'en');
              next[heKey] = next[heKey] ?? getLegacyDraftFallback(next, template.id) ?? template.defaultTextHe;
              next[enKey] = next[enKey] ?? template.defaultTextEn;
            });
            return next;
          });
        }
        if (s.days) setDays(prev => ({ ...prev, ...s.days }));
        if (s.sendTypes) setSendTypes(prev => ({ ...prev, ...s.sendTypes }));
      }
      setDbLoaded(true);
    })();
  }, [user]);

  useEffect(() => {
    const allTemplates = [...SHARED_TEMPLATES, ...BROWS_TEMPLATES, ...LIPS_TEMPLATES, ...customTemplates];
    setDrafts((prev) => {
      const next = { ...prev };
      let changed = false;

      allTemplates.forEach((template) => {
        const heKey = getLanguageDraftKey(template.id, 'he');
        const enKey = getLanguageDraftKey(template.id, 'en');

        if (next[heKey] === undefined) {
          next[heKey] = getLegacyDraftFallback(next, template.id) ?? template.defaultTextHe;
          changed = true;
        }

        if (next[enKey] === undefined) {
          next[enKey] = template.defaultTextEn;
          changed = true;
        }
      });

      return changed ? next : prev;
    });
  }, [customTemplates]);

  useEffect(() => {
    const allTemplates = [...SHARED_TEMPLATES, ...BROWS_TEMPLATES, ...LIPS_TEMPLATES, ...customTemplates];
    setDrafts((prev) => {
      const next = { ...prev };

      allTemplates.forEach((template) => {
        const key = getLanguageDraftKey(template.id, currentLanguage);
        const fallbackText = currentLanguage === 'en'
          ? prev[key] ?? template.defaultTextEn
          : prev[key] ?? getLegacyDraftFallback(prev, template.id) ?? template.defaultTextHe;

        next[key] = fallbackText;
      });

      return next;
    });
  }, [currentLanguage, customTemplates]);

  const handleSave = useCallback(async () => {
    const state: SavedState = { drafts, days, sendTypes, customTemplates };
    // Always save to localStorage as fallback
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));

    // If profileId not yet loaded, try to fetch it now
    let pid = profileId;
    if (!pid && user) {
      const { data: profile } = await supabase
        .from('profiles')
        .select('id')
        .eq('user_id', user.id)
        .single();
      if (profile) {
        pid = profile.id;
        setProfileId(pid);
      }
    }

    if (!pid) {
      toast({ title: isEn ? 'Please log in to save to the cloud' : 'יש להתחבר כדי לשמור לענן', variant: 'destructive' });
      return;
    }

    setSaving(true);
    const { error } = await (supabase as any)
      .from('artist_message_settings')
      .upsert({
        artist_profile_id: pid,
        settings: state,
      }, { onConflict: 'artist_profile_id' });

    setSaving(false);
    if (error) {
      console.error('Save error:', error);
      toast({ title: isEn ? 'Error saving messages' : 'שגיאה בשמירת ההודעות', variant: 'destructive' });
    } else {
      toast({ title: isEn ? 'Messages saved to cloud ✅' : 'ההודעות נשמרו בהצלחה ✅' });
      // Mark onboarding checklist step as done
      try {
        const raw = localStorage.getItem('gp-onboarding-checklist');
        const checks = raw ? JSON.parse(raw) : {};
        if (!checks.pushMessages) {
          checks.pushMessages = true;
          localStorage.setItem('gp-onboarding-checklist', JSON.stringify(checks));
        }
      } catch {}
    }
  }, [drafts, days, sendTypes, customTemplates, toast, isEn, profileId, user]);

  const handleSaveSingle = useCallback(async (templateId: string) => {
    // Resolve profile
    let pid = profileId;
    if (!pid && user) {
      const { data: profile } = await supabase.from('profiles').select('id').eq('user_id', user.id).single();
      if (profile) { pid = profile.id; setProfileId(pid); }
    }
    if (!pid) {
      toast({ title: isEn ? 'Please log in to save' : 'יש להתחבר כדי לשמור', variant: 'destructive' });
      return;
    }
    setSavingId(templateId);
    const state: SavedState = { drafts, days, sendTypes, customTemplates };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    const { error } = await (supabase as any)
      .from('artist_message_settings')
      .upsert({ artist_profile_id: pid, settings: state }, { onConflict: 'artist_profile_id' });
    setSavingId(null);
    if (error) {
      console.error('Save error:', error);
      toast({ title: isEn ? 'Error saving' : 'שגיאה בשמירה', variant: 'destructive' });
    } else {
      setSavedIds(prev => new Set(prev).add(templateId));
      setTimeout(() => setSavedIds(prev => { const n = new Set(prev); n.delete(templateId); return n; }), 2000);
      // Mark onboarding checklist step as done
      try {
        const raw = localStorage.getItem('gp-onboarding-checklist');
        const checks = raw ? JSON.parse(raw) : {};
        if (!checks.pushMessages) {
          checks.pushMessages = true;
          localStorage.setItem('gp-onboarding-checklist', JSON.stringify(checks));
        }
      } catch {}
    }
  }, [drafts, days, sendTypes, customTemplates, toast, isEn, profileId, user]);

  const handleReset = useCallback((templateId: string) => {
    const allBuiltIn = [...SHARED_TEMPLATES, ...BROWS_TEMPLATES, ...LIPS_TEMPLATES];
    const template = allBuiltIn.find(t => t.id === templateId);
    if (!template) return;
    setDrafts(prev => ({
      ...prev,
      [getLanguageDraftKey(templateId, 'he')]: template.defaultTextHe,
      [getLanguageDraftKey(templateId, 'en')]: template.defaultTextEn,
    }));
    setDays(prev => ({ ...prev, [templateId]: template.day }));
    setSendTypes(prev => ({ ...prev, [templateId]: 'push' }));
    toast({ title: isEn ? 'Template restored to default 🔄' : 'הנוסח שוחזר לברירת המחדל 🔄' });
  }, [toast, isEn]);

  const insertTag = useCallback((templateId: string, tag: string) => {
    setDrafts(prev => {
      const draftKey = getLanguageDraftKey(templateId, currentLanguage);
      const current = prev[draftKey] ?? getLegacyDraftFallback(prev, templateId) ?? '';
      return { ...prev, [draftKey]: `${current} ${tag}`.trim() };
    });
  }, [currentLanguage]);

  const addCustomMessage = useCallback(() => {
    const newId = `custom_${Date.now()}`;
    const newTemplate: MessageTemplate = {
      id: newId,
      labelHe: 'הודעה מותאמת אישית',
      labelEn: 'Custom Message',
      icon: '💬',
      day: 14,
      defaultTextHe: 'היי {שם_לקוחה}, איך את מרגישה? אשמח לשמוע!',
      defaultTextEn: 'Hi {Client_Name}, how are you feeling? I\'d love to hear from you!',
      placeholdersHe: ['{שם_לקוחה}'],
      placeholdersEn: ['{Client_Name}'],
      isCustom: true,
      category: activeCategory,
    };
    setCustomTemplates(prev => [...prev, newTemplate]);
    setDrafts(prev => ({
      ...prev,
      [getLanguageDraftKey(newId, 'he')]: newTemplate.defaultTextHe,
      [getLanguageDraftKey(newId, 'en')]: newTemplate.defaultTextEn,
    }));
    setDays(prev => ({ ...prev, [newId]: newTemplate.day }));
    setSendTypes(prev => ({ ...prev, [newId]: 'push' }));
    // Auto-scroll to the new card after render
    setTimeout(() => {
      const el = document.getElementById(`msg-card-${newId}`);
      el?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }, 100);
  }, [activeCategory]);

  const removeCustomMessage = useCallback((id: string) => {
    setCustomTemplates(prev => prev.filter(t => t.id !== id));
    setDrafts(prev => { const n = { ...prev }; delete n[id]; return n; });
    setDays(prev => { const n = { ...prev }; delete n[id]; return n; });
    setSendTypes(prev => { const n = { ...prev }; delete n[id]; return n; });
    toast({ title: isEn ? 'Message removed 🗑️' : 'ההודעה הוסרה 🗑️' });
  }, [toast, isEn]);

  const currentTemplates = getCategoryTemplates(activeCategory);
  const sortedTemplates = currentTemplates.sort((a, b) => {
    const dayA = days[a.id] ?? a.day ?? -1;
    const dayB = days[b.id] ?? b.day ?? -1;
    return dayA - dayB;
  });

  return (
    <div className="space-y-5 pb-24" dir={isEn ? 'ltr' : 'rtl'}>
      {/* Header */}
      <div className="text-center mb-2">
        <div className="flex items-center justify-center gap-2 mb-1">
          <MessageSquareText className="w-5 h-5 text-accent" />
          <h2 className="text-xl font-bold text-foreground font-serif">
            {isEn ? 'Edit Message Content' : 'עריכת תוכן הודעות'}
          </h2>
        </div>
        <p className="text-sm text-muted-foreground">
          {isEn ? 'Edit the messages sent to your clients' : 'ערכי את ההודעות שנשלחות ללקוחות שלך'}
        </p>
      </div>

      {/* ===== CATEGORY TABS ===== */}
      <div className="flex gap-2">
        {([
          { id: 'eyebrows' as const, labelHe: 'גבות', labelEn: 'Brows', Icon: BrowIcon },
          { id: 'lips' as const, labelHe: 'שפתיים', labelEn: 'Lips', Icon: LipIcon },
        ]).map(({ id, labelHe, labelEn, Icon }) => {
          const isActive = activeCategory === id;
          return (
            <button
              key={id}
              onClick={() => setActiveCategory(id)}
              className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-2xl text-sm font-bold transition-all border ${
                isActive
                  ? 'border-[#D4AF37]/40 shadow-md'
                  : 'border-border text-foreground/60 bg-card hover:bg-muted'
              }`}
              style={isActive ? {
                background: 'linear-gradient(135deg, #B8860B, #D4AF37 30%, #F9F295 50%, #D4AF37 70%, #B8860B)',
                color: '#4a3636',
              } : undefined}
            >
              <Icon />
              {isEn ? labelEn : labelHe}
            </button>
          );
        })}
      </div>

      {/* ===== VISUAL TIMELINE ===== */}
      <div className="rounded-2xl bg-card border border-border p-4 shadow-sm">
        <h3 className="font-bold text-sm text-foreground mb-3 flex items-center gap-2">
          <Clock className="w-4 h-4 text-accent" />
          {isEn
            ? `Message Schedule — ${activeCategory === 'eyebrows' ? 'Brows' : 'Lips'}`
            : `סדר שליחת ההודעות — ${activeCategory === 'eyebrows' ? 'גבות' : 'שפתיים'}`}
        </h3>
        <div className={`relative ${isEn ? 'pl-4' : 'pr-4'}`}>
          {/* Timeline line */}
          <div className={`absolute ${isEn ? 'left-[7px]' : 'right-[7px]'} top-2 bottom-2 w-0.5 bg-accent/30 rounded-full`} />
          {sortedTemplates.map((template) => {
            const day = days[template.id] ?? template.day;
            const type = sendTypes[template.id] || 'push';
            const label = isEn ? template.labelEn : template.labelHe;
            return (
              <div key={template.id} className="relative flex items-start gap-3 pb-4 last:pb-0">
                {/* Dot */}
                <div
                  className="w-3.5 h-3.5 rounded-full border-2 border-accent shrink-0 mt-0.5 z-10"
                  style={{
                    background: day === null
                      ? 'linear-gradient(135deg, #B8860B, #D4AF37)'
                      : 'hsl(var(--card))',
                  }}
                />
                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-sm">{template.icon}</span>
                    <span className="text-xs font-bold text-foreground truncate">
                      {day === null ? (isEn ? 'Immediate' : 'מיידי') : (isEn ? `Day ${day}` : `יום ${day}`)}
                    </span>
                    <span className="text-xs text-muted-foreground truncate">— {label}</span>
                    {type === 'whatsapp' ? (
                      <MessageCircle className="w-3 h-3 text-green-600 shrink-0" />
                    ) : (
                      <Bell className="w-3 h-3 text-accent shrink-0" />
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* ===== MESSAGE CARDS ===== */}
      {sortedTemplates.map((template) => {
        const day = days[template.id] ?? template.day;
        const type = sendTypes[template.id] || 'push';
        const label = isEn ? template.labelEn : template.labelHe;
        const placeholders = isEn ? template.placeholdersEn : template.placeholdersHe;
        const draftKey = getLanguageDraftKey(template.id, currentLanguage);
        const draftValue = drafts[draftKey] ?? getDefaultText(template, currentLanguage);
        return (
          <div
            key={template.id}
            id={`msg-card-${template.id}`}
            className="rounded-2xl bg-card border border-border p-5 space-y-3 shadow-sm"
          >
            {/* Header */}
            <div className="flex items-center gap-2">
              <span className="text-lg">{template.icon}</span>
              <h3 className="font-bold text-sm text-foreground flex-1">{label}</h3>
              <button
                onClick={() => setPreviewId(template.id)}
                className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-[11px] font-bold transition-all hover:scale-105 active:scale-95"
                style={{
                  border: '2px solid #D4AF37',
                  background: 'rgba(212, 175, 55, 0.1)',
                  color: '#4a3636',
                  boxShadow: '0 3px 10px -2px rgba(212, 175, 55, 0.3)',
                }}
              >
                <Eye className="w-3.5 h-3.5" />
                {isEn ? 'Preview' : 'תצוגה מקדימה'}
              </button>
              {template.isCustom && (
                <button
                  onClick={() => removeCustomMessage(template.id)}
                  className="p-1.5 rounded-lg hover:bg-destructive/10 transition-colors"
                >
                  <Trash2 className="w-4 h-4 text-destructive" />
                </button>
              )}
            </div>

            {/* Timing + Send Type row */}
            <div className="flex flex-col gap-2.5">
              {/* Timing selector */}
              <div className="flex items-center gap-3 bg-background rounded-xl p-3 border border-border">
                <Clock className="w-4 h-4 text-accent shrink-0" />
                <span className="text-xs font-medium text-foreground whitespace-nowrap">
                  {isEn ? 'Timing:' : 'תזמון:'}
                </span>
                {day === null ? (
                  <span className="text-xs text-muted-foreground">
                    {isEn ? 'Immediate (Upon booking)' : 'מיידי (עם קביעת תור)'}
                  </span>
                ) : (
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs text-muted-foreground">
                      {isEn ? 'Send on day' : 'שלחי ביום ה-'}
                    </span>
                    <DayInput
                      value={day}
                      onChange={(val) => setDays(prev => ({ ...prev, [template.id]: val }))}
                    />
                    <span className="text-xs text-muted-foreground">
                      {isEn ? 'after treatment' : 'לאחר הטיפול'}
                    </span>
                  </div>
                )}
              </div>

              {/* Send type toggle */}
              <div className="flex items-center gap-2 bg-background rounded-xl p-2 border border-border">
                <span className={`text-xs font-medium text-foreground ${isEn ? 'ml-1' : 'mr-1'}`}>
                  {isEn ? 'Send via:' : 'שליחה דרך:'}
                </span>
                <button
                  onClick={() => setSendTypes(prev => ({ ...prev, [template.id]: 'push' }))}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                    type === 'push'
                      ? 'bg-accent/15 text-accent border border-accent/30'
                      : 'text-muted-foreground hover:bg-muted'
                  }`}
                >
                  <Bell className="w-3.5 h-3.5" />
                  Push
                </button>
                <button
                  onClick={() => setSendTypes(prev => ({ ...prev, [template.id]: 'whatsapp' }))}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                    type === 'whatsapp'
                      ? 'bg-green-100 text-green-700 border border-green-300'
                      : 'text-muted-foreground hover:bg-muted'
                  }`}
                >
                  <MessageCircle className="w-3.5 h-3.5" />
                  WhatsApp
                </button>
                {type === 'whatsapp' && (
                  <span className={`text-[10px] text-muted-foreground ${isEn ? 'ml-auto' : 'mr-auto'}`}>
                    {isEn ? '⚡ Requires upgrade' : '⚡ דורש שדרוג'}
                  </span>
                )}
              </div>
            </div>

            {/* Textarea */}
            <Textarea
              ref={(el) => { textareaRefs.current[template.id] = el; }}
              value={draftValue}
              onChange={(e) => setDrafts(prev => ({ ...prev, [draftKey]: e.target.value }))}
              rows={4}
              dir={isEn ? 'ltr' : 'rtl'}
              className="resize-y text-sm bg-background"
            />


            {/* Per-card actions row */}
            <div className="flex items-center gap-3 pt-1">
              {/* Reset button (only for built-in) */}
              {!template.isCustom && !template.id.startsWith('welcome') && (
                <button
                  onClick={() => handleReset(template.id)}
                  className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  {isEn ? 'Restore original' : 'שחזור מקורי'}
                </button>
              )}

              <div className={isEn ? 'ml-auto' : 'mr-auto'}>
                <button
                  onClick={() => handleSaveSingle(template.id)}
                  disabled={savingId === template.id}
                  className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold transition-all hover:scale-105 active:scale-95 disabled:opacity-60"
                  style={{
                    background: savedIds.has(template.id)
                      ? 'hsl(145 60% 45%)'
                      : 'linear-gradient(135deg, #B8860B, #D4AF37 40%, #F9F295 60%, #D4AF37)',
                    color: savedIds.has(template.id) ? '#fff' : '#4a3636',
                    border: savedIds.has(template.id)
                      ? '1px solid hsl(145 60% 40%)'
                      : '1px solid #D4AF37',
                    boxShadow: '0 2px 8px -2px rgba(212, 175, 55, 0.3)',
                  }}
                >
                  {savingId === template.id ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : savedIds.has(template.id) ? (
                    <Check className="w-3.5 h-3.5" />
                  ) : (
                    <Save className="w-3.5 h-3.5" />
                  )}
                  {savingId === template.id
                    ? (isEn ? 'Saving…' : 'שומר…')
                    : savedIds.has(template.id)
                      ? (isEn ? 'Saved ✓' : 'נשמר ✓')
                      : (isEn ? 'Save' : 'שמור')}
                </button>
              </div>
            </div>
          </div>
        );
      })}

      {/* Add New Message Button */}
      <button
        onClick={addCustomMessage}
        className="w-full flex items-center justify-center gap-2.5 py-3.5 rounded-2xl font-bold text-base transition-all hover:opacity-90 active:scale-[0.97]"
        style={{
          background: 'linear-gradient(135deg, #B8860B, #D4AF37 30%, #F9F295 50%, #D4AF37 70%, #B8860B)',
          color: '#4a3636',
          border: '1px solid #D4AF37',
        }}
      >
        <Plus className="w-5 h-5" />
        {isEn ? 'Add delivery day' : 'הוספת יום למשלוח'}
      </button>

      {/* Sticky Save */}
      <div className="sticky bottom-20 flex justify-center z-30">
        <button
          onClick={handleSave}
          disabled={saving}
          className="flex items-center gap-2.5 px-10 py-3.5 rounded-2xl font-bold text-base transition-all hover:opacity-90 active:scale-[0.97] shadow-lg disabled:opacity-60"
            style={{
              background: 'linear-gradient(135deg, #B8860B, #D4AF37 30%, #F9F295 50%, #D4AF37 70%, #B8860B)',
              color: '#5C4033',
              border: '1px solid #D4AF37',
          }}
        >
          {saving ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
          {saving
            ? (isEn ? 'Saving…' : 'שומר…')
            : (isEn ? 'Save All Messages' : 'שמירת כל ההודעות')}
        </button>
      </div>

      {/* Preview Modal */}
      <MessagePreviewModal
        open={!!previewId}
        onClose={() => setPreviewId(null)}
        messageText={previewId ? (drafts[getLanguageDraftKey(previewId, currentLanguage)] ?? '') : ''}
        onEditClick={() => {
          if (previewId) {
            textareaRefs.current[previewId]?.focus();
          }
        }}
      />
    </div>
  );
}
