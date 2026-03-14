export type TreatmentType = 'eyebrows' | 'lips';

export function getProgressPercentage(day: number): number {
  return Math.min(Math.round((day / 30) * 100), 100);
}
