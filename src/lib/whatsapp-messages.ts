/**
 * Centralized WhatsApp message generation for health declaration links.
 * 
 * @param clientName - Client's display name
 * @param link - The short URL to include
 * @param includePolicy - Whether clinic policy is bundled
 * @param artistName - Artist/business name fallback
 */
export function generateWhatsAppMessage(
  clientName: string,
  link: string,
  includePolicy: boolean,
  artistName: string,
  lang: 'he' | 'en' = 'he',
): string {
  if (lang === 'en') {
    if (includePolicy) {
      return `Hey ${clientName} 🤍\nI'm so excited for our appointment!\nTo make sure everything goes smoothly, I've prepared a personal area where you can review the clinic policy and fill out a short health questionnaire.\nPlease take a minute to complete it before your visit:\n${link}\nFeel free to reach out with any questions. See you soon! ✨ ${artistName}`;
    }
    return `Hey ${clientName} 🤍\nI'm so excited for our appointment!\nTo make sure everything is perfectly tailored for you, I've prepared a short health questionnaire. Please take a minute to fill it out before your visit:\n${link}\nSee you soon! ✨ ${artistName}`;
  }
  if (includePolicy) {
    return `היי ${clientName} אהובה 🤍\nאני ממש מחכה לטיפול שלנו!\nכדי שהכל יהיה ברור, מסודר ובטוח, הכנתי לך אזור אישי שבו תוכלי לעבור על מדיניות הקליניקה ולמלא שאלון בריאות קצר.\nאשמח שתקדישי לזה דקה לפני הגעתך:\n${link}\nלכל שאלה אני כאן. נתראה בקרוב! ✨ ${artistName}`;
  }
  return `היי ${clientName} אהובה 🤍\nאני ממש מחכה לטיפול שלנו!\nכדי שנוכל להתחיל ברוגע ולוודא שהכל מותאם עבורך בצורה מושלמת, הכנתי לך שאלון בריאות קצר. אשמח שתקדישי דקה למלא אותו לפני הגעתך:\n${link}\nנתראה בקרוב! ✨ ${artistName}`;
}

/**
 * Format a phone number for the wa.me API.
 * Strips non-digits and replaces leading 0 with Israel country code 972.
 */
export function formatPhoneForWhatsApp(raw: string): string {
  let digits = raw.replace(/[^0-9]/g, '');
  if (digits.startsWith('0')) {
    digits = '972' + digits.slice(1);
  }
  return digits;
}

/**
 * Build a full wa.me URL with pre-filled message.
 */
export function buildWhatsAppUrl(phone: string, message: string): string {
  const encoded = encodeURIComponent(message);
  const waPhone = phone.trim() ? formatPhoneForWhatsApp(phone) : '';
  return waPhone
    ? `https://wa.me/${waPhone}?text=${encoded}`
    : `https://wa.me/?text=${encoded}`;
}
