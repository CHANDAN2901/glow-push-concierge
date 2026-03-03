import { useState } from 'react';
import { Gift, MessageCircle, Bell, Sparkles } from 'lucide-react';
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

interface BirthdayWishDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  clientName: string;
  clientPhone: string;
  clientDbId?: string;
  artistName: string;
}

const GIFT_PRESETS = [
  '15% הנחה',
  'Lip Oil במתנה',
  '50 ₪ הנחה',
  'טיפול מיני במתנה',
];

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
}: BirthdayWishDialogProps) {
  const { toast } = useToast();
  const [selectedGift, setSelectedGift] = useState('');
  const [customGift, setCustomGift] = useState('');
  const [sendingPush, setSendingPush] = useState(false);

  const gift = customGift.trim() || selectedGift;

  const buildMessage = () =>
    `היי ${clientName}, מזל טוב! 🎉🎂 לכבוד היום המיוחד שלך, מחכה לך הטבה מפנקת: ${gift} על הטיפול הבא שלך. נשיקות, ${artistName || 'האמנית שלך'} 💕`;

  const handleWhatsApp = () => {
    if (!gift) {
      toast({ title: 'בחרי הטבה לפני השליחה', variant: 'destructive' });
      return;
    }
    const msg = buildMessage();
    const cleanPhone = clientPhone ? formatPhone(clientPhone) : '';
    const url = cleanPhone
      ? `https://wa.me/${cleanPhone}?text=${encodeURIComponent(msg)}`
      : `https://wa.me/?text=${encodeURIComponent(msg)}`;
    window.open(url, '_blank');
    toast({ title: 'וואטסאפ נפתח! 🎉' });
    onOpenChange(false);
  };

  const handlePush = async () => {
    if (!gift) {
      toast({ title: 'בחרי הטבה לפני השליחה', variant: 'destructive' });
      return;
    }
    if (!clientDbId) {
      toast({ title: 'לא ניתן לשלוח התראה — אין מזהה לקוחה', variant: 'destructive' });
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
        toast({ title: 'לא נמצא מנוי התראות ללקוחה זו', variant: 'destructive' });
        return;
      }
      const sub = subs[0];
      const { error } = await supabase.functions.invoke('send-push', {
        body: {
          subscription: {
            endpoint: sub.endpoint,
            keys: { p256dh: sub.p256dh, auth: sub.auth_key },
          },
          title: `🎂 יום הולדת שמח, ${clientName}!`,
          body: `מחכה לך הטבה מפנקת: ${gift} 🎉`,
          day: 0,
        },
      });
      if (error) throw error;
      toast({ title: 'התראת יום הולדת נשלחה! 🎂✅' });
      onOpenChange(false);
    } catch (err: any) {
      toast({ title: 'שליחת ההתראה נכשלה', description: err?.message, variant: 'destructive' });
    } finally {
      setSendingPush(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm rounded-3xl" dir="rtl">
        <DialogHeader className="text-center">
          <DialogTitle className="text-lg font-bold flex items-center justify-center gap-2">
            <span className="text-2xl">🎂</span>
            ברכת יום הולדת ל{clientName}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 pt-2">
          {/* Gift presets */}
          <div>
            <p className="text-xs font-semibold text-muted-foreground mb-2">בחרי הטבה:</p>
            <div className="grid grid-cols-2 gap-2">
              {GIFT_PRESETS.map((preset) => (
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
            <p className="text-xs font-semibold text-muted-foreground mb-1.5">או כתבי הטבה מותאמת:</p>
            <Input
              value={customGift}
              onChange={(e) => setCustomGift(e.target.value)}
              placeholder="לדוגמה: טיפול שפתיים חינם"
              className="rounded-xl text-sm"
              dir="rtl"
            />
          </div>

          {/* Message preview */}
          {gift && (
            <div className="rounded-2xl p-3 bg-accent/10 border border-accent/30">
              <p className="text-[10px] font-semibold text-accent mb-1 flex items-center gap-1">
                <Sparkles className="w-3 h-3" />
                תצוגה מקדימה:
              </p>
              <p className="text-xs text-foreground whitespace-pre-line leading-relaxed">
                {buildMessage()}
              </p>
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
              שלחי בוואטסאפ
            </Button>
            <Button
              onClick={handlePush}
              disabled={!gift || sendingPush}
              variant="outline"
              className="w-full rounded-full py-3 font-bold text-sm gap-2 border-2 border-[hsl(38_55%_62%)]"
            >
              <Bell className="w-4 h-4" />
              {sendingPush ? 'שולחת...' : 'שלחי התראת פוש'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
