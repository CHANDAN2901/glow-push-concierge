import { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useI18n } from '@/lib/i18n';
import { useHealthQuestions, calculateDynamicRiskLevel } from '@/hooks/useHealthQuestions';

// Cast to bypass generated types until they regenerate for 'appointments' table
const db = supabase as any;

import { useToast } from '@/hooks/use-toast';
import {
  ChevronLeft, ChevronRight, Plus, Check, Clock, Phone,
  ClipboardCheck, AlertTriangle, Sparkles, X, CalendarDays,
  MessageSquare, Eye, MessageCircle,
} from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

export type HealthRiskLevel = 'red' | 'yellow' | 'green' | 'none';

export interface HealthFormAnswers {
  pregnancy?: boolean;
  allergies?: boolean;
  allergiesDetail?: string;
  chronicDiseases?: boolean;
  chronicDiseasesDetail?: string;
  roaccutane?: boolean;
  bloodThinners?: boolean;
  otherMedications?: boolean;
  otherMedicationsDetail?: string;
  skinConditions?: boolean;
  autoimmune?: boolean;
  antibiotics?: boolean;
  antibioticsDetail?: string;
  botoxFiller?: boolean;
  g6pd?: boolean;
  eyeSensitivity?: boolean;
}

export interface Appointment {
  id: string;
  clientName: string;
  clientPhone: string;
  treatmentType: 'eyebrows' | 'lips' | 'eyeliner';
  date: string; // YYYY-MM-DD
  time: string; // HH:MM
  healthFormStatus: 'signed' | 'pending';
  healthRiskLevel: HealthRiskLevel;
  healthFormAnswers?: HealthFormAnswers;
  status: 'scheduled' | 'completed' | 'cancelled';
  autoSendHealth: boolean;
}

interface Props {
  lang: 'en' | 'he';
  onTreatmentCompleted?: (appointment: Appointment) => void;
  redFlagClients?: string[];
  onNewAppointment?: (prefill: { name: string; phone: string; treatment: string; date: string; time: string }) => void;
  onBack?: () => void;
  artistProfileId?: string;
  logoUrl?: string;
  removeClientName?: string | null;
  onClientRemoved?: () => void;
  onClientAdded?: () => void;
  existingClientNames?: string[];
}

const DAYS_HE = ['א׳', 'ב׳', 'ג׳', 'ד׳', 'ה׳', 'ו׳', 'ש׳'];
const DAYS_EN = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MONTHS_HE = ['ינואר', 'פברואר', 'מרץ', 'אפריל', 'מאי', 'יוני', 'יולי', 'אוגוסט', 'ספטמבר', 'אוקטובר', 'נובמבר', 'דצמבר'];

const goldColor = '#D4AF37';

/** Calculate risk level from health form answers */
export function calculateRiskLevel(answers: HealthFormAnswers): HealthRiskLevel {
  // Red: critical conditions
  const redFlags = [answers.pregnancy, answers.roaccutane, answers.bloodThinners, answers.autoimmune, answers.g6pd, answers.chronicDiseases];
  if (redFlags.some(Boolean)) return 'red';

  // Yellow: attention needed
  const yellowFlags = [answers.allergies, answers.skinConditions, answers.antibiotics, answers.botoxFiller, answers.eyeSensitivity, answers.otherMedications];
  if (yellowFlags.some(Boolean)) return 'yellow';

  return 'green';
}

const RISK_CONFIG: Record<HealthRiskLevel, { color: string; bg: string; emoji: string; labelHe: string; labelEn: string }> = {
  red: { color: '#DC2626', bg: 'rgba(220,38,38,0.12)', emoji: '🔴', labelHe: 'דגל אדום — נדרשת בדיקה', labelEn: 'Red flag — review required' },
  yellow: { color: '#D97706', bg: 'rgba(217,119,6,0.12)', emoji: '🟡', labelHe: 'דורש תשומת לב', labelEn: 'Attention needed' },
  green: { color: '#16A34A', bg: 'rgba(22,163,74,0.12)', emoji: '🟢', labelHe: 'תקין — מאושר לטיפול', labelEn: 'Clear — approved' },
  none: { color: '#9CA3AF', bg: 'rgba(156,163,175,0.12)', emoji: '⚪', labelHe: 'ממתין למילוי טופס', labelEn: 'Awaiting form' },
};

