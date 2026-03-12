import { useState, useEffect } from 'react';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Save, Loader2, ScrollText } from 'lucide-react';

export default function AdminPolicyEditor() {
  const { toast } = useToast();
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
      .from('clinic_policy_master' as any)
      .select('*')
      .limit(1)
      .maybeSingle();
    if (data) {
      setMasterId((data as any).id);
      setContentHe((data as any).content_he || '');
      setContentEn((data as any).content_en || '');
    }
    setLoading(false);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      if (masterId) {
        await supabase
          .from('clinic_policy_master' as any)
          .update({ content_he: contentHe, content_en: contentEn, updated_at: new Date().toISOString() } as any)
          .eq('id', masterId);
      } else {
        const { data } = await supabase
          .from('clinic_policy_master' as any)
          .insert({ content_he: contentHe, content_en: contentEn } as any)
          .select()
          .single();
        if (data) setMasterId((data as any).id);
      }
      toast({ title: 'תבנית המדיניות נשמרה בהצלחה ✨' });
    } catch (err) {
      toast({ title: 'שגיאה בשמירה', variant: 'destructive' });
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
    <div className="space-y-6">
      <div className="flex items-center gap-3 mb-2">
        <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: 'linear-gradient(135deg, rgba(212,175,55,0.2), rgba(184,134,11,0.1))' }}>
          <ScrollText className="w-5 h-5" style={{ color: '#B8860B' }} />
        </div>
        <div>
          <h2 className="font-serif font-bold text-lg" style={{ color: '#4a3636' }}>תבנית מדיניות קליניקה</h2>
          <p className="text-xs text-muted-foreground">התבנית הגלובלית — ברירת המחדל לכל המאפרות</p>
        </div>
      </div>

      <div className="rounded-xl p-5" style={{ background: '#FFF9F7', border: '1px solid rgba(212,175,55,0.2)' }}>
        <label className="text-sm font-semibold mb-2 block" style={{ color: '#B8860B' }}>תוכן בעברית</label>
        <Textarea
          value={contentHe}
          onChange={(e) => setContentHe(e.target.value)}
          className="min-h-[250px] text-sm leading-relaxed"
          dir="rtl"
          placeholder="# כותרת ראשית&#10;## כותרת משנית&#10;- נקודה ראשונה&#10;- נקודה שנייה"
        />
        <p className="text-[11px] text-muted-foreground mt-1">
          פורמט: # כותרת ראשית, ## כותרת משנית, - נקודות, **טקסט מודגש**
        </p>
      </div>

      <div className="rounded-xl p-5" style={{ background: '#FFF9F7', border: '1px solid rgba(212,175,55,0.2)' }}>
        <label className="text-sm font-semibold mb-2 block" style={{ color: '#B8860B' }}>English Content</label>
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
        שמירת תבנית מדיניות
      </Button>
    </div>
  );
}
