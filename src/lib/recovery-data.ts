export interface ChecklistItem {
  en: string;
  he: string;
}

export interface DayInstruction {
  day: number;
  dayEnd: number;
  titleEn: string;
  titleHe: string;
  checklist: ChecklistItem[];
  icon: string;
  severity: 'high' | 'medium' | 'low';
}

export type TreatmentType = 'eyebrows' | 'lips';

export const eyebrowPhases: DayInstruction[] = [
  {
    day: 1, dayEnd: 3,
    titleEn: "Protection & Calm", titleHe: "שמירה והרגעה 💧",
    checklist: [
      { en: '🧻 Gently blot secretions with clean gauze.', he: '🧻 לספוג הפרשות בעדינות עם גזה נקייה.' },
      { en: '🧴 Apply a very thin layer of ointment.', he: '🧴 למרוח שכבה דקה מאוד של משחה.' },
      { en: '❌💧 Do NOT wet the area with running water!', he: '❌💧 אסור להרטיב את האזור במים זורמים!' },
    ],
    icon: "💧", severity: 'high'
  },
  {
    day: 4, dayEnd: 7,
    titleEn: "Peeling Stage — Caution! 🛡️", titleHe: "שלב הקילופים — זהירות! 🛡️",
    checklist: [
      { en: "❌ Don't scratch or peel the scab (it pulls pigment!)", he: '❌ אסור לגרד או לקלף את הגלד (זה יתלוש פיגמנט!).' },
      { en: '🧴 Keep applying ointment when the area is dry.', he: '🧴 להמשיך למרוח משחה כשהאזור יבש.' },
      { en: '👀 Color may look faded or odd — completely normal.', he: '👀 הצבע ייראה דהוי או מוזר — זה תקין לחלוטין.' },
    ],
    icon: "🛡️", severity: 'high'
  },
  {
    day: 11, dayEnd: 20,
    titleEn: "Ghosting Phase 👻", titleHe: "העלמות הפיגמנט 👻",
    checklist: [
      { en: "👻 Color looks like it disappeared? Don't worry, it'll come back.", he: '👻 הצבע נראה כאילו נעלם? אל דאגה, הוא יחזור.' },
      { en: '🧼 You can go back to washing your face normally.', he: '🧼 אפשר לחזור לשטוף פנים כרגיל.' },
      { en: '❌☀️ Still avoid direct sunlight.', he: '❌☀️ עדיין להימנע משמש ישירה.' },
    ],
    icon: "👻", severity: 'medium'
  },
  {
    day: 21, dayEnd: 30,
    titleEn: "Final Result ✨", titleHe: "החשיפה הסופית ✨",
    checklist: [
      { en: '✨ The color is stabilizing and coming back.', he: '✨ הצבע מתייצב וחוזר לעצמו.' },
      { en: "📅 Time to book a touch-up appointment if needed.", he: "📅 זה הזמן לקבוע תור לטאץ׳-אפ אם צריך." },
      { en: '🎉 Enjoy your new brows!', he: '🎉 תיהני מהגבות החדשות שלך!' },
    ],
    icon: "✨", severity: 'low'
  },
];

export const lipPhases: DayInstruction[] = [
  {
    day: 1, dayEnd: 3,
    titleEn: "Swelling & Protection 👄", titleHe: "נפיחות והגנה 👄",
    checklist: [
      { en: '💧 Swelling is completely normal — it will subside.', he: '💧 נפיחות היא נורמלית — היא תרד.' },
      { en: '🥤 Drink only through a straw.', he: '🥤 שתי רק באמצעות קשית.' },
      { en: '🌶️❌ Avoid hot or spicy foods.', he: '🌶️❌ המנעי ממאכלים חמים או חריפים.' },
    ],
    icon: "👄", severity: 'high'
  },
  {
    day: 4, dayEnd: 7,
    titleEn: "Dryness Phase — Keep Moist! 🧴", titleHe: "שלב היובש — שמרי על לחות! 🧴",
    checklist: [
      { en: '🧴 Lips will feel very dry — apply ointment regularly.', he: '🧴 השפתיים ירגישו יבשות מאוד. מרחי את המשחה בקביעות.' },
      { en: "❌ Do NOT peel or pick at the skin!", he: '❌ אל תקלפי את העור!' },
      { en: '👀 Color may look very dark or uneven — this is normal.', he: '👀 הצבע עשוי להיראות כהה או לא אחיד — זה תקין.' },
    ],
    icon: "🛡️", severity: 'high'
  },
  {
    day: 8, dayEnd: 14,
    titleEn: "Peeling & Fading 👻", titleHe: "קילוף ודהייה 👻",
    checklist: [
      { en: '👻 Peeling is finishing — color may look very light.', he: '👻 הקילוף מסתיים — הצבע עשוי להיראות בהיר מאוד.' },
      { en: '🧴 Continue moisturizing the lips.', he: '🧴 המשיכי ללחלח את השפתיים.' },
      { en: '💄❌ Avoid lipstick or lip products on the area.', he: '💄❌ הימנעי משפתון או מוצרי שפתיים באזור.' },
    ],
    icon: "👻", severity: 'medium'
  },
  {
    day: 15, dayEnd: 30,
    titleEn: "Color Blooming ✨", titleHe: "הצבע חוזר לעצמו ✨",
    checklist: [
      { en: '✨ The true color is gradually returning.', he: '✨ הצבע האמיתי חוזר בהדרגה.' },
      { en: "📅 Book a touch-up if needed.", he: "📅 קבעי תור לטאץ׳-אפ אם צריך." },
      { en: '🎉 Enjoy your new lips!', he: '🎉 תיהני מהשפתיים החדשות שלך!' },
    ],
    icon: "✨", severity: 'low'
  },
];

export function getPhases(treatment: TreatmentType): DayInstruction[] {
  return treatment === 'lips' ? lipPhases : eyebrowPhases;
}

export function getDayInstruction(day: number, treatment: TreatmentType = 'eyebrows'): DayInstruction | null {
  const phases = getPhases(treatment);
  return phases.find(p => day >= p.day && day <= p.dayEnd) || null;
}

export function getProgressPercentage(day: number): number {
  return Math.min(Math.round((day / 30) * 100), 100);
}
