import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { CheckCircle2, XCircle, FileText } from 'lucide-react';
import { useI18n } from '@/lib/i18n';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  clientId: string;
  artistProfileId: string;
}

interface QuestionRow {
  id: string;
  question_he: string;
  question_en: string;
  sort_order: number;
  icon: string;
}

export default function HealthDeclarationReadOnly({ open, onOpenChange, clientId, artistProfileId }: Props) {
  const { lang } = useI18n();
  const [declaration, setDeclaration] = useState<any>(null);
  const [questions, setQuestions] = useState<QuestionRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!open || !clientId) return;
    setLoading(true);

    const fetchData = async () => {
      // Fetch latest declaration for this client
      const { data: decl } = await supabase
        .from('health_declarations')
        .select('form_data, is_signed, created_at, signature_svg')
        .eq('client_id', clientId)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      setDeclaration(decl);

      // Fetch questions (master + artist overrides)
      const { data: masterQ } = await supabase
        .from('health_questions')
        .select('id, question_he, question_en, sort_order, icon')
        .eq('is_active', true)
        .order('sort_order');

      // Also fetch artist custom questions
      const { data: customQ } = await supabase
        .from('artist_custom_health_questions')
        .select('id, question_he, question_en, sort_order, icon')
        .eq('artist_profile_id', artistProfileId);

      const all: QuestionRow[] = [
        ...(masterQ || []),
        ...(customQ || []),
      ].sort((a, b) => a.sort_order - b.sort_order);

      setQuestions(all);
      setLoading(false);
    };

    fetchData();
  }, [open, clientId, artistProfileId]);

  const formData = declaration?.form_data as Record<string, any> | null;
  const answers: Record<string, boolean> = formData?.answers || {};
  const answerDetails: Record<string, string> = formData?.answerDetails || {};
  const idNumber: string = formData?.idNumber || '';
  const signedAt = declaration?.created_at
    ? new Date(declaration.created_at).toLocaleDateString('he-IL', { year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' })
    : '';

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md mx-auto max-h-[85vh] overflow-y-auto rounded-3xl p-0" dir="rtl"
        style={{
          background: '#FFFAF8',
          border: '1px solid rgba(212,175,55,0.25)',
        }}
      >
        <DialogHeader className="px-6 pt-6 pb-2">
          <DialogTitle className="text-lg font-bold text-center" style={{ color: '#5C400A', fontFamily: "'Assistant', sans-serif" }}>
            <FileText className="w-5 h-5 inline-block ml-2" style={{ color: '#B8860B' }} />
            {lang === 'en' ? 'My Health Declaration' : 'הצהרת הבריאות שלי'}
          </DialogTitle>
        </DialogHeader>

        <div className="px-6 pb-6">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin w-6 h-6 border-2 border-t-transparent rounded-full" style={{ borderColor: '#B8860B', borderTopColor: 'transparent' }} />
            </div>
          ) : !declaration ? (
            <div className="text-center py-10" style={{ color: '#8B7355', fontFamily: "'Assistant', sans-serif" }}>
              <p className="text-sm">{lang === 'en' ? 'No health declaration found.' : 'לא נמצאה הצהרת בריאות.'}</p>
            </div>
          ) : (
            <>
              {/* ID Number */}
              {idNumber && (
                <div className="mb-4 p-3 rounded-xl" style={{ background: 'rgba(212,175,55,0.08)', border: '1px solid rgba(212,175,55,0.15)' }}>
                  <span className="text-xs font-medium" style={{ color: '#8B7355', fontFamily: "'Assistant', sans-serif" }}>
                    {lang === 'en' ? 'ID Number' : 'מספר תעודת זהות'}
                  </span>
                  <p className="text-sm font-semibold mt-0.5" style={{ color: '#5C400A', fontFamily: "'Assistant', sans-serif" }}>{idNumber}</p>
                </div>
              )}

              {/* Questions & Answers */}
              <div className="space-y-2.5">
                {questions.map((q) => {
                  const answered = answers[q.id];
                  const isYes = answered === true;
                  const detail = answerDetails[q.id];
                  const qText = lang === 'en' ? q.question_en : q.question_he;
                  if (!qText) return null;

                  return (
                    <div key={q.id} className="p-3 rounded-xl" style={{
                      background: 'rgba(255,255,255,0.85)',
                      border: '1px solid rgba(212,175,55,0.12)',
                      boxShadow: '0 1px 4px rgba(0,0,0,0.03)',
                    }}>
                      <div className="flex items-start gap-2.5">
                        <span className="text-base mt-0.5 flex-shrink-0">{q.icon}</span>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm leading-snug" style={{ color: '#5C400A', fontFamily: "'Assistant', sans-serif" }}>{qText}</p>
                          <div className="flex items-center gap-1.5 mt-1.5">
                            {isYes ? (
                              <>
                                <CheckCircle2 className="w-4 h-4 flex-shrink-0" style={{ color: '#22c55e' }} />
                                <span className="text-xs font-medium" style={{ color: '#22c55e' }}>{lang === 'en' ? 'Yes' : 'כן'}</span>
                              </>
                            ) : answered === false ? (
                              <>
                                <XCircle className="w-4 h-4 flex-shrink-0" style={{ color: '#94a3b8' }} />
                                <span className="text-xs font-medium" style={{ color: '#94a3b8' }}>{lang === 'en' ? 'No' : 'לא'}</span>
                              </>
                            ) : (
                              <span className="text-xs" style={{ color: '#94a3b8' }}>{lang === 'en' ? 'Not answered' : 'לא נענתה'}</span>
                            )}
                          </div>
                          {detail && (
                            <p className="text-xs mt-1 px-2 py-1 rounded-lg" style={{ background: 'rgba(212,175,55,0.06)', color: '#8B7355' }}>{detail}</p>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Signature */}
              {declaration.signature_svg && (
                <div className="mt-5 text-center">
                  <p className="text-xs mb-2 font-medium" style={{ color: '#8B7355', fontFamily: "'Assistant', sans-serif" }}>
                    {lang === 'en' ? 'Signature' : 'חתימה'}
                  </p>
                  <div className="inline-block p-2 rounded-xl" style={{ background: 'rgba(255,255,255,0.9)', border: '1px solid rgba(212,175,55,0.15)' }}>
                    <img src={declaration.signature_svg} alt="Signature" className="max-h-16 mx-auto" />
                  </div>
                </div>
              )}

              {/* Timestamp */}
              {signedAt && (
                <div className="mt-5 text-center">
                  <p className="text-xs" style={{ color: '#8B7355', fontFamily: "'Assistant', sans-serif" }}>
                    {lang === 'en' ? `Signed on: ${signedAt}` : `נחתם בתאריך: ${signedAt}`}
                  </p>
                </div>
              )}
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
