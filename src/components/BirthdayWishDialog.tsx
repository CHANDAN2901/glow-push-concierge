import { useState, useEffect } from 'react';
import { Gift, MessageCircle, Bell, Sparkles } from 'lucide-react';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { extractEdgeFunctionError } from '@/lib/edge-function-errors';
import { useI18n } from '@/lib/i18n';

interface BirthdayWishDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  clientName: string;
  clientPhone: string;
  clientDbId?: string;
  artistName: string;
  customTemplate?: string;
  customTemplateEn?: string;
}

const GIFT_PRESETS_HE = [
  '15% הנחה',
  'Lip Oil במתנה',
  '50 ₪ הנחה',
  'טיפול מיני במתנה',
];

const GIFT_PRESETS_EN = [
  '15% off',
  'Free Lip Oil',
  '$10 off',
  'Free mini treatment',
];

const DEFAULT_TEMPLATE_HE = 'היי [CLIENT], מזל טוב! 🎉🎂 לכבוד היום המיוחד שלך, מחכה לך הטבה מפנקת: [GIFT] על הטיפול הבא שלך. נשיקות, [ARTIST] 💕';
const DEFAULT_TEMPLATE_EN = 'Hi [CLIENT], Happy Birthday! 🎉🎂 To celebrate your special day, we have a treat for you: [GIFT] on your next treatment. Warm wishes, [ARTIST] 💕';

const formatPhone = (raw: string): string => {
  const digits = raw.replace(/[^0-9]/g, '');
  if (digits.startsWith('0')) return '972' + digits.slice(1);
  if (!digits.startsWith('972')) return '972' + digits;
  return digits;
};

export default function BirthdayWishDialog({
  open,
  onOpenChange,
  clientName,
  clientPhone,
  clientDbId,
  artistName,
  customTemplate,
  customTemplateEn,
}: BirthdayWishDialogProps) {
  const { toast } = useToast();
  const { lang } = useI18n();
  const isEn = lang === 'en';

  const [selectedGift, setSelectedGift] = useState('');
  const [customGift, setCustomGift] = useState('');
  const [sendingPush, setSendingPush] = useState(false);
  const [editedMessage, setEditedMessage] = useState('');

  const gift = customGift.trim() || selectedGift;
  const giftPresets = isEn ? GIFT_PRESETS_EN : GIFT_PRESETS_HE;

  const buildMessage = () => {
    const template = isEn
      ? (customTemplateEn || DEFAULT_TEMPLATE_EN)
      : (customTemplate || DEFAULT_TEMPLATE_HE);
    return template
      .replace(/\[CLIENT\]/g, clientName)
      .replace(/\[GIFT\]/g, gift)
      .replace(/\[ARTIST\]/g, artistName || (isEn ? 'Your Artist' : 'האמנית שלך'));
  };

  useEffect(() => {
    if (gift) {
      setEditedMessage(buildMessage());
    }
  }, [gift, clientName, artistName, customTemplate, customTemplateEn, lang]);

  const getFinalMessage = () => editedMessage.trim() || buildMessage();

  const handleWhatsApp = () => {
    if (!gift) {
      toast({ title: isEn ? 'Select a gift before sending' : 'בחרי הטבה לפני השליחה', variant: 'destructive' });
      return;
    }
    const msg = getFinalMessage();
    const cleanPhone = clientPhone ? formatPhone(clientPhone) : '';
    const url = cleanPhone
      ? `https://wa.me/${cleanPhone}?text=${encodeURIComponent(msg)}`
      : `https://wa.me/?text=${encodeURIComponent(msg)}`;
    window.open(url, '_blank');
    toast({ title: isEn ? 'WhatsApp opened! 🎉' : 'וואטסאפ נפתח! 🎉' });
    onOpenChange(false);
  };

  const handlePush = async () => {
    if (!gift) {
      toast({ title: isEn ? 'Select a gift before sending' : 'בחרי הטבה לפני השליחה', variant: 'destructive' });
      return;
    }
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
          title: isEn ? `🎂 Happy Birthday, ${clientName}!` : `🎂 יום הולדת שמח, ${clientName}!`,
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
      toast({ title: isEn ? 'Birthday push sent! 🎂✅' : 'התראת יום הולדת נשלחה! 🎂✅' });
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
            <span className="text-2xl">🎂</span>
            {isEn ? `Birthday Wish for ${clientName}` : `ברכת יום הולדת ל${clientName}`}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 pt-2">
          {/* Gift presets */}
          <div>
            <p className="text-xs font-semibold text-muted-foreground mb-2">
              {isEn ? 'Choose a gift:' : 'בחרי הטבה:'}
            </p>
            <div className="grid grid-cols-2 gap-2">
              {giftPresets.map((preset) => (
                <button
                  key={preset}
                  onClick={() => { setSelectedGift(preset); setCustomGift(''); }}
                  className={`px-3 py-2.5 rounded-2xl text-xs font-bold border-2 transition-all active:scale-95 ${
                    selectedGift === preset && !customGift
                      ? 'border-[hsl(38_55%_62%)] bg-[hsl(38_55%_62%/0.15)] text-foreground'
                      : 'border-border bg-card text-muted-foreground hover:border-[hsl(38_55%_62%/0.5)]'
                  }`}
                >
                  <Gift className="w-3.5 h-3.5 inline-block ml-1" />
                  {preset}
                </button>
              ))}
            </div>
          </div>

          {/* Custom gift */}
          <div>
            <p className="text-xs font-semibold text-muted-foreground mb-1.5">
              {isEn ? 'Or write a custom gift:' : 'או כתבי הטבה מותאמת:'}
            </p>
            <Input
              value={customGift}
              onChange={(e) => setCustomGift(e.target.value)}
              placeholder={isEn ? 'e.g. Free lip treatment' : 'לדוגמה: טיפול שפתיים חינם'}
              className="rounded-xl text-sm"
              dir={isEn ? 'ltr' : 'rtl'}
            />
          </div>

          {/* Editable message */}
          {gift && (
            <div className="rounded-2xl p-3 bg-accent/10 border border-accent/30">
              <p className="text-[10px] font-semibold text-accent mb-1.5 flex items-center gap-1">
                <Sparkles className="w-3 h-3" />
                {isEn ? 'Edit message:' : 'עריכת ההודעה:'}
              </p>
              <Textarea
                value={editedMessage}
                onChange={(e) => setEditedMessage(e.target.value)}
                dir={isEn ? 'ltr' : 'rtl'}
                className="text-xs leading-relaxed min-h-[100px] rounded-xl border-accent/30 bg-background/80 focus-visible:ring-accent/40"
              />
            </div>
          )}

          {/* Actions */}
          <div className="flex flex-col gap-2 pt-1">
            <Button
              onClick={handleWhatsApp}
              disabled={!gift}
              className="w-full rounded-full py-3 font-bold text-sm gap-2"
              style={{ background: '#25D366', color: 'white', border: 'none' }}
            >
              <MessageCircle className="w-4 h-4" />
              {isEn ? 'Send via WhatsApp' : 'שלחי בוואטסאפ'}
            </Button>
            <Button
              onClick={handlePush}
              disabled={!gift || sendingPush}
              variant="outline"
              className="w-full rounded-full py-3 font-bold text-sm gap-2 border-2 border-[hsl(38_55%_62%)]"
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
