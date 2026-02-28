import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useI18n } from '@/lib/i18n';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { Lock, Crown } from 'lucide-react';

const ResetPassword = () => {
  const { lang } = useI18n();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    // Listen for the PASSWORD_RECOVERY event
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'PASSWORD_RECOVERY') {
        setReady(true);
      }
    });
    // Also check hash for type=recovery
    if (window.location.hash.includes('type=recovery')) {
      setReady(true);
    }
    return () => subscription.unsubscribe();
  }, []);

  const handleReset = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const { error } = await supabase.auth.updateUser({ password });
    if (error) {
      toast({ title: lang === 'en' ? 'Error' : 'שגיאה', description: error.message, variant: 'destructive' });
    } else {
      toast({ title: lang === 'en' ? 'Password updated!' : 'הסיסמה עודכנה!' });
      navigate('/artist');
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-secondary flex items-center justify-center px-4 pt-20">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="w-16 h-16 rounded-full bg-gold-muted flex items-center justify-center mx-auto mb-4">
            <Crown className="w-8 h-8 text-accent" />
          </div>
          <h1 className="text-2xl font-serif font-bold">
            {lang === 'en' ? 'Set New Password' : 'הגדרת סיסמה חדשה'}
          </h1>
        </div>
        <div className="bg-card rounded-2xl border border-border p-8 shadow-sm">
          {ready ? (
            <form onSubmit={handleReset} className="space-y-5">
              <div className="space-y-2">
                <Label className="text-xs font-medium">{lang === 'en' ? 'New Password' : 'סיסמה חדשה'}</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    type="password"
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="pl-10 h-12"
                    required
                    minLength={6}
                  />
                </div>
              </div>
              <Button type="submit" disabled={loading} className="w-full h-12 bg-gold-shimmer text-accent-foreground">
                {loading ? '...' : (lang === 'en' ? 'Update Password' : 'עדכני סיסמה')}
              </Button>
            </form>
          ) : (
            <p className="text-center text-muted-foreground">
              {lang === 'en' ? 'Loading recovery session...' : 'טוען...'}
            </p>
          )}
        </div>
      </div>
    </div>
  );
};

export default ResetPassword;
