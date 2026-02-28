import { useState, useEffect } from 'react';
import { Save, Plus, X, CreditCard } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { usePricingPlans, useInvalidatePricingPlans, type PricingPlan } from '@/hooks/usePricingPlans';

export default function AdminPricingEditor() {
  const { toast } = useToast();
  const { data: fetchedPlans = [], isLoading: loading } = usePricingPlans();
  const invalidatePlans = useInvalidatePricingPlans();
  const [plans, setPlans] = useState<PricingPlan[]>([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setPlans(fetchedPlans);
  }, [fetchedPlans]);

  const updatePlan = (id: string, field: keyof PricingPlan, value: any) => {
    setPlans(plans.map(p => p.id === id ? { ...p, [field]: value } : p));
  };

  const updateFeature = (planId: string, lang: 'en' | 'he', idx: number, value: string) => {
    setPlans(plans.map(p => {
      if (p.id !== planId) return p;
      const key = lang === 'en' ? 'features_en' : 'features_he';
      const arr = [...p[key]];
      arr[idx] = value;
      return { ...p, [key]: arr };
    }));
  };

  const addFeature = (planId: string) => {
    setPlans(plans.map(p => {
      if (p.id !== planId) return p;
      return {
        ...p,
        features_en: [...p.features_en, ''],
        features_he: [...p.features_he, ''],
      };
    }));
  };

  const removeFeature = (planId: string, idx: number) => {
    setPlans(plans.map(p => {
      if (p.id !== planId) return p;
      return {
        ...p,
        features_en: p.features_en.filter((_, i) => i !== idx),
        features_he: p.features_he.filter((_, i) => i !== idx),
      };
    }));
  };

  const saveAll = async () => {
    setSaving(true);
    let hasError = false;
    for (const plan of plans) {
      const { error } = await supabase
        .from('pricing_plans')
        .update({
          name_en: plan.name_en,
          name_he: plan.name_he,
          price_monthly: plan.price_monthly,
          price_usd: plan.price_usd,
          is_highlighted: plan.is_highlighted,
          badge_en: plan.badge_en,
          badge_he: plan.badge_he,
          features_en: plan.features_en,
          features_he: plan.features_he,
          cta_en: plan.cta_en,
          cta_he: plan.cta_he,
          sort_order: plan.sort_order,
          total_promo_spots: plan.total_promo_spots,
        } as any)
        .eq('id', plan.id);
      if (error) hasError = true;
    }
    setSaving(false);
    if (!hasError) {
      await invalidatePlans();
    }
    toast({
      title: hasError ? 'שגיאה בשמירה' : 'החבילות עודכנו בהצלחה! ✨',
      variant: hasError ? 'destructive' : 'default',
    });
  };

  if (loading) {
    return <div className="text-center py-12 text-muted-foreground">טוען חבילות...</div>;
  }

  return (
    <div className="space-y-6 max-w-4xl relative pb-20" dir="rtl">
      <div className="flex items-center gap-2 mb-2">
        <CreditCard className="w-5 h-5 text-accent" />
        <h2 className="font-serif font-semibold text-lg">ניהול חבילות ומחירים</h2>
      </div>
      <p className="text-sm text-muted-foreground">
        עדכני את שמות החבילות, המחירים והפיצ'רים. השינויים ישתקפו אוטומטית בדף הנחיתה.
      </p>

      {plans.map((plan) => (
        <div key={plan.id} className={`bg-card border rounded-xl p-6 space-y-4 ${plan.is_highlighted ? 'border-accent shadow-gold' : 'border-border'}`}>
          <div className="flex items-center justify-between">
            <h3 className="font-serif font-bold text-lg">{plan.name_he || plan.name_en}</h3>
            <div className="flex items-center gap-2 text-sm">
              <span className="text-muted-foreground">מודגשת</span>
              <Switch
                checked={plan.is_highlighted}
                onCheckedChange={(v) => updatePlan(plan.id, 'is_highlighted', v)}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium mb-1 block">שם (עברית)</label>
              <Input value={plan.name_he} onChange={(e) => updatePlan(plan.id, 'name_he', e.target.value)} dir="rtl" />
            </div>
            <div>
              <label className="text-sm font-medium mb-1 block">Name (English)</label>
              <Input value={plan.name_en} onChange={(e) => updatePlan(plan.id, 'name_en', e.target.value)} />
            </div>
            <div>
              <label className="text-sm font-medium mb-1 block">מחיר חודשי (₪)</label>
              <Input type="number" value={plan.price_monthly} onChange={(e) => updatePlan(plan.id, 'price_monthly', Number(e.target.value))} />
            </div>
            <div>
              <label className="text-sm font-medium mb-1 block">Price USD ($)</label>
              <Input type="number" value={plan.price_usd} onChange={(e) => updatePlan(plan.id, 'price_usd', Number(e.target.value))} />
            </div>
            <div>
              <label className="text-sm font-medium mb-1 block">סדר תצוגה</label>
              <Input type="number" value={plan.sort_order} onChange={(e) => updatePlan(plan.id, 'sort_order', Number(e.target.value))} />
            </div>
            {plan.slug === 'vip-3year' && (
              <div>
                <label className="text-sm font-medium mb-1 block">🔥 סה״כ מקומות פרומו</label>
                <Input type="number" value={plan.total_promo_spots} onChange={(e) => updatePlan(plan.id, 'total_promo_spots', Number(e.target.value))} placeholder="50" />
              </div>
            )}
          </div>

          {plan.is_highlighted && (
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium mb-1 block">תגית (עברית)</label>
                <Input value={plan.badge_he || ''} onChange={(e) => updatePlan(plan.id, 'badge_he', e.target.value)} dir="rtl" placeholder="הכי פופולרי" />
              </div>
              <div>
                <label className="text-sm font-medium mb-1 block">Badge (English)</label>
                <Input value={plan.badge_en || ''} onChange={(e) => updatePlan(plan.id, 'badge_en', e.target.value)} placeholder="Most Popular" />
              </div>
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium mb-1 block">כפתור CTA (עברית)</label>
              <Input value={plan.cta_he} onChange={(e) => updatePlan(plan.id, 'cta_he', e.target.value)} dir="rtl" />
            </div>
            <div>
              <label className="text-sm font-medium mb-1 block">CTA Button (English)</label>
              <Input value={plan.cta_en} onChange={(e) => updatePlan(plan.id, 'cta_en', e.target.value)} />
            </div>
          </div>

          {/* Features */}
          <div>
            <label className="text-sm font-medium mb-2 block">פיצ'רים</label>
            <div className="space-y-2">
              {plan.features_he.map((feat, idx) => (
                <div key={idx} className="flex items-center gap-2">
                  <Input
                    value={feat}
                    onChange={(e) => updateFeature(plan.id, 'he', idx, e.target.value)}
                    placeholder="פיצ'ר בעברית"
                    dir="rtl"
                    className="flex-1"
                  />
                  <Input
                    value={plan.features_en[idx] || ''}
                    onChange={(e) => updateFeature(plan.id, 'en', idx, e.target.value)}
                    placeholder="Feature in English"
                    className="flex-1"
                  />
                  <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive shrink-0" onClick={() => removeFeature(plan.id, idx)}>
                    <X className="w-3.5 h-3.5" />
                  </Button>
                </div>
              ))}
            </div>
            <Button variant="outline" size="sm" className="mt-2" onClick={() => addFeature(plan.id)}>
              <Plus className="w-3.5 h-3.5 ml-1" /> הוסיפי פיצ'ר
            </Button>
          </div>
        </div>
      ))}

      {/* Sticky Save */}
      <div className="sticky bottom-6 flex justify-start">
        <Button
          className="bg-accent text-accent-foreground hover:bg-accent/90 h-12 px-8 text-base shadow-lg"
          onClick={saveAll}
          disabled={saving}
        >
          <Save className="w-4 h-4 ml-2" />
          {saving ? 'שומר...' : 'שמור שינויים'}
        </Button>
      </div>
    </div>
  );
}
