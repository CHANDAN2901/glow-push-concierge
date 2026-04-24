import { useState, useEffect } from 'react';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Save, Loader2, ScrollText } from 'lucide-react';
import { useI18n } from '@/lib/i18n';

export default function AdminPolicyEditor() {
  const { lang } = useI18n();
  const { toast } = useToast();
  const isHe = lang === 'he';
  const [contentHe, setContentHe] = useState('');
  const [contentEn, setContentEn] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [masterId, setMasterId] = useState('');

  useEffect(() => {
    loadMaster();
  }, []);

  const loadMaster = async () => {
    setLoading(true);
    const { data } = await supabase
      .from('clinic_policy_master')
      .select('*')
      .limit(1)
      .maybeSingle();
    if (data) {
      setMasterId(data.id);
      setContentHe(data.content_he || '');
      setContentEn(data.content_en || '');
    }
    setLoading(false);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      if (masterId) {
        await supabase
          .from('clinic_policy_master')
          .update({ content_he: contentHe, content_en: contentEn, updated_at: new Date().toISOString() })
          .eq('id', masterId);
      } else {
        const { data } = await supabase
          .from('clinic_policy_master')
          .insert({ content_he: contentHe, content_en: contentEn })
          .select()
          .single();
        if (data) setMasterId(data.id);
      }
      toast({ title: isHe ? 'תבנית המדיניות נשמרה בהצלחה ✨' : 'Policy template saved successfully ✨' });
    } catch (err) {
      toast({ title: isHe ? 'שגיאה בשמירה' : 'Save failed', variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6" dir={isHe ? 'rtl' : 'ltr'}>
      <div className="flex items-center gap-3 mb-2">
        <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: 'linear-gradient(135deg, rgba(212,175,55,0.2), rgba(184,134,11,0.1))' }}>
          <ScrollText className="w-5 h-5" style={{ color: '#B8860B' }} />
        </div>
        <div>
          <h2 className="font-serif font-bold text-lg" style={{ color: '#4a3636' }}>{isHe ? 'תבנית מדיניות קליניקה' : 'Clinic Policy Template'}</h2>
          <p className="text-xs text-muted-foreground">{isHe ? 'התבנית הגלובלית — ברירת המחדל לכל המאפרות' : 'The global template used as the default for all artists'}</p>
        </div>
      </div>

      <div className="rounded-xl p-5" style={{ background: '#FFF9F7', border: '1px solid rgba(212,175,55,0.2)' }}>
        <label className="text-sm font-semibold mb-2 block" style={{ color: '#B8860B' }}>{isHe ? 'תוכן בעברית' : 'Hebrew Content'}</label>
        <Textarea
          value={contentHe}
          onChange={(e) => setContentHe(e.target.value)}
          className="min-h-[250px] text-sm leading-relaxed"
          dir="rtl"
          placeholder="# כותרת ראשית&#10;## כותרת משנית&#10;- נקודה ראשונה&#10;- נקודה שנייה"
        />
        <p className="text-[11px] text-muted-foreground mt-1">
          {isHe ? 'פורמט: # כותרת ראשית, ## כותרת משנית, - נקודות, **טקסט מודגש**' : 'Format: # Main title, ## Subtitle, - bullet points, **bold text**'}
        </p>
      </div>

      <div className="rounded-xl p-5" style={{ background: '#FFF9F7', border: '1px solid rgba(212,175,55,0.2)' }}>
        <label className="text-sm font-semibold mb-2 block" style={{ color: '#B8860B' }}>{isHe ? 'תוכן באנגלית' : 'English Content'}</label>
        <Textarea
          value={contentEn}
          onChange={(e) => setContentEn(e.target.value)}
          className="min-h-[250px] text-sm leading-relaxed"
          dir="ltr"
          placeholder="# Main Title&#10;## Subtitle&#10;- First point&#10;- Second point"
        />
      </div>

      <Button
        onClick={handleSave}
        disabled={saving}
        className="gap-2"
        style={{
          background: 'linear-gradient(135deg, #B8860B 0%, #D4AF37 50%, #B8860B 100%)',
          color: '#fff',
        }}
      >
        {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
        {isHe ? 'שמירת תבנית מדיניות' : 'Save Policy Template'}
      </Button>
    </div>
  );
}
