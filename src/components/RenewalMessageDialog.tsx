import { useState, useEffect } from 'react';
import { MessageCircle, Bell, RefreshCw } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { extractEdgeFunctionError } from '@/lib/edge-function-errors';
import { useI18n } from '@/lib/i18n';

interface RenewalMessageDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  clientName: string;
  clientPhone: string;
  clientDbId?: string;
  treatmentType: string;
  artistName: string;
  customTemplate?: string;
  customTemplateEn?: string;
}

const formatPhone = (raw: string): string => {
  const digits = raw.replace(/[^0-9]/g, '');
  if (digits.startsWith('0')) return '972' + digits.slice(1);
  if (!digits.startsWith('972')) return '972' + digits;
  return digits;
};

export function isRenewalDue(treatmentType: string, daysSinceTreatment: number): boolean {
  const t = (treatmentType || '').toLowerCase();
  const isLips = t.includes('שפתיי') || t.includes('lip');
  const isBrows = t.includes('גבות') || t.includes('brow') || t.includes('eyebrow');
  if (isLips) return daysSinceTreatment >= 180;
  if (isBrows) return daysSinceTreatment >= 365;
  return daysSinceTreatment >= 365;
}

const DEFAULT_LIPS_HE = 'היי [CLIENT], עברו כבר כמה חודשים מאז שעיצבנו לך את השפתיים! 💋✨ זה בדיוק הזמן לרענון כדי לשמור על המראה המושלם. קבעי תור השבוע ותהני מהנחת לקוחה חוזרת. מחכה לך, [ARTIST]';
const DEFAULT_BROWS_HE = 'היי [CLIENT], עברה כמעט שנה מאז שעיצבנו לך את הגבות! ✨ זה בדיוק הזמן לרענון כדי לשמור על המראה המושלם. קבעי תור השבוע ותהני מהנחת לקוחה חוזרת. מחכה לך, [ARTIST]';

const DEFAULT_LIPS_EN = 'Hi [CLIENT], it\'s been a few months since we styled your lips! 💋✨ Now is the perfect time for a touch-up to keep your look flawless. Book this week and enjoy a returning client discount. Looking forward to seeing you, [ARTIST]';
const DEFAULT_BROWS_EN = 'Hi [CLIENT], it\'s been almost a year since we styled your brows! ✨ Now is the perfect time for a touch-up to keep your look flawless. Book this week and enjoy a returning client discount. Looking forward to seeing you, [ARTIST]';

function resolvePlaceholders(template: string, vars: Record<string, string>): string {
  let result = template;
  for (const [key, value] of Object.entries(vars)) {
    result = result
      .replace(new RegExp(`\\{\\{${key}\\}\\}`, 'gi'), value)
      .replace(new RegExp(`\\[${key.toUpperCase()}\\]`, 'gi'), value);
  }
  return result;
}

function buildRenewalMessage(clientName: string, treatmentType: string, artistName: string, isEn: boolean, customTemplate?: string, customTemplateEn?: string): string {
  const vars = { client_name: clientName, artist_name: artistName, client: clientName, artist: artistName };
  if (isEn && customTemplateEn) return resolvePlaceholders(customTemplateEn, vars);
  if (!isEn && customTemplate) return resolvePlaceholders(customTemplate, vars);
  const t = (treatmentType || '').toLowerCase();
  const isLips = t.includes('שפתיי') || t.includes('lip');
  const template = isEn
    ? (isLips ? DEFAULT_LIPS_EN : DEFAULT_BROWS_EN)
    : (isLips ? DEFAULT_LIPS_HE : DEFAULT_BROWS_HE);
  return resolvePlaceholders(template, vars);
}

