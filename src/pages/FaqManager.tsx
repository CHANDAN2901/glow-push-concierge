import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Card } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { toast } from 'sonner';
import { Plus, Pencil, Trash2, GripVertical, ArrowRight } from 'lucide-react';

interface FaqItem {
  id: string;
  question_he: string;
  answer_he: string;
  question_en: string;
  answer_en: string;
  sort_order: number;
  is_active: boolean;
}

const emptyFaq: Omit<FaqItem, 'id'> = {
  question_he: '',
  answer_he: '',
  question_en: '',
  answer_en: '',
  sort_order: 0,
  is_active: true,
};

export default function FaqManager() {
  const { isAdmin } = useAuth();
  const navigate = useNavigate();
  const [faqs, setFaqs] = useState<FaqItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingFaq, setEditingFaq] = useState<FaqItem | null>(null);
  const [form, setForm] = useState(emptyFaq);

  useEffect(() => {
    if (!isAdmin) {
      navigate('/');
      return;
    }
    fetchFaqs();
  }, [isAdmin]);

  const fetchFaqs = async () => {
    const { data, error } = await supabase
      .from('faqs')
      .select('*')
      .order('sort_order', { ascending: true });
    if (!error && data) setFaqs(data);
    setLoading(false);
  };

  const openNew = () => {
    setEditingFaq(null);
    setForm({ ...emptyFaq, sort_order: faqs.length });
    setDialogOpen(true);
  };

  const openEdit = (faq: FaqItem) => {
    setEditingFaq(faq);
    setForm({
      question_he: faq.question_he,
      answer_he: faq.answer_he,
      question_en: faq.question_en,
      answer_en: faq.answer_en,
      sort_order: faq.sort_order,
      is_active: faq.is_active,
    });
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!form.question_he.trim()) {
      toast.error('שאלה בעברית היא שדה חובה');
      return;
    }

    if (editingFaq) {
      const { error } = await supabase
        .from('faqs')
        .update({
          question_he: form.question_he,
          answer_he: form.answer_he,
          question_en: form.question_en,
          answer_en: form.answer_en,
          sort_order: form.sort_order,
          is_active: form.is_active,
        })
        .eq('id', editingFaq.id);
      if (error) {
        toast.error('שגיאה בעדכון');
        return;
      }
      toast.success('שאלה עודכנה בהצלחה');
    } else {
      const { error } = await supabase.from('faqs').insert({
        question_he: form.question_he,
        answer_he: form.answer_he,
        question_en: form.question_en,
        answer_en: form.answer_en,
        sort_order: form.sort_order,
        is_active: form.is_active,
      });
      if (error) {
        toast.error('שגיאה בהוספה');
        return;
      }
      toast.success('שאלה נוספה בהצלחה');
    }

    setDialogOpen(false);
    fetchFaqs();
  };

  const handleDelete = async (id: string) => {
    if (!confirm('למחוק שאלה זו?')) return;
    const { error } = await supabase.from('faqs').delete().eq('id', id);
    if (error) {
      toast.error('שגיאה במחיקה');
      return;
    }
    toast.success('שאלה נמחקה');
    fetchFaqs();
  };

  const toggleActive = async (faq: FaqItem) => {
    await supabase.from('faqs').update({ is_active: !faq.is_active }).eq('id', faq.id);
    fetchFaqs();
  };

  if (!isAdmin) return null;

  return (
    <div className="min-h-screen bg-background" dir="rtl">
      <div className="max-w-4xl mx-auto p-6 pt-24 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">ניהול שאלות נפוצות</h1>
            <p className="text-sm text-muted-foreground mt-1">שאלות אלו מוצגות בדף הנחיתה הראשי</p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => navigate('/super-admin')}>
              <ArrowRight className="w-4 h-4 ml-1" /> חזרה לניהול
            </Button>
            <Button onClick={openNew} size="sm">
              <Plus className="w-4 h-4 ml-1" /> שאלה חדשה
            </Button>
          </div>
        </div>

        {/* FAQ List */}
        {loading ? (
          <p className="text-center text-muted-foreground py-12">טוען...</p>
        ) : faqs.length === 0 ? (
          <p className="text-center text-muted-foreground py-12">אין שאלות עדיין</p>
        ) : (
          <div className="space-y-3">
            {faqs.map((faq) => (
              <Card
                key={faq.id}
                className={`p-4 flex items-start gap-4 transition-opacity ${!faq.is_active ? 'opacity-50' : ''}`}
              >
                <GripVertical className="w-4 h-4 mt-1 text-muted-foreground/40 shrink-0" />
                <div className="flex-1 min-w-0 space-y-1">
                  <p className="font-medium text-sm leading-relaxed">{faq.question_he}</p>
                  <p className="text-xs text-muted-foreground leading-relaxed line-clamp-2">{faq.answer_he}</p>
                  {faq.question_en && (
                    <p className="text-xs text-muted-foreground/60 italic" dir="ltr">{faq.question_en}</p>
                  )}
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <Switch checked={faq.is_active} onCheckedChange={() => toggleActive(faq)} />
                  <Button variant="ghost" size="icon" onClick={() => openEdit(faq)}>
                    <Pencil className="w-4 h-4" />
                  </Button>
                  <Button variant="ghost" size="icon" onClick={() => handleDelete(faq.id)}>
                    <Trash2 className="w-4 h-4 text-destructive" />
                  </Button>
                </div>
              </Card>
            ))}
          </div>
        )}

        {/* Add/Edit Dialog */}
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogContent className="max-w-lg" dir="rtl">
            <DialogHeader>
              <DialogTitle>{editingFaq ? 'עריכת שאלה' : 'שאלה חדשה'}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 pt-2">
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1 block">שאלה (עברית) *</label>
                <Input
                  value={form.question_he}
                  onChange={(e) => setForm({ ...form, question_he: e.target.value })}
                  placeholder="מה השאלה?"
                />
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1 block">תשובה (עברית) *</label>
                <Textarea
                  value={form.answer_he}
                  onChange={(e) => setForm({ ...form, answer_he: e.target.value })}
                  placeholder="התשובה..."
                  rows={3}
                />
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1 block">Question (English)</label>
                <Input
                  dir="ltr"
                  value={form.question_en}
                  onChange={(e) => setForm({ ...form, question_en: e.target.value })}
                  placeholder="Question in English"
                />
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1 block">Answer (English)</label>
                <Textarea
                  dir="ltr"
                  value={form.answer_en}
                  onChange={(e) => setForm({ ...form, answer_en: e.target.value })}
                  placeholder="Answer in English"
                  rows={3}
                />
              </div>
              <div className="flex items-center gap-3">
                <label className="text-xs font-medium text-muted-foreground">סדר מיון</label>
                <Input
                  type="number"
                  className="w-20"
                  value={form.sort_order}
                  onChange={(e) => setForm({ ...form, sort_order: parseInt(e.target.value) || 0 })}
                />
                <div className="flex items-center gap-2 mr-auto">
                  <label className="text-xs font-medium text-muted-foreground">פעיל</label>
                  <Switch checked={form.is_active} onCheckedChange={(v) => setForm({ ...form, is_active: v })} />
                </div>
              </div>
              <Button onClick={handleSave} className="w-full">
                {editingFaq ? 'שמור שינויים' : 'הוסף שאלה'}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}
