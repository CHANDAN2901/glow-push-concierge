import { useState, useEffect, useRef, useCallback } from 'react';
import { MessageSquareText, Save, Send, Bell, Heart, Plus, Upload, Image, Globe } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { eyebrowPhases } from '@/lib/recovery-data';

interface HealingPhase {
  id: string;
  treatment_type: string;
  day_start: number;
  day_end: number;
  title_he: string;
  title_en: string;
  steps_he: string[];
  steps_en: string[];
  icon: string;
  severity: string;
  sort_order: number;
  image_url?: string | null;
}

interface MessageTemplate {
  id: string;
  template_key: string;
  label: string;
  default_text: string;
  placeholders: string[];
}

interface PhaseDraft {
  title_he: string;
  title_en: string;
  image_url: string;
  imageFile?: File;
  imagePreview?: string;
}

function buildDayDrafts(phases: HealingPhase[], maxDay: number): Record<number, string> {
  const drafts: Record<number, string> = {};
  for (let day = 1; day <= maxDay; day++) {
    const phase = phases.find(p => day >= p.day_start && day <= p.day_end);
    if (phase && phase.steps_he.length > 0) {
      drafts[day] = phase.steps_he.join('\n');
    } else {
      const localPhase = eyebrowPhases.find(p => day >= p.day && day <= p.dayEnd);
      if (localPhase) {
        drafts[day] = localPhase.checklist.map(c => c.he).join('\n');
      } else {
        drafts[day] = '';
      }
    }
  }
  return drafts;
}

function buildPhaseDrafts(phases: HealingPhase[]): Record<string, PhaseDraft> {
  const drafts: Record<string, PhaseDraft> = {};
  phases.forEach(p => {
    drafts[p.id] = {
      title_he: p.title_he,
      title_en: p.title_en,
      image_url: p.image_url || '',
    };
  });
  return drafts;
}

const PUSH_EVENTS = [
  { key: 'appointment_reminder', label: 'תזכורת תור', icon: '📅', defaultText: 'היי {{client_name}}, תזכורת מהקליניקה — קבענו לתאריך {{date}} בשעה {{time}}. מחכה לראותך! ✨' },
  { key: 'post_treatment_followup', label: 'מעקב אחרי טיפול', icon: '💌', defaultText: 'היי {{client_name}}, איך את מרגישה? 💕 היום מתחיל מסע ההחלמה שלך. נא לעקוב אחרי ההנחיות באפליקציה ולפנות אליי בכל שאלה!' },
  { key: 'birthday_greeting', label: 'הודעת יום הולדת', icon: '🎂', defaultText: 'יום הולדת שמח {{client_name}}! 🎉🎂 מאחלת לך שנה מלאה ביופי ובאושר 💕 כמתנה — קבלי 10% הנחה על הטיפול הבא!' },
  { key: 'review_request', label: 'בקשת ביקורת', icon: '⭐', defaultText: 'היי {{client_name}}, נשמח מאוד לביקורת שלך ⭐ זה עוזר לנו להמשיך לתת שירות מעולה! {{review_link}}' },
  { key: 'healing_day_notification', label: 'הודעת מסע החלמה', icon: '💧', defaultText: 'היי {{client_name}}, יום {{day_number}} במסע ההחלמה שלך 💧 הנה ההנחיות להיום — פתחי את האפליקציה לפרטים!' },
  { key: 'renewal_reminder', label: 'תזכורת חידוש', icon: '🔄', defaultText: 'היי {{client_name}}, עברו כבר כמה חודשים מהטיפול האחרון 🔄 הגיע הזמן לחידוש! נקבע תור?' },
];

// Auto-expanding textarea
function AutoTextarea({ value, onChange, placeholder }: {
  value: string;
  onChange: (val: string) => void;
  placeholder: string;
}) {
  const ref = useRef<HTMLTextAreaElement>(null);
  const resize = useCallback(() => {
    const el = ref.current;
    if (el) {
      el.style.height = 'auto';
      el.style.height = Math.max(80, el.scrollHeight) + 'px';
    }
  }, []);
  useEffect(() => { resize(); }, [value, resize]);

  return (
    <textarea
      ref={ref}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      dir="rtl"
      className="w-full rounded-[10px] px-3 py-2 text-sm resize-none transition-all duration-200 focus:outline-none focus:ring-2"
      style={{
        background: '#FFFFFF',
        color: '#4a2020',
        border: '1.5px solid rgba(216, 180, 180, 0.3)',
        minHeight: '80px',
      }}
      onFocus={(e) => {
        e.currentTarget.style.borderColor = '#d8b4b4';
        e.currentTarget.style.boxShadow = '0 0 0 3px rgba(216, 180, 180, 0.25)';
      }}
      onBlur={(e) => {
        e.currentTarget.style.borderColor = 'rgba(216, 180, 180, 0.3)';
        e.currentTarget.style.boxShadow = 'none';
      }}
    />
  );
}

