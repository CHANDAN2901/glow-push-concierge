import { X, Share2, AlertTriangle, CheckCircle, MessageCircle, FileX, Printer } from 'lucide-react';
import { useI18n } from '@/lib/i18n';
import { useHealthQuestions, type HealthQuestion } from '@/hooks/useHealthQuestions';
import type { HealthDeclarationData } from '@/components/HealthDeclaration';

interface DeclarationViewerProps {
  clientName: string;
  clientPhone?: string;
  declarationData: HealthDeclarationData | null;
  dbDeclaration?: { signature_svg: string | null; created_at: string; form_data: any } | null;
  onClose: () => void;
  onSendReminder?: (clientName: string, clientPhone?: string) => void;
  logoUrl?: string;
}

export default function DeclarationViewer({
  clientName,
  clientPhone,
  declarationData,
  dbDeclaration,
  onClose,
  onSendReminder,
  logoUrl,
}: DeclarationViewerProps) {
  const { lang } = useI18n();
  const isHe = lang === 'he';
  const { questions } = useHealthQuestions();

  const handleShare = async () => {
    const text = isHe
      ? `הצהרת בריאות של ${clientName} — ${new Date().toLocaleDateString('he-IL')}`
      : `Health Declaration for ${clientName} — ${new Date().toLocaleDateString('en-US')}`;
    if (navigator.share) {
      try {
        await navigator.share({ title: text, text });
      } catch {}
    } else {
      window.print();
    }
  };

  // Empty state — no declaration filled yet
  if (!declarationData) {
    return (
      <div className="fixed inset-0 z-50 overflow-y-auto bg-background">
        <div className="min-h-screen flex flex-col items-center justify-center px-6">
          <div className="text-center max-w-sm">
            <div className="w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-5 border border-border bg-card">
              <FileX className="w-9 h-9 text-muted-foreground" />
            </div>
            <h2 className="font-bold text-xl text-foreground mb-2">
              {isHe ? 'הצהרה טרם מולאה' : 'Declaration Not Filled Yet'}
            </h2>
            <p className="text-sm text-muted-foreground mb-6">
              {isHe
                ? `${clientName} טרם מילאה את הצהרת הבריאות. שלחי תזכורת בוואטסאפ.`
                : `${clientName} hasn't filled the health declaration yet. Send a reminder via WhatsApp.`}
            </p>
            {onSendReminder && (
              <button
                onClick={() => onSendReminder(clientName, clientPhone)}
                className="flex items-center justify-center gap-2 mx-auto px-6 py-3 rounded-xl text-sm font-bold transition-all active:scale-95"
                style={{ background: 'linear-gradient(135deg, #B8860B 0%, #D4AF37 30%, #F9F295 50%, #D4AF37 70%, #B8860B 100%)', color: '#4a3636', boxShadow: '0 4px 18px rgba(212, 175, 55, 0.35)' }}
              >
                <MessageCircle className="w-4 h-4" />
                {isHe ? 'שלחי תזכורת בוואטסאפ' : 'Send Reminder via WhatsApp'}
              </button>
            )}
            <button
              onClick={onClose}
              className="mt-4 text-sm text-muted-foreground hover:underline"
            >
              {isHe ? 'חזרה' : 'Back'}
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Build answers map: for dynamic DB questions, use `answers` field; for legacy fields, use named booleans
  const getAnswer = (q: HealthQuestion): { answered: boolean; detail?: string } => {
    // Check dynamic answers first
    if (declarationData.answers && declarationData.answers[q.id] !== undefined) {
      return {
        answered: declarationData.answers[q.id],
        detail: declarationData.answerDetails?.[q.id] || undefined,
      };
    }
    return { answered: false };
  };

  const signatureData = declarationData.signatureDataUrl || dbDeclaration?.signature_svg || null;
  const submittedDate = declarationData.submittedAt
    ? new Date(declarationData.submittedAt).toLocaleDateString(isHe ? 'he-IL' : 'en-US')
    : dbDeclaration?.created_at
      ? new Date(dbDeclaration.created_at).toLocaleDateString(isHe ? 'he-IL' : 'en-US')
      : '';

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-background print:static print:overflow-visible">
      <div className="min-h-screen flex flex-col items-center px-4 pt-5 pb-24">
        <div className="w-full max-w-lg">
          {/* Top bar */}
          <div className="flex items-center justify-between mb-5 print:hidden">
            <button
              onClick={onClose}
              className="w-10 h-10 rounded-full flex items-center justify-center border border-border hover:bg-muted transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
            <button
              onClick={handleShare}
              className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all active:scale-95"
              style={{ background: 'linear-gradient(135deg, #B8860B 0%, #D4AF37 30%, #F9F295 50%, #D4AF37 70%, #B8860B 100%)', color: '#4a3636', boxShadow: '0 4px 18px rgba(212, 175, 55, 0.35)' }}
            >
              <Printer className="w-3.5 h-3.5" />
              {isHe ? 'הדפסה / שיתוף' : 'Print / Share'}
            </button>
          </div>

          {/* Header */}
          <div className="rounded-2xl p-5 mb-4 text-center bg-card">
            {logoUrl && (
              <img src={logoUrl} alt="" className="w-14 h-14 rounded-full object-cover mx-auto mb-3 border border-border" />
            )}
            <h1 className="font-bold text-lg text-foreground">
              {isHe ? 'הצהרת בריאות' : 'Health Declaration'}
            </h1>
            <p className="text-sm text-foreground/70 mt-1">{clientName}</p>
            {submittedDate && (
              <p className="text-xs text-muted-foreground mt-0.5">{submittedDate}</p>
            )}
          </div>

          {/* Personal Details */}
          <div className="rounded-2xl bg-card border border-border p-4 mb-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-3">
              {isHe ? 'פרטים אישיים' : 'Personal Details'}
            </h3>
            <div className="space-y-2">
              {[
                { label: isHe ? 'שם מלא' : 'Full Name', value: declarationData.fullName },
                { label: isHe ? 'ת.ז.' : 'ID', value: declarationData.idNumber },
                { label: isHe ? 'טלפון' : 'Phone', value: declarationData.phone },
              ].filter(f => f.value).map((f, i) => (
                <div key={i} className="flex justify-between items-center py-1.5 border-b border-border/50 last:border-0">
                  <span className="text-xs text-muted-foreground">{f.label}</span>
                  <span className="text-sm font-medium text-foreground">{f.value}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Questions */}
          <div className="rounded-2xl bg-card border border-border p-4 mb-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-3">
              {isHe ? 'שאלון רפואי' : 'Medical Questionnaire'}
            </h3>
            <div className="space-y-2">
              {questions.map((q) => {
                const { answered, detail } = getAnswer(q);
                const isRedAlert = answered && q.risk_level === 'red';
                const isYellowAlert = answered && q.risk_level === 'yellow';

                return (
                  <div
                    key={q.id}
                    className="rounded-xl p-3 border transition-all"
                    style={{
                      backgroundColor: isRedAlert ? 'hsl(0 80% 96%)' : '#fff',
                      borderColor: isRedAlert ? 'hsl(0 70% 80%)' : isYellowAlert ? 'hsl(45 80% 70%)' : 'hsl(var(--border))',
                      boxShadow: isRedAlert ? '0 0 12px hsl(0 70% 80% / 0.3)' : undefined,
                    }}
                  >
                    <div className="flex items-start gap-2.5">
                      {/* Traffic light indicator */}
                      <div
                        className="w-3 h-3 rounded-full mt-1 shrink-0 border"
                        style={{
                          backgroundColor: q.risk_level === 'red' ? '#ef4444' : q.risk_level === 'yellow' ? '#eab308' : '#22c55e',
                          borderColor: q.risk_level === 'red' ? '#dc2626' : q.risk_level === 'yellow' ? '#ca8a04' : '#16a34a',
                        }}
                      />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-sm text-foreground">
                            {q.icon} {isHe ? q.question_he : q.question_en}
                          </span>
                          <div className="flex items-center gap-1 shrink-0">
                            {isRedAlert && <AlertTriangle className="w-4 h-4 text-red-500" />}
                            {answered ? (
                              <span className="text-xs font-bold text-red-600">{isHe ? 'כן' : 'Yes'}</span>
                            ) : (
                              <span className="text-xs font-medium text-green-600">{isHe ? 'לא' : 'No'}</span>
                            )}
                          </div>
                        </div>
                        {answered && detail && (
                          <p className="text-xs text-muted-foreground mt-1 bg-muted/50 rounded-lg p-2">
                            {detail}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}

              {/* Legacy fields fallback if no dynamic questions matched */}
              {questions.length === 0 && (
                <div className="space-y-2">
                  {[
                    { key: 'pregnancy', he: 'הריון', en: 'Pregnancy', risk: 'red' },
                    { key: 'allergies', he: 'אלרגיות', en: 'Allergies', risk: 'yellow' },
                    { key: 'roaccutane', he: 'רואקוטן', en: 'Roaccutane', risk: 'red' },
                    { key: 'bloodThinners', he: 'מדללי דם', en: 'Blood Thinners', risk: 'red' },
                    { key: 'autoimmune', he: 'מחלות אוטואימוניות', en: 'Autoimmune', risk: 'red' },
                    { key: 'g6pd', he: 'חוסר G6PD', en: 'G6PD Deficiency', risk: 'red' },
                    { key: 'chronicDiseases', he: 'מחלות כרוניות', en: 'Chronic diseases', risk: 'yellow' },
                    { key: 'skinConditions', he: 'בעיות עור', en: 'Skin conditions', risk: 'yellow' },
                    { key: 'antibiotics', he: 'אנטיביוטיקה', en: 'Antibiotics', risk: 'yellow' },
                    { key: 'botoxFiller', he: 'בוטוקס/פילר', en: 'Botox/Filler', risk: 'yellow' },
                    { key: 'eyeSensitivity', he: 'רגישות בעיניים', en: 'Eye sensitivity', risk: 'green' },
                  ].map((item) => {
                    const val = (declarationData as any)[item.key];
                    const isAlert = val && item.risk === 'red';
                    return (
                      <div
                        key={item.key}
                        className="rounded-xl p-3 border"
                        style={{
                          backgroundColor: isAlert ? 'hsl(0 80% 96%)' : '#fff',
                          borderColor: isAlert ? 'hsl(0 70% 80%)' : 'hsl(var(--border))',
                        }}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <div
                              className="w-3 h-3 rounded-full border"
                              style={{
                                backgroundColor: item.risk === 'red' ? '#ef4444' : item.risk === 'yellow' ? '#eab308' : '#22c55e',
                                borderColor: item.risk === 'red' ? '#dc2626' : item.risk === 'yellow' ? '#ca8a04' : '#16a34a',
                              }}
                            />
                            <span className="text-sm">{isHe ? item.he : item.en}</span>
                          </div>
                          <div className="flex items-center gap-1">
                            {isAlert && <AlertTriangle className="w-4 h-4 text-red-500" />}
                            {val ? (
                              <span className="text-xs font-bold text-red-600">{isHe ? 'כן' : 'Yes'}</span>
                            ) : (
                              <span className="text-xs font-medium text-green-600">{isHe ? 'לא' : 'No'}</span>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          {/* Signature */}
          <div className="rounded-2xl bg-card border border-border p-4">
            <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-3">
              {isHe ? 'חתימה' : 'Signature'}
            </h3>
            {signatureData ? (
              <div className="bg-white rounded-xl border border-border p-3 flex items-center justify-center">
                <img
                  src={signatureData}
                  alt="Signature"
                  className="max-h-24 w-auto"
                  style={{ filter: 'contrast(1.5)' }}
                />
              </div>
            ) : (
              <div className="rounded-xl border-2 border-dashed border-border p-6 text-center">
                <p className="text-xs text-muted-foreground">
                  {isHe ? 'אין חתימה דיגיטלית' : 'No digital signature'}
                </p>
              </div>
            )}
            {declarationData.consent && (
              <div className="flex items-center gap-2 mt-3">
                <CheckCircle className="w-4 h-4 text-green-500" />
                <span className="text-xs text-foreground">
                  {isHe ? 'הלקוחה אישרה הסכמה לטיפול' : 'Client confirmed consent to treatment'}
                </span>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
