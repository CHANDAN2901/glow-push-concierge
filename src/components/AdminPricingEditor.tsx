import { useState, useEffect, useMemo } from 'react';
import { Save, Plus, X, CreditCard } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { usePricingPlans, useInvalidatePricingPlans, type PricingPlan } from '@/hooks/usePricingPlans';
import {
  useMasterPricingFeatures,
  useInvalidatePricingFeatureBank,
  type PricingFeature,
} from '@/hooks/usePricingFeatureBank';
import { FEATURES } from '@/lib/subscriptionConfig';
import { getAccessToken, restDeleteWhere, restInsert, restSelect } from '@/lib/supabase-rest';

interface PlanFeatureLinkInsert {
  plan_id: string;
  feature_id: string;
}

function featureLabel(key: string, feature?: PricingFeature): string {
  if (feature) {
    const he = feature.name_he?.trim() || key;
    const en = feature.name_en?.trim() || key;
    return `${he} / ${en}`;
  }

  const feat = FEATURES.find((f) => f.id === key);
  return feat ? `${feat.name.he} / ${feat.name.en}` : key;
}

export default function AdminPricingEditor() {
  const { toast } = useToast();
  const { data: fetchedPlans = [], isLoading: loading } = usePricingPlans();
  const { data: masterFeatures = [], isLoading: loadingFeatureBank } = useMasterPricingFeatures();
  const invalidatePlans = useInvalidatePricingPlans();
  const invalidateFeatureBank = useInvalidatePricingFeatureBank();

  const [plans, setPlans] = useState<PricingPlan[]>([]);
  const [saving, setSaving] = useState(false);

  const featureByKey = useMemo(
    () => new Map(masterFeatures.map((feature) => [feature.key, feature])),
    [masterFeatures]
  );

  useEffect(() => {
    setPlans(fetchedPlans);
  }, [fetchedPlans]);

  const updatePlan = (id: string, field: keyof PricingPlan, value: any) => {
    setPlans((prev) => prev.map((p) => (p.id === id ? { ...p, [field]: value } : p)));
  };

  const updateFeature = (planId: string, lang: 'en' | 'he', idx: number, value: string) => {
    setPlans((prev) =>
      prev.map((p) => {
        if (p.id !== planId) return p;
        const key = lang === 'en' ? 'features_en' : 'features_he';
        const arr = [...p[key]];
        arr[idx] = value;
        return { ...p, [key]: arr };
      })
    );
  };

  const addFeature = (planId: string) => {
    setPlans((prev) =>
      prev.map((p) => {
        if (p.id !== planId) return p;
        return {
          ...p,
          features_en: [...p.features_en, ''],
          features_he: [...p.features_he, ''],
        };
      })
    );
  };

  const removeFeature = (planId: string, idx: number) => {
    setPlans((prev) =>
      prev.map((p) => {
        if (p.id !== planId) return p;
        return {
          ...p,
          features_en: p.features_en.filter((_, i) => i !== idx),
          features_he: p.features_he.filter((_, i) => i !== idx),
        };
      })
    );
  };

  /** M:N link add: only link feature to current plan */
  const addFeatureKey = (planId: string, key: string) => {
    setPlans((prev) =>
      prev.map((p) => {
        if (p.id !== planId) return p;
        if ((p.feature_keys || []).includes(key)) return p;
        return { ...p, feature_keys: [...(p.feature_keys || []), key] };
      })
    );
  };

  /** M:N unlink: removes relation only, never from master feature bank */
  const removeFeatureKey = (planId: string, key: string) => {
    setPlans((prev) =>
      prev.map((p) => {
        if (p.id !== planId) return p;
        return { ...p, feature_keys: (p.feature_keys || []).filter((k) => k !== key) };
      })
    );
  };

  const saveAll = async () => {
    setSaving(true);
    let hasError = false;

    try {
      const accessToken = getAccessToken() || undefined;

      // Ensure any custom keys are restored to the immutable master bank
      const currentFeatureIdByKey = new Map(masterFeatures.map((f) => [f.key, f.id]));
      const missingKeys = Array.from(
        new Set(
          plans
            .flatMap((plan) => plan.feature_keys || [])
            .filter((key) => !currentFeatureIdByKey.has(key))
        )
      );

      let featuresForSave = masterFeatures;
      if (missingKeys.length > 0) {
        await restInsert(
          'pricing_features',
          missingKeys.map((key) => ({
            key,
            name_en: key,
            name_he: key,
            is_active: true,
          })),
          accessToken
        );

        featuresForSave = await restSelect<PricingFeature>(
          'pricing_features',
          'select=id,key,name_en,name_he,is_active&order=key.asc',
          accessToken
        );
      }

      const featureIdByKey = new Map(featuresForSave.map((feature) => [feature.key, feature.id]));

      // 1) Save tier metadata
      await Promise.all(
        plans.map(async (plan) => {
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
              original_price_monthly: plan.original_price_monthly,
              original_price_usd: plan.original_price_usd,
            } as any)
            .eq('id', plan.id);

          if (error) throw error;
        })
      );

      // 2) Save M:N links (unlink + relink per plan)
      await Promise.all(
        plans.map(async (plan) => {
          await restDeleteWhere('pricing_plan_features', `plan_id=eq.${plan.id}`, accessToken);

          const rows: PlanFeatureLinkInsert[] = (plan.feature_keys || [])
            .map((key) => {
              const featureId = featureIdByKey.get(key);
              if (!featureId) return null;
              return { plan_id: plan.id, feature_id: featureId };
            })
            .filter((row): row is PlanFeatureLinkInsert => !!row);

          if (rows.length > 0) {
            await restInsert('pricing_plan_features', rows, accessToken);
          }
        })
      );

      await Promise.all([invalidatePlans(), invalidateFeatureBank()]);
    } catch (error) {
      hasError = true;
      console.error('Failed to save pricing M:N data:', error);
    } finally {
      setSaving(false);
    }

    toast({
      title: hasError ? 'שגיאה בשמירה' : 'החבילות עודכנו בהצלחה! ✨',
      variant: hasError ? 'destructive' : 'default',
    });
  };

  if (loading || loadingFeatureBank) {
    return <div className="text-center py-12 text-muted-foreground">טוען חבילות...</div>;
  }

  return (
    <div className="space-y-6 max-w-4xl relative pb-20" dir="rtl">
      <div className="flex items-center gap-2 mb-2">
        <CreditCard className="w-5 h-5 text-accent" />
        <h2 className="font-serif font-semibold text-lg">ניהול חבילות ומחירים</h2>
      </div>
      <p className="text-sm text-muted-foreground">
        עדכני את שמות החבילות, המחירים והפיצ׳רים. הפיצ׳רים המערכתיים מנוהלים כעת כמסד Master קבוע + קישורי Tier.
      </p>

      {plans.map((plan) => {
        const planKeys = plan.feature_keys || [];

        return (
          <div
            key={plan.id}
            className={`bg-card border rounded-xl p-6 space-y-4 ${plan.is_highlighted ? 'border-accent shadow-gold' : 'border-border'}`}
          >
            <div className="flex items-center justify-between">
              <h3 className="font-serif font-bold text-lg">{plan.name_he || plan.name_en}</h3>
              <div className="flex items-center gap-2 text-sm">
                <span className="text-muted-foreground">מודגשת</span>
                <Switch checked={plan.is_highlighted} onCheckedChange={(v) => updatePlan(plan.id, 'is_highlighted', v)} />
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
                <Input
                  type="number"
                  value={plan.price_monthly}
                  onChange={(e) => updatePlan(plan.id, 'price_monthly', Number(e.target.value))}
                />
              </div>
              <div>
                <label className="text-sm font-medium mb-1 block">Price USD ($)</label>
                <Input
                  type="number"
                  value={plan.price_usd}
                  onChange={(e) => updatePlan(plan.id, 'price_usd', Number(e.target.value))}
                />
              </div>
              <div>
                <label className="text-sm font-medium mb-1 block">💰 מחיר מקורי / מחוק (₪)</label>
                <Input
                  type="number"
                  value={plan.original_price_monthly}
                  onChange={(e) => updatePlan(plan.id, 'original_price_monthly', Number(e.target.value))}
                  placeholder="199"
                />
              </div>
              <div>
                <label className="text-sm font-medium mb-1 block">💰 Original Price USD ($)</label>
                <Input
                  type="number"
                  value={plan.original_price_usd}
                  onChange={(e) => updatePlan(plan.id, 'original_price_usd', Number(e.target.value))}
                  placeholder="59"
                />
              </div>
              <div>
                <label className="text-sm font-medium mb-1 block">סדר תצוגה</label>
                <Input
                  type="number"
                  value={plan.sort_order}
                  onChange={(e) => updatePlan(plan.id, 'sort_order', Number(e.target.value))}
                />
              </div>
              {plan.slug === 'vip-3year' && (
                <div>
                  <label className="text-sm font-medium mb-1 block">🔥 סה״כ מקומות פרומו</label>
                  <Input
                    type="number"
                    value={plan.total_promo_spots}
                    onChange={(e) => updatePlan(plan.id, 'total_promo_spots', Number(e.target.value))}
                    placeholder="50"
                  />
                </div>
              )}
            </div>

            {plan.is_highlighted && (
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium mb-1 block">תגית (עברית)</label>
                  <Input
                    value={plan.badge_he || ''}
                    onChange={(e) => updatePlan(plan.id, 'badge_he', e.target.value)}
                    dir="rtl"
                    placeholder="הכי פופולרי"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium mb-1 block">Badge (English)</label>
                  <Input
                    value={plan.badge_en || ''}
                    onChange={(e) => updatePlan(plan.id, 'badge_en', e.target.value)}
                    placeholder="Most Popular"
                  />
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

            {/* Feature Keys (M:N linkage) */}
            <div>
              <label className="text-sm font-medium mb-2 block">🔑 פיצ׳רים מערכתיים (Master Feature Bank)</label>
              <p className="text-xs text-muted-foreground mb-2">
                הסרה מנתקת את הקשר לחבילה בלבד — לא מוחקת את הפיצ׳ר מהמערכת.
              </p>
              <div className="flex flex-wrap gap-2 mb-2">
                {planKeys.map((key) => (
                  <span
                    key={`${plan.id}-${key}`}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold bg-accent/15 text-accent border border-accent/30"
                  >
                    {featureLabel(key, featureByKey.get(key))}
                    <button onClick={() => removeFeatureKey(plan.id, key)} className="hover:text-destructive transition-colors">
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                ))}
              </div>

              <Select onValueChange={(val) => addFeatureKey(plan.id, val)}>
                <SelectTrigger className="w-72 h-9 text-sm">
                  <SelectValue placeholder="הוסיפי פיצ׳ר ממאגר ה-Master..." />
                </SelectTrigger>
                <SelectContent>
                  {masterFeatures.map((feature) => {
                    const alreadyLinked = planKeys.includes(feature.key);
                    return (
                      <SelectItem key={feature.key} value={feature.key} disabled={alreadyLinked}>
                        {featureLabel(feature.key, feature)}{alreadyLinked ? ' (כבר משויך)' : ''}
                      </SelectItem>
                    );
                  })}
                </SelectContent>
              </Select>
            </div>

            {/* Display Features (marketing copy) */}
            <div>
              <label className="text-sm font-medium mb-2 block">📝 פיצ׳רים לתצוגה (טקסט שיווקי)</label>
              <div className="space-y-2">
                {plan.features_he.map((feat, idx) => (
                  <div key={idx} className="flex items-center gap-2">
                    <Input
                      value={feat}
                      onChange={(e) => updateFeature(plan.id, 'he', idx, e.target.value)}
                      placeholder="פיצ׳ר בעברית"
                      dir="rtl"
                      className="flex-1"
                    />
                    <Input
                      value={plan.features_en[idx] || ''}
                      onChange={(e) => updateFeature(plan.id, 'en', idx, e.target.value)}
                      placeholder="Feature in English"
                      className="flex-1"
                    />
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-destructive shrink-0"
                      onClick={() => removeFeature(plan.id, idx)}
                    >
                      <X className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                ))}
              </div>
              <Button variant="outline" size="sm" className="mt-2" onClick={() => addFeature(plan.id)}>
                <Plus className="w-3.5 h-3.5 ml-1" /> הוסיפי טקסט תצוגה
              </Button>
            </div>
          </div>
        );
      })}

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
