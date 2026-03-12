import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Loader2, ScrollText } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useI18n } from '@/lib/i18n';

interface ClinicPolicyViewerProps {
  open: boolean;
  onClose: () => void;
  artistProfileId?: string;
}

/** Simple markdown-like renderer: # headers, ## subheaders, - bullets, **bold** */
function renderPolicyText(text: string) {
  if (!text) return null;
  const lines = text.split('\n');
  return lines.map((line, i) => {
    const trimmed = line.trim();
    if (!trimmed) return <div key={i} className="h-3" />;

    // H1
    if (trimmed.startsWith('# ') && !trimmed.startsWith('## ')) {
      return (
        <h2 key={i} className="text-lg font-serif font-bold mt-6 mb-2 first:mt-0" style={{ color: '#4a3636' }}>
          {trimmed.slice(2)}
        </h2>
      );
    }
    // H2
    if (trimmed.startsWith('## ')) {
      return (
        <h3 key={i} className="text-base font-semibold mt-5 mb-1.5 flex items-center gap-2" style={{ color: '#B8860B' }}>
          {trimmed.slice(3)}
        </h3>
      );
    }
    // Bullet
    if (trimmed.startsWith('- ')) {
      return (
        <div key={i} className="flex items-start gap-2 py-0.5 pr-4">
          <span className="mt-1.5 w-1.5 h-1.5 rounded-full shrink-0" style={{ background: '#D4AF37' }} />
          <span className="text-sm leading-relaxed" style={{ color: '#4a3636' }}>{parseBold(trimmed.slice(2))}</span>
        </div>
      );
    }
    // Normal text
    return (
      <p key={i} className="text-sm leading-relaxed" style={{ color: '#4a3636' }}>
        {parseBold(trimmed)}
      </p>
    );
  });
}

function parseBold(text: string) {
  const parts = text.split(/\*\*(.*?)\*\*/g);
  return parts.map((part, i) =>
    i % 2 === 1 ? <strong key={i} className="font-semibold">{part}</strong> : part
  );
}

export default function ClinicPolicyViewer({ open, onClose, artistProfileId }: ClinicPolicyViewerProps) {
  const { lang } = useI18n();
  const isHe = lang === 'he';
  const [content, setContent] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!open) return;
    loadContent();
  }, [open, artistProfileId]);

  const loadContent = async () => {
    setLoading(true);
    try {
      // Try artist-specific
      if (artistProfileId) {
        const { data } = await supabase
          .from('clinic_policies' as any)
          .select('content_he, content_en')
          .eq('artist_profile_id', artistProfileId)
          .maybeSingle();
        if (data) {
          const text = isHe ? (data as any).content_he : (data as any).content_en;
          if (text) { setContent(text); setLoading(false); return; }
        }
      }
      // Fall back to master
      const { data: master } = await supabase
        .from('clinic_policy_master' as any)
        .select('content_he, content_en')
        .limit(1)
        .maybeSingle();
      if (master) {
        setContent(isHe ? (master as any).content_he : (master as any).content_en || '');
      }
    } catch (err) {
      console.error('Failed to load policy:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-lg max-h-[90vh] flex flex-col p-0 overflow-hidden" dir={isHe ? 'rtl' : 'ltr'}>
        {/* Elegant header */}
        <div
          className="px-6 py-5 flex items-center gap-3 shrink-0"
          style={{
            background: 'linear-gradient(135deg, hsl(350 35% 75%) 0%, hsl(350 50% 90%) 50%, hsl(40 60% 90%) 100%)',
            borderBottom: '1px solid rgba(212,175,55,0.2)',
          }}
        >
          <div className="w-10 h-10 rounded-full flex items-center justify-center" style={{ background: 'rgba(255,255,255,0.6)', backdropFilter: 'blur(8px)' }}>
            <ScrollText className="w-5 h-5" style={{ color: '#B8860B' }} />
          </div>
          <div>
            <h2 className="font-serif font-bold text-base" style={{ color: '#4a3636' }}>
              {isHe ? 'מדיניות הקליניקה' : 'Clinic Policy'}
            </h2>
            <p className="text-xs" style={{ color: '#6b5050' }}>
              {isHe ? 'תנאי שירות ומידע חשוב' : 'Terms of service & important information'}
            </p>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-6 py-5 min-h-0" style={{ background: '#FFF9F7' }}>
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
            </div>
          ) : content ? (
            <div className="space-y-1">{renderPolicyText(content)}</div>
          ) : (
            <p className="text-center text-muted-foreground text-sm py-12">
              {isHe ? 'לא הוגדרה מדיניות עדיין' : 'No policy defined yet'}
            </p>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
