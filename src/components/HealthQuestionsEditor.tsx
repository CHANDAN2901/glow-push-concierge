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
import { Plus, Trash2, Save, Loader2, AlertTriangle, Pencil, X, FileText, List } from 'lucide-react';

const RISK_OPTIONS = [
  { value: 'red', label: '🔴 קריטי (אדום)', color: '#DC2626' },
  { value: 'yellow', label: '🟡 דורש תשומת לב (צהוב)', color: '#D97706' },
  { value: 'green', label: '🟢 תקין (ירוק)', color: '#16A34A' },
];

const ICON_OPTIONS = ['🤰', '⚠️', '🏥', '💊', '🩸', '💉', '🧴', '🛡️', '🧬', '👁️', '❓', '🫀', '🦷', '🧠', '💗'];

export default function HealthQuestionsEditor() {
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

  useEffect(() => {
    setQuestions(dbQuestions);
  }, [dbQuestions]);

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
      toast({ title: 'השאלה נוספה בהצלחה ✅' });
    } catch (err: any) {
      toast({ title: 'שגיאה בהוספת שאלה', description: err.message, variant: 'destructive' });
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
    } catch (err: any) {
      toast({ title: 'שגיאה בעדכון', description: err.message, variant: 'destructive' });
      refetch();
    }
  };

  const deleteQuestion = async (id: string) => {
    setQuestions(prev => prev.filter(q => q.id !== id));
    try {
      const { error } = await supabase
        .from('health_questions')
        .delete()
        .eq('id', id);
      if (error) throw error;
      toast({ title: 'השאלה נמחקה ✅' });
    } catch (err: any) {
      toast({ title: 'שגיאה במחיקה', description: err.message, variant: 'destructive' });
      refetch();
    }
  };

  const toggleActive = (id: string, currentActive: boolean) => {
    updateQuestion(id, { is_active: !currentActive });
  };

  const handleSaveAll = async () => {
    setSaving(true);
    try {
      await new Promise(r => setTimeout(r, 600));
      toast({ title: 'כל השינויים נשמרו בהצלחה ✅', description: 'השאלות מעודכנות ומסונכרנות עם הטופס שהלקוחות רואות.' });
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
    <div className="space-y-6 max-w-3xl" dir="rtl">
      {/* Header */}
      <div className="rounded-xl p-6 border border-border/50 bg-card">
        <div className="flex items-center gap-2 mb-2">
          <AlertTriangle className="w-5 h-5 text-accent" />
          <h2 className="font-serif font-semibold text-lg text-foreground">ניהול שאלות הצהרת בריאות</h2>
        </div>
        <p className="text-xs text-muted-foreground">
          הוסיפי, ערכי או מחקי שאלות מהטופס. כל שינוי ישפיע בזמן אמת על הטופס שהלקוחות רואות.
        </p>
      </div>

      {/* Add New Question */}
      <div className="rounded-xl p-5 space-y-3 border-2 border-dashed border-accent/40 bg-accent/5">
        <h3 className="text-sm font-semibold flex items-center gap-2">
          <Plus className="w-4 h-4 text-accent" />
          הוספת שאלה חדשה
        </h3>

        <Input
          value={newQuestionHe}
          onChange={(e) => setNewQuestionHe(e.target.value)}
          placeholder="שאלה בעברית..."
          dir="rtl"
          className="border-accent/20"
        />
        <Input
          value={newQuestionEn}
          onChange={(e) => setNewQuestionEn(e.target.value)}
          placeholder="Question in English (optional)..."
          dir="ltr"
          className="border-accent/20"
        />

        <div className="flex items-center gap-3 flex-wrap relative z-[100]">
          <Select value={newRisk} onValueChange={(v) => setNewRisk(v as any)}>
            <SelectTrigger className="w-52 text-xs h-9 border-accent/30 bg-background">
              <SelectValue placeholder="רמת דחיפות" />
            </SelectTrigger>
            <SelectContent className="z-[200] bg-popover border border-border shadow-xl">
              {RISK_OPTIONS.map(r => (
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
            שדה פירוט
          </label>
        </div>

        <Button
          onClick={addQuestion}
          disabled={!newQuestionHe.trim() || adding}
          variant="gold"
          className="h-10"
        >
          {adding ? <Loader2 className="w-4 h-4 animate-spin ml-2" /> : <Plus className="w-4 h-4 ml-2" />}
          הוספת שאלה
        </Button>
      </div>

      {/* ── Existing Questionnaire Section ── */}
      <div className="rounded-xl border border-border/50 overflow-hidden bg-card">
        <div className="px-5 py-4 flex items-center gap-2">
          <List className="w-5 h-5 text-accent" />
          <h3 className="font-serif font-semibold text-base text-foreground">השאלון הקיים שלך</h3>
          <span className="mr-auto text-xs text-muted-foreground rounded-full px-2 py-0.5 bg-background/60">
            {questions.length} שאלות
          </span>
        </div>

        {questions.length === 0 ? (
          <div className="px-5 pb-6 text-center">
            <p className="text-sm text-muted-foreground py-8">אין שאלות עדיין. הוסיפי שאלה חדשה למעלה.</p>
          </div>
        ) : (
          <div className="bg-card mx-3 mb-3 rounded-xl overflow-hidden border border-border/30">
            {questions.map((q, idx) => {
              const riskOpt = RISK_OPTIONS.find(r => r.value === q.risk_level);
              const isEditing = editingId === q.id;
              const questionType = q.has_detail_field ? 'טקסט חופשי' : 'כן / לא';
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
                          placeholder="English translation (optional)"
                        />
                        <div className="flex items-center gap-3 flex-wrap relative z-[100]">
                          <Select
                            value={q.risk_level}
                            onValueChange={(v) => updateQuestion(q.id, { risk_level: v as any })}
                          >
                            <SelectTrigger className="w-52 text-xs h-8 border-accent/30 bg-background">
                              <SelectValue placeholder="רמת דחיפות" />
                            </SelectTrigger>
                            <SelectContent className="z-[200] bg-popover border border-border shadow-xl">
                              {RISK_OPTIONS.map(r => (
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
                            שדה פירוט
                          </label>
                          <label className="flex items-center gap-1.5 text-xs cursor-pointer">
                            <Checkbox
                              checked={q.is_active}
                              onCheckedChange={() => toggleActive(q.id, q.is_active)}
                            />
                            פעיל
                          </label>
                        </div>
                        <button
                          onClick={() => setEditingId(null)}
                          className="text-xs font-medium px-3 py-1.5 rounded-lg hover:bg-muted transition-colors text-muted-foreground"
                        >
                          ✓ סיום עריכה
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
                          <p className="text-sm font-medium text-foreground leading-snug">{q.question_he}</p>
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
                                לא פעיל
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Action Buttons */}
                        <div className="flex items-center gap-1 shrink-0">
                          <button
                            onClick={() => setEditingId(q.id)}
                            className="p-2 rounded-lg transition-all hover:bg-accent/10 active:scale-95 border border-transparent hover:border-accent/20"
                            title="עריכה"
                          >
                            <Pencil className="w-3.5 h-3.5 text-accent" />
                          </button>
                          <button
                            onClick={() => deleteQuestion(q.id)}
                            className="p-2 rounded-lg transition-all hover:bg-destructive/10 active:scale-95 border border-transparent hover:border-destructive/20"
                            title="מחיקה"
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

      {/* Sticky Save Button */}
      <div className="sticky bottom-0 bg-background/95 backdrop-blur-sm border-t border-border pt-4 pb-6 -mx-1 px-1">
        <Button
          onClick={handleSaveAll}
          disabled={saving}
          className="w-full h-12 text-base font-bold"
          variant="gold"
        >
          {saving ? <Loader2 className="w-5 h-5 animate-spin ml-2" /> : <Save className="w-5 h-5 ml-2" />}
          שמירת שינויים
        </Button>
        <p className="text-xs text-muted-foreground text-center mt-2">השינויים נשמרים אוטומטית בכל עריכה</p>
      </div>
    </div>
  );
}
