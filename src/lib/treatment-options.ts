/** Single source of truth for treatment type options across the app */
export interface TreatmentOption {
  value: string;
  en: string;
  he: string;
  emoji: string;
}

export const TREATMENT_OPTIONS: TreatmentOption[] = [
  { value: 'eyebrows', en: 'Eyebrows', he: 'גבות', emoji: '✍️' },
  { value: 'lips', en: 'Lips', he: 'שפתיים', emoji: '👄' },
  { value: 'eyeliner', en: 'Eyeliner', he: 'אייליינר', emoji: '👁️' },
];

export const getTreatmentLabel = (value: string, lang: 'en' | 'he'): string => {
  const opt = TREATMENT_OPTIONS.find(o => o.value === value);
  return opt ? (lang === 'en' ? opt.en : opt.he) : value;
};
