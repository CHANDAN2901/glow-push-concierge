import { useState, useEffect } from 'react';
import { MessageSquareText, Save, Info } from 'lucide-react';
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
    toast({ title: 'תבניות ההודעות עודכנו בהצלחה ✅' });
    // refresh
    const { data } = await supabase.from('message_templates').select('*').order('template_key');
    if (data) {
      setTemplates(data as MessageTemplate[]);
    }
  };

  return (
    <div className="space-y-6 max-w-3xl relative pb-20" dir="rtl">
      <div className="bg-card border border-border rounded-xl p-6">
        <div className="flex items-center gap-2 mb-5">
          <MessageSquareText className="w-5 h-5 text-accent" />
          <h2 className="font-serif font-semibold text-lg">ניהול הודעות ותבניות</h2>
        </div>

        <p className="text-sm text-muted-foreground mb-6">
          ערכי את תבניות ההודעות הגלובליות. אמניות בתוכנית Master יכולות לדרוס תבניות אלו בטקסט אישי.
        </p>

        <div className="space-y-6">
          {templates.map((t) => (
            <div key={t.id} className="space-y-2">
              <div className="flex items-center gap-2">
                <label className="text-sm font-medium">{t.label}</label>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Info className="w-3.5 h-3.5 text-muted-foreground cursor-help" />
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
                className="resize-y"
              />
              <div className="flex flex-wrap gap-1.5">
                {t.placeholders.map((p) => (
                  <span key={p} className="inline-flex items-center px-2 py-0.5 rounded-md bg-accent/10 text-accent text-xs font-mono">
                    {p}
                  </span>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Sticky Save */}
      <div className="sticky bottom-6 flex justify-start">
        <Button
          className="bg-accent text-accent-foreground hover:bg-accent/90 h-12 px-8 text-base shadow-lg"
          onClick={handleSave}
          disabled={saving}
        >
          <Save className="w-4 h-4 ml-2" />
          {saving ? 'שומר…' : 'שמור תבניות גלובליות'}
        </Button>
      </div>
    </div>
  );
}
