import { useState } from "react";
import { useLocation } from "react-router-dom";
import { Lightbulb, Loader2 } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "@/hooks/use-toast";
import { useI18n } from "@/lib/i18n";

const TOPIC_KEYS = ["efficiency", "feature", "bug", "other"] as const;

export default function FeedbackFAB() {
  const location = useLocation();
  const { t, dir } = useI18n();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({ name: "", email: "", topic: "", message: "" });

  const hiddenRoutes = ["/", "/pricing", "/auth", "/legal", "/privacy", "/terms", "/refund-policy"];
  if (hiddenRoutes.includes(location.pathname)) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim() || !form.topic || !form.message.trim()) {
      toast({ title: t('feedback.fillAll'), variant: "destructive" });
      return;
    }

    const topicLabel = t(`feedback.topic.${form.topic}`);
    const subject = encodeURIComponent(`New Feedback: ${topicLabel}`);
    const body = encodeURIComponent(`Name: ${form.name.trim()}\n\nMessage: ${form.message.trim()}`);
    window.open(`mailto:hello@glowpush.app?subject=${subject}&body=${body}`, "_self");

    setForm({ name: "", email: "", topic: "", message: "" });
    setOpen(false);
    toast({
      title: t('feedback.thanks'),
      description: t('feedback.thanksDesc'),
    });
  };

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        aria-label={t('feedback.aria')}
        className="fixed z-[9999] flex items-center justify-center rounded-full transition-transform hover:scale-105 active:scale-95"
        style={{
          bottom: 100,
          left: 20,
          width: 56,
          height: 56,
          borderRadius: "50%",
          background: "linear-gradient(135deg, #E8C0C8 0%, #d69da9 100%)",
          border: "none",
          boxShadow: "0 6px 14px rgba(0,0,0,0.15), 0 2px 6px rgba(214,157,169,0.3)",
        }}
      >
        <Lightbulb className="h-6 w-6 text-white drop-shadow" />
      </button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent
          className="max-w-md sm:rounded-2xl p-0 overflow-hidden"
          style={{
            background: "#FAFAFA",
            border: "2px solid transparent",
            backgroundClip: "padding-box",
            boxShadow: "0 8px 40px rgba(0,0,0,0.10), 0 0 0 2px #D4AF3766",
          }}
          dir={dir}
        >
          <div
            className="h-1 w-full"
            style={{
              background: "linear-gradient(90deg, #BF953F, #FCF6BA, #B38728, #FBF5B7, #AA771C)",
            }}
          />

          <div className="p-6 pt-5 space-y-4">
            <DialogHeader className={dir === 'rtl' ? 'text-right space-y-2' : 'text-left space-y-2'}>
              <DialogTitle className={`text-xl font-serif ${dir === 'rtl' ? 'text-right' : 'text-left'}`} style={{ color: "#4a3636" }}>
                {t('feedback.title')}
              </DialogTitle>
              <DialogDescription className={`text-sm leading-relaxed ${dir === 'rtl' ? 'text-right' : 'text-left'}`} style={{ color: "#6B5E57" }}>
                {t('feedback.description')}
              </DialogDescription>
            </DialogHeader>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-1.5">
                <Label className={`block text-xs font-medium ${dir === 'rtl' ? 'text-right' : 'text-left'}`} style={{ color: "#4a3636" }}>{t('feedback.name')}</Label>
                <Input
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  placeholder={t('feedback.namePlaceholder')}
                  className={`${dir === 'rtl' ? 'text-right' : 'text-left'} border-[hsl(38_30%_82%)] focus-visible:ring-[#D4AF37]`}
                  dir={dir}
                />
              </div>

              <div className="space-y-1.5">
                <Label className={`block text-xs font-medium ${dir === 'rtl' ? 'text-right' : 'text-left'}`} style={{ color: "#4a3636" }}>{t('feedback.topic')}</Label>
                <Select value={form.topic} onValueChange={(v) => setForm({ ...form, topic: v })}>
                  <SelectTrigger className={`${dir === 'rtl' ? 'text-right' : 'text-left'} border-[hsl(38_30%_82%)] focus:ring-[#D4AF37]`} dir={dir}>
                    <SelectValue placeholder={t('feedback.topicPlaceholder')} />
                  </SelectTrigger>
                  <SelectContent dir={dir}>
                    {TOPIC_KEYS.map((key) => (
                      <SelectItem key={key} value={key}>{t(`feedback.topic.${key}`)}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label className={`block text-xs font-medium ${dir === 'rtl' ? 'text-right' : 'text-left'}`} style={{ color: "#4a3636" }}>{t('feedback.message')}</Label>
                <Textarea
                  value={form.message}
                  onChange={(e) => setForm({ ...form, message: e.target.value })}
                  placeholder={t('feedback.messagePlaceholder')}
                  className={`min-h-[120px] ${dir === 'rtl' ? 'text-right' : 'text-left'} border-[hsl(38_30%_82%)] focus-visible:ring-[#D4AF37]`}
                  dir={dir}
                />
              </div>

              <Button
                type="submit"
                disabled={loading}
                className="w-full h-12 rounded-2xl text-white font-serif text-base tracking-wide relative overflow-hidden"
                style={{
                  background: "linear-gradient(135deg, #E8C0C8 0%, #c4869a 100%)",
                  boxShadow: "0 4px 14px rgba(196,134,154,0.35), 0 0 0 1.5px #D4AF3755",
                }}
              >
                {loading ? (
                  <Loader2 className="h-5 w-5 animate-spin" />
                ) : (
                  t('feedback.submit')
                )}
              </Button>
            </form>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
