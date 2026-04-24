import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useAllHealthQuestions, type HealthQuestion } from '@/hooks/useHealthQuestions';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Plus, Trash2, Save, Loader2, AlertTriangle, Pencil, X, FileText, List, RotateCcw, Undo2 } from 'lucide-react';
import { useI18n } from '@/lib/i18n';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

const ICON_OPTIONS = ['🤰', '⚠️', '🏥', '💊', '🩸', '💉', '🧴', '🛡️', '🧬', '👁️', '❓', '🫀', '🦷', '🧠', '💗'];

const DEFAULT_QUESTION_IDS = [
  '70efd5e5-c63f-4d8c-a807-3c3382364c75',
  'd13240aa-eaa6-40e5-8f27-4f28116dba69',
  '53560374-124c-4dbe-bd76-edccaca978ee',
  '6a94980c-77ce-4727-9104-0bb1d61c0fde',
  '1a87ec5b-f80d-4b94-9645-e823ab83905f',
  'afc1ace4-a388-4470-8878-9c05c6da6228',
  '6c59176c-b868-4d99-af04-5795ba9efee0',
  'c7e16ab6-2dc6-48b4-9344-bb02311fb717',
];

export default function HealthQuestionsEditor() {
  const { lang } = useI18n();
  const isHe = lang === 'he';
  const { toast } = useToast();
  const { questions: dbQuestions, loading, refetch } = useAllHealthQuestions();
  const [questions, setQuestions] = useState<HealthQuestion[]>([]);
  const [saving, setSaving] = useState(false);
  const [adding, setAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [newQuestionHe, setNewQuestionHe] = useState('');
  const [newQuestionEn, setNewQuestionEn] = useState('');
  const [newRisk, setNewRisk] = useState<'red' | 'yellow' | 'green'>('yellow');
  const [newIcon, setNewIcon] = useState('❓');
  const [newHasDetail, setNewHasDetail] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<HealthQuestion | null>(null);
  const [restoring, setRestoring] = useState(false);
  const [showRestoreDialog, setShowRestoreDialog] = useState(false);

  useEffect(() => {
    setQuestions(dbQuestions);
  }, [dbQuestions]);

  const riskOptions = [
    { value: 'red', label: isHe ? '🔴 קריטי (אדום)' : '🔴 Critical (Red)', color: '#DC2626' },
    { value: 'yellow', label: isHe ? '🟡 דורש תשומת לב (צהוב)' : '🟡 Needs Attention (Yellow)', color: '#D97706' },
    { value: 'green', label: isHe ? '🟢 תקין (ירוק)' : '🟢 Clear (Green)', color: '#16A34A' },
  ] as const;

  const addQuestion = async () => {
    if (!newQuestionHe.trim()) return;
    setAdding(true);
    try {
      const maxOrder = questions.reduce((max, q) => Math.max(max, q.sort_order), 0);
      const { data, error } = await supabase
        .from('health_questions')
        .insert({
          question_he: newQuestionHe.trim(),
          question_en: newQuestionEn.trim(),
          risk_level: newRisk,
          icon: newIcon,
          has_detail_field: newHasDetail,
          sort_order: maxOrder + 1,
        })
        .select()
        .single();

      if (error) throw error;
      setQuestions([...questions, data as HealthQuestion]);
      setNewQuestionHe('');
      setNewQuestionEn('');
      setNewRisk('yellow');
      setNewIcon('❓');
      setNewHasDetail(false);
      toast({ title: isHe ? 'השאלה נוספה בהצלחה ✅' : 'Question added successfully ✅' });
    } catch (err: unknown) {
      toast({
        title: isHe ? 'שגיאה בהוספת שאלה' : 'Error adding question',
        description: err instanceof Error ? err.message : undefined,
        variant: 'destructive',
      });
    } finally {
      setAdding(false);
    }
  };

  const updateQuestion = async (id: string, updates: Partial<HealthQuestion>) => {
    setQuestions(prev => prev.map(q => q.id === id ? { ...q, ...updates } : q));
    try {
      const { error } = await supabase
        .from('health_questions')
        .update(updates)
        .eq('id', id);
      if (error) throw error;
    } catch (err: unknown) {
      toast({
        title: isHe ? 'שגיאה בעדכון' : 'Update failed',
        description: err instanceof Error ? err.message : undefined,
        variant: 'destructive',
      });
      refetch();
    }
  };

  const confirmDelete = (q: HealthQuestion) => {
    setDeleteTarget(q);
  };

  const executeDelete = async () => {
    if (!deleteTarget) return;
    const deletedQuestion = deleteTarget;
    setDeleteTarget(null);
    
    // Optimistically remove from UI
    setQuestions(prev => prev.filter(q => q.id !== deletedQuestion.id));
    
    try {
      const { error } = await supabase
        .from('health_questions')
        .delete()
        .eq('id', deletedQuestion.id);
      if (error) throw error;
      
      // Show toast with undo option
      toast({
        title: isHe ? 'השאלה נמחקה' : 'Question deleted',
        description: isHe ? 'לחצי על \'ביטול\' לשחזור' : 'Click Undo to restore it',
        action: (
          <Button
            variant="outline"
            size="sm"
            className="gap-1 border-accent/40 text-accent hover:bg-accent/10"
            onClick={() => restoreQuestion(deletedQuestion)}
          >
            <Undo2 className="w-3 h-3" />
            {isHe ? 'ביטול' : 'Undo'}
          </Button>
        ),
        duration: 8000,
      });
    } catch (err: unknown) {
      toast({
        title: isHe ? 'שגיאה במחיקה' : 'Delete failed',
        description: err instanceof Error ? err.message : undefined,
        variant: 'destructive',
      });
      refetch();
    }
  };

  const restoreQuestion = async (q: HealthQuestion) => {
    try {
      const { error } = await supabase
        .from('health_questions')
        .insert({
          id: q.id,
          question_he: q.question_he,
          question_en: q.question_en,
          risk_level: q.risk_level,
          icon: q.icon,
          has_detail_field: q.has_detail_field,
          detail_placeholder_he: q.detail_placeholder_he,
          detail_placeholder_en: q.detail_placeholder_en,
          sort_order: q.sort_order,
          is_active: q.is_active,
        });
      if (error) throw error;
      await refetch();
      toast({ title: isHe ? 'השאלה שוחזרה בהצלחה ✅' : 'Question restored successfully ✅' });
    } catch (err: unknown) {
      toast({
        title: isHe ? 'שגיאה בשחזור' : 'Restore failed',
        description: err instanceof Error ? err.message : undefined,
        variant: 'destructive',
      });
    }
  };

  const restoreDefaults = async () => {
    setShowRestoreDialog(false);
    setRestoring(true);
    try {
      // Re-activate all default questions
      for (const id of DEFAULT_QUESTION_IDS) {
        await supabase
          .from('health_questions')
          .update({ is_active: true })
          .eq('id', id);
      }
      await refetch();
      toast({
        title: isHe ? '8 שאלות ברירת המחדל שוחזרו ✅' : '8 default questions restored ✅',
        description: isHe ? 'כל שאלות ברירת המחדל מסומנות כפעילות.' : 'All default questions are active now.',
      });
    } catch (err: unknown) {
      toast({
        title: isHe ? 'שגיאה בשחזור ברירת מחדל' : 'Default restore failed',
        description: err instanceof Error ? err.message : undefined,
        variant: 'destructive',
      });
    } finally {
      setRestoring(false);
    }
  };

  const toggleActive = (id: string, currentActive: boolean) => {
    updateQuestion(id, { is_active: !currentActive });
  };

  const handleSaveAll = async () => {
    setSaving(true);
    try {
      await new Promise(r => setTimeout(r, 600));
      toast({
        title: isHe ? 'כל השינויים נשמרו בהצלחה ✅' : 'All changes saved successfully ✅',
        description: isHe ? 'השאלות מעודכנות ומסונכרנות עם הטופס שהלקוחות רואות.' : 'Questions are updated and synced with the form clients see.',
      });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-6 h-6 animate-spin text-accent" />
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-3xl" dir={lang === 'en' ? 'ltr' : 'rtl'}>
      {/* Header */}
      <div className="rounded-xl p-6 border border-border/50 bg-card">
        <div className="flex items-center gap-2 mb-2">
          <AlertTriangle className="w-5 h-5 text-accent" />
          <h2 className="font-serif font-semibold text-lg text-foreground">{isHe ? 'ניהול שאלות הצהרת בריאות' : 'Manage Health Declaration Questions'}</h2>
        </div>
        <p className="text-xs text-muted-foreground">
          {isHe
            ? 'הוסיפי, ערכי או מחקי שאלות מהטופס. כל שינוי ישפיע בזמן אמת על הטופס שהלקוחות רואות.'
            : 'Add, edit, or delete questions from the form. Every change affects the form clients see in real time.'}
        </p>
      </div>

      {/* Add New Question */}
      <div className="rounded-xl p-5 space-y-3 border-2 border-dashed border-accent/40 bg-accent/5">
        <h3 className="text-sm font-semibold flex items-center gap-2">
          <Plus className="w-4 h-4 text-accent" />
          {isHe ? 'הוספת שאלה חדשה' : 'Add New Question'}
        </h3>

        <Input
          value={newQuestionHe}
          onChange={(e) => setNewQuestionHe(e.target.value)}
          placeholder={isHe ? 'שאלה בעברית...' : 'Question in Hebrew...'}
          dir="rtl"
          className="border-accent/20"
        />
        <Input
          value={newQuestionEn}
          onChange={(e) => setNewQuestionEn(e.target.value)}
          placeholder={isHe ? 'שאלה באנגלית (לא חובה)...' : 'Question in English (optional)...'}
          dir="ltr"
          className="border-accent/20"
        />

        <div className="flex items-center gap-3 flex-wrap relative z-[100]">
          <Select value={newRisk} onValueChange={(v) => setNewRisk(v as 'red' | 'yellow' | 'green')}>
            <SelectTrigger className="w-52 text-xs h-9 border-accent/30 bg-background">
              <SelectValue placeholder={isHe ? 'רמת דחיפות' : 'Priority level'} />
            </SelectTrigger>
            <SelectContent className="z-[200] bg-popover border border-border shadow-xl">
              {riskOptions.map(r => (
                <SelectItem key={r.value} value={r.value} className="text-xs cursor-pointer">
                  {r.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={newIcon} onValueChange={setNewIcon}>
            <SelectTrigger className="w-20 text-xs h-9 border-accent/30 bg-background">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="z-[200] bg-popover border border-border shadow-xl">
              {ICON_OPTIONS.map(icon => (
                <SelectItem key={icon} value={icon} className="cursor-pointer">{icon}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          <label className="flex items-center gap-1.5 text-xs cursor-pointer">
            <Checkbox checked={newHasDetail} onCheckedChange={(c) => setNewHasDetail(c === true)} />
            {isHe ? 'שדה פירוט' : 'Detail field'}
          </label>
        </div>

        <Button
          onClick={addQuestion}
          disabled={!newQuestionHe.trim() || adding}
          variant="gold"
          className="h-10"
        >
          {adding ? <Loader2 className="w-4 h-4 animate-spin ml-2" /> : <Plus className="w-4 h-4 ml-2" />}
          {isHe ? 'הוספת שאלה' : 'Add Question'}
        </Button>
      </div>

      {/* ── Existing Questionnaire Section ── */}
      <div className="rounded-xl border border-border/50 overflow-hidden bg-card">
        <div className="px-5 py-4 flex items-center gap-2">
          <List className="w-5 h-5 text-accent" />
          <h3 className="font-serif font-semibold text-base text-foreground">{isHe ? 'השאלון הקיים שלך' : 'Your Current Questionnaire'}</h3>
          <span className="mr-auto text-xs text-muted-foreground rounded-full px-2 py-0.5 bg-background/60">
            {questions.length} {isHe ? 'שאלות' : 'questions'}
          </span>
        </div>

        {questions.length === 0 ? (
          <div className="px-5 pb-6 text-center">
            <p className="text-sm text-muted-foreground py-8">{isHe ? 'אין שאלות עדיין. הוסיפי שאלה חדשה למעלה.' : 'No questions yet. Add a new question above.'}</p>
          </div>
        ) : (
          <div className="bg-card mx-3 mb-3 rounded-xl overflow-hidden border border-border/30">
            {questions.map((q, idx) => {
              const riskOpt = riskOptions.find(r => r.value === q.risk_level);
              const isEditing = editingId === q.id;
              const questionType = q.has_detail_field ? (isHe ? 'טקסט חופשי' : 'Free text') : (isHe ? 'כן / לא' : 'Yes / No');
              return (
                <div key={q.id}>
                  {idx > 0 && <div className="h-px bg-border/50 mx-4" />}
                  <div className={`p-4 transition-all ${!q.is_active ? 'opacity-50' : ''}`}>
                    {isEditing ? (
                      /* ── Edit Mode ── */
                      <div className="space-y-3">
                        <Input
                          value={q.question_he}
                          onChange={(e) => updateQuestion(q.id, { question_he: e.target.value })}
                          className="text-sm font-medium border-accent/30"
                          dir="rtl"
                        />
                        <Input
                          value={q.question_en}
                          onChange={(e) => updateQuestion(q.id, { question_en: e.target.value })}
                          className="text-xs border-accent/30"
                          dir="ltr"
                          placeholder={isHe ? 'תרגום לאנגלית (לא חובה)' : 'English translation (optional)'}
                        />
                        <div className="flex items-center gap-3 flex-wrap relative z-[100]">
                          <Select
                            value={q.risk_level}
                            onValueChange={(v) => updateQuestion(q.id, { risk_level: v as HealthQuestion['risk_level'] })}
                          >
                            <SelectTrigger className="w-52 text-xs h-8 border-accent/30 bg-background">
                              <SelectValue placeholder={isHe ? 'רמת דחיפות' : 'Priority level'} />
                            </SelectTrigger>
                            <SelectContent className="z-[200] bg-popover border border-border shadow-xl">
                              {riskOptions.map(r => (
                                <SelectItem key={r.value} value={r.value} className="text-xs cursor-pointer">
                                  {r.label}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>

                          <Select
                            value={q.icon}
                            onValueChange={(v) => updateQuestion(q.id, { icon: v })}
                          >
                            <SelectTrigger className="w-20 text-xs h-8 border-accent/30 bg-background">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent className="z-[200] bg-popover border border-border shadow-xl">
                              {ICON_OPTIONS.map(icon => (
                                <SelectItem key={icon} value={icon} className="cursor-pointer">{icon}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>

                          <label className="flex items-center gap-1.5 text-xs cursor-pointer">
                            <Checkbox
                              checked={q.has_detail_field}
                              onCheckedChange={(c) => updateQuestion(q.id, { has_detail_field: c === true })}
                            />
                            {isHe ? 'שדה פירוט' : 'Detail field'}
                          </label>
                          <label className="flex items-center gap-1.5 text-xs cursor-pointer">
                            <Checkbox
                              checked={q.is_active}
                              onCheckedChange={() => toggleActive(q.id, q.is_active)}
                            />
                            {isHe ? 'פעיל' : 'Active'}
                          </label>
                        </div>
                        <button
                          onClick={() => setEditingId(null)}
                          className="text-xs font-medium px-3 py-1.5 rounded-lg hover:bg-muted transition-colors text-muted-foreground"
                        >
                          {isHe ? '✓ סיום עריכה' : '✓ Done Editing'}
                        </button>
                      </div>
                    ) : (
                      /* ── Read-Only Mode ── */
                      <div className="flex items-center gap-3">
                        {/* Icon + Traffic Light */}
                        <div className="flex flex-col items-center gap-1 shrink-0">
                          <span className="text-lg">{q.icon}</span>
                          <div
                            className="w-3.5 h-3.5 rounded-full border border-black/15 shadow-sm"
                            style={{ backgroundColor: riskOpt?.color }}
                            title={riskOpt?.label}
                          />
                        </div>

                        {/* Question Text & Meta */}
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-foreground leading-snug">{lang === 'en' && q.question_en ? q.question_en : q.question_he}</p>
                          {q.question_en && (
                            <p className="text-[11px] text-muted-foreground mt-0.5" dir="ltr">{q.question_en}</p>
                          )}
                          <div className="flex items-center gap-2 mt-1.5">
                            <span className="inline-flex items-center gap-1 text-[10px] font-medium px-2 py-0.5 rounded-full bg-muted text-muted-foreground">
                              <FileText className="w-2.5 h-2.5" />
                              {questionType}
                            </span>
                            {!q.is_active && (
                              <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-destructive/10 text-destructive">
                                {isHe ? 'לא פעיל' : 'Inactive'}
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Action Buttons */}
                        <div className="flex items-center gap-1 shrink-0">
                          <button
                            onClick={() => setEditingId(q.id)}
                            className="p-2 rounded-lg transition-all hover:bg-accent/10 active:scale-95 border border-transparent hover:border-accent/20"
                            title={isHe ? 'עריכה' : 'Edit'}
                          >
                            <Pencil className="w-3.5 h-3.5 text-accent" />
                          </button>
                          <button
                            onClick={() => confirmDelete(q)}
                            className="p-2 rounded-lg transition-all hover:bg-destructive/10 active:scale-95 border border-transparent hover:border-destructive/20"
                            title={isHe ? 'מחיקה' : 'Delete'}
                          >
                            <Trash2 className="w-3.5 h-3.5 text-destructive" />
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Restore Defaults */}
      <div className="flex justify-center">
        <Button
          variant="outline"
          onClick={() => setShowRestoreDialog(true)}
          disabled={restoring}
          className="gap-2 border-accent/30 text-accent hover:bg-accent/10"
        >
          {restoring ? <Loader2 className="w-4 h-4 animate-spin" /> : <RotateCcw className="w-4 h-4" />}
          {isHe ? 'שחזור שאלות ברירת מחדל' : 'Restore Default Questions'}
        </Button>
      </div>

      {/* Sticky Save Button */}
      <div className="sticky bottom-0 bg-background/95 backdrop-blur-sm border-t border-border pt-4 pb-6 -mx-1 px-1">
        <Button
          onClick={handleSaveAll}
          disabled={saving}
          className="w-full h-12 text-base font-bold"
          variant="gold"
        >
          {saving ? <Loader2 className="w-5 h-5 animate-spin ml-2" /> : <Save className="w-5 h-5 ml-2" />}
          {isHe ? 'שמירת שינויים' : 'Save Changes'}
        </Button>
        <p className="text-xs text-muted-foreground text-center mt-2">{isHe ? 'השינויים נשמרים אוטומטית בכל עריכה' : 'Changes are saved automatically as you edit'}</p>
      </div>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <AlertDialogContent dir={isHe ? 'rtl' : 'ltr'} className="rounded-2xl">
          <AlertDialogHeader>
            <AlertDialogTitle>{isHe ? 'למחוק את השאלה?' : 'Delete this question?'}</AlertDialogTitle>
            <AlertDialogDescription>
              {lang === 'en' && deleteTarget?.question_en ? deleteTarget.question_en : deleteTarget?.question_he}
              <br />
              <span className="text-xs mt-1 block">{isHe ? 'ניתן יהיה לשחזר באמצעות כפתור ׳ביטול׳ בהודעה שתופיע.' : 'You can restore it with the Undo button in the next message.'}</span>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="flex-row-reverse gap-2">
            <AlertDialogAction onClick={executeDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              {isHe ? 'מחיקה' : 'Delete'}
            </AlertDialogAction>
            <AlertDialogCancel>{isHe ? 'ביטול' : 'Cancel'}</AlertDialogCancel>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Restore Defaults Dialog */}
      <AlertDialog open={showRestoreDialog} onOpenChange={setShowRestoreDialog}>
        <AlertDialogContent dir={isHe ? 'rtl' : 'ltr'} className="rounded-2xl">
          <AlertDialogHeader>
            <AlertDialogTitle>{isHe ? 'שחזור שאלות ברירת מחדל?' : 'Restore default questions?'}</AlertDialogTitle>
            <AlertDialogDescription>
              {isHe
                ? '8 שאלות ברירת המחדל שהוגדרו על ידי המערכת ישוחזרו כפעילות. שאלות מותאמות אישית שהוספת לא יימחקו.'
                : 'The 8 default system questions will be restored as active. Custom questions you added will not be deleted.'}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="flex-row-reverse gap-2">
            <AlertDialogAction onClick={restoreDefaults} className="bg-accent text-accent-foreground hover:bg-accent/90">
              {isHe ? 'שחזור' : 'Restore'}
            </AlertDialogAction>
            <AlertDialogCancel>{isHe ? 'ביטול' : 'Cancel'}</AlertDialogCancel>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
