import { useState } from 'react';
import { useI18n } from '@/lib/i18n';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Plus, Trash2, GripVertical, X } from 'lucide-react';

const DEFAULT_QUESTIONS_HE = [
  'האם את בהריון או חושדת בהריון?',
  'האם יש לך אלרגיות כלשהן?',
  'האם את סובלת ממחלות כרוניות?',
  'האם נטלת רואקוטן ב-6 החודשים האחרונים?',
  'האם את נוטלת תרופות לדילול דם?',
  'האם את נוטלת תרופות אחרות באופן קבוע?',
  'האם יש לך בעיות עור (פסוריאזיס, אקזמה וכו׳)?',
  'האם יש לך מחלה אוטואימונית?',
  'האם נטלת אנטיביוטיקה בשבועיים האחרונים?',
  'האם עברת הזרקת בוטוקס/פילר ב-3 החודשים האחרונים?',
  'האם יש לך חוסר באנזים G6PD?',
  'האם יש לך רגישות מיוחדת באזור העיניים?',
];

export default function HealthDeclarationEditor({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { lang } = useI18n();
  const isHe = lang === 'he';

  const [questions, setQuestions] = useState<string[]>(() => {
    const saved = localStorage.getItem('gp-health-questions');
    return saved ? JSON.parse(saved) : DEFAULT_QUESTIONS_HE;
  });
  const [newQuestion, setNewQuestion] = useState('');

  const save = () => {
    localStorage.setItem('gp-health-questions', JSON.stringify(questions));
    onClose();
  };

  const addQuestion = () => {
    if (!newQuestion.trim()) return;
    setQuestions([...questions, newQuestion.trim()]);
    setNewQuestion('');
  };

  const removeQuestion = (idx: number) => {
    setQuestions(questions.filter((_, i) => i !== idx));
  };

  const updateQuestion = (idx: number, value: string) => {
    const updated = [...questions];
    updated[idx] = value;
    setQuestions(updated);
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto rounded-3xl border-accent/20" dir={isHe ? 'rtl' : 'ltr'}>
        <DialogHeader>
          <DialogTitle className="text-accent font-light text-xl tracking-wide">
            {isHe ? 'עריכת הצהרת בריאות' : 'Edit Health Declaration'}
          </DialogTitle>
        </DialogHeader>

        <p className="text-xs text-[#555555] mb-4">
          {isHe ? 'הוסיפי, מחקי או ערכי שאלות בטופס הצהרת הבריאות שנשלח ללקוחות.' : 'Add, remove or edit questions in the health declaration form sent to clients.'}
        </p>

        <div className="space-y-2.5">
          {questions.map((q, idx) => (
            <div key={idx} className="flex items-center gap-2 group">
              <GripVertical className="w-4 h-4 text-muted-foreground/40 shrink-0" />
              <Input
                value={q}
                onChange={(e) => updateQuestion(idx, e.target.value)}
                className="flex-1 bg-background border-accent/25 rounded-xl text-sm"
                dir="rtl"
              />
              <button
                onClick={() => removeQuestion(idx)}
                className="opacity-0 group-hover:opacity-100 transition-opacity p-1.5 rounded-lg hover:bg-destructive/10"
              >
                <Trash2 className="w-4 h-4 text-destructive" />
              </button>
            </div>
          ))}
        </div>

        {/* Add new question */}
        <div className="flex items-center gap-2 mt-4 pt-4 border-t border-accent/15">
          <Input
            value={newQuestion}
            onChange={(e) => setNewQuestion(e.target.value)}
            placeholder={isHe ? 'הוסיפי שאלה חדשה...' : 'Add a new question...'}
            className="flex-1 bg-background border-accent/25 rounded-xl text-sm"
            dir="rtl"
            onKeyDown={(e) => e.key === 'Enter' && addQuestion()}
          />
          <Button onClick={addQuestion} size="icon" className="shrink-0 bg-accent hover:bg-accent/90 rounded-xl">
            <Plus className="w-4 h-4" />
          </Button>
        </div>

        <div className="flex gap-3 mt-5">
          <Button onClick={save} className="flex-1 btn-gold-cta">
            {isHe ? 'שמור שינויים' : 'Save Changes'}
          </Button>
          <Button onClick={onClose} variant="outline" className="border-accent/30 text-accent rounded-2xl">
            {isHe ? 'ביטול' : 'Cancel'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