export default function SmartCalendar({ lang, onTreatmentCompleted, redFlagClients = [], onNewAppointment, onBack, artistProfileId, logoUrl, removeClientName, onClientRemoved, onClientAdded, existingClientNames = [] }: Props) {
  const isHe = lang === 'he';
  const { toast } = useToast();
  const isRedFlag = (name: string) => redFlagClients.includes(name);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [viewMode, setViewMode] = useState<'week' | 'month'>('week');
  const [displayMonth, setDisplayMonth] = useState(() => new Date());
  const [weekStart, setWeekStart] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() - d.getDay());
    return d;
  });
  const [showAddModal, setShowAddModal] = useState(false);
  const [detailModalApt, setDetailModalApt] = useState<Appointment | null>(null);
  const [fullScreenDeclaration, setFullScreenDeclaration] = useState<Appointment | null>(null);

  // Load appointments from database
  useEffect(() => {
    if (!artistProfileId) return;
    const loadAppointments = async () => {
      const { data, error } = await db
        .from('appointments')
        .select('*')
        .eq('artist_id', artistProfileId)
        .order('date', { ascending: true });
      if (data && !error) {
        // Deduplicate by client_name + date + time
        const seen = new Set<string>();
        const unique = data.filter((row: any) => {
          const key = `${row.client_name}-${row.date}-${row.time}`;
          if (seen.has(key)) return false;
          seen.add(key);
          return true;
        });
        setAppointments(unique.map((row: any) => ({
          id: row.id,
          clientName: row.client_name,
          clientPhone: row.client_phone || '',
          treatmentType: row.treatment_type as 'eyebrows' | 'lips' | 'eyeliner',
          date: row.date,
          time: row.time,
          healthFormStatus: row.health_form_status as 'signed' | 'pending',
          healthRiskLevel: row.health_risk_level as HealthRiskLevel,
          healthFormAnswers: row.health_form_answers as HealthFormAnswers | undefined,
          status: row.status as 'scheduled' | 'completed' | 'cancelled',
          autoSendHealth: row.auto_send_health,
        })));
      }
    };
    loadAppointments();
  }, [artistProfileId]);

  // Remove future appointments for a deleted client
  useEffect(() => {
    if (removeClientName && artistProfileId) {
      const today = new Date().toISOString().split('T')[0];
      // Remove from DB
      db
        .from('appointments')
        .delete()
        .eq('artist_id', artistProfileId)
        .eq('client_name', removeClientName)
        .gte('date', today)
        .eq('status', 'scheduled')
        .then(() => {});
      // Remove from local state
      setAppointments(prev => prev.filter(a => !(a.clientName === removeClientName && a.date >= today && a.status === 'scheduled')));
      onClientRemoved?.();
    }
  }, [removeClientName]);

  // New appointment form
  const [newName, setNewName] = useState('');
  const [newPhone, setNewPhone] = useState('');
  const [newType, setNewType] = useState<'eyebrows' | 'lips' | 'eyeliner'>('eyebrows');
  const [newDate, setNewDate] = useState(new Date().toISOString().split('T')[0]);
  const [newTime, setNewTime] = useState('10:00');
  const [newAutoHealth, setNewAutoHealth] = useState(false);

  // Swipe handling
  const touchStartX = useRef(0);
  const touchEndX = useRef(0);
  const swipeContainerRef = useRef<HTMLDivElement>(null);

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
  }, []);

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    touchEndX.current = e.touches[0].clientX;
  }, []);

  const handleTouchEnd = useCallback(() => {
    const diff = touchStartX.current - touchEndX.current;
    const threshold = 50;
    if (Math.abs(diff) > threshold) {
      if (diff > 0) {
        setSelectedDate(prev => {
          const d = new Date(prev);
          d.setDate(d.getDate() + 1);
          const weekEnd = new Date(weekStart);
          weekEnd.setDate(weekEnd.getDate() + 6);
          if (d > weekEnd) {
            setWeekStart(prev => {
              const w = new Date(prev);
              w.setDate(w.getDate() + 7);
              return w;
            });
          }
          return d;
        });
      } else {
        setSelectedDate(prev => {
          const d = new Date(prev);
          d.setDate(d.getDate() - 1);
          if (d < weekStart) {
            setWeekStart(prev => {
              const w = new Date(prev);
              w.setDate(w.getDate() - 7);
              return w;
            });
          }
          return d;
        });
      }
    }
  }, [weekStart]);

  const treatmentLabels: Record<string, { en: string; he: string; emoji: string }> = {
    eyebrows: { en: 'Brows', he: 'גבות', emoji: '✨' },
    lips: { en: 'Lips', he: 'שפתיים', emoji: '💋' },
    eyeliner: { en: 'Eyeliner', he: 'אייליינר', emoji: '🖤' },
  };

  const weekDays = useMemo(() => {
    const days = [];
    for (let i = 0; i < 7; i++) {
      const d = new Date(weekStart);
      d.setDate(d.getDate() + i);
      days.push(d);
    }
    return days;
  }, [weekStart]);

  // Month grid days computation
  const monthGridDays = useMemo(() => {
    const year = displayMonth.getFullYear();
    const month = displayMonth.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const startDay = firstDay.getDay(); // 0=Sun
    const days: (Date | null)[] = [];
    // Fill leading blanks
    for (let i = 0; i < startDay; i++) days.push(null);
    for (let d = 1; d <= lastDay.getDate(); d++) {
      days.push(new Date(year, month, d));
    }
    return days;
  }, [displayMonth]);

  const selectedDateStr = selectedDate.toISOString().split('T')[0];
  const dayAppointments = appointments
    .filter(a => a.date === selectedDateStr && a.status !== 'cancelled')
    .sort((a, b) => a.time.localeCompare(b.time));

  const navigateWeek = (dir: number) => {
    setWeekStart(prev => {
      const d = new Date(prev);
      d.setDate(d.getDate() + dir * 7);
      return d;
    });
  };

  const navigateMonth = (dir: number) => {
    setDisplayMonth(prev => {
      const d = new Date(prev);
      d.setMonth(d.getMonth() + dir);
      return d;
    });
  };

  const isToday = (d: Date) => d.toISOString().split('T')[0] === new Date().toISOString().split('T')[0];
  const isSelected = (d: Date) => d.toISOString().split('T')[0] === selectedDateStr;
  const hasAppointments = (d: Date) => appointments.some(a => a.date === d.toISOString().split('T')[0] && a.status !== 'cancelled');

  const formatPhoneForWA = (phone: string) => {
    const digits = phone.replace(/\D/g, '');
    return digits.startsWith('0') ? '972' + digits.slice(1) : digits;
  };

  const getHealthFormLink = (clientName?: string, clientPhone?: string) => {
    const base = window.location.origin;
    const params = new URLSearchParams();
    if (artistProfileId) params.set('artist_id', artistProfileId);
    if (clientName) params.set('name', clientName);
    if (clientPhone) params.set('client_phone', clientPhone);
    if (logoUrl) params.set('logo', logoUrl);
    return `${base}/health-declaration?${params.toString()}`;
  };

  const openWhatsAppHealthForm = (name: string, phone: string, date: string, time: string) => {
    if (!phone) {
      toast({ title: isHe ? 'לא ניתן לשלוח — חסר מספר טלפון' : 'Cannot send — phone number missing', variant: 'destructive' });
      return;
    }
    const formattedDate = new Date(date).toLocaleDateString('he-IL');
    const link = getHealthFormLink(name, phone);
    const artistDisplayName = 'האמנית שלך';
    const text = `היי ${name} 💛\nאני ${artistDisplayName}, ממש שמחה שקבענו תור ב-${formattedDate} בשעה ${time}!\n\nלפני הטיפול, חשוב למלא הצהרת בריאות קצרה 🩺\nזה לוקח פחות מדקה:\n👇\n${link}\n\nתודה מראש ונתראה בקרוב! ✨`;
    const waUrl = `https://wa.me/${formatPhoneForWA(phone)}?text=${encodeURIComponent(text)}`;
    window.open(waUrl, '_blank');
    toast({ title: isHe ? 'הודעה נשלחה בהצלחה ✉️' : 'Message sent successfully ✉️' });
  };

  const isTomorrow = (dateStr: string) => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    return dateStr === tomorrow.toISOString().split('T')[0];
  };

  const sendReminder = (apt: Appointment) => {
    if (!apt.clientPhone) {
      toast({ title: isHe ? 'לא ניתן לשלוח — חסר מספר טלפון' : 'Cannot send — phone number missing', variant: 'destructive' });
      return;
    }
    let text = `היי ${apt.clientName}, מזכירה לך את התור שלנו מחר ב-${apt.time}. מחכה לראותך! ✨`;
    if (apt.healthFormStatus === 'pending') {
      const link = getHealthFormLink(apt.clientName, apt.clientPhone);
      text += `\n\nשימי לב שטרם מילאת את הצהרת הבריאות, אנא עשי זאת כעת בקישור:\n${link}`;
    }
    const waUrl = `https://wa.me/${formatPhoneForWA(apt.clientPhone)}?text=${encodeURIComponent(text)}`;
    window.open(waUrl, '_blank');
  };

  const toggleHealthStatus = async (aptId: string) => {
    if (navigator.vibrate) navigator.vibrate(50);
    const apt = appointments.find(a => a.id === aptId);
    if (!apt) return;
    const newStatus = apt.healthFormStatus === 'signed' ? 'pending' : 'signed';
    const newRisk = newStatus === 'pending' ? 'none' : (apt.healthFormAnswers ? calculateRiskLevel(apt.healthFormAnswers) : 'green');
    setAppointments(prev => prev.map(a =>
      a.id === aptId ? { ...a, healthFormStatus: newStatus, healthRiskLevel: newRisk } : a
    ));
    await db.from('appointments').update({ health_form_status: newStatus, health_risk_level: newRisk }).eq('id', aptId);
  };

  const [isSaving, setIsSaving] = useState(false);

  const handleAdd = async () => {
    if (!newName.trim() || !artistProfileId) return;
    setIsSaving(true);

    try {
      // 0. Check for duplicate appointment
      const { data: existing } = await db
        .from('appointments')
        .select('id')
        .eq('artist_id', artistProfileId)
        .eq('client_name', newName.trim())
        .eq('date', newDate)
        .eq('time', newTime)
        .neq('status', 'cancelled')
        .limit(1);
      if (existing && existing.length > 0) {
        toast({ title: isHe ? 'תור זהה כבר קיים לאותו לקוח, תאריך ושעה' : 'A duplicate appointment already exists for this client, date and time', variant: 'destructive' });
        setIsSaving(false);
        return;
      }

      // 1. Save appointment to DB
      const { data: insertedApt, error: aptError } = await db
        .from('appointments')
        .insert({
          artist_id: artistProfileId,
          client_name: newName.trim(),
          client_phone: newPhone.trim(),
          treatment_type: newType,
          date: newDate,
          time: newTime,
          health_form_status: 'pending',
          health_risk_level: 'none',
          health_form_answers: {},
          status: 'scheduled',
          auto_send_health: newAutoHealth,
        })
        .select()
        .single();

      if (aptError) throw aptError;

      // 2. Add to local state
      const apt: Appointment = {
        id: insertedApt.id,
        clientName: insertedApt.client_name,
        clientPhone: insertedApt.client_phone || '',
        treatmentType: insertedApt.treatment_type as 'eyebrows' | 'lips' | 'eyeliner',
        date: insertedApt.date,
        time: insertedApt.time,
        healthFormStatus: 'pending',
        healthRiskLevel: 'none',
        status: 'scheduled',
        autoSendHealth: insertedApt.auto_send_health,
      };
      setAppointments(prev => [...prev, apt]);

      // 3. Auto-create client if not exists, and link appointment to client
      const isNewClient = !existingClientNames.some(n => n === newName.trim());
      let clientId: string | null = null;
      if (isNewClient) {
        const { data: newClient, error: clientError } = await supabase.from('clients').insert({
          artist_id: artistProfileId,
          full_name: newName.trim(),
          phone: newPhone.trim() || null,
          treatment_type: newType === 'eyebrows' ? 'גבות' : newType === 'lips' ? 'שפתיים' : 'אייליינר',
          treatment_date: newDate,
        }).select('id').single();
        if (!clientError && newClient) {
          clientId = newClient.id;
          onClientAdded?.();
        }
      } else {
        // Find existing client ID
        const { data: existing } = await supabase.from('clients')
          .select('id')
          .eq('artist_id', artistProfileId)
          .eq('full_name', newName.trim())
          .limit(1)
          .maybeSingle();
        if (existing) clientId = existing.id;
      }
      // Link appointment to client
      if (clientId && insertedApt?.id) {
        await db.from('appointments').update({ client_id: clientId }).eq('id', insertedApt.id);
      }

      setShowAddModal(false);

      if (newAutoHealth && onNewAppointment) {
        onNewAppointment({ name: newName, phone: newPhone, treatment: newType, date: newDate, time: newTime });
      }

      if (newPhone.trim()) {
        openWhatsAppHealthForm(newName, newPhone, newDate, newTime);
      }

      setNewName(''); setNewPhone(''); setNewType('eyebrows'); setNewTime('10:00'); setNewAutoHealth(false);
      toast({
        title: isHe ? 'התור נשמר בהצלחה! ✨' : 'Appointment saved successfully! ✨',
      });
    } catch (err) {
      console.error('Failed to save appointment:', err);
      toast({ title: isHe ? 'שמירת התור נכשלה' : 'Failed to save appointment', variant: 'destructive' });
    } finally {
      setIsSaving(false);
    }
  };

  const markCompleted = async (apt: Appointment) => {
    if (navigator.vibrate) navigator.vibrate(50);
    setAppointments(prev => prev.map(a => a.id === apt.id ? { ...a, status: 'completed' as const } : a));
    await db.from('appointments').update({ status: 'completed' }).eq('id', apt.id);
    toast({ title: isHe ? `הטיפול של ${apt.clientName} הושלם! מסלול החלמה הופעל אוטומטית 🎉` : `${apt.clientName}'s treatment completed! Healing journey activated 🎉` });
    onTreatmentCompleted?.({ ...apt, status: 'completed' });
  };

  const monthLabel = viewMode === 'month'
    ? (isHe
        ? `${MONTHS_HE[displayMonth.getMonth()]} ${displayMonth.getFullYear()}`
        : displayMonth.toLocaleDateString('en-US', { month: 'long', year: 'numeric' }))
    : (isHe
        ? `${MONTHS_HE[weekStart.getMonth()]} ${weekStart.getFullYear()}`
        : weekStart.toLocaleDateString('en-US', { month: 'long', year: 'numeric' }));

  // Medical question labels for detail modal
  const medicalLabels: { key: keyof HealthFormAnswers; labelHe: string; labelEn: string; detailKey?: keyof HealthFormAnswers; critical?: boolean }[] = [
    { key: 'pregnancy', labelHe: 'הריון או הנקה', labelEn: 'Pregnancy/breastfeeding', critical: true },
    { key: 'allergies', labelHe: 'אלרגיות', labelEn: 'Allergies', detailKey: 'allergiesDetail' },
    { key: 'chronicDiseases', labelHe: 'מחלות כרוניות', labelEn: 'Chronic diseases', detailKey: 'chronicDiseasesDetail', critical: true },
    { key: 'roaccutane', labelHe: 'רואקוטן', labelEn: 'Roaccutane', critical: true },
    { key: 'bloodThinners', labelHe: 'מדללי דם', labelEn: 'Blood thinners', critical: true },
    { key: 'otherMedications', labelHe: 'תרופות אחרות', labelEn: 'Other medications', detailKey: 'otherMedicationsDetail' },
    { key: 'skinConditions', labelHe: 'בעיות עור', labelEn: 'Skin conditions' },
    { key: 'autoimmune', labelHe: 'מחלות אוטואימוניות', labelEn: 'Autoimmune', critical: true },
    { key: 'antibiotics', labelHe: 'אנטיביוטיקה', labelEn: 'Antibiotics', detailKey: 'antibioticsDetail' },
    { key: 'botoxFiller', labelHe: 'בוטוקס/פילר', labelEn: 'Botox/filler' },
    { key: 'g6pd', labelHe: 'חוסר G6PD', labelEn: 'G6PD deficiency', critical: true },
    { key: 'eyeSensitivity', labelHe: 'רגישות בעיניים', labelEn: 'Eye sensitivity' },
  ];

  return (
    <div className="space-y-5 animate-fade-up">
      {/* Back Navigation */}
      {onBack && (
        <div className="flex items-center justify-between w-full px-4 py-3">
          <div className="w-10 h-10" />
          <h1 className="text-lg font-bold text-foreground truncate text-center flex-1 mx-2">
            {isHe ? 'יומן טיפולים' : 'Treatment Calendar'}
          </h1>
          <button
            onClick={onBack}
            aria-label="Back"
            className="w-10 h-10 flex items-center justify-center rounded-full transition-all active:scale-90 text-accent border-2 border-accent bg-accent/5"
          >
            <ChevronRight className="w-5 h-5" strokeWidth={2.5} />
          </button>
        </div>
      )}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          {!onBack && (
            <h2 className="font-serif font-bold text-xl flex items-center gap-2">
              <CalendarDays className="w-5 h-5 text-accent" />
              {isHe ? 'יומן טיפולים' : 'Treatment Calendar'}
            </h2>
          )}
        </div>
        <div className="flex items-center gap-2">
          {/* Week/Month toggle */}
          <div className="flex items-center bg-muted rounded-xl p-0.5">
            <button
              onClick={() => setViewMode('week')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${viewMode === 'week' ? 'bg-card shadow-sm text-foreground' : 'text-muted-foreground'}`}
            >
              {isHe ? 'שבוע' : 'Week'}
            </button>
            <button
              onClick={() => setViewMode('month')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${viewMode === 'month' ? 'bg-card shadow-sm text-foreground' : 'text-muted-foreground'}`}
            >
              {isHe ? 'חודש' : 'Month'}
            </button>
          </div>
          <button
            onClick={() => { setNewDate(selectedDateStr); setShowAddModal(true); }}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-semibold transition-all active:scale-95"
            style={{ background: '#ffffff', border: '2.5px solid #D4AF37', color: '#5C4033' }}
          >
            <Plus className="w-4 h-4" />
            {isHe ? 'תור חדש' : 'New'}
          </button>
        </div>
      </div>

      {/* Calendar Views */}
      <div className="bg-card rounded-2xl border border-border p-3 select-none">
        {/* Navigation header */}
        <div className="flex items-center justify-between mb-3">
          <button
            onClick={() => viewMode === 'week' ? navigateWeek(-1) : navigateMonth(-1)}
            className="w-8 h-8 rounded-full flex items-center justify-center hover:bg-muted transition-colors"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <div className="flex items-center gap-3">
            <span className="text-sm font-semibold text-foreground">{monthLabel}</span>
            <button
              onClick={() => {
                const today = new Date();
                setSelectedDate(today);
                setDisplayMonth(today);
                setWeekStart(() => { const d = new Date(); d.setDate(d.getDate() - d.getDay()); return d; });
              }}
              className="text-xs font-medium text-accent hover:underline"
            >
              {isHe ? 'היום' : 'Today'}
            </button>
          </div>
          <button
            onClick={() => viewMode === 'week' ? navigateWeek(1) : navigateMonth(1)}
            className="w-8 h-8 rounded-full flex items-center justify-center hover:bg-muted transition-colors"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>

        {viewMode === 'week' ? (
          /* Week Strip */
          <div
            ref={swipeContainerRef}
            onTouchStart={handleTouchStart}
            onTouchMove={handleTouchMove}
            onTouchEnd={handleTouchEnd}
            className="touch-pan-y"
          >
            <div className="grid grid-cols-7 gap-1">
              {weekDays.map((day, i) => {
                const dayNames = isHe ? DAYS_HE : DAYS_EN;
                return (
                  <button
                    key={i}
                    onClick={() => setSelectedDate(day)}
                    className={`flex flex-col items-center py-2 rounded-xl transition-all ${
                      isSelected(day)
                        ? 'shadow-sm'
                        : isToday(day)
                        ? 'bg-accent/10 text-accent'
                        : 'hover:bg-muted text-foreground'
                    }`}
                    style={isSelected(day) ? { background: '#ffffff', border: '2.5px solid #D4AF37', color: '#5C4033' } : undefined}
                  >
                    <span className="text-[10px] font-medium opacity-70">{dayNames[i]}</span>
                    <span className="text-sm font-bold mt-0.5">{day.getDate()}</span>
                    {hasAppointments(day) && !isSelected(day) && (
                      <div className="w-1.5 h-1.5 rounded-full mt-1" style={{ backgroundColor: goldColor }} />
                    )}
                  </button>
                );
              })}
            </div>
            <p className="text-[10px] text-muted-foreground text-center mt-2 opacity-60">
              {isHe ? '← החליקי בין ימים →' : '← Swipe between days →'}
            </p>
          </div>
        ) : (
          /* Full Month Grid */
          <div>
            {/* Day name headers */}
            <div className="grid grid-cols-7 gap-1 mb-1">
              {(isHe ? DAYS_HE : DAYS_EN).map((name, i) => (
                <div key={i} className="text-center text-[10px] font-semibold text-muted-foreground py-1">
                  {name}
                </div>
              ))}
            </div>
            {/* Day cells */}
            <div className="grid grid-cols-7 gap-1">
              {monthGridDays.map((day, i) => {
                if (!day) return <div key={`blank-${i}`} />;
                const isCurrentMonth = day.getMonth() === displayMonth.getMonth();
                return (
                  <button
                    key={i}
                    onClick={() => {
                      setSelectedDate(day);
                      // Also update week start so switching back to week view stays consistent
                      const ws = new Date(day);
                      ws.setDate(ws.getDate() - ws.getDay());
                      setWeekStart(ws);
                    }}
                    className={`flex flex-col items-center justify-center py-1.5 rounded-xl transition-all text-sm relative ${
                      isSelected(day)
                        ? 'shadow-sm font-bold'
                        : isToday(day)
                        ? 'bg-accent/10 text-accent font-semibold'
                        : isCurrentMonth
                        ? 'hover:bg-muted text-foreground'
                        : 'text-muted-foreground/40'
                    }`}
                    style={isSelected(day) ? { background: '#ffffff', border: '2.5px solid #D4AF37', color: '#5C4033' } : undefined}
                  >
                    <span>{day.getDate()}</span>
                    {hasAppointments(day) && !isSelected(day) && (
                      <div className="w-1.5 h-1.5 rounded-full mt-0.5" style={{ backgroundColor: goldColor }} />
                    )}
                    {hasAppointments(day) && isSelected(day) && (
                      <div className="w-1.5 h-1.5 rounded-full mt-0.5" style={{ backgroundColor: goldColor }} />
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* Day Appointments */}
      <div
        className="space-y-3 relative z-10"
      >
        <h3 className="text-sm font-semibold text-muted-foreground">
          {isHe
            ? `${selectedDate.getDate()} ${MONTHS_HE[selectedDate.getMonth()]} · ${dayAppointments.length} תורים`
            : `${selectedDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} · ${dayAppointments.length} appointments`}
        </h3>

        {dayAppointments.length === 0 ? (
          <div className="bg-card rounded-2xl border border-border p-8 text-center">
            <CalendarDays className="w-10 h-10 mx-auto mb-3 text-muted-foreground/30" />
            <p className="text-sm text-muted-foreground">
              {isHe ? 'אין תורים ליום זה' : 'No appointments for this day'}
            </p>
            <button
              onClick={() => { setNewDate(selectedDateStr); setShowAddModal(true); }}
              className="mt-3 text-xs font-semibold hover:underline"
              style={{ color: goldColor }}
            >
              {isHe ? '+ הוסיפי תור' : '+ Add appointment'}
            </button>
          </div>
        ) : (
          dayAppointments.map(apt => {
            const t = treatmentLabels[apt.treatmentType] ?? { en: apt.treatmentType, he: apt.treatmentType, emoji: '💉' };
            const isCompleted = apt.status === 'completed';
            const risk = RISK_CONFIG[apt.healthRiskLevel];
            const hasRedFlag = isRedFlag(apt.clientName) || apt.healthRiskLevel === 'red';
            return (
              <div
                key={apt.id}
                onClick={(e) => e.stopPropagation()}
                onTouchStart={(e) => e.stopPropagation()}
                className={`bg-card rounded-2xl p-4 transition-all duration-500 ease-in-out ${
                  hasRedFlag && !isCompleted
                    ? 'border-2 border-destructive/50 bg-destructive/5'
                    : isCompleted
                    ? 'border border-accent/20 opacity-80'
                    : apt.healthRiskLevel === 'yellow'
                    ? 'border-2 border-yellow-500/40'
                    : apt.healthFormStatus === 'pending'
                    ? 'border-2 border-dashed border-muted-foreground/30'
                    : 'border border-border'
                }`}
              >
                <div className="flex items-start gap-3">
                  {/* Time pill + risk dot */}
                  <div className="flex flex-col items-center gap-1.5">
                    <div className={`px-3 py-2 rounded-xl text-center shrink-0 ${hasRedFlag && !isCompleted ? 'bg-destructive/10' : isCompleted ? 'bg-accent/10' : 'bg-muted'}`}>
                      <p className="text-xs font-bold" style={isCompleted ? { color: goldColor } : hasRedFlag ? { color: 'hsl(var(--destructive))' } : undefined}>{apt.time}</p>
                      <p className="text-[10px] text-muted-foreground">{t.emoji}</p>
                    </div>
                    {/* Traffic light dot — clickable */}
                    <button
                      onClick={() => apt.healthFormStatus === 'signed' ? setDetailModalApt(apt) : undefined}
                      className="w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all active:scale-90"
                      style={{ borderColor: risk.color, backgroundColor: risk.bg }}
                      title={isHe ? risk.labelHe : risk.labelEn}
                    >
                      <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: risk.color }} />
                    </button>
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className={`font-medium text-sm truncate ${hasRedFlag && !isCompleted ? 'text-destructive font-bold' : ''}`}>{apt.clientName}</p>
                      {apt.healthRiskLevel === 'red' && !isCompleted && <span className="text-xs">🔴</span>}
                      {apt.healthRiskLevel === 'yellow' && !isCompleted && <span className="text-xs">🟡</span>}
                      {isCompleted && <Check className="w-4 h-4 text-accent shrink-0" />}
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {isHe ? t.he : t.en}
                      {apt.clientPhone && <span className="mx-1.5">·</span>}
                      {apt.clientPhone && <span dir="ltr">{apt.clientPhone}</span>}
                    </p>

                    {/* Badges */}
                    <div className="flex items-center gap-2 mt-2 flex-wrap">
                      {/* Health form status toggle */}
                      <button
                        onClick={() => toggleHealthStatus(apt.id)}
                        className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold transition-all duration-500 ease-in-out active:scale-95 cursor-pointer text-white"
                        style={{
                          backgroundColor: apt.healthFormStatus === 'signed' ? '#22c55e' : '#9ca3af',
                        }}
                      >
                        {apt.healthFormStatus === 'signed' ? (
                          <><Check className="w-3 h-3" /> {isHe ? '✅ הצהרה חתומה' : '✅ Signed'}</>
                        ) : (
                          <>
                            <span className="relative flex h-2.5 w-2.5">
                              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white/60" />
                              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-white/80" />
                            </span>
                            {isHe ? 'ממתין לחתימה' : 'Pending'}
                          </>
                        )}
                      </button>

                      {/* View details button — signed: open full declaration; pending: send WhatsApp */}
                      {apt.healthFormStatus === 'signed' ? (
                        <button
                          onClick={() => setFullScreenDeclaration(apt)}
                          className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold text-white transition-all active:scale-95 shadow-sm"
                          style={{ background: 'linear-gradient(135deg, #B8860B, #D4AF37 50%, #F9F295 80%)' }}
                        >
                          <Eye className="w-3 h-3" />
                          {isHe ? 'צפייה' : 'View'}
                        </button>
                      ) : apt.clientPhone ? (
                        <button
                          onClick={() => openWhatsAppHealthForm(apt.clientName, apt.clientPhone, apt.date, apt.time)}
                         className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold border transition-all active:scale-95"
                          style={{ borderColor: '#D4AF37', color: '#5C4033', background: 'transparent' }}
                        >
                          <ClipboardCheck className="w-3 h-3" />
                          {isHe ? 'שלח קישור' : 'Send Link'}
                        </button>
                      ) : null}

                      {apt.autoSendHealth && (
                        <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-[10px] font-semibold bg-accent/10 text-accent">
                          <MessageSquare className="w-3 h-3" />
                          {isHe ? 'שליחה אוטומטית' : 'Auto Send'}
                        </span>
                      )}

                      {isCompleted && (
                        <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-[10px] font-semibold bg-accent/10 text-accent">
                          <Sparkles className="w-3 h-3" />
                          {isHe ? 'מסלול החלמה פעיל' : 'Healing Journey Active'}
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Action buttons */}
                {!isCompleted && (
                  <div className="flex items-center gap-2 mt-3 pt-3 border-t border-border">
                    <button
                      onClick={() => markCompleted(apt)}
                      className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-full text-xs font-bold transition-all active:scale-[0.97] shadow-md btn-metallic-gold"
                      style={{ boxShadow: '0 4px 14px -3px rgba(212, 175, 55, 0.4)' }}
                    >
                      <Check className="w-3.5 h-3.5" />
                      {isHe ? 'סמני כהושלם' : 'Mark Completed'}
                    </button>
                    {/* WhatsApp health form send */}
                    {apt.clientPhone && apt.healthFormStatus === 'pending' && (
                      <button
                        onClick={() => openWhatsAppHealthForm(apt.clientName, apt.clientPhone, apt.date, apt.time)}
                        className="w-10 h-10 rounded-full flex items-center justify-center border border-[#D4AF37]/30 shadow-md transition-all active:scale-95 shrink-0"
                        style={{ background: 'linear-gradient(135deg, #B8860B, #D4AF37 50%, #F9F295 80%)' }}
                        title={isHe ? 'שלח הצהרת בריאות בוואטסאפ' : 'Send health form via WhatsApp'}
                      >
                        <MessageCircle className="w-4 h-4 text-white" />
                      </button>
                    )}
                    {/* Tomorrow reminder button */}
                    {isTomorrow(apt.date) && apt.clientPhone && (
                      <button
                        onClick={() => sendReminder(apt)}
                        className="w-10 h-10 rounded-xl flex items-center justify-center border border-accent/30 bg-accent/5 hover:bg-accent/10 transition-colors shrink-0"
                        title={isHe ? 'שלח תזכורת למחר' : 'Send tomorrow reminder'}
                      >
                        <MessageSquare className="w-4 h-4 text-accent" />
                      </button>
                    )}
                    {apt.clientPhone && (
                      <a
                        href={`tel:${apt.clientPhone}`}
                        className="w-10 h-10 rounded-xl flex items-center justify-center border border-border hover:bg-muted transition-colors shrink-0"
                      >
                        <Phone className="w-4 h-4 text-muted-foreground" />
                      </a>
                    )}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* Add Appointment Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
          <div className="relative w-full max-w-md rounded-t-2xl sm:rounded-2xl bg-card shadow-2xl animate-fade-up max-h-[90vh] overflow-y-auto">
            <button onClick={() => setShowAddModal(false)} className="absolute top-4 right-4 z-10 w-8 h-8 rounded-full flex items-center justify-center hover:bg-muted transition-colors">
              <X className="w-4 h-4 text-muted-foreground" />
            </button>
            <div className="pt-8 pb-4 px-6 text-center border-b border-border">
              <CalendarDays className="w-8 h-8 mx-auto mb-2 text-accent" />
              <h2 className="font-serif font-bold text-lg">{isHe ? 'תור חדש' : 'New Appointment'}</h2>
            </div>
            <div className="p-6 space-y-4">
              <div className="space-y-2">
                <Label className="text-xs font-medium">{isHe ? 'שם הלקוחה' : 'Client Name'}</Label>
                <Input value={newName} onChange={e => setNewName(e.target.value)} placeholder={isHe ? 'הכניסי שם...' : 'Enter name...'} />
              </div>
              <div className="space-y-2">
                <Label className="text-xs font-medium">{isHe ? 'טלפון' : 'Phone'}</Label>
                <Input value={newPhone} onChange={e => setNewPhone(e.target.value)} placeholder="050-0000000" dir="ltr" />
              </div>
              <div className="space-y-2">
                <Label className="text-xs font-medium">{isHe ? 'סוג טיפול' : 'Treatment Type'}</Label>
                <Select value={newType} onValueChange={(v) => setNewType(v as any)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="eyebrows">{isHe ? '✨ גבות' : '✨ Brows'}</SelectItem>
                    <SelectItem value="lips">{isHe ? '💋 שפתיים' : '💋 Lips'}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label className="text-xs font-medium">{isHe ? 'תאריך' : 'Date'}</Label>
                  <Input type="date" value={newDate} onChange={e => setNewDate(e.target.value)} dir="ltr" />
                </div>
                <div className="space-y-2">
                  <Label className="text-xs font-medium">{isHe ? 'שעה' : 'Time'}</Label>
                  <div className="flex items-center gap-1" dir="ltr">
                    <Select value={newTime.split(':')[0] || '10'} onValueChange={(h) => setNewTime(`${h}:${newTime.split(':')[1] || '00'}`)}>
                      <SelectTrigger className="w-[70px]"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {Array.from({ length: 24 }, (_, i) => String(i).padStart(2, '0')).map(h => (
                          <SelectItem key={h} value={h}>{h}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <span className="text-sm font-bold">:</span>
                    <Select value={newTime.split(':')[1] || '00'} onValueChange={(m) => setNewTime(`${newTime.split(':')[0] || '10'}:${m}`)}>
                      <SelectTrigger className="w-[70px]"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {['00', '15', '30', '45'].map(m => (
                          <SelectItem key={m} value={m}>{m}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>

              {/* Auto health form checkbox */}
              <div className="flex items-start gap-3 p-3 rounded-xl bg-muted/50 border border-border">
                <Checkbox
                  id="auto-health"
                  checked={newAutoHealth}
                  onCheckedChange={(checked) => setNewAutoHealth(checked === true)}
                  className="mt-0.5"
                />
                <label htmlFor="auto-health" className="cursor-pointer">
                  <p className="text-xs font-semibold">
                    {isHe ? 'שלח הצהרת בריאות אוטומטית בוואטסאפ' : 'Auto-send Health Declaration via WhatsApp'}
                  </p>
                  <p className="text-[10px] text-muted-foreground mt-0.5">
                    {isHe ? 'הלקוחה תקבל הצהרת בריאות דיגיטלית למילוי לפני התור' : 'Client receives a digital health form to fill before the appointment'}
                  </p>
                </label>
              </div>
            </div>
            <div className="px-6 pb-6">
              <button
                onClick={handleAdd}
                disabled={!newName.trim()}
                className="w-full py-3 rounded-xl text-sm font-semibold text-accent-foreground transition-all active:scale-95 disabled:opacity-50"
                style={{ background: `linear-gradient(135deg, ${goldColor}, hsl(38, 50%, 70%))` }}
              >
                {isHe ? 'הוסיפי תור' : 'Add Appointment'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Health Declaration Detail Modal (small) */}
      {detailModalApt && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
          <div className="relative w-full max-w-md rounded-2xl bg-card shadow-2xl animate-fade-up overflow-hidden max-h-[85vh] overflow-y-auto">
            <button onClick={() => setDetailModalApt(null)} className="absolute top-4 right-4 z-10 w-8 h-8 rounded-full flex items-center justify-center hover:bg-muted transition-colors bg-card/80 backdrop-blur-sm">
              <X className="w-4 h-4 text-muted-foreground" />
            </button>

            {/* Header with risk level */}
            <div className="pt-8 pb-4 px-6 text-center border-b border-border" style={{ backgroundColor: RISK_CONFIG[detailModalApt.healthRiskLevel].bg }}>
              <div className="text-3xl mb-2">{RISK_CONFIG[detailModalApt.healthRiskLevel].emoji}</div>
              <h2 className="font-serif font-bold text-lg">{detailModalApt.clientName}</h2>
              <p className="text-xs font-semibold mt-1" style={{ color: RISK_CONFIG[detailModalApt.healthRiskLevel].color }}>
                {isHe ? RISK_CONFIG[detailModalApt.healthRiskLevel].labelHe : RISK_CONFIG[detailModalApt.healthRiskLevel].labelEn}
              </p>
              <p className="text-[10px] text-muted-foreground mt-1">
                {treatmentLabels[detailModalApt.treatmentType]?.emoji} {isHe ? treatmentLabels[detailModalApt.treatmentType]?.he : treatmentLabels[detailModalApt.treatmentType]?.en} · {detailModalApt.date} · {detailModalApt.time}
              </p>
            </div>

            {/* Answers breakdown */}
            <div className="p-6 space-y-2">
              <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-3">
                {isHe ? 'פירוט תשובות' : 'Answer Breakdown'}
              </h3>
              {detailModalApt.healthFormAnswers ? (
                medicalLabels.map(({ key, labelHe, labelEn, detailKey, critical }) => {
                  const val = detailModalApt.healthFormAnswers?.[key];
                  const detail = detailKey ? (detailModalApt.healthFormAnswers as any)?.[detailKey] : undefined;
                  const isYes = val === true;
                  return (
                    <div
                      key={key}
                      className="flex items-center justify-between py-2.5 px-3 rounded-lg transition-colors"
                      style={isYes ? { backgroundColor: critical ? 'rgba(220,38,38,0.08)' : 'rgba(217,119,6,0.08)' } : { backgroundColor: 'rgba(22,163,74,0.05)' }}
                    >
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-medium">{isHe ? labelHe : labelEn}</p>
                        {detail && <p className="text-[10px] text-muted-foreground mt-0.5">{detail}</p>}
                      </div>
                      <span className="text-sm shrink-0 ml-2">
                        {isYes ? (critical ? '🔴' : '🟡') : '✅'}
                      </span>
                    </div>
                  );
                })
              ) : (
                <div className="text-center py-6">
                  <p className="text-sm text-muted-foreground">{isHe ? 'אין נתונים זמינים — הטופס סומן ידנית' : 'No data available — form was toggled manually'}</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ===== FULL SCREEN HEALTH DECLARATION VIEW ===== */}
      {fullScreenDeclaration && (
        <div className="fixed inset-0 z-[70] bg-card flex flex-col" dir={isHe ? 'rtl' : 'ltr'}>
          {/* Top bar */}
          <div className="flex-shrink-0 border-b border-border bg-background px-4 py-3 flex items-center gap-3">
            <button
              onClick={() => setFullScreenDeclaration(null)}
              className="p-2 -m-2 rounded-xl hover:bg-muted transition-colors"
            >
              <X className="w-5 h-5 text-foreground" />
            </button>
            <h2 className="font-bold text-lg flex-1 text-foreground">
              {isHe ? 'הצהרת בריאות' : 'Health Declaration'}
            </h2>
          </div>

          {/* Scrollable content */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {/* Client Info Card */}
            <div className="bg-background rounded-2xl border border-border p-5 space-y-3">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-full bg-accent/15 flex items-center justify-center shrink-0">
                  <ClipboardCheck className="w-5 h-5 text-accent" />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-bold text-base text-foreground">{fullScreenDeclaration.clientName}</h3>
                  <p className="text-xs text-muted-foreground">
                    {fullScreenDeclaration.clientPhone && <span dir="ltr">{fullScreenDeclaration.clientPhone}</span>}
                    {fullScreenDeclaration.clientPhone && ' · '}
                    {treatmentLabels[fullScreenDeclaration.treatmentType as keyof typeof treatmentLabels]?.emoji ?? '💉'} {isHe ? treatmentLabels[fullScreenDeclaration.treatmentType as keyof typeof treatmentLabels]?.he ?? fullScreenDeclaration.treatmentType : treatmentLabels[fullScreenDeclaration.treatmentType as keyof typeof treatmentLabels]?.en ?? fullScreenDeclaration.treatmentType}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2 pt-2 border-t border-border">
                <span className="text-[10px] text-muted-foreground">{isHe ? 'תאריך:' : 'Date:'}</span>
                <span className="text-xs font-semibold text-foreground">{fullScreenDeclaration.date} · {fullScreenDeclaration.time}</span>
              </div>
            </div>

            {/* Status Badge */}
            <div
              className="rounded-2xl p-4 flex items-center gap-3"
              style={{ backgroundColor: RISK_CONFIG[fullScreenDeclaration.healthRiskLevel].bg }}
            >
              <div className="text-2xl">{RISK_CONFIG[fullScreenDeclaration.healthRiskLevel].emoji}</div>
              <div>
                <p className="text-sm font-bold" style={{ color: RISK_CONFIG[fullScreenDeclaration.healthRiskLevel].color }}>
                  {isHe ? RISK_CONFIG[fullScreenDeclaration.healthRiskLevel].labelHe : RISK_CONFIG[fullScreenDeclaration.healthRiskLevel].labelEn}
                </p>
                <p className="text-[10px] text-muted-foreground mt-0.5">
                  {fullScreenDeclaration.healthFormStatus === 'signed'
                    ? (isHe ? '✅ הצהרה חתומה' : '✅ Declaration signed')
                    : (isHe ? '⚠️ ממתין לחתימה' : '⚠️ Pending signature')}
                </p>
              </div>
            </div>

            {/* Medical History */}
            <div className="bg-background rounded-2xl border border-border p-5">
              <h3 className="text-sm font-bold text-foreground mb-3">
                {isHe ? 'היסטוריה רפואית' : 'Medical History'}
              </h3>
              {fullScreenDeclaration.healthFormAnswers ? (
                <div className="space-y-2">
                  {medicalLabels.map(({ key, labelHe, labelEn, detailKey, critical }) => {
                    const val = fullScreenDeclaration.healthFormAnswers?.[key];
                    const detail = detailKey ? (fullScreenDeclaration.healthFormAnswers as any)?.[detailKey] : undefined;
                    const isYes = val === true;
                    return (
                      <div
                        key={key}
                        className="flex items-center justify-between py-3 px-4 rounded-xl transition-colors"
                        style={isYes ? { backgroundColor: critical ? 'rgba(220,38,38,0.08)' : 'rgba(217,119,6,0.08)' } : { backgroundColor: 'rgba(22,163,74,0.05)' }}
                      >
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-medium text-foreground">{isHe ? labelHe : labelEn}</p>
                          {detail && <p className="text-[10px] text-muted-foreground mt-0.5">{detail}</p>}
                        </div>
                        <span className="text-sm shrink-0 ml-2">
                          {isYes ? (critical ? '🔴' : '🟡') : '✅'}
                        </span>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="text-center py-8">
                  <p className="text-sm text-muted-foreground">{isHe ? 'אין נתונים זמינים — הטופס סומן ידנית' : 'No data available — form was toggled manually'}</p>
                </div>
              )}
            </div>

            {/* Digital Signature placeholder */}
            <div className="bg-background rounded-2xl border border-border p-5">
              <h3 className="text-sm font-bold text-foreground mb-3">
                {isHe ? 'חתימה דיגיטלית' : 'Digital Signature'}
              </h3>
              <div className="h-20 rounded-xl bg-muted/50 border border-dashed border-border flex items-center justify-center">
                <p className="text-xs text-muted-foreground italic">
                  {isHe ? 'חתימה שמורה ✍️' : 'Signature on file ✍️'}
                </p>
              </div>
            </div>
          </div>

          {/* Bottom safe area spacer */}
          <div className="h-20" />
        </div>
      )}
    </div>
  );
}
