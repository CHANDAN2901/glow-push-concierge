import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Gift, Save } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

const DEFAULT_TEXT_HE = 'שלחי לחברה את הקוד שלך! היא תקבל 100 ש"ח הנחה לטיפול ראשון, ואת תקבלי 50 ש"ח קרדיט לטיפול החיזוק הבא שלך.';
const DEFAULT_TEXT_EN = 'Send your code to a friend! She gets ₪100 off her first treatment, and you get ₪50 credit for your next touch-up.';
const DEFAULT_WA_HE = 'היי אהובה! ✨\nרציתי לפרגן לך במתנה קטנה... קיבלתי קוד הטבה אישי אצל {{artist_name}}, המאפרת המהממת שלי!\nאם בא לך להתפנק בטיפול, תשתמשי בקוד שלי: [CODE] ותקבלי הנחה שווה על הטיפול הראשון שלך אצלה. מומלץ בחום! 🤍';
const DEFAULT_WA_EN = 'Hey babe! ✨\nI wanted to treat you... I got a personal discount code for my amazing permanent makeup artist, {{artist_name}}!\nUse my code: [CODE] to get a discount on your first treatment with her. Highly recommended! 🤍';

export const VOUCHER_DEFAULTS = {
  voucher_text_he: DEFAULT_TEXT_HE,
  voucher_text_en: DEFAULT_TEXT_EN,
  voucher_wa_he: DEFAULT_WA_HE,
  voucher_wa_en: DEFAULT_WA_EN,
};

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  artistProfileId: string;
  lang: 'en' | 'he';
}

