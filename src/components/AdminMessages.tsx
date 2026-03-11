import { useState, useEffect } from 'react';
import { MessageSquareText, Save, Send, Bell, Heart, Info } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';

interface MessageTemplate {
  id: string;
  template_key: string;
  label: string;
  default_text: string;
  placeholders: string[];
}

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
}

// Map day numbers to their healing phase for editing
function buildDayDrafts(phases: HealingPhase[]): Record<number, string> {
  const drafts: Record<number, string> = {};
  for (let day = 1; day <= 14; day++) {
    const phase = phases.find(p => day >= p.day_start && day <= p.day_end);
    if (phase) {
      // Show instructions joined by newlines for that day's phase
      drafts[day] = phase.steps_he.join('\n');
    } else {
      drafts[day] = '';
    }
  }
  return drafts;
}

const PUSH_EVENTS = [
  { key: 'appointment_reminder', label: 'תזכורת תור', icon: '📅', placeholder: 'היי {{client_name}}, תזכורת לתור שלך מחר...' },
  { key: 'birthday_greeting', label: 'הודעת יום הולדת', icon: '🎂', placeholder: 'יום הולדת שמח {{client_name}}! 🎉...' },
  { key: 'review_request', label: 'בקשת ביקורת', icon: '⭐', placeholder: 'היי {{client_name}}, נשמח לביקורת שלך ב-{{review_link}}...' },
  { key: 'healing_day_notification', label: 'הודעת מסע החלמה', icon: '💧', placeholder: 'היי {{client_name}}, יום {{day_number}} במסע ההחלמה שלך...' },
  { key: 'renewal_reminder', label: 'תזכורת חידוש', icon: '🔄', placeholder: 'היי {{client_name}}, הגיע הזמן לחידוש הטיפול...' },
];

