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

// ─── Audio helpers: record via MediaRecorder, encode to 16kHz mono WAV ───
// (server-side transcription works in every browser/PWA, unlike the Web Speech API)

function writeString(view: DataView, offset: number, str: string) {
  for (let i = 0; i < str.length; i++) view.setUint8(offset + i, str.charCodeAt(i));
}

function encodeWav(samples: Float32Array, sampleRate: number): ArrayBuffer {
  const buffer = new ArrayBuffer(44 + samples.length * 2);
  const view = new DataView(buffer);
  writeString(view, 0, 'RIFF');
  view.setUint32(4, 36 + samples.length * 2, true);
  writeString(view, 8, 'WAVE');
  writeString(view, 12, 'fmt ');
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true); // PCM
  view.setUint16(22, 1, true); // mono
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * 2, true); // byte rate
  view.setUint16(32, 2, true); // block align
  view.setUint16(34, 16, true); // bits per sample
  writeString(view, 36, 'data');
  view.setUint32(40, samples.length * 2, true);
  let offset = 44;
  for (let i = 0; i < samples.length; i++, offset += 2) {
    const s = Math.max(-1, Math.min(1, samples[i]));
    view.setInt16(offset, s < 0 ? s * 0x8000 : s * 0x7fff, true);
  }
  return buffer;
}

function downsample(buffer: Float32Array, inputRate: number, targetRate: number): Float32Array {
  if (targetRate >= inputRate) return buffer;
  const ratio = inputRate / targetRate;
  const newLen = Math.round(buffer.length / ratio);
  const result = new Float32Array(newLen);
  let offsetResult = 0;
  let offsetBuffer = 0;
  while (offsetResult < newLen) {
    const nextOffset = Math.round((offsetResult + 1) * ratio);
    let accum = 0, count = 0;
    for (let i = offsetBuffer; i < nextOffset && i < buffer.length; i++) { accum += buffer[i]; count++; }
    result[offsetResult] = count ? accum / count : 0;
    offsetResult++;
    offsetBuffer = nextOffset;
  }
  return result;
}

async function blobToWavBase64(blob: Blob): Promise<string> {
  const arrayBuffer = await blob.arrayBuffer();
  const AudioCtx = (window as any).AudioContext || (window as any).webkitAudioContext;
  const audioCtx = new AudioCtx();
  let audioBuffer: AudioBuffer;
  try {
    audioBuffer = await audioCtx.decodeAudioData(arrayBuffer);
  } finally {
    // close lazily after decode
  }
  // mix all channels down to mono
  const channels = audioBuffer.numberOfChannels;
  const length = audioBuffer.length;
  const mono = new Float32Array(length);
  for (let c = 0; c < channels; c++) {
    const data = audioBuffer.getChannelData(c);
    for (let i = 0; i < length; i++) mono[i] += data[i] / channels;
  }
  const targetRate = 16000;
  const down = downsample(mono, audioBuffer.sampleRate, targetRate);
  try { audioCtx.close(); } catch {}
  const wavBuffer = encodeWav(down, targetRate);
  // base64 encode (chunked to avoid call-stack limits)
  const bytes = new Uint8Array(wavBuffer);
  let binary = '';
  const chunk = 0x8000;
  for (let i = 0; i < bytes.length; i += chunk) {
    binary += String.fromCharCode.apply(null, Array.from(bytes.subarray(i, i + chunk)));
  }
  return btoa(binary);
}