export default function ReferralVoucherEditor({ open, onOpenChange, artistProfileId, lang }: Props) {
  const { toast } = useToast();
  const [textHe, setTextHe] = useState(DEFAULT_TEXT_HE);
  const [textEn, setTextEn] = useState(DEFAULT_TEXT_EN);
  const [waHe, setWaHe] = useState(DEFAULT_WA_HE);
  const [waEn, setWaEn] = useState(DEFAULT_WA_EN);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open || !artistProfileId) return;
    (async () => {
      const { data } = await supabase
        .from('artist_message_settings')
        .select('settings')
        .eq('artist_profile_id', artistProfileId)
        .maybeSingle();
      if (data?.settings && typeof data.settings === 'object') {
        const s = data.settings as Record<string, unknown>;
        if (s.voucher_text_he) setTextHe(s.voucher_text_he as string);
        if (s.voucher_text_en) setTextEn(s.voucher_text_en as string);
        if (s.voucher_wa_he) setWaHe(s.voucher_wa_he as string);
        if (s.voucher_wa_en) setWaEn(s.voucher_wa_en as string);
      }
    })();
  }, [open, artistProfileId]);

  const handleSave = async () => {
    setSaving(true);
    try {
      const { data: existing } = await supabase
        .from('artist_message_settings')
        .select('id, settings')
        .eq('artist_profile_id', artistProfileId)
        .maybeSingle();

      const newSettings = {
        ...((existing?.settings as Record<string, unknown>) || {}),
        voucher_text_he: textHe,
        voucher_text_en: textEn,
        voucher_wa_he: waHe,
        voucher_wa_en: waEn,
      };

      if (existing) {
        await supabase
          .from('artist_message_settings')
          .update({ settings: newSettings })
          .eq('id', existing.id);
      } else {
        await supabase
          .from('artist_message_settings')
          .insert({ artist_profile_id: artistProfileId, settings: newSettings });
      }

      toast({
        title: lang === 'en' ? 'Voucher saved!' : 'השובר נשמר בהצלחה!',
        description: lang === 'en' ? 'Your clients will see the updated text.' : 'הלקוחות יראו את הטקסט המעודכן.',
      });
      onOpenChange(false);
    } catch {
      toast({ title: lang === 'en' ? 'Error saving' : 'שגיאה בשמירה', variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md max-h-[85vh] overflow-y-auto" dir={lang === 'he' ? 'rtl' : 'ltr'}>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 font-serif">
            <Gift className="w-5 h-5" style={{ color: 'hsl(38 55% 62%)' }} />
            {lang === 'en' ? 'Edit Referral Voucher' : 'עריכת שובר חברות'}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-5 mt-2">
          {/* Referral WhatsApp message with presets */}
          <div>
            <Label className="text-sm font-semibold mb-1.5 block">
              {lang === 'en' ? 'Referral WhatsApp Message (Hebrew)' : '💝 הודעת שובר - חברה מביאה חברה (עברית)'}
            </Label>
            {lang === 'he' && (
              <div className="flex flex-wrap gap-1.5 mb-2">
                <button
                  type="button"
                  onClick={() => setWaHe('היי אהובה! ✨\nרציתי לפרגן לך במתנה קטנה... קיבלתי קוד הטבה אישי אצל {{artist_name}}, המאפרת המהממת שלי!\nאם בא לך להתפנק בטיפול, תשתמשי בקוד שלי: [CODE] ותקבלי הנחה שווה על הטיפול הראשון שלך אצלה. מומלץ בחום! 🤍')}
                  className="px-2.5 py-1 rounded-lg text-[11px] font-semibold transition-all hover:scale-[1.03] active:scale-[0.97] border"
                  style={{
                    background: 'linear-gradient(135deg, hsl(38 50% 96%), hsl(38 45% 92%))',
                    borderColor: 'hsl(38 55% 62% / 0.4)',
                    color: 'hsl(36 50% 35%)',
                  }}
                >
                  תבנית 1: חברות קרובה
                </button>
                <button
                  type="button"
                  onClick={() => setWaHe('היי {{client_name}} מהממת! 🥰 תודה שבחרת בי. פינקתי אותך בקוד הטבה אישי לחברות: [CODE]. כל חברה שתגיע דרכך ותציג את הקוד תקבל הנחה מיוחדת, ואני אפנק אותך בקרדיט לטיפול הבא! תרגישי חופשי להעביר למי שרק בא לך. מחכה לראות אותך בטאצ\'-אפ! ✨')}
                  className="px-2.5 py-1 rounded-lg text-[11px] font-semibold transition-all hover:scale-[1.03] active:scale-[0.97] border"
                  style={{
                    background: 'linear-gradient(135deg, hsl(38 50% 96%), hsl(38 45% 92%))',
                    borderColor: 'hsl(38 55% 62% / 0.4)',
                    color: 'hsl(36 50% 35%)',
                  }}
                >
                  תבנית 2: קצרה וקולעת
                </button>
              </div>
            )}
            <Textarea
              value={waHe}
              onChange={e => setWaHe(e.target.value)}
              rows={4}
              dir="rtl"
              className="text-sm"
            />
            <div className="flex flex-wrap gap-1.5 mt-1.5">
              {['{{client_name}}', '{{artist_name}}', '[CODE]'].map(tag => (
                <span key={tag} className="inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-mono" style={{ backgroundColor: 'hsl(38 55% 62% / 0.15)', color: 'hsl(38 40% 45%)' }}>
                  {tag}
                </span>
              ))}
            </div>
          </div>

          <div>
            <Label className="text-sm font-semibold mb-1.5 block">
              {lang === 'en' ? 'Referral WhatsApp Message (English)' : 'הודעת שובר וואטסאפ (אנגלית)'}
            </Label>
            <Textarea
              value={waEn}
              onChange={e => setWaEn(e.target.value)}
              rows={3}
              dir="ltr"
              className="text-sm"
            />
            <p className="text-xs text-muted-foreground mt-1">
              {lang === 'en' ? 'Use [CODE] as placeholder for the referral code' : 'השתמשי ב-[CODE] כמקום לקוד ההפניה'}
            </p>
          </div>

          <Button
            onClick={handleSave}
            disabled={saving}
            className="w-full rounded-2xl font-bold"
            style={{ background: 'hsl(38 55% 50%)', color: 'hsl(0 0% 100%)' }}
          >
            <Save className="w-4 h-4 ml-2" />
            {saving
              ? (lang === 'en' ? 'Saving...' : 'שומר...')
              : (lang === 'en' ? 'Save Changes' : 'שמירת שינויים')}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
