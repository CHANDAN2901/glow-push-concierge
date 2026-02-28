import { useState, useCallback, useRef, useEffect } from 'react';
import { Mic, Square, Save, RotateCcw, Pencil, Droplets, Target, Crosshair, FileText, Sparkles, RefreshCw, KeyboardIcon } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

interface StructuredNotes {
  treatmentArea: string;
  pigmentFormula: string;
  needleType: string;
  clinicalNotes: string;
}

interface VoiceTreatmentRecordProps {
  lang: 'en' | 'he';
  clientName?: string;
  onSave?: (text: string, structured?: StructuredNotes) => void;
}

/** Remove repeated words/phrases from speech recognition output */
function deduplicateTranscript(text: string): string {
  if (!text) return text;
  const words = text.split(/\s+/);
  const cleaned: string[] = [];
  for (let i = 0; i < words.length; i++) {
    // Check for repeated sequences of 1-4 words
    let isDup = false;
    for (let len = 1; len <= 4 && len <= cleaned.length; len++) {
      const recent = cleaned.slice(-len).join(' ');
      const current = words.slice(i, i + len).join(' ');
      if (recent === current && i + len <= words.length) {
        isDup = true;
        i += len - 1; // skip the duplicate sequence
        break;
      }
    }
    if (!isDup) cleaned.push(words[i]);
  }
  return cleaned.join(' ');
}

