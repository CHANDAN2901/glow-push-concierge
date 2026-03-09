import { useState } from "react";
import { useLocation } from "react-router-dom";
import { MessageSquarePlus, Loader2 } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "@/hooks/use-toast";

const TOPICS = [
  { value: "efficiency", label: "הצעת ייעול" },
  { value: "feature", label: "בקשה לפיצ'ר חדש" },
  { value: "bug", label: "דיווח על תקלה" },
  { value: "other", label: "אחר" },
];

export default function FeedbackFAB() {
  const location = useLocation();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({ name: "", email: "", topic: "", message: "" });

  // Hide on landing/marketing pages
  const hiddenRoutes = ["/", "/pricing", "/auth", "/legal", "/privacy", "/terms", "/refund-policy"];
  if (hiddenRoutes.includes(location.pathname)) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim() || !form.email.trim() || !form.topic || !form.message.trim()) {
      toast({ title: "נא למלא את כל השדות", variant: "destructive" });
      return;
    }

    setLoading(true);
    const { error } = await supabase.from("user_feedback").insert({
      name: form.name.trim(),
      email: form.email.trim(),
      topic: form.topic,
      message: form.message.trim(),
    });
    setLoading(false);

    if (error) {
      toast({ title: "שגיאה בשליחה", description: error.message, variant: "destructive" });
      return;
    }

    setForm({ name: "", email: "", topic: "", message: "" });
    setOpen(false);
    toast({
      title: "תודה ששיתפת אותנו! 🤍",
      description: "הרעיון שלך התקבל בהצלחה ויעזור לנו להשתפר.",
    });
  };

  return (
    <>
      {/* FAB */}
      <button
        onClick={() => setOpen(true)}
        aria-label="שלחי משוב"
        className="fixed z-[9999] flex items-center justify-center rounded-full transition-transform hover:scale-105 active:scale-95"
        style={{
          bottom: 100,
          left: 20,
          width: 56,
          height: 56,
          borderRadius: "50%",
          background: "linear-gradient(135deg, #E8C0C8 0%, #d69da9 100%)",
          border: "2.5px solid #D4AF37",
          boxShadow: "0 8px 15px rgba(0,0,0,0.3), 0 0 12px rgba(212,175,55,0.4)",
        }}
      >
        <MessageSquarePlus className="h-6 w-6 text-white drop-shadow" />
      </button>

      {/* Modal */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent
          className="max-w-md sm:rounded-2xl p-0 overflow-hidden"
          style={{
            background: "#FAFAFA",
            border: "2px solid transparent",
            backgroundClip: "padding-box",
            boxShadow: "0 8px 40px rgba(0,0,0,0.10), 0 0 0 2px #D4AF3766",
          }}
          dir="rtl"
        >
          {/* Gold accent line */}
          <div
            className="h-1 w-full"
            style={{
              background: "linear-gradient(90deg, #BF953F, #FCF6BA, #B38728, #FBF5B7, #AA771C)",
            }}
          />

          <div className="p-6 pt-5 space-y-4">
            <DialogHeader className="text-right space-y-2">
              <DialogTitle className="text-xl font-serif text-right" style={{ color: "#3D2B1F" }}>
                הקול שלך משפיע ✨
              </DialogTitle>
              <DialogDescription className="text-right text-sm leading-relaxed" style={{ color: "#6B5E57" }}>
                המערכת הזו נבנית עבורך. חסר לך פיצ׳ר ביומיום בקליניקה? יש לך רעיון לשדרוג? נשמח לשמוע ממך.
              </DialogDescription>
            </DialogHeader>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-1.5">
                <Label className="text-right block text-xs font-medium" style={{ color: "#5C4033" }}>שם מלא</Label>
                <Input
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  placeholder="השם שלך"
                  className="text-right border-[hsl(38_30%_82%)] focus-visible:ring-[#D4AF37]"
                  dir="rtl"
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-right block text-xs font-medium" style={{ color: "#5C4033" }}>אימייל</Label>
                <Input
                  type="email"
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                  placeholder="your@email.com"
                  className="text-right border-[hsl(38_30%_82%)]  focus-visible:ring-[#D4AF37]"
                  dir="rtl"
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-right block text-xs font-medium" style={{ color: "#5C4033" }}>נושא</Label>
                <Select value={form.topic} onValueChange={(v) => setForm({ ...form, topic: v })}>
                  <SelectTrigger className="text-right border-[hsl(38_30%_82%)] focus:ring-[#D4AF37]" dir="rtl">
                    <SelectValue placeholder="בחרי נושא" />
                  </SelectTrigger>
                  <SelectContent dir="rtl">
                    {TOPICS.map((t) => (
                      <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label className="text-right block text-xs font-medium" style={{ color: "#5C4033" }}>ההודעה שלך</Label>
                <Textarea
                  value={form.message}
                  onChange={(e) => setForm({ ...form, message: e.target.value })}
                  placeholder="ספרי לנו מה עובר לך בראש..."
                  className="min-h-[120px] text-right border-[hsl(38_30%_82%)] focus-visible:ring-[#D4AF37]"
                  dir="rtl"
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
                  "💡 שתפי אותנו ברעיון שלך"
                )}
              </Button>
            </form>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