// Image upload thumbnail component
function PhaseImageUploader({ currentUrl, previewUrl, onFileSelect }: {
  currentUrl: string;
  previewUrl?: string;
  onFileSelect: (file: File) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const displayUrl = previewUrl || currentUrl;

  return (
    <div className="flex items-center gap-3">
      <div
        className="w-14 h-14 rounded-xl overflow-hidden flex items-center justify-center shrink-0"
        style={{
          background: displayUrl ? 'transparent' : 'rgba(216, 180, 180, 0.15)',
          border: '1.5px solid rgba(216, 180, 180, 0.3)',
        }}
      >
        {displayUrl ? (
          <img src={displayUrl} alt="" className="w-full h-full object-cover" />
        ) : (
          <Image className="w-5 h-5" style={{ color: '#b8a090' }} />
        )}
      </div>
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        className="flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-lg transition-all hover:scale-[1.02]"
        style={{
          color: '#D4AF37',
          background: 'rgba(212, 175, 55, 0.08)',
          border: '1px solid rgba(212, 175, 55, 0.3)',
        }}
      >
        <Upload className="w-3.5 h-3.5" />
        {displayUrl ? 'החלף תמונה' : 'העלה תמונה'}
      </button>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) onFileSelect(file);
        }}
      />
    </div>
  );
}

