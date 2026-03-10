import { useState, useEffect } from 'react';
import { MessageSquareText, Save, Info, Send } from 'lucide-react';
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

export default function AdminMessages() {
  const { toast } = useToast();
  const [templates, setTemplates] = useState<MessageTemplate[]>([]);
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [broadcastText, setBroadcastText] = useState('');
  const [broadcasting, setBroadcasting] = useState(false);

  useEffect(() => {
    supabase
      .from('message_templates')
      .select('*')
      .order('template_key')
      .then(({ data, error }) => {
        if (error) {
          toast({ title: 'שגיאה בטעינת תבניות', variant: 'destructive' });
          return;
        }
        const items = (data ?? []) as MessageTemplate[];
        setTemplates(items);
        const d: Record<string, string> = {};
        items.forEach((t) => (d[t.id] = t.default_text));
        setDrafts(d);
      });
  }, []);

  const handleSave = async () => {
    setSaving(true);
    for (const t of templates) {
      if (drafts[t.id] !== t.default_text) {
        await supabase
          .from('message_templates')
          .update({ default_text: drafts[t.id] })
          .eq('id', t.id);
      }
    }
    setSaving(false);
    toast({ title: 'התבניות נשמרו בהצלחה ✅' });
    const { data } = await supabase.from('message_templates').select('*').order('template_key');
    if (data) {
      setTemplates(data as MessageTemplate[]);
      const d: Record<string, string> = {};
      (data as MessageTemplate[]).forEach((t) => (d[t.id] = t.default_text));
      setDrafts(d);
    }
  };

  const handleBroadcast = async () => {
    if (!broadcastText.trim()) {
      toast({ title: 'נא להזין הודעה לשידור', variant: 'destructive' });
      return;
    }
    setBroadcasting(true);
    // Simulate broadcast – in production this would call an edge function
    await new Promise((r) => setTimeout(r, 1200));
    setBroadcasting(false);
    setBroadcastText('');
    toast({ title: 'ההודעה נשלחה לכל המשתמשות ✅' });
  };

  return (
    <div className="space-y-6 max-w-3xl relative pb-20" dir="rtl">
      {/* Templates Card */}
      <div
        className="rounded-2xl p-6"
        style={{
          background: 'hsl(350 15% 12%)',
          border: '1px solid hsl(38 55% 50% / 0.3)',
        }}
      >
        <div className="flex items-center gap-2 mb-5">
          <MessageSquareText className="w-5 h-5" style={{ color: '#D4AF37' }} strokeWidth={1.2} />
          <h2 className="font-serif font-semibold text-lg" style={{ color: '#DCAE96' }}>
            ניהול הודעות ותבניות
          </h2>
        </div>

        <p className="text-sm mb-6" style={{ color: 'hsl(350 10% 60%)' }}>
          ערכי את תבניות ההודעות הגלובליות. אמניות בתוכנית Master יכולות לדרוס תבניות אלו בטקסט אישי.
        </p>

        <div className="space-y-6">
          {templates.map((t) => (
            <div key={t.id} className="space-y-2">
              <div className="flex items-center gap-2">
                <label className="text-sm font-medium" style={{ color: '#DCAE96' }}>
                  {t.label}
                </label>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Info className="w-3.5 h-3.5 cursor-help" style={{ color: 'hsl(350 10% 50%)' }} />
                  </TooltipTrigger>
                  <TooltipContent side="left" className="max-w-xs text-xs" dir="rtl">
                    <p className="font-medium mb-1">תגיות זמינות:</p>
                    <p>{t.placeholders.join(' · ')}</p>
                  </TooltipContent>
                </Tooltip>
              </div>
              <Textarea
                value={drafts[t.id] ?? ''}
                onChange={(e) => setDrafts({ ...drafts, [t.id]: e.target.value })}
                rows={3}
                dir="rtl"
                className="resize-y border-none"
                style={{
                  background: 'hsl(350 12% 16%)',
                  color: 'hsl(350 10% 85%)',
                  borderRadius: '12px',
                }}
              />
              <div className="flex flex-wrap gap-1.5">
                {t.placeholders.map((p) => (
                  <span
                    key={p}
                    className="inline-flex items-center px-2 py-0.5 rounded-md text-xs font-mono"
                    style={{ backgroundColor: 'hsl(38 55% 50% / 0.15)', color: '#D4AF37' }}
                  >
                    {p}
                  </span>
                ))}
              </div>
            </div>
          ))}
        </div>

        {/* Save Templates Button */}
        <div className="mt-6 flex justify-start">
          <Button
            className="h-12 px-8 text-base font-semibold"
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
        className="rounded-2xl p-6"
        style={{
          background: 'hsl(350 15% 12%)',
          border: '1px solid hsl(38 55% 50% / 0.3)',
        }}
      >
        <div className="flex items-center gap-2 mb-4">
          <Send className="w-5 h-5" style={{ color: '#D4AF37' }} strokeWidth={1.2} />
          <h2 className="font-serif font-semibold text-lg" style={{ color: '#DCAE96' }}>
            שידור הודעה גלובלית
          </h2>
        </div>

        <p className="text-sm mb-4" style={{ color: 'hsl(350 10% 60%)' }}>
          כתבי הודעה שתישלח לכל המשתמשות הרשומות במערכת בו-זמנית.
        </p>

        <Textarea
          value={broadcastText}
          onChange={(e) => setBroadcastText(e.target.value)}
          rows={5}
          dir="rtl"
          placeholder="כתבי את ההודעה כאן..."
          className="resize-y border-none mb-4"
          style={{
            background: 'hsl(350 12% 16%)',
            color: 'hsl(350 10% 85%)',
            borderRadius: '12px',
          }}
        />

        <Button
          className="w-full h-14 text-base font-bold transition-all hover:scale-[1.01] active:scale-[0.99]"
          style={{
            background: 'hsl(350 15% 14%)',
            color: '#D4AF37',
            border: '3px solid transparent',
            borderImage: 'linear-gradient(135deg, #B8860B, #F9F295, #D4AF37, #F9F295, #B8860B) 1',
            boxShadow: '0 0 24px hsla(38, 55%, 50%, 0.3), inset 0 1px 0 hsla(38, 55%, 70%, 0.1)',
          }}
          onClick={handleBroadcast}
          disabled={broadcasting}
        >
          <Send className="w-4 h-4 ml-2" style={{ color: '#D4AF37' }} />
          {broadcasting ? 'שולחת...' : 'שלח הודעה לכל המשתמשות בו-זמנית'}
        </Button>
      </div>
    </div>
  );
}