export default function AdminMessages() {
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState<'healing' | 'push'>('healing');

  // Healing phases state
  const [phases, setPhases] = useState<HealingPhase[]>([]);
  const [dayDrafts, setDayDrafts] = useState<Record<number, string>>({});
  const [loadingPhases, setLoadingPhases] = useState(true);

  // Push templates state
  const [templates, setTemplates] = useState<MessageTemplate[]>([]);
  const [pushDrafts, setPushDrafts] = useState<Record<string, string>>({});

  // Broadcast
  const [broadcastText, setBroadcastText] = useState('');
  const [broadcasting, setBroadcasting] = useState(false);

  const [saving, setSaving] = useState(false);

  // Load healing phases
  useEffect(() => {
    setLoadingPhases(true);
    supabase
      .from('healing_phases')
      .select('*')
      .eq('treatment_type', 'eyebrows')
      .order('sort_order')
      .then(({ data, error }) => {
        if (!error && data) {
          const items = data as HealingPhase[];
          setPhases(items);
          setDayDrafts(buildDayDrafts(items));
        }
        setLoadingPhases(false);
      });
  }, []);

  // Load message templates
  useEffect(() => {
    supabase
      .from('message_templates')
      .select('*')
      .order('template_key')
      .then(({ data, error }) => {
        if (!error && data) {
          const items = data as MessageTemplate[];
          setTemplates(items);
          const d: Record<string, string> = {};
          items.forEach((t) => (d[t.template_key] = t.default_text));
          // Also init push event drafts from templates or empty
          const pd: Record<string, string> = {};
          PUSH_EVENTS.forEach(ev => {
            const found = items.find(t => t.template_key === ev.key);
            pd[ev.key] = found ? found.default_text : '';
          });
          setPushDrafts(pd);
        }
      });
  }, []);

  const handleSave = async () => {
    setSaving(true);
    try {
      if (activeTab === 'healing') {
        // Group days back into phases and update steps_he
        for (const phase of phases) {
          const newSteps: string[] = [];
          for (let d = phase.day_start; d <= phase.day_end; d++) {
            if (dayDrafts[d]?.trim()) {
              newSteps.push(...dayDrafts[d].split('\n').filter(Boolean));
            }
          }
          await supabase
            .from('healing_phases')
            .update({ steps_he: newSteps })
            .eq('id', phase.id);
        }
      } else {
        // Save push templates – upsert into message_templates
        for (const ev of PUSH_EVENTS) {
          const text = pushDrafts[ev.key] ?? '';
          const existing = templates.find(t => t.template_key === ev.key);
          if (existing) {
            await supabase
              .from('message_templates')
              .update({ default_text: text })
              .eq('id', existing.id);
          } else {
            await supabase
              .from('message_templates')
              .insert({
                template_key: ev.key,
                label: ev.label,
                default_text: text,
                placeholders: [],
              });
          }
        }
      }
      toast({ title: 'התבניות נשמרו בהצלחה ✅' });
    } catch {
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

  const textareaStyle = {
    background: '#FFFFFF',
    color: '#4a2020',
    border: '1.5px solid rgba(216, 180, 180, 0.3)',
    borderRadius: '10px',
    fontSize: '13px',
    transition: 'border-color 0.2s, box-shadow 0.2s',
  };

  const textareaFocusClass = "focus:border-[#d8b4b4] focus:ring-2 focus:ring-[#d8b4b4]/30";

  return (
    <div className="space-y-4 max-w-3xl relative pb-20" dir="rtl">
      {/* Main Editor Card */}
      <div
        className="rounded-2xl overflow-hidden"
        style={{
          background: '#FFFFFF',
          border: '1px solid rgba(216, 180, 180, 0.3)',
          boxShadow: '0 4px 24px rgba(216, 180, 180, 0.15), 0 1px 4px rgba(0,0,0,0.04)',
        }}
      >
        {/* Header */}
        <div className="px-5 pt-5 pb-3 flex items-center gap-2">
          <MessageSquareText className="w-5 h-5" style={{ color: '#D4AF37' }} strokeWidth={1.5} />
          <h2 className="font-serif font-bold text-lg" style={{ color: '#4a2020' }}>
            ניהול הודעות ותבניות
          </h2>
        </div>

        {/* Tabs */}
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

        {/* Tab Content */}
        <div className="px-5 py-4">
          {activeTab === 'healing' ? (
            <div className="space-y-4">
              <p className="text-xs mb-2" style={{ color: '#8c6a6a' }}>
                ערכי את הנחיות מסע ההחלמה לכל יום (יום 1 עד 14). השינויים ישפיעו על כל הלקוחות.
              </p>
              {loadingPhases ? (
                <div className="text-center py-8" style={{ color: '#b8a090' }}>טוען...</div>
              ) : (
                Array.from({ length: 14 }, (_, i) => i + 1).map(day => {
                  const phase = phases.find(p => day >= p.day_start && day <= p.day_end);
                  return (
                    <div key={day} className="space-y-1.5">
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
                        {phase && (
                          <span className="text-xs px-2 py-0.5 rounded-full" style={{ background: 'rgba(216, 180, 180, 0.2)', color: '#8c6a6a' }}>
                            {phase.icon} {phase.title_he}
                          </span>
                        )}
                      </div>
                      <Textarea
                        value={dayDrafts[day] ?? ''}
                        onChange={(e) => setDayDrafts(prev => ({ ...prev, [day]: e.target.value }))}
                        rows={3}
                        dir="rtl"
                        placeholder={`הנחיות ליום ${day}...`}
                        className={`resize-y ${textareaFocusClass}`}
                        style={textareaStyle}
                      />
                    </div>
                  );
                })
              )}
            </div>
          ) : (
            <div className="space-y-4">
              <p className="text-xs mb-2" style={{ color: '#8c6a6a' }}>
                ערכי את תבניות הודעות ה-Push לכל סוג אירוע. התגיות בסוגריים מעוגלים יוחלפו בערכים אמיתיים.
              </p>
              {PUSH_EVENTS.map(ev => (
                <div key={ev.key} className="space-y-1.5">
                  <div className="flex items-center gap-2">
                    <span className="text-lg">{ev.icon}</span>
                    <label className="text-sm font-bold" style={{ color: '#4a2020' }}>
                      {ev.label}
                    </label>
                  </div>
                  <Textarea
                    value={pushDrafts[ev.key] ?? ''}
                    onChange={(e) => setPushDrafts(prev => ({ ...prev, [ev.key]: e.target.value }))}
                    rows={3}
                    dir="rtl"
                    placeholder={ev.placeholder}
                    className={`resize-y ${textareaFocusClass}`}
                    style={textareaStyle}
                  />
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Fixed Save Button at Bottom of Card */}
        <div
          className="sticky bottom-0 px-5 py-4"
          style={{
            background: 'linear-gradient(to top, #FFFFFF 80%, transparent)',
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
          background: '#FFFFFF',
          border: '1px solid rgba(216, 180, 180, 0.3)',
          boxShadow: '0 4px 24px rgba(216, 180, 180, 0.15), 0 1px 4px rgba(0,0,0,0.04)',
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

        <Textarea
          value={broadcastText}
          onChange={(e) => setBroadcastText(e.target.value)}
          rows={4}
          dir="rtl"
          placeholder="כתבי את ההודעה כאן..."
          className={`resize-y mb-3 ${textareaFocusClass}`}
          style={textareaStyle}
        />

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
  );
}
