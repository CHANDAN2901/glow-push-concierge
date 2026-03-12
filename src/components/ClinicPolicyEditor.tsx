import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Save, Loader2, RotateCcw } from 'lucide-react';
import { useI18n } from '@/lib/i18n';

interface ClinicPolicyEditorProps {
  open: boolean;
  onClose: () => void;
  artistProfileId: string;
}

export default function ClinicPolicyEditor({ open, onClose, artistProfileId }: ClinicPolicyEditorProps) {
  const { toast } = useToast();
  const { lang } = useI18n();
  const isHe = lang === 'he';
  const [contentHe, setContentHe] = useState('');
  const [contentEn, setContentEn] = useState('');
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [hasOwnPolicy, setHasOwnPolicy] = useState(false);

  useEffect(() => {
    if (!open || !artistProfileId) return;
    loadPolicy();
  }, [open, artistProfileId]);

  const loadPolicy = async () => {
    setLoading(true);
    try {
      // Try artist-specific first
      const { data: artistPolicy } = await supabase
        .from('clinic_policies' as any)
        .select('content_he, content_en')
        .eq('artist_profile_id', artistProfileId)
        .maybeSingle();

      if (artistPolicy && ((artistPolicy as any).content_he || (artistPolicy as any).content_en)) {
        setContentHe((artistPolicy as any).content_he || '');
        setContentEn((artistPolicy as any).content_en || '');
        setHasOwnPolicy(true);
      } else {
        // Fall back to master template
        const { data: master } = await supabase
          .from('clinic_policy_master' as any)
          .select('content_he, content_en')
          .limit(1)
          .maybeSingle();
        if (master) {
          setContentHe((master as any).content_he || '');
          setContentEn((master as any).content_en || '');
        }
        setHasOwnPolicy(false);
      }
    } catch (err) {
      console.error('Failed to load policy:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      if (hasOwnPolicy) {
        await supabase
          .from('clinic_policies' as any)
          .update({ content_he: contentHe, content_en: contentEn, updated_at: new Date().toISOString() } as any)
          .eq('artist_profile_id', artistProfileId);
      } else {
        await supabase
          .from('clinic_policies' as any)
          .insert({ artist_profile_id: artistProfileId, content_he: contentHe, content_en: contentEn } as any);
        setHasOwnPolicy(true);
      }
      toast({ title: isHe ? 'המדיניות נשמרה בהצלחה ✨' : 'Policy saved successfully ✨' });
    } catch (err) {
      toast({ title: isHe ? 'שגיאה בשמירה' : 'Error saving', variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  const handleResetToDefault = async () => {
    const { data: master } = await supabase
      .from('clinic_policy_master' as any)
      .select('content_he, content_en')
      .limit(1)
      .maybeSingle();
    if (master) {
      setContentHe((master as any).content_he || '');
      setContentEn((master as any).content_en || '');
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-2xl max-h-[85vh] flex flex-col" dir="rtl">
        <DialogHeader>
          <DialogTitle className="font-serif text-lg" style={{ color: '#4a3636' }}>
            {isHe ? '✏️ עריכת מדיניות ותנאי שירות' : '✏️ Edit Clinic Policy & Terms'}
          </DialogTitle>
        </DialogHeader>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <div className="flex-1 overflow-y-auto space-y-4 min-h-0 px-1">
            <div>
              <label className="text-sm font-medium mb-1 block" style={{ color: '#B8860B' }}>
                {isHe ? 'תוכן בעברית' : 'Hebrew Content'}
              </label>
              <Textarea
                value={contentHe}
                onChange={(e) => setContentHe(e.target.value)}
                className="min-h-[200px] text-sm leading-relaxed font-sans"
                dir="rtl"
                placeholder={isHe ? 'כתבי כאן את מדיניות הקליניקה...' : 'Write your clinic policy here...'}
              />
            </div>
            <div>
              <label className="text-sm font-medium mb-1 block" style={{ color: '#B8860B' }}>
                {isHe ? 'תוכן באנגלית' : 'English Content'}
              </label>
              <Textarea
                value={contentEn}
                onChange={(e) => setContentEn(e.target.value)}
                className="min-h-[200px] text-sm leading-relaxed font-sans"
                dir="ltr"
                placeholder="Write your clinic policy here..."
              />
            </div>

            {hasOwnPolicy && (
              <Button variant="outline" size="sm" onClick={handleResetToDefault} className="gap-2">
                <RotateCcw className="w-3.5 h-3.5" />
                {isHe ? 'שחזור לתבנית ברירת מחדל' : 'Reset to default template'}
              </Button>
            )}
          </div>
        )}

        <DialogFooter className="pt-3 border-t border-border">
          <Button
            onClick={handleSave}
            disabled={saving}
            className="gap-2 min-w-[120px] transition-all"
            style={{
              background: saving
                ? 'linear-gradient(135deg, #9a7209 0%, #b8960f 50%, #9a7209 100%)'
                : 'linear-gradient(135deg, #B8860B 0%, #D4AF37 50%, #B8860B 100%)',
              color: '#fff',
              opacity: saving ? 0.8 : 1,
            }}
          >
            {saving ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                {isHe ? 'שומר...' : 'Saving...'}
              </>
            ) : (
              <>
                <Save className="w-4 h-4" />
                {isHe ? 'שמירה' : 'Save'}
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