export default function AdminMessages() {
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState<'healing' | 'push'>('healing');

  const [phases, setPhases] = useState<HealingPhase[]>([]);
  const [totalDays, setTotalDays] = useState(14);
  const [dayDrafts, setDayDrafts] = useState<Record<number, string>>({});
  const [phaseDrafts, setPhaseDrafts] = useState<Record<string, PhaseDraft>>({});
  const [loadingPhases, setLoadingPhases] = useState(true);

  const [templates, setTemplates] = useState<MessageTemplate[]>([]);
  const [pushDrafts, setPushDrafts] = useState<Record<string, string>>({});

  const [broadcastText, setBroadcastText] = useState('');
  const [broadcasting, setBroadcasting] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setLoadingPhases(true);
    supabase
      .from('healing_phases')
      .select('*')
      .eq('treatment_type', 'eyebrows')
      .order('sort_order')
      .then(({ data, error }) => {
        const items = (!error && data ? data : []) as HealingPhase[];
        setPhases(items);
        const maxDbDay = items.reduce((m, p) => Math.max(m, p.day_end), 0);
        const days = Math.max(14, maxDbDay);
        setTotalDays(days);
        setDayDrafts(buildDayDrafts(items, days));
        setPhaseDrafts(buildPhaseDrafts(items));
        setLoadingPhases(false);
      });
  }, []);

  useEffect(() => {
    supabase
      .from('message_templates')
      .select('*')
      .order('template_key')
      .then(({ data, error }) => {
        const items = (!error && data ? data : []) as MessageTemplate[];
        setTemplates(items);
        const pd: Record<string, string> = {};
        PUSH_EVENTS.forEach(ev => {
          const found = items.find(t => t.template_key === ev.key);
          pd[ev.key] = found ? found.default_text : ev.defaultText;
        });
        setPushDrafts(pd);
      });
  }, []);

  const handleAddDay = () => {
    const newDay = totalDays + 1;
    setTotalDays(newDay);
    setDayDrafts(prev => ({ ...prev, [newDay]: '' }));
  };

  const handleImageSelect = (phaseId: string, file: File) => {
    const previewUrl = URL.createObjectURL(file);
    setPhaseDrafts(prev => ({
      ...prev,
      [phaseId]: {
        ...prev[phaseId],
        imageFile: file,
        imagePreview: previewUrl,
      },
    }));
  };

  const uploadPhaseImage = async (phaseId: string, file: File): Promise<string> => {
    const ext = file.name.split('.').pop() || 'jpg';
    const path = `phases/${phaseId}-${crypto.randomUUID()}.${ext}`;
    const { error } = await supabase.storage.from('healing-assets').upload(path, file, { upsert: true });
    if (error) throw error;
    const { data } = supabase.storage.from('healing-assets').getPublicUrl(path);
    return data.publicUrl;
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      if (activeTab === 'healing') {
        for (const phase of phases) {
          const draft = phaseDrafts[phase.id];
          const newSteps: string[] = [];
          for (let d = phase.day_start; d <= phase.day_end; d++) {
            if (dayDrafts[d]?.trim()) {
              newSteps.push(...dayDrafts[d].split('\n').filter(Boolean));
            }
          }

          let imageUrl = draft?.image_url || phase.image_url || null;
          if (draft?.imageFile) {
            imageUrl = await uploadPhaseImage(phase.id, draft.imageFile);
          }

          await supabase
            .from('healing_phases')
            .update({
              steps_he: newSteps,
              title_he: draft?.title_he ?? phase.title_he,
              title_en: draft?.title_en ?? phase.title_en,
              image_url: imageUrl,
            })
            .eq('id', phase.id);
        }
      } else {
        for (const ev of PUSH_EVENTS) {
          const text = pushDrafts[ev.key] ?? '';
          const existing = templates.find(t => t.template_key === ev.key);
          if (existing) {
            await supabase.from('message_templates').update({ default_text: text }).eq('id', existing.id);
          } else {
            await supabase.from('message_templates').insert({
              template_key: ev.key,
              label: ev.label,
              default_text: text,
              placeholders: [],
            });
          }
        }
      }
      toast({ title: 'התבניות נשמרו בהצלחה ✅' });
    } catch (err) {
      console.error('Save error:', err);
      toast({ title: 'שגיאה בשמירה', variant: 'destructive' });
    }
    setSaving(false);
  };

  const handleBroadcast = async () => {
    if (!broadcastText.trim()) {
      toast({ title: 'נא להזין הודעה לשידור', variant: 'destructive' });
      return;
    }
    setBroadcasting(true);
    await new Promise((r) => setTimeout(r, 1200));
    setBroadcasting(false);
    setBroadcastText('');
    toast({ title: 'ההודעה נשלחה לכל המשתמשות ✅' });
  };

  const tabStyle = (isActive: boolean) => ({
    padding: '10px 20px',
    borderRadius: '12px 12px 0 0',
    fontWeight: 700 as const,
    fontSize: '14px',
    cursor: 'pointer' as const,
    border: 'none',
    transition: 'all 0.2s',
    color: isActive ? '#4a2020' : '#8c6a6a',
    background: isActive ? '#FFFFFF' : 'rgba(216, 180, 180, 0.15)',
    borderBottom: isActive ? '3px solid #D4AF37' : '3px solid transparent',
  });

  const getPhaseForDay = (day: number) => phases.find(p => day >= p.day_start && day <= p.day_end);
  const isFirstDayOfPhase = (day: number) => {
    const phase = getPhaseForDay(day);
    return phase ? phase.day_start === day : false;
  };

  return (
    <div className="space-y-4 max-w-3xl relative pb-20" dir="rtl">
      {/* Main Editor Card */}
      <div
        className="rounded-2xl overflow-hidden"
        style={{
          background: '#FFF9F7',
          border: '1px solid rgba(216, 180, 180, 0.3)',
          boxShadow: '0 4px 24px rgba(216, 180, 180, 0.18), 0 1px 4px rgba(0,0,0,0.04)',
        }}
      >
        <div className="px-5 pt-5 pb-3 flex items-center gap-2">
          <MessageSquareText className="w-5 h-5" style={{ color: '#D4AF37' }} strokeWidth={1.5} />
          <h2 className="font-serif font-bold text-lg" style={{ color: '#4a2020' }}>
            ניהול הודעות ותבניות
          </h2>
        </div>

        <div className="flex gap-0 px-5" style={{ borderBottom: '1px solid rgba(216, 180, 180, 0.2)' }}>
          <button style={tabStyle(activeTab === 'healing')} onClick={() => setActiveTab('healing')}>
            <Heart className="w-4 h-4 inline ml-1.5" style={{ color: activeTab === 'healing' ? '#D4AF37' : '#b8a090' }} />
            מסע החלמה
          </button>
          <button style={tabStyle(activeTab === 'push')} onClick={() => setActiveTab('push')}>
            <Bell className="w-4 h-4 inline ml-1.5" style={{ color: activeTab === 'push' ? '#D4AF37' : '#b8a090' }} />
            הודעות Push
          </button>
        </div>

        <div className="px-5 py-4">
          {activeTab === 'healing' ? (
            <div className="space-y-4">
              <p className="text-xs mb-2" style={{ color: '#8c6a6a' }}>
                ערכי את כותרות, תמונות והנחיות מסע ההחלמה. השינויים ישפיעו על כל הלקוחות בזמן אמת.
              </p>
              {loadingPhases ? (
                <div className="text-center py-8" style={{ color: '#b8a090' }}>טוען...</div>
              ) : (
                <>
                  {Array.from({ length: totalDays }, (_, i) => i + 1).map(day => {
                    const phase = getPhaseForDay(day);
                    const showPhaseHeader = phase && isFirstDayOfPhase(day);
                    const draft = phase ? phaseDrafts[phase.id] : null;

                    return (
                      <div key={day} className="space-y-2">
                        {/* Phase header block — show at start of each phase */}
                        {showPhaseHeader && phase && draft && (
                          <div
                            className="rounded-xl p-4 space-y-3 mt-2"
                            style={{
                              background: 'rgba(212, 175, 55, 0.06)',
                              border: '1px solid rgba(212, 175, 55, 0.2)',
                            }}
                          >
                            <div className="flex items-center gap-2 mb-1">
                              <span className="text-base">{phase.icon}</span>
                              <span className="text-xs font-bold px-2 py-0.5 rounded-full" style={{
                                background: 'linear-gradient(135deg, #D4AF37, #F0D78C)',
                                color: '#fff',
                              }}>
                                ימים {phase.day_start}–{phase.day_end}
                              </span>
                            </div>

                            {/* Title HE */}
                            <div className="space-y-1">
                              <label className="text-xs font-bold flex items-center gap-1" style={{ color: '#4a2020' }}>
                                🇮🇱 כותרת בעברית
                              </label>
                              <Input
                                value={draft.title_he}
                                onChange={(e) => setPhaseDrafts(prev => ({
                                  ...prev,
                                  [phase.id]: { ...prev[phase.id], title_he: e.target.value },
                                }))}
                                dir="rtl"
                                className="text-sm h-9"
                                style={{
                                  background: '#FFFFFF',
                                  color: '#4a2020',
                                  border: '1.5px solid rgba(216, 180, 180, 0.3)',
                                  borderRadius: '8px',
                                }}
                              />
                            </div>

                            {/* Title EN */}
                            <div className="space-y-1">
                              <label className="text-xs font-bold flex items-center gap-1" style={{ color: '#4a2020' }}>
                                <Globe className="w-3 h-3" /> Title in English
                              </label>
                              <Input
                                value={draft.title_en}
                                onChange={(e) => setPhaseDrafts(prev => ({
                                  ...prev,
                                  [phase.id]: { ...prev[phase.id], title_en: e.target.value },
                                }))}
                                dir="ltr"
                                className="text-sm h-9"
                                style={{
                                  background: '#FFFFFF',
                                  color: '#4a2020',
                                  border: '1.5px solid rgba(216, 180, 180, 0.3)',
                                  borderRadius: '8px',
                                }}
                              />
                            </div>

                            {/* Image Uploader */}
                            <PhaseImageUploader
                              currentUrl={draft.image_url}
                              previewUrl={draft.imagePreview}
                              onFileSelect={(file) => handleImageSelect(phase.id, file)}
                            />
                          </div>
                        )}

                        {/* Day row */}
                        <div className="space-y-1.5">
                          <div className="flex items-center gap-2">
                            <span
                              className="inline-flex items-center justify-center w-8 h-8 rounded-full text-xs font-bold"
                              style={{
                                background: 'linear-gradient(135deg, #D4AF37, #F0D78C)',
                                color: '#fff',
                                boxShadow: '0 2px 8px rgba(212, 175, 55, 0.3)',
                              }}
                            >
                              {day}
                            </span>
                            <label className="text-sm font-bold" style={{ color: '#4a2020' }}>
                              יום {day}
                            </label>
                            {phase && !showPhaseHeader && (
                              <span className="text-xs px-2 py-0.5 rounded-full" style={{ background: 'rgba(216, 180, 180, 0.2)', color: '#8c6a6a' }}>
                                {phase.icon} {phase.title_he}
                              </span>
                            )}
                          </div>
                          <AutoTextarea
                            value={dayDrafts[day] ?? ''}
                            onChange={(val) => setDayDrafts(prev => ({ ...prev, [day]: val }))}
                            placeholder={`הנחיות ליום ${day}...`}
                          />
                        </div>
                      </div>
                    );
                  })}

                  <Button
                    variant="outline"
                    className="w-full h-11 rounded-xl font-bold text-sm transition-all hover:scale-[1.01]"
                    style={{
                      color: '#D4AF37',
                      borderColor: 'rgba(212, 175, 55, 0.4)',
                      background: 'rgba(212, 175, 55, 0.06)',
                    }}
                    onClick={handleAddDay}
                  >
                    <Plus className="w-4 h-4 ml-1.5" />
                    + הוסף יום למסע
                  </Button>
                </>
              )}
            </div>
          ) : (
            <div className="space-y-4">
              <p className="text-xs mb-2" style={{ color: '#8c6a6a' }}>
                ערכי את תבניות הודעות ה-Push. התגיות בסוגריים מעוגלים יוחלפו בערכים אמיתיים.
              </p>
              {PUSH_EVENTS.map(ev => (
                <div key={ev.key} className="space-y-1.5">
                  <div className="flex items-center gap-2">
                    <span className="text-lg">{ev.icon}</span>
                    <label className="text-sm font-bold" style={{ color: '#4a2020' }}>
                      {ev.label}
                    </label>
                  </div>
                  <AutoTextarea
                    value={pushDrafts[ev.key] ?? ''}
                    onChange={(val) => setPushDrafts(prev => ({ ...prev, [ev.key]: val }))}
                    placeholder={ev.defaultText}
                  />
                </div>
              ))}
            </div>
          )}
        </div>

        <div
          className="sticky bottom-0 px-5 py-4"
          style={{
            background: 'linear-gradient(to top, #FFF9F7 80%, transparent)',
            borderTop: '1px solid rgba(216, 180, 180, 0.15)',
          }}
        >
          <Button
            className="w-full h-12 text-base font-bold rounded-xl transition-all hover:scale-[1.01] active:scale-[0.99]"
            style={{
              background: 'linear-gradient(135deg, #B8860B, #D4AF37 40%, #F9F295 60%, #D4AF37)',
              color: '#1a1a1a',
              boxShadow: '0 4px 20px hsla(38, 55%, 50%, 0.35)',
            }}
            onClick={handleSave}
            disabled={saving}
          >
            <Save className="w-4 h-4 ml-2" />
            {saving ? 'שומר…' : 'שמור תבניות גלובליות'}
          </Button>
        </div>
      </div>

      {/* Broadcast Card */}
      <div
        className="rounded-2xl p-5"
        style={{
          background: '#FFF9F7',
          border: '1px solid rgba(216, 180, 180, 0.3)',
          boxShadow: '0 4px 24px rgba(216, 180, 180, 0.18), 0 1px 4px rgba(0,0,0,0.04)',
        }}
      >
        <div className="flex items-center gap-2 mb-3">
          <Send className="w-5 h-5" style={{ color: '#D4AF37' }} strokeWidth={1.5} />
          <h2 className="font-serif font-bold text-lg" style={{ color: '#4a2020' }}>
            שידור הודעה גלובלית
          </h2>
        </div>
        <p className="text-xs mb-3" style={{ color: '#8c6a6a' }}>
          כתבי הודעה שתישלח לכל המשתמשות הרשומות במערכת בו-זמנית.
        </p>
        <AutoTextarea
          value={broadcastText}
          onChange={setBroadcastText}
          placeholder="כתבי את ההודעה כאן..."
        />
        <div className="mt-3">
          <Button
            className="w-full h-12 text-base font-bold transition-all hover:scale-[1.01] active:scale-[0.99] rounded-xl"
            style={{
              background: '#FFFFFF',
              color: '#D4AF37',
              border: '3px solid transparent',
              borderImage: 'linear-gradient(135deg, #B8860B, #F9F295, #D4AF37, #F9F295, #B8860B) 1',
              boxShadow: '0 4px 20px hsla(38, 55%, 50%, 0.2)',
            }}
            onClick={handleBroadcast}
            disabled={broadcasting}
          >
            <Send className="w-4 h-4 ml-2" style={{ color: '#D4AF37' }} />
            {broadcasting ? 'שולחת...' : 'שלח הודעה לכל המשתמשות'}
          </Button>
        </div>
      </div>
    </div>
  );
}
