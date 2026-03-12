import { useState } from 'react';
import { useI18n } from '@/lib/i18n';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Loader2, RotateCcw, Eye, EyeOff, Pencil, Check, X } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useArtistHealthQuestionsEditor, type ArtistHealthQuestion } from '@/hooks/useArtistHealthQuestions';

interface Props {
  open: boolean;
  onClose: () => void;
  artistProfileId: string | null;
}

export default function HealthDeclarationEditor({ open, onClose, artistProfileId }: Props) {
  const { lang } = useI18n();
  const isHe = lang === 'he';
  const { toast } = useToast();
  const { questions, loading, refetch, setQuestions } = useArtistHealthQuestionsEditor(artistProfileId);
  const [saving, setSaving] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editText, setEditText] = useState('');
  const [editTextEn, setEditTextEn] = useState('');

  const toggleIncluded = (questionId: string) => {
    setQuestions(prev =>
      prev.map(q =>
        q.id === questionId ? { ...q, is_included: !q.is_included } : q
      )
    );
  };

  const startEdit = (q: ArtistHealthQuestion) => {
    setEditingId(q.id);
    setEditText(q.custom_text_he || q.question_he);
    setEditTextEn(q.custom_text_en || q.question_en);
  };

  const confirmEdit = (questionId: string) => {
    setQuestions(prev =>
      prev.map(q => {
        if (q.id !== questionId) return q;
        const originalHe = q.question_he;
        const originalEn = q.question_en;
        // Only set custom text if it differs from original
        const customHe = editText.trim() !== originalHe ? editText.trim() : undefined;
        const customEn = editTextEn.trim() !== originalEn ? editTextEn.trim() : undefined;
        return { ...q, custom_text_he: customHe, custom_text_en: customEn, has_override: true };
      })
    );
    setEditingId(null);
  };

  const resetToAdmin = (questionId: string) => {
    setQuestions(prev =>
      prev.map(q =>
        q.id === questionId
          ? { ...q, custom_text_he: undefined, custom_text_en: undefined, is_included: true, has_override: false }
          : q
      )
    );
  };

  const saveAll = async () => {
    if (!artistProfileId) return;
    setSaving(true);
    try {
      // Delete existing overrides for this artist
      await supabase
        .from('artist_health_question_overrides')
        .delete()
        .eq('artist_profile_id', artistProfileId);

      // Insert new overrides (only for questions that have changes)
      const overrides = questions
        .filter(q => !q.is_included || q.custom_text_he || q.custom_text_en)
        .map((q, idx) => ({
          artist_profile_id: artistProfileId,
          question_id: q.id,
          is_included: q.is_included,
          custom_text_he: q.custom_text_he || null,
          custom_text_en: q.custom_text_en || null,
          sort_order: idx,
        }));

      if (overrides.length > 0) {
        const { error } = await supabase
          .from('artist_health_question_overrides')
          .insert(overrides);
        if (error) throw error;
      }

      toast({ title: isHe ? 'ההגדרות נשמרו בהצלחה! ✅' : 'Settings saved successfully! ✅' });
      onClose();
    } catch (err: any) {
      toast({ title: isHe ? 'שגיאה בשמירה' : 'Save error', description: err.message, variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  const includedCount = questions.filter(q => q.is_included).length;

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto rounded-3xl border-accent/20" dir={isHe ? 'rtl' : 'ltr'}>
        <DialogHeader>
          <DialogTitle className="text-accent font-light text-xl tracking-wide">
            {isHe ? 'עריכת הצהרת בריאות' : 'Edit Health Declaration'}
          </DialogTitle>
        </DialogHeader>

        <p className="text-xs text-muted-foreground mb-2">
          {isHe
            ? 'בחרי אילו שאלות להציג ללקוחות שלך. תוכלי גם לערוך את הטקסט בלי לשנות את רשימת האדמין.'
            : 'Choose which questions to show your clients. You can also edit text without affecting the admin list.'}
        </p>

        <div className="flex items-center gap-2 mb-4">
          <span className="text-xs font-medium px-2.5 py-1 rounded-full bg-accent/10 text-accent">
            {includedCount}/{questions.length} {isHe ? 'פעילות' : 'active'}
          </span>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-6 h-6 animate-spin text-accent" />
          </div>
        ) : (
          <div className="space-y-2">
            {questions.map((q) => {
              const isEditing = editingId === q.id;
              const displayText = q.custom_text_he || q.question_he;
              const hasCustom = !!q.custom_text_he || !!q.custom_text_en;

              return (
                <div
                  key={q.id}
                  className={`rounded-xl border p-3 transition-all ${
                    q.is_included
                      ? 'border-accent/25 bg-background'
                      : 'border-border/30 bg-muted/30 opacity-60'
                  }`}
                >
                  {isEditing ? (
                    <div className="space-y-2">
                      <Input
                        value={editText}
                        onChange={(e) => setEditText(e.target.value)}
                        className="text-sm border-accent/30"
                        dir="rtl"
                      />
                      <Input
                        value={editTextEn}
                        onChange={(e) => setEditTextEn(e.target.value)}
                        className="text-xs border-accent/30"
                        dir="ltr"
                        placeholder="English (optional)"
                      />
                      <div className="flex gap-2">
                        <Button size="sm" variant="ghost" onClick={() => confirmEdit(q.id)} className="h-7 text-xs gap-1">
                          <Check className="w-3 h-3" /> {isHe ? 'אישור' : 'Confirm'}
                        </Button>
                        <Button size="sm" variant="ghost" onClick={() => setEditingId(null)} className="h-7 text-xs gap-1 text-muted-foreground">
                          <X className="w-3 h-3" /> {isHe ? 'ביטול' : 'Cancel'}
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-center gap-3">
                      <span className="text-lg shrink-0">{q.icon}</span>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium leading-snug">{displayText}</p>
                        {hasCustom && (
                          <span className="text-[10px] text-accent/70 font-medium">
                            {isHe ? '✏️ טקסט מותאם' : '✏️ Custom text'}
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-1.5 shrink-0">
                        {hasCustom && (
                          <button
                            onClick={() => resetToAdmin(q.id)}
                            className="p-1.5 rounded-lg hover:bg-muted transition-colors"
                            title={isHe ? 'איפוס לטקסט מקורי' : 'Reset to original'}
                          >
                            <RotateCcw className="w-3.5 h-3.5 text-muted-foreground" />
                          </button>
                        )}
                        <button
                          onClick={() => startEdit(q)}
                          className="p-1.5 rounded-lg hover:bg-muted transition-colors"
                          title={isHe ? 'עריכת טקסט' : 'Edit text'}
                        >
                          <Pencil className="w-3.5 h-3.5 text-muted-foreground" />
                        </button>
                        <Switch
                          checked={q.is_included}
                          onCheckedChange={() => toggleIncluded(q.id)}
                          className="scale-75"
                        />
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        <div className="flex gap-3 mt-5">
          <Button onClick={saveAll} disabled={saving || loading} className="flex-1 btn-gold-cta">
            {saving ? <Loader2 className="w-4 h-4 animate-spin ml-2" /> : null}
            {saving ? (isHe ? 'שומר...' : 'Saving...') : (isHe ? 'שמור שינויים' : 'Save Changes')}
          </Button>
          <Button onClick={onClose} variant="outline" className="border-accent/30 text-accent rounded-2xl">
            {isHe ? 'ביטול' : 'Cancel'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
