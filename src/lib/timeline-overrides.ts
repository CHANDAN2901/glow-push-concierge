const LEGACY_HE_PATTERNS = [
  'יום ראשון - מושלם',
  'שמרי על האזור נקי ויבש. הצבע כהה היום — זה טבעי',
  'הפיגמנט מתחמצן ומכהה',
  'לא לקלף! תני לגלד ליפול לבד',
  'שלב ה-ghosting',
  'הצבע מתייצב. שמרי על הגנה מהשמש',
  'הגיע הזמן לקבוע תור לטאצ׳ אפ',
];

const LEGACY_EN_PATTERNS = [
  'day one - perfect',
  'keep the area clean and dry. color is dark today',
  'the pigment oxidizes and darkens',
  "don't peel!",
  'ghosting phase',
  'color is stabilizing. protect from sun exposure',
  'time to schedule your touch-up',
];

export function isLegacyTimelineOverride(quoteHe?: string | null, quoteEn?: string | null): boolean {
  const he = (quoteHe || '').trim().toLowerCase();
  const en = (quoteEn || '').trim().toLowerCase();

  if (!he && !en) return false;

  const matchesHe = LEGACY_HE_PATTERNS.some((pattern) => he.includes(pattern.toLowerCase()));
  const matchesEn = LEGACY_EN_PATTERNS.some((pattern) => en.includes(pattern.toLowerCase()));

  return matchesHe || matchesEn;
}