export default function RenewalMessageDialog({
  open,
  onOpenChange,
  clientName,
  clientPhone,
  clientDbId,
  treatmentType,
  artistName,
  customTemplate,
  customTemplateEn,
}: RenewalMessageDialogProps) {
  const { toast } = useToast();
  const { lang } = useI18n();
  const isEn = lang === 'en';
  const [sendingPush, setSendingPush] = useState(false);

  const baseMessage = buildRenewalMessage(clientName, treatmentType, artistName || (isEn ? 'Your Artist' : 'האמנית שלך'), isEn, customTemplate, customTemplateEn);
  const [editedMessage, setEditedMessage] = useState('');

  useEffect(() => {
    setEditedMessage(baseMessage);
  }, [baseMessage]);

  const getFinalMessage = () => editedMessage.trim() || baseMessage;

  const handleWhatsApp = () => {
    const msg = getFinalMessage();
    const cleanPhone = clientPhone ? formatPhone(clientPhone) : '';
    const url = cleanPhone
      ? `https://wa.me/${cleanPhone}?text=${encodeURIComponent(msg)}`
      : `https://wa.me/?text=${encodeURIComponent(msg)}`;
    window.open(url, '_blank');
    toast({ title: isEn ? 'WhatsApp opened! 🔄' : 'וואטסאפ נפתח! 🔄' });
    onOpenChange(false);
  };

  const handlePush = async () => {
    if (!clientDbId) {
      toast({ title: isEn ? 'Cannot send — no client ID' : 'לא ניתן לשלוח התראה — אין מזהה לקוחה', variant: 'destructive' });
      return;
    }
    setSendingPush(true);
    try {
      const { data: subs, error: subErr } = await supabase
        .from('push_subscriptions')
        .select('endpoint, p256dh, auth_key')
        .eq('client_id', clientDbId)
        .order('created_at', { ascending: false })
        .limit(1);
      if (subErr || !subs?.length) {
        toast({ title: isEn ? 'No push subscription found for this client' : 'לא נמצא מנוי התראות ללקוחה זו', variant: 'destructive' });
        return;
      }
      const sub = subs[0];
      const { data, error } = await supabase.functions.invoke('send-push', {
        body: {
          subscription: {
            endpoint: sub.endpoint,
            keys: { p256dh: sub.p256dh, auth: sub.auth_key },
          },
          title: isEn ? '✨ Time for a touch-up!' : '✨ הגיע הזמן לרענון!',
          body: getFinalMessage().substring(0, 200),
          day: 0,
        },
      });
      if (error) {
        const details = await extractEdgeFunctionError(error);
        throw new Error(details.message);
      }
      if (data && typeof data === 'object' && 'success' in data && !data.success) {
        throw new Error((data as any).error || 'Push delivery failed');
      }
      toast({ title: isEn ? 'Renewal push sent! 🔄✅' : 'התראת חידוש נשלחה! 🔄✅' });
      onOpenChange(false);
    } catch (err: any) {
      toast({ title: isEn ? 'Push notification failed' : 'שליחת ההתראה נכשלה', description: err?.message || '', variant: 'destructive' });
    } finally {
      setSendingPush(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm rounded-3xl" dir={isEn ? 'ltr' : 'rtl'}>
        <DialogHeader className="text-center">
          <DialogTitle className="text-lg font-bold flex items-center justify-center gap-2">
            <RefreshCw className="w-5 h-5 text-accent" />
            {isEn ? `Treatment Renewal — ${clientName}` : `חידוש טיפול — ${clientName}`}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 pt-2">
          {/* Editable message */}
          <div className="rounded-2xl p-3 bg-accent/10 border border-accent/30">
            <p className="text-[10px] font-semibold text-accent mb-1.5">
              {isEn ? 'Edit message:' : 'עריכת ההודעה:'}
            </p>
            <Textarea
              value={editedMessage}
              onChange={(e) => setEditedMessage(e.target.value)}
              dir={isEn ? 'ltr' : 'rtl'}
              className="text-xs leading-relaxed min-h-[100px] rounded-xl border-accent/30 bg-background/80 focus-visible:ring-accent/40"
            />
          </div>

          {/* Actions */}
          <div className="flex flex-col gap-2 pt-1">
            <Button
              onClick={handleWhatsApp}
              className="w-full rounded-full py-3 font-bold text-sm gap-2"
              style={{ background: '#25D366', color: 'white', border: 'none' }}
            >
              <MessageCircle className="w-4 h-4" />
              {isEn ? 'Send via WhatsApp' : 'שלחי בוואטסאפ'}
            </Button>
            <Button
              onClick={handlePush}
              disabled={sendingPush}
              variant="outline"
              className="w-full rounded-full py-3 font-bold text-sm gap-2 border-2 border-accent"
            >
              <Bell className="w-4 h-4" />
              {sendingPush
                ? (isEn ? 'Sending...' : 'שולחת...')
                : (isEn ? 'Send Push Notification' : 'שלחי התראת פוש')}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
