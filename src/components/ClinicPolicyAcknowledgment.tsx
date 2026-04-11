import { useState, useEffect } from 'react';
import { Loader2, ScrollText, CheckCircle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

interface Props {
  artistProfileId: string;
  lang: 'he' | 'en';
  onAcknowledge: () => void;
}

function renderPolicyText(text: string) {
  if (!text) return null;
  const lines = text.split('\n');
  return lines.map((line, i) => {
    const trimmed = line.trim();
    if (!trimmed) return <div key={i} className="h-3" />;
    if (trimmed.startsWith('# ') && !trimmed.startsWith('## ')) {
      return <h2 key={i} className="text-lg font-serif font-bold mt-6 mb-2 first:mt-0" style={{ color: '#4a3636' }}>{trimmed.slice(2)}</h2>;
    }
    if (trimmed.startsWith('## ')) {
      return <h3 key={i} className="text-base font-semibold mt-5 mb-1.5" style={{ color: '#B8860B' }}>{trimmed.slice(3)}</h3>;
    }
    if (trimmed.startsWith('- ')) {
      return (
        <div key={i} className="flex items-start gap-2 py-0.5 pr-4">
          <span className="mt-1.5 w-1.5 h-1.5 rounded-full shrink-0" style={{ background: '#D4AF37' }} />
          <span className="text-sm leading-relaxed" style={{ color: '#4a3636' }}>{parseBold(trimmed.slice(2))}</span>
        </div>
      );
    }
    return <p key={i} className="text-sm leading-relaxed" style={{ color: '#4a3636' }}>{parseBold(trimmed)}</p>;
  });
}

function parseBold(text: string) {
  const parts = text.split(/\*\*(.*?)\*\*/g);
  return parts.map((part, i) => i % 2 === 1 ? <strong key={i} className="font-semibold">{part}</strong> : part);
}

export default function ClinicPolicyAcknowledgment({ artistProfileId, lang, onAcknowledge }: Props) {
  const isHe = lang === 'he';
  const [content, setContent] = useState('');
  const [loading, setLoading] = useState(true);
  const [scrolledToBottom, setScrolledToBottom] = useState(false);

  useEffect(() => {
    loadContent();
  }, [artistProfileId, lang]);

  const loadContent = async () => {
    try {
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

  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const el = e.currentTarget;
    const atBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 60;
    if (atBottom && !scrolledToBottom) setScrolledToBottom(true);
  };

  // If no content loaded and not loading, skip policy screen
  useEffect(() => {
    if (!loading && !content) onAcknowledge();
  }, [loading, content]);

  return (
    <div className="min-h-screen flex flex-col" dir={isHe ? 'rtl' : 'ltr'} style={{ background: 'linear-gradient(180deg, #FFF9F7 0%, #f5eded 100%)' }}>
      {/* Header */}
      <div
        className="px-6 py-6 flex items-center gap-3 shrink-0"
        style={{
          background: 'linear-gradient(135deg, hsl(38 55% 60%) 0%, hsl(40 45% 85%) 50%, hsl(40 60% 90%) 100%)',
          borderBottom: '1px solid rgba(212,175,55,0.2)',
        }}
      >
        <div className="w-11 h-11 rounded-full flex items-center justify-center" style={{ background: 'rgba(255,255,255,0.6)', backdropFilter: 'blur(8px)' }}>
          <ScrollText className="w-5.5 h-5.5" style={{ color: '#B8860B' }} />
        </div>
        <div>
          <h1 className="font-serif font-bold text-lg" style={{ color: '#4a3636' }}>
            {isHe ? 'מדיניות הקליניקה' : 'Clinic Policy'}
          </h1>
          <p className="text-xs mt-0.5" style={{ color: '#6b5050' }}>
            {isHe ? 'נא לקרוא ולאשר לפני מילוי הצהרת הבריאות' : 'Please read and acknowledge before the health declaration'}
          </p>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto px-5 py-6" onScroll={handleScroll}>
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <div className="max-w-lg mx-auto bg-white rounded-2xl p-5 shadow-sm" style={{ border: '1px solid rgba(212,175,55,0.15)' }}>
            {renderPolicyText(content)}
          </div>
        )}
      </div>

      {/* Acknowledge Button */}
      <div className="shrink-0 p-5 pb-8" style={{ background: 'linear-gradient(180deg, transparent, #FFF9F7 30%)' }}>
        <button
          onClick={onAcknowledge}
          disabled={loading}
          className="w-full max-w-lg mx-auto flex items-center justify-center gap-2.5 py-4 rounded-full font-bold text-sm transition-all active:scale-[0.97] disabled:opacity-40"
          style={{
            background: 'linear-gradient(135deg, #B8860B 0%, #D4AF37 30%, #F9F295 50%, #D4AF37 70%, #B8860B 100%)',
            color: '#4a3636',
            boxShadow: '0 4px 18px rgba(212, 175, 55, 0.35)',
          }}
        >
          <CheckCircle className="w-5 h-5" />
          {isHe ? 'קראתי ואני מאשרת – המשך להצהרת בריאות' : "I've Read & Acknowledge – Continue to Health Form"}
        </button>
      </div>
    </div>
  );
}