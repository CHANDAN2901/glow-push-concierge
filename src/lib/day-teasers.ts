import { TreatmentType } from './recovery-data';

export interface DayTeaser {
  day: number;
  en: string;
  he: string;
}

export const dailyTips: DayTeaser[] = [
  { day: 1, en: 'Congrats on your new beauty! Gently blot fluids from the area with a dry gauze pad every hour to prevent thick scabs.', he: 'מזל טוב על היופי החדש! זכרי לספוג בעדינות נוזלים מהאזור עם פד גזה יבש כל שעה, כדי למנוע גלדים עבים.' },
  { day: 2, en: 'Color looks dark and dramatic? Don\'t panic — it\'s part of the process. It will lighten by 30-50% later.', he: 'הצבע נראה כהה ודרמטי? אל תיבהלי, זה חלק מהתהליך. הוא יתבהר ב-30-50% בהמשך.' },
  { day: 3, en: 'Mild swelling is completely normal. For lips, you can use ice wrapped in a clean towel (not directly on skin).', he: 'נפיחות קלה היא נורמלית לחלוטין. אם עשינו שפתיים, אפשר להיעזר בקרח עטוף במגבת נקייה (לא ישירות על העור).' },
  { day: 4, en: 'Skin feeling tight? Time to apply a very thin layer of the healing ointment I gave you. Less is more!', he: 'העור מתחיל להרגיש מתוח? זה הזמן למרוח שכבה דקה מאוד של משחת ההחלמה שנתתי לך. פחות זה יותר!' },
  { day: 5, en: 'Golden rule: Don\'t peel! Even if it\'s itchy or looks uneven, let the peeling fall off naturally to protect the pigment.', he: 'חוק הברזל: לא לקלף! גם אם זה מגרד או נראה לא אחיד, תני לקילופים לנשור לבד כדי לא לפגוע בפיגמנט.' },
  { day: 6, en: 'Feeling the urge to scratch? Try gently patting around the area with clean fingers instead.', he: 'מרגישה צורך לגרד? נסי לטפוח בעדינות מסביב לאזור עם אצבעות נקיות במקום לגרד.' },
  { day: 7, en: 'Peeling almost done? Remember there\'s new, sensitive skin underneath — keep it away from overly hot water.', he: 'הקילופים כמעט סיימו? זכרי שמתחתם מסתתר עור חדש ורגיש, המשיכי לשמור עליו ממים חמים מדי.' },
  { day: 8, en: 'Main peeling stage is done! You\'re a hero. Now the \'magic\' color phase begins.', he: 'סיימת את שלב הקילופים העיקרי! את גיבורה. עכשיו מתחיל שלב ה\'קסם\' של הצבע.' },
  { day: 9, en: 'Color looks too light or almost gone? That\'s the Ghosting phase. The pigment is hiding under the new skin.', he: 'הצבע נראה בהיר מדי או כמעט נעלם? זה נקרא שלב ה-Ghosting. הפיגמנט מתחבא מתחת לעור החדש.' },
  { day: 10, en: 'Don\'t worry — the color will gradually \'come back up\' over the next two weeks. Trust the process.', he: 'אל דאגה, הצבע \'יעלה\' חזרה בהדרגה במהלך השבועיים הקרובים. סמכי על התהליך.' },
  { day: 11, en: 'Time to return to normal skincare routine, but still avoid peels on the treated area.', he: 'זה הזמן להתחיל לחזור לשגרת טיפוח פנים רגילה, אבל עדיין להימנע מפילינגים על האזור המטופל.' },
  { day: 12, en: 'The shade you see now is still not the final one. It will warm up and stabilize soon.', he: 'הגוון שאת רואה עכשיו הוא עדיין לא הגוון הסופי. הוא יתחמם ויתייצב בקרוב.' },
  { day: 13, en: 'Keeping your skin hydrated (drink water!) helps the pigment settle more beautifully.', he: 'שמירה על לחות העור (שתיית מים!) עוזרת לפיגמנט להתקבע בצורה יפה יותר.' },
  { day: 14, en: 'Two weeks done! The skin is closed but the pigment is still \'working\'. You already look amazing.', he: 'עברו שבועיים! העור כבר סגור, אבל הפיגמנט עדיין ב\'עבודה\'. את כבר נראית מעולה.' },
  { day: 15, en: 'Color coming back? How exciting! Time to start using sunscreen (SPF) on the area every time you go out.', he: 'הצבע מתחיל לחזור? איזה כיף! זה הזמן להתחיל להשתמש בקרם הגנה (SPF) על האזור בכל יציאה מהבית.' },
  { day: 16, en: 'Sun is enemy #1 of permanent makeup. Good protection today ensures the color won\'t shift in the future.', he: 'שמש היא האויב מספר 1 של איפור קבוע. הגנה טובה היום תבטיח שהצבע לא ישנה את הגוון שלו בעתיד.' },
  { day: 17, en: 'Planning a vacation? A wide-brimmed hat is your best friend right now.', he: 'מתכננת חופשה? כובע רחב שוליים הוא החבר הכי טוב שלך כרגע.' },
  { day: 18, en: 'Feel like the color isn\'t 100% even? That\'s exactly what our planned touch-up session is for.', he: 'מרגישה שהצבע לא אחיד ב-100%? בדיוק בשביל זה יש לנו את פגישת הטאצ\' אפ המתוכננת.' },
  { day: 19, en: 'Your skin is back to normal, but the pigment is still settling in the deeper layers.', he: 'העור שלך כבר חזר לעצמו, אבל הפיגמנט עדיין מתיישב בשכבות העמוקות.' },
  { day: 20, en: 'Almost done with a month of healing! See how much time you\'re saving every morning in front of the mirror.', he: 'עוד מעט מסיימים חודש של החלמה! תראי כמה זמן את חוסכת לעצמך כל בוקר מול המראה.' },
  { day: 21, en: 'Great day to check your \'Before\' photo in the app and see what an amazing difference we made!', he: 'זה יום מצוין להעיף מבט בתיקיית ה\'לפני\' שלך בתוך האפליקציה ולראות איזה הבדל מדהים עשינו!' },
  { day: 22, en: 'Notice any area that needs reinforcement? Note it down so you don\'t forget to tell me at the touch-up.', he: 'שימי לב אם יש אזור שדורש חיזוק בטאצ\' אפ – את יכולה לרשום לך אותו כדי שלא תשכחי להגיד לי.' },
  { day: 23, en: 'Continue avoiding retinol or strong acids directly on the tattooed area.', he: 'המשיכי להימנע משימוש ברטינול או חומצות חזקות ישירות על אזור הקעקוע.' },
  { day: 24, en: 'Feeling beautiful? Treat yourself! Time to take a selfie and show the world.', he: 'מרגישה יפה? תתחדשי! זה הזמן לצלם סלפי ולהראות לעולם.' },
  { day: 25, en: 'The color is almost at its peak. It should look natural and blend perfectly with your facial features.', he: 'הצבע כבר כמעט בשיא שלו. הוא אמור להיראות טבעי ומשתלב מושלם עם תווי הפנים שלך.' },
  { day: 26, en: 'Remember day one when it was dark? See how it softened and became perfectly precise.', he: 'זוכרת את היום הראשון שהיה כהה? תראי כמה זה התרכך והפך למדויק.' },
  { day: 27, en: 'We\'re nearing the end of daily guidance. Remember you can always come back to this link to read instructions.', he: 'אנחנו מתקרבות לסוף הליווי היומי. אל תשכחי שאת תמיד יכולה לחזור לקישור הזה כדי לקרוא הוראות.' },
  { day: 28, en: 'Time to make sure you have a touch-up appointment. If not yet, click the button below!', he: 'זה הזמן לוודא שיש לך תור לטאצ\' אפ. אם עדיין לא קבעת, לחצי על הכפתור למטה!' },
  { day: 29, en: 'Successful healing is 50% me and 50% you. You did an amazing job taking care of the area!', he: 'החלמה מוצלחת תלויה 50% בי ו-50% בך. עשית עבודה מעולה בשמירה על האזור!' },
  { day: 30, en: 'That\'s it — you\'re ready! The pigment is stable, skin is healthy, and you look like a million dollars. See you at the touch-up ✨', he: 'זהו, את מוכנה! הפיגמנט יציב, העור בריא ואת נראית מיליון דולר. נתראה בטאצ\' אפ ✨' },
];

// Legacy exports for backward compatibility
export const browTeasers = dailyTips;
export const lipTeasers = dailyTips;

export function getDayTeaser(day: number, treatment?: TreatmentType): DayTeaser | null {
  return dailyTips.find(t => t.day === day) || null;
}