const normalizeTranscriptSegment = (text: string) =>
  text
    .replace(/[.,!?;:״“”'`~\-]/g, '')
    .replace(/\s+/g, ' ')
    .trim();

const VoiceTreatmentRecord = ({ lang, clientName, onSave }: VoiceTreatmentRecordProps) => {
  const { toast } = useToast();

  const [mode, setMode] = useState<'idle' | 'recording' | 'processing' | 'result'>('idle');
  const [showTextInput, setShowTextInput] = useState(false);
  const [rawText, setRawText] = useState('');
  const [structured, setStructured] = useState<StructuredNotes | null>(null);
  const [transcription, setTranscription] = useState('');
  const [isEditing, setIsEditing] = useState(false);
  const [editFields, setEditFields] = useState<StructuredNotes | null>(null);
  const [timer, setTimer] = useState(0);

  const recognitionRef = useRef<any>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const accumulatedTextRef = useRef('');
  const lastFinalNormalizedRef = useRef('');
  const recentFinalsRef = useRef<string[]>([]);
  const isRecordingRef = useRef(false);
  const isStartingRef = useRef(false);
  const sessionIdRef = useRef(0);

  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      if (recognitionRef.current) {
        try { recognitionRef.current.abort(); } catch {}
      }
    };
  }, []);

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60).toString().padStart(2, '0');
    const s = (seconds % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  };

  const startRecording = async () => {
    if (isRecordingRef.current || isStartingRef.current) return;

    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      toast({
        title: lang === 'en' ? 'Speech recognition not supported' : 'זיהוי דיבור אינו נתמך בדפדפן זה',
        description: lang === 'en' ? 'Please use Chrome or Edge browser.' : 'אנא השתמשי בדפדפן Chrome או Edge.',
        variant: 'destructive',
      });
      return;
    }

    isStartingRef.current = true;
    const sessionId = ++sessionIdRef.current;

    if (recognitionRef.current) {
      try { recognitionRef.current.abort(); } catch {}
      recognitionRef.current = null;
    }

    try {
      // Request mic permission first
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      stream.getTracks().forEach(t => t.stop());
    } catch {
      isStartingRef.current = false;
      toast({
        title: lang === 'en' ? 'Please allow microphone access' : 'כדי להקליט, יש לאשר גישה למיקרופון בהגדרות הדפדפן',
        variant: 'destructive',
      });
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.lang = 'he-IL';
    recognition.continuous = true;
    recognition.interimResults = true;
    recognitionRef.current = recognition;
    accumulatedTextRef.current = '';
    lastFinalNormalizedRef.current = '';
    recentFinalsRef.current = [];

    recognition.onresult = (event: any) => {
      if (sessionId !== sessionIdRef.current || recognitionRef.current !== recognition) return;

      let interimText = '';
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const result = event.results[i];
        const transcript = (result[0]?.transcript || '').trim();
        if (!transcript) continue;

        if (result.isFinal) {
          const normalized = normalizeTranscriptSegment(transcript);
          const accumulatedNormalized = normalizeTranscriptSegment(accumulatedTextRef.current);
          const isDuplicate =
            !normalized ||
            normalized === lastFinalNormalizedRef.current ||
            recentFinalsRef.current.includes(normalized) ||
            accumulatedNormalized.endsWith(normalized);

          if (!isDuplicate) {
            accumulatedTextRef.current = (accumulatedTextRef.current + ' ' + transcript).trim();
            lastFinalNormalizedRef.current = normalized;
            recentFinalsRef.current = [...recentFinalsRef.current.slice(-24), normalized];
          }
        } else {
          interimText += transcript + ' ';
        }
      }

      const display = (accumulatedTextRef.current + ' ' + interimText).trim();
      setTranscription(deduplicateTranscript(display));
    };

    recognition.onerror = (event: any) => {
      if (sessionId !== sessionIdRef.current || recognitionRef.current !== recognition) return;

      console.error('Speech recognition error:', event.error);
      if (event.error === 'not-allowed' || event.error === 'permission-denied') {
        toast({
          title: 'כדי להקליט, יש לאשר גישה למיקרופון בהגדרות הדפדפן',
          variant: 'destructive',
        });
        handleFullReset();
      } else if (event.error === 'no-speech') {
        // Will auto-restart via onend
      }
    };

    recognition.onend = () => {
      if (sessionId !== sessionIdRef.current || recognitionRef.current !== recognition) return;

      if (isRecordingRef.current) {
        try { recognition.start(); } catch {}
      }
    };

    isRecordingRef.current = true;
    try {
      recognition.start();
    } catch (e) {
      console.error('Failed to start recognition:', e);
      toast({ title: 'שגיאה בהפעלת זיהוי דיבור', variant: 'destructive' });
      handleFullReset();
      return;
    } finally {
      isStartingRef.current = false;
    }

    setMode('recording');
    setTranscription('');
    setTimer(0);
    timerRef.current = setInterval(() => setTimer(prev => prev + 1), 1000);
  };

  const stopRecording = () => {
    isRecordingRef.current = false;
    isStartingRef.current = false;
    sessionIdRef.current += 1;

    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }

    const recognition = recognitionRef.current;
    recognitionRef.current = null;
    if (recognition) {
      recognition.onresult = null;
      recognition.onerror = null;
      recognition.onend = null;
      try { recognition.stop(); } catch {}
    }

    // Use accumulated text for processing
    const spokenText = deduplicateTranscript(accumulatedTextRef.current.trim());
    if (!spokenText) {
      toast({
        title: lang === 'en' ? 'No speech detected' : 'לא זוהה דיבור',
        description: lang === 'en' ? 'Please try again or type manually.' : 'אנא נסי שוב או הקלידי ידנית.',
        variant: 'destructive',
      });
      setMode('idle');
      return;
    }
    setMode('processing');
    processTranscribedText(spokenText);
  };

  const processTranscribedText = async (text: string) => {
    try {
      const { data, error } = await supabase.functions.invoke('structure-treatment-notes', {
        body: { rawText: text, lang },
      });

      if (error) {
        console.error('AI structuring error:', error);
        toast({
          title: lang === 'en' ? 'AI processing failed' : 'עיבוד AI נכשל',
          description: lang === 'en' ? 'Please try again or type your notes manually.' : 'אנא נסי שוב או הקלידי ידנית.',
          variant: 'destructive',
        });
        setMode('idle');
        return;
      }

      const result = data as StructuredNotes;
      setStructured(result);
      setEditFields({ ...result });
      setMode('result');
    } catch (err) {
      console.error('Error processing text:', err);
      toast({ title: lang === 'en' ? 'Connection error' : 'שגיאת חיבור', variant: 'destructive' });
      setMode('idle');
    }
  };

  const processText = async () => {
    const text = rawText.trim();
    if (!text) {
      toast({ title: lang === 'en' ? 'Please enter treatment notes' : 'אנא הכניסי הערות טיפול', variant: 'destructive' });
      return;
    }
    setMode('processing');
    try {
      const { data, error } = await supabase.functions.invoke('structure-treatment-notes', {
        body: { rawText: text, lang },
      });
      if (error) {
        toast({ title: lang === 'en' ? 'AI processing failed' : 'עיבוד AI נכשל', variant: 'destructive' });
        setMode('idle');
        return;
      }
      setTranscription(text);
      setStructured(data as StructuredNotes);
      setEditFields(data as StructuredNotes);
      setMode('result');
    } catch {
      toast({ title: lang === 'en' ? 'Connection error' : 'שגיאת חיבור', variant: 'destructive' });
      setMode('idle');
    }
  };

  const handleSave = useCallback(() => {
    const dataToSave = isEditing ? editFields : structured;
    if (!dataToSave && !transcription) {
      toast({ title: lang === 'en' ? 'No notes to save' : 'אין הערות לשמירה', variant: 'destructive' });
      return;
    }
    if (onSave) {
      onSave(transcription, dataToSave || undefined);
    }
    handleFullReset();
  }, [structured, editFields, transcription, isEditing, lang, toast, onSave]);

  const handleFullReset = () => {
    isRecordingRef.current = false;
    isStartingRef.current = false;
    sessionIdRef.current += 1;
    accumulatedTextRef.current = '';
    lastFinalNormalizedRef.current = '';
    recentFinalsRef.current = [];
    setMode('idle');
    setRawText('');
    setStructured(null);
    setTranscription('');
    setIsEditing(false);
    setEditFields(null);
    setShowTextInput(false);
    setTimer(0);
    if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null; }
    if (recognitionRef.current) {
      recognitionRef.current.onresult = null;
      recognitionRef.current.onerror = null;
      recognitionRef.current.onend = null;
      try { recognitionRef.current.abort(); } catch {}
      recognitionRef.current = null;
    }
  };

  const handleEdit = () => { setIsEditing(true); setEditFields(structured ? { ...structured } : null); };
  const handleEditSave = () => { if (editFields) { setStructured(editFields); setIsEditing(false); } };

  const structuredFields = [
    { key: 'treatmentArea' as const, icon: Target, labelHe: 'אזור טיפול', labelEn: 'Treatment Area' },
    { key: 'pigmentFormula' as const, icon: Droplets, labelHe: 'נוסחת פיגמנטים', labelEn: 'Pigment Formula' },
    { key: 'needleType' as const, icon: Crosshair, labelHe: 'סוג מחט', labelEn: 'Needle Type' },
    { key: 'clinicalNotes' as const, icon: FileText, labelHe: 'הערות קליניות', labelEn: 'Clinical Notes' },
  ];

  return (
    <div className="space-y-4">
      {/* Input Card */}
      <div className="rounded-2xl overflow-hidden bg-background border border-accent shadow-[0_2px_20px_hsl(38_55%_62%/0.08)]">
        {/* Header */}
        <div className="px-6 pt-6 pb-4">
          <div className="flex items-center justify-between mb-1">
            <div className="flex items-center gap-2.5">
              <FileText className="w-4 h-4 text-accent" strokeWidth={1.5} />
              <h3 className="font-serif font-medium text-base tracking-wide" style={{ color: '#1a1a1a' }}>
                {lang === 'en' ? 'AI Treatment Record' : 'תיעוד טיפול - AI'}
              </h3>
            </div>
            {mode !== 'idle' && (
              <button
                onClick={handleFullReset}
                className="flex items-center gap-1 text-[11px] font-medium px-2.5 py-1 rounded-full transition-all active:scale-95 hover:bg-red-50 text-muted-foreground"
              >
                <RefreshCw className="w-3 h-3" strokeWidth={1.5} />
                {lang === 'en' ? 'Reset' : 'איפוס'}
              </button>
            )}
          </div>
          {clientName && (
            <p className="text-xs mt-1 text-muted-foreground">
              {lang === 'en' ? `Recording for: ${clientName}` : `תיעוד עבור: ${clientName}`}
            </p>
          )}
        </div>

        {/* ── IDLE: Record or Type ── */}
        {mode === 'idle' && !showTextInput && (
          <div className="px-6 pb-6 flex flex-col items-center gap-5">
            <button
              onClick={startRecording}
              className="relative w-24 h-24 rounded-full flex items-center justify-center transition-all duration-300 active:scale-95 hover:scale-105 bg-white border-2 border-accent/40"
              style={{ boxShadow: '0 6px 28px rgba(212,175,55,0.15)' }}
            >
              <Mic className="w-10 h-10 text-accent" strokeWidth={1.8} />
            </button>
            <p className="text-sm font-medium" style={{ color: '#1a1a1a' }}>
              {lang === 'en' ? 'Tap to start recording' : 'לחצי להתחלת הקלטה'}
            </p>
            <button
              onClick={() => setShowTextInput(true)}
              className="flex items-center gap-2 text-xs font-medium px-4 py-2 rounded-full transition-all active:scale-95 text-muted-foreground border border-border"
            >
              <KeyboardIcon className="w-3.5 h-3.5" strokeWidth={1.5} />
              {lang === 'en' ? 'Or type manually' : 'או הקלידי ידנית'}
            </button>
          </div>
        )}

        {/* ── IDLE: Text Input Mode ── */}
        {mode === 'idle' && showTextInput && (
          <div className="px-6 pb-6">
            <textarea
              value={rawText}
              onChange={(e) => setRawText(e.target.value)}
              placeholder={lang === 'en'
                ? 'Type or use your keyboard microphone to dictate the treatment details...\n\nExample: Used pigment shade #3, 0.25mm needle, client skin type normal...'
                : 'הקלידי או השתמשי במיקרופון של המקלדת כדי להכתיב את מהלך הטיפול...\n\nדוגמה: שימוש בפיגמנט גוון 3, מחט 0.25 מ"מ, סוג עור רגיל...'}
              className="w-full min-h-[180px] rounded-xl px-5 py-4 text-sm leading-relaxed resize-none focus:outline-none transition-colors font-sans bg-muted/50 border border-accent/25"
              style={{ color: '#1a1a1a' }}
              dir={lang === 'he' ? 'rtl' : 'ltr'}
            />
            <div className="flex gap-3 mt-4">
              {rawText.trim() && (
                <button
                  onClick={processText}
                  className="flex-1 flex items-center justify-center gap-2.5 py-4 rounded-full text-[15px] font-bold tracking-wide transition-all active:scale-95 btn-gold-cta"
                >
                  <Sparkles className="w-5 h-5" strokeWidth={2} />
                  {lang === 'en' ? 'Organize with AI' : 'סדרי בעזרת AI ✨'}
                </button>
              )}
              <button
                onClick={() => { setShowTextInput(false); setRawText(''); }}
                className="flex items-center justify-center gap-2 px-5 py-4 rounded-full text-xs font-semibold transition-all active:scale-95 bg-gold-muted text-accent border border-accent/30"
              >
                <Mic className="w-4 h-4" strokeWidth={1.5} />
                {lang === 'en' ? 'Record' : 'הקלטה'}
              </button>
            </div>
          </div>
        )}

        {/* ── RECORDING ── */}
        {mode === 'recording' && (
          <div className="px-6 pb-6 flex flex-col items-center gap-5">
            <div className="relative flex items-center justify-center">
              {/* Ripple rings */}
              <div className="absolute w-36 h-36 rounded-full border border-accent/20 animate-[ping_2s_ease-out_infinite]" />
              <div className="absolute w-32 h-32 rounded-full border border-accent/15 animate-[ping_2s_ease-out_0.4s_infinite]" />
              <div className="absolute w-28 h-28 rounded-full border border-accent/10 animate-[ping_2s_ease-out_0.8s_infinite]" />
              <button
                onClick={stopRecording}
                className="relative w-24 h-24 rounded-full flex items-center justify-center transition-all active:scale-95 z-10 bg-white border-2 border-accent"
                style={{ boxShadow: '0 0 30px rgba(212,175,55,0.2)' }}
              >
                <Square className="w-8 h-8 text-destructive" fill="currentColor" strokeWidth={0} />
              </button>
            </div>
            <div className="text-center">
              <p className="text-2xl font-mono font-bold tracking-widest text-accent">
                {formatTime(timer)}
              </p>
              <p className="text-xs mt-2 font-medium text-accent animate-pulse">
                {lang === 'en' ? '✨ AI is listening...' : '✨ ה-AI מקשיב לך...'}
              </p>
            </div>
          </div>
        )}

        {/* ── PROCESSING ── */}
        {mode === 'processing' && (
          <div className="flex flex-col items-center gap-4 px-6 py-10">
            <div className="relative w-16 h-16">
              <div className="absolute inset-0 rounded-full animate-spin" style={{ border: '2.5px solid hsla(38, 55%, 62%, 0.12)', borderTopColor: 'hsl(38 55% 62%)' }} />
              <div className="absolute inset-3 rounded-full flex items-center justify-center">
                <Sparkles className="w-5 h-5 text-accent animate-pulse" strokeWidth={1.5} />
              </div>
            </div>
            <div className="text-center">
              <p className="text-sm font-serif font-medium tracking-wide text-accent animate-pulse">
                {lang === 'en' ? '✨ AI is writing the treatment summary...' : '✨ ה-AI כותב את סיכום הטיפול...'}
              </p>
              <p className="text-[11px] mt-1.5 text-muted-foreground">
                {lang === 'en' ? 'Analyzing and structuring your notes' : 'מנתח ומסדר את ההערות שלך'}
              </p>
            </div>
          </div>
        )}
      </div>

      {/* ── RESULT: Structured Output ── */}
      {mode === 'result' && structured && (
        <div
          className="rounded-2xl overflow-hidden animate-fade-up bg-background border border-accent shadow-[0_2px_20px_hsl(38_55%_62%/0.08)]"
        >
          <div className="px-6 pt-6 pb-2">
            <div className="flex items-center gap-2.5">
              <Sparkles className="w-4 h-4 text-accent" strokeWidth={1.5} />
              <h3 className="font-serif font-medium text-base tracking-wide" style={{ color: '#1a1a1a' }}>
                {lang === 'en' ? 'AI Structured Record' : 'תיעוד מובנה - AI'}
              </h3>
            </div>
          </div>

          {transcription && (
            <div className="px-6 py-3">
              <p className="text-[11px] uppercase tracking-[0.15em] font-medium mb-1.5 text-muted-foreground">
                {lang === 'en' ? 'Transcription' : 'תמלול'}
              </p>
              <p className="text-xs leading-relaxed rounded-lg px-4 py-3 bg-muted/50 text-muted-foreground border border-border" dir={lang === 'he' ? 'rtl' : 'ltr'}>
                {transcription}
              </p>
            </div>
          )}

          <div className="px-6 py-4 space-y-5">
            {structuredFields.map((field) => {
              const value = isEditing ? (editFields?.[field.key] || '') : (structured[field.key] || '');
              return (
                <div key={field.key}>
                  <div className="flex items-center gap-2 mb-2">
                    <field.icon className="w-3.5 h-3.5 text-accent" strokeWidth={1.5} />
                    <label className="font-serif text-xs font-medium uppercase tracking-[0.15em] text-muted-foreground">
                      {lang === 'en' ? field.labelEn : field.labelHe}
                    </label>
                  </div>
                  {isEditing ? (
                    <input
                      value={value}
                      onChange={(e) => setEditFields(prev => prev ? { ...prev, [field.key]: e.target.value } : null)}
                      className="w-full rounded-lg px-4 py-2.5 text-sm font-sans focus:outline-none transition-colors bg-muted/50 border border-accent/25"
                      style={{ color: '#1a1a1a' }}
                      dir={lang === 'he' ? 'rtl' : 'ltr'}
                    />
                  ) : (
                    <p className="text-sm font-sans leading-relaxed px-1" style={{ color: '#1a1a1a' }} dir={lang === 'he' ? 'rtl' : 'ltr'}>
                      {value}
                    </p>
                  )}
                </div>
              );
            })}
          </div>

          <div className="flex items-center gap-3 px-6 pb-6 pt-2">
            {isEditing ? (
              <>
                <button
                  onClick={handleEditSave}
                  className="flex-1 flex items-center justify-center gap-2 py-3 rounded-full text-xs font-semibold tracking-wide transition-all active:scale-95 btn-gold-cta"
                >
                  <Save className="w-4 h-4" strokeWidth={1.5} />
                  {lang === 'en' ? 'Confirm Changes' : 'אישור שינויים'}
                </button>
                <button
                  onClick={() => { setIsEditing(false); setEditFields(structured); }}
                  className="flex items-center justify-center gap-2 px-5 py-3 rounded-full text-xs font-semibold tracking-wide transition-all active:scale-95 bg-gold-muted text-accent border border-accent/30"
                >
                  {lang === 'en' ? 'Cancel' : 'ביטול'}
                </button>
              </>
            ) : (
              <>
                <button
                  onClick={handleSave}
                  className="flex-1 flex items-center justify-center gap-2.5 py-4 rounded-full text-[15px] font-bold tracking-wide transition-all active:scale-95 btn-gold-cta"
                >
                  <Save className="w-5 h-5" strokeWidth={2} />
                  {lang === 'en' ? 'Save to Client File' : 'שמרי בתיק הלקוחה'}
                </button>
                <button
                  onClick={handleEdit}
                  className="flex items-center justify-center gap-2 px-5 py-4 rounded-full text-xs font-semibold tracking-wide transition-all active:scale-95 bg-gold-muted text-accent border border-accent/30"
                >
                  <Pencil className="w-3.5 h-3.5" strokeWidth={1.5} />
                  {lang === 'en' ? 'Edit' : 'עריכה'}
                </button>
              </>
            )}
          </div>

          <div className="px-6 pb-5">
            <button
              onClick={handleFullReset}
              className="w-full flex items-center justify-center gap-2 py-2.5 rounded-full text-[11px] font-medium tracking-wide transition-all active:scale-95 text-muted-foreground"
            >
              <RotateCcw className="w-3 h-3" strokeWidth={1.5} />
              {lang === 'en' ? 'New Record' : 'תיעוד חדש'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default VoiceTreatmentRecord;