const VoiceTreatmentRecord = ({ lang, clientName, onSave }: VoiceTreatmentRecordProps) => {
  const { toast } = useToast();

  const [mode, setMode] = useState<'idle' | 'recording' | 'processing' | 'result'>('idle');
  const [showTextInput, setShowTextInput] = useState(false);
  const [rawText, setRawText] = useState('');
  const [structured, setStructured] = useState<StructuredNotes | null>(null);
  const [transcription, setTranscription] = useState('');
  const [interimTranscription, setInterimTranscription] = useState('');
  const [isEditing, setIsEditing] = useState(false);
  const [editFields, setEditFields] = useState<StructuredNotes | null>(null);
  const [timer, setTimer] = useState(0);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const isRecordingRef = useRef(false);
  const isStartingRef = useRef(false);

  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      try { mediaRecorderRef.current?.stop(); } catch {}
      streamRef.current?.getTracks().forEach(t => t.stop());
    };
  }, []);

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60).toString().padStart(2, '0');
    const s = (seconds % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  };

  const startRecording = async () => {
    if (isRecordingRef.current || isStartingRef.current) return;

    if (typeof MediaRecorder === 'undefined' || !navigator.mediaDevices?.getUserMedia) {
      toast({
        title: lang === 'en' ? 'Recording not supported' : 'הקלטה אינה נתמכת בדפדפן זה',
        description: lang === 'en' ? 'Please use Chrome, Safari, or Edge.' : 'אנא השתמשי בדפדפן Chrome, Safari או Edge.',
        variant: 'destructive',
      });
      return;
    }

    isStartingRef.current = true;

    let stream: MediaStream;
    try {
      stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    } catch {
      isStartingRef.current = false;
      toast({
        title: lang === 'en' ? 'Please allow microphone access' : 'כדי להקליט, יש לאשר גישה למיקרופון בהגדרות הדפדפן',
        variant: 'destructive',
      });
      return;
    }
    streamRef.current = stream;

    // Pick the first mime type the browser actually supports
    const preferred = ['audio/webm;codecs=opus', 'audio/webm', 'audio/mp4', 'audio/ogg'];
    let chosen = '';
    for (const m of preferred) {
      if (typeof MediaRecorder.isTypeSupported === 'function' && MediaRecorder.isTypeSupported(m)) { chosen = m; break; }
    }

    let recorder: MediaRecorder;
    try {
      recorder = chosen ? new MediaRecorder(stream, { mimeType: chosen }) : new MediaRecorder(stream);
    } catch {
      recorder = new MediaRecorder(stream);
    }
    mediaRecorderRef.current = recorder;
    audioChunksRef.current = [];

    recorder.ondataavailable = (e: BlobEvent) => {
      if (e.data && e.data.size > 0) audioChunksRef.current.push(e.data);
    };
    recorder.onstop = () => { handleRecordingStopped(); };

    isRecordingRef.current = true;
    try {
      recorder.start();
    } catch (e) {
      console.error('Failed to start recording:', e);
      toast({ title: lang === 'en' ? 'Failed to start recording' : 'שגיאה בהפעלת ההקלטה', variant: 'destructive' });
      handleFullReset();
      return;
    } finally {
      isStartingRef.current = false;
    }

    setMode('recording');
    setTranscription('');
    setInterimTranscription('');
    setTimer(0);
    timerRef.current = setInterval(() => setTimer(prev => prev + 1), 1000);
  };

  const stopRecording = () => {
    if (!isRecordingRef.current) return;
    isRecordingRef.current = false;
    isStartingRef.current = false;

    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }

    setMode('processing');

    const recorder = mediaRecorderRef.current;
    if (recorder && recorder.state !== 'inactive') {
      try {
        recorder.stop(); // fires onstop -> handleRecordingStopped
      } catch {
        handleRecordingStopped();
      }
    } else {
      handleRecordingStopped();
    }
  };

  const handleRecordingStopped = async () => {
    // Release the microphone
    streamRef.current?.getTracks().forEach(t => t.stop());
    streamRef.current = null;

    const chunks = audioChunksRef.current;
    audioChunksRef.current = [];
    const recorder = mediaRecorderRef.current;
    mediaRecorderRef.current = null;

    if (!chunks.length) {
      toast({
        title: lang === 'en' ? 'No speech detected' : 'לא זוהה דיבור',
        description: lang === 'en' ? 'Please try again or type manually.' : 'אנא נסי שוב או הקלידי ידנית.',
        variant: 'destructive',
      });
      setMode('idle');
      return;
    }

    try {
      const blob = new Blob(chunks, { type: recorder?.mimeType || 'audio/webm' });
      const audioBase64 = await blobToWavBase64(blob);

      // Server caps audio at 10MB (~4 min at 16kHz mono)
      if ((audioBase64.length * 3) / 4 > 10 * 1024 * 1024) {
        toast({
          title: lang === 'en' ? 'Recording too long' : 'ההקלטה ארוכה מדי',
          description: lang === 'en' ? 'Please keep recordings under ~4 minutes.' : 'אנא הקליטי עד כ-4 דקות.',
          variant: 'destructive',
        });
        setMode('idle');
        return;
      }

      const { data, error } = await supabase.functions.invoke('transcribe-treatment-audio', {
        body: { audioBase64, mimeType: 'audio/wav', lang },
      });

      if (error || !data || (data as any).error) {
        console.error('Transcription error:', error || (data as any)?.error);
        toast({
          title: lang === 'en' ? 'Transcription failed' : 'התמלול נכשל',
          description: lang === 'en' ? 'Please try again or type your notes manually.' : 'אנא נסי שוב או הקלידי ידנית.',
          variant: 'destructive',
        });
        setMode('idle');
        return;
      }

      const result = data as StructuredNotes & { transcription?: string };
      const text = (result.transcription || '').trim();
      const structuredResult: StructuredNotes = {
        treatmentArea: result.treatmentArea || '',
        pigmentFormula: result.pigmentFormula || '',
        needleType: result.needleType || '',
        clinicalNotes: result.clinicalNotes || '',
      };

      if (!text && !structuredResult.treatmentArea && !structuredResult.clinicalNotes) {
        toast({
          title: lang === 'en' ? 'No speech detected' : 'לא זוהה דיבור',
          description: lang === 'en' ? 'Please try again or type manually.' : 'אנא נסי שוב או הקלידי ידנית.',
          variant: 'destructive',
        });
        setMode('idle');
        return;
      }

      setTranscription(text);
      setStructured(structuredResult);
      setEditFields({ ...structuredResult });
      setMode('result');
    } catch (err) {
      console.error('Error processing recording:', err);
      toast({
        title: lang === 'en' ? 'Processing failed' : 'העיבוד נכשל',
        description: lang === 'en' ? 'Please try again or type your notes manually.' : 'אנא נסי שוב או הקלידי ידנית.',
        variant: 'destructive',
      });
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
      setInterimTranscription('');
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
    setMode('idle');
    setRawText('');
    setStructured(null);
    setTranscription('');
    setInterimTranscription('');
    setIsEditing(false);
    setEditFields(null);
    setShowTextInput(false);
    setTimer(0);
    if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null; }
    if (mediaRecorderRef.current) {
      mediaRecorderRef.current.ondataavailable = null;
      mediaRecorderRef.current.onstop = null;
      try { mediaRecorderRef.current.stop(); } catch {}
      mediaRecorderRef.current = null;
    }
    streamRef.current?.getTracks().forEach(t => t.stop());
    streamRef.current = null;
    audioChunksRef.current = [];
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
              <p className="text-[11px] mt-3 text-muted-foreground">
                {lang === 'en' ? 'Tap the stop button when done' : 'לחצי על עצור כשסיימת'}
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
