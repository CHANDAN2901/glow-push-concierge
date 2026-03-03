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

interface RenewalMessageDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  clientName: string;
  clientPhone: string;
  clientDbId?: string;
  treatmentType: string;
  artistName: string;
  customTemplate?: string;
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

const DEFAULT_LIPS_TEMPLATE = 'היי [CLIENT], עברו כבר כמה חודשים מאז שעיצבנו לך את השפתיים! 💋✨ זה בדיוק הזמן לרענון כדי לשמור על המראה המושלם. קבעי תור השבוע ותהני מהנחת לקוחה חוזרת. מחכה לך, [ARTIST]';
const DEFAULT_BROWS_TEMPLATE = 'היי [CLIENT], עברה כמעט שנה מאז שעיצבנו לך את הגבות! ✨ זה בדיוק הזמן לרענון כדי לשמור על המראה המושלם. קבעי תור השבוע ותהני מהנחת לקוחה חוזרת. מחכה לך, [ARTIST]';

function buildRenewalMessage(clientName: string, treatmentType: string, artistName: string, customTemplate?: string): string {
  if (customTemplate) {
    return customTemplate
      .replace(/\[CLIENT\]/g, clientName)
      .replace(/\[ARTIST\]/g, artistName);
  }
  const t = (treatmentType || '').toLowerCase();
  const isLips = t.includes('שפתיי') || t.includes('lip');
  const template = isLips ? DEFAULT_LIPS_TEMPLATE : DEFAULT_BROWS_TEMPLATE;
  return template
    .replace(/\[CLIENT\]/g, clientName)
    .replace(/\[ARTIST\]/g, artistName);
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
}: RenewalMessageDialogProps) {
  const { toast } = useToast();
  const [sendingPush, setSendingPush] = useState(false);

  const baseMessage = buildRenewalMessage(clientName, treatmentType, artistName || 'האמנית שלך', customTemplate);
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
    toast({ title: 'וואטסאפ נפתח! 🔄' });
    onOpenChange(false);
  };

  const handlePush = async () => {
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
          title: '✨ הגיע הזמן לרענון!',
          body: getFinalMessage().substring(0, 200),
          day: 0,
        },
      });
      if (error) throw error;
      toast({ title: 'התראת חידוש נשלחה! 🔄✅' });
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
            <RefreshCw className="w-5 h-5 text-accent" />
            חידוש טיפול — {clientName}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 pt-2">
          {/* Editable message */}
          <div className="rounded-2xl p-3 bg-accent/10 border border-accent/30">
            <p className="text-[10px] font-semibold text-accent mb-1.5">עריכת ההודעה:</p>
            <Textarea
              value={editedMessage}
              onChange={(e) => setEditedMessage(e.target.value)}
              dir="rtl"
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
              שלחי בוואטסאפ
            </Button>
            <Button
              onClick={handlePush}
              disabled={sendingPush}
              variant="outline"
              className="w-full rounded-full py-3 font-bold text-sm gap-2 border-2 border-accent"
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
