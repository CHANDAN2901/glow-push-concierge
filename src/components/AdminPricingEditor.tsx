import { useState, useEffect, useMemo } from 'react';
import { Save, Plus, X, CreditCard, EyeOff, Eye, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useAllPricingPlans, useInvalidatePricingPlans, type PricingPlan } from '@/hooks/usePricingPlans';
import {
  useMasterPricingFeatures,
  useInvalidatePricingFeatureBank,
  type PricingFeature,
} from '@/hooks/usePricingFeatureBank';
import { FEATURES } from '@/lib/subscriptionConfig';
import { getAccessToken, restDeleteWhere, restInsert, restSelect } from '@/lib/supabase-rest';
import { useI18n } from '@/lib/i18n';

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

function generateSlug(): string {
  return `plan-${Date.now()}`;
}

export default function AdminPricingEditor() {
  const { lang } = useI18n();
  const { toast } = useToast();
  const isHe = lang === 'he';
  const { data: fetchedPlans = [], isLoading: loading } = useAllPricingPlans();
  const { data: masterFeatures = [], isLoading: loadingFeatureBank } = useMasterPricingFeatures();
  const invalidatePlans = useInvalidatePricingPlans();
  const invalidateFeatureBank = useInvalidatePricingFeatureBank();

  const [plans, setPlans] = useState<PricingPlan[]>([]);
  const [newPlanIds, setNewPlanIds] = useState<Set<string>>(new Set());
  const [saving, setSaving] = useState(false);

  const featureByKey = useMemo(
    () => new Map(masterFeatures.map((feature) => [feature.key, feature])),
    [masterFeatures]
  );

  useEffect(() => {
    setPlans(fetchedPlans);
  }, [fetchedPlans]);

  const updatePlan = (id: string, field: keyof PricingPlan, value: PricingPlan[keyof PricingPlan]) => {
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
        return { ...p, features_en: [...p.features_en, ''], features_he: [...p.features_he, ''] };
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

  const addFeatureKey = (planId: string, key: string) => {
    setPlans((prev) =>
      prev.map((p) => {
        if (p.id !== planId) return p;
        if ((p.feature_keys || []).includes(key)) return p;
        return { ...p, feature_keys: [...(p.feature_keys || []), key] };
      })
    );
  };

  const removeFeatureKey = (planId: string, key: string) => {
    setPlans((prev) =>
      prev.map((p) => {
        if (p.id !== planId) return p;
        return { ...p, feature_keys: (p.feature_keys || []).filter((k) => k !== key) };
      })
    );
  };

  const addNewPlan = () => {
    const tempId = `new-${Date.now()}`;
    const newPlan: PricingPlan = {
      id: tempId,
      slug: generateSlug(),
      name_en: '',
      name_he: '',
      price_monthly: 0,
      price_usd: 0,
      original_price_monthly: 0,
      original_price_usd: 0,
      currency: 'ILS',
      is_highlighted: false,
      is_active: true,
      billing_period: 'monthly',
      subscription_tier: null,
      ls_variant_id_test: null,
      ls_variant_id_live: null,
      badge_en: null,
      badge_he: null,
      features_en: [],
      features_he: [],
      feature_keys: [],
      cta_en: 'Get Started',
      cta_he: 'התחילי',
      sort_order: plans.length,
      total_promo_spots: 0,
      stripe_price_id: null,
    };
    setPlans((prev) => [...prev, newPlan]);
    setNewPlanIds((prev) => new Set([...prev, tempId]));
  };

  const saveAll = async () => {
    setSaving(true);
    let hasError = false;

    try {
      const accessToken = getAccessToken() || undefined;

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
          missingKeys.map((key) => ({ key, name_en: key, name_he: key, is_active: true })),
          accessToken
        );
        featuresForSave = await restSelect<PricingFeature>(
          'pricing_features',
          'select=id,key,name_en,name_he,is_active&order=key.asc',
          accessToken
        );
      }

      const featureIdByKey = new Map(featuresForSave.map((feature) => [feature.key, feature.id]));

      for (const plan of plans) {
        const payload = {
          name_en: plan.name_en,
          name_he: plan.name_he,
          slug: plan.slug,
          price_monthly: plan.price_monthly,
          price_usd: plan.price_usd,
          is_highlighted: plan.is_highlighted,
          is_active: plan.is_active,
          billing_period: plan.billing_period,
          subscription_tier: plan.subscription_tier,
          ls_variant_id_test: plan.ls_variant_id_test,
          ls_variant_id_live: plan.ls_variant_id_live,
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
        };

        if (newPlanIds.has(plan.id)) {
          const { error } = await supabase.from('pricing_plans').insert(payload);
          if (error) throw error;
        } else {
          const { error } = await supabase
            .from('pricing_plans')
            .update(payload)
            .eq('id', plan.id);
          if (error) throw error;
        }
      }

      // Re-fetch to get real IDs for newly inserted plans
      const { data: savedPlans } = await supabase
        .from('pricing_plans')
        .select('id, slug')
        .order('sort_order');

      const slugToId = new Map((savedPlans || []).map((p) => [p.slug, p.id]));

      await Promise.all(
        plans.map(async (plan) => {
          const realId = newPlanIds.has(plan.id) ? slugToId.get(plan.slug) : plan.id;
          if (!realId) return;

          await restDeleteWhere('pricing_plan_features', `plan_id=eq.${realId}`, accessToken);

          const rows: PlanFeatureLinkInsert[] = (plan.feature_keys || [])
            .map((key) => {
              const featureId = featureIdByKey.get(key);
              if (!featureId) return null;
              return { plan_id: realId, feature_id: featureId };
            })
            .filter((row): row is PlanFeatureLinkInsert => !!row);

          if (rows.length > 0) {
            await restInsert('pricing_plan_features', rows, accessToken);
          }
        })
      );

      setNewPlanIds(new Set());
      await Promise.all([invalidatePlans(), invalidateFeatureBank()]);
    } catch (error) {
      hasError = true;
      console.error('Failed to save pricing data:', error);
    } finally {
      setSaving(false);
    }

    toast({
      title: hasError
        ? (isHe ? 'שגיאה בשמירה' : 'Save failed')
        : (isHe ? 'החבילות עודכנו בהצלחה! ✨' : 'Plans updated successfully! ✨'),
      variant: hasError ? 'destructive' : 'default',
    });
  };

  if (loading || loadingFeatureBank) {
    return <div className="text-center py-12 text-muted-foreground">{isHe ? 'טוען חבילות...' : 'Loading plans...'}</div>;
  }

  return (
    <div className="space-y-6 max-w-4xl relative pb-20" dir={isHe ? 'rtl' : 'ltr'}>
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <CreditCard className="w-5 h-5 text-accent" />
          <h2 className="font-serif font-semibold text-lg">{isHe ? 'ניהול חבילות ומחירים' : 'Manage Plans & Pricing'}</h2>
        </div>
        <Button variant="outline" size="sm" onClick={addNewPlan} className="gap-1.5">
          <Plus className="w-3.5 h-3.5" />
          {isHe ? 'חבילה חדשה' : 'New Plan'}
        </Button>
      </div>
      <p className="text-sm text-muted-foreground">
        {isHe
          ? 'כל החבילות מנוהלות כאן — פעילות ולא פעילות. חבילה לא פעילה נסתרת מהמשתמשים אך לא נמחקת.'
          : 'All plans are managed here — active and inactive. Inactive plans are hidden from users but not deleted.'}
      </p>

      {plans.map((plan) => {
        const planKeys = plan.feature_keys || [];
        const isNew = newPlanIds.has(plan.id);

        return (
          <div
            key={plan.id}
            className={`bg-card border rounded-xl p-6 space-y-4 ${
              !plan.is_active
                ? 'border-border opacity-60'
                : plan.is_highlighted
                ? 'border-accent shadow-gold'
                : 'border-border'
            }`}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <h3 className="font-serif font-bold text-lg">
                  {isHe ? (plan.name_he || plan.name_en) : (plan.name_en || plan.name_he)}
                  {isNew && (
                    <span className="ml-2 text-xs font-normal text-accent bg-accent/10 px-2 py-0.5 rounded-full">
                      {isHe ? 'חדש' : 'New'}
                    </span>
                  )}
                </h3>
                {!plan.is_active && (
                  <span className="text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded-full">
                    {isHe ? 'מוסתר' : 'Hidden'}
                  </span>
                )}
              </div>
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-2 text-sm">
                  <span className="text-muted-foreground">{isHe ? 'מודגשת' : 'Highlighted'}</span>
                  <Switch checked={plan.is_highlighted} onCheckedChange={(v) => updatePlan(plan.id, 'is_highlighted', v)} />
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8"
                  title={plan.is_active ? (isHe ? 'הסתר חבילה' : 'Hide plan') : (isHe ? 'הצג חבילה' : 'Restore plan')}
                  onClick={() => updatePlan(plan.id, 'is_active', !plan.is_active)}
                >
                  {plan.is_active ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4 text-accent" />}
                </Button>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium mb-1 block">שם (עברית)</label>
                <Input value={plan.name_he} onChange={(e) => updatePlan(plan.id, 'name_he', e.target.value)} dir="rtl" />
              </div>
              <div>
                <label className="text-sm font-medium mb-1 block">{isHe ? 'שם (אנגלית)' : 'Name (English)'}</label>
                <Input value={plan.name_en} onChange={(e) => updatePlan(plan.id, 'name_en', e.target.value)} />
              </div>
              <div>
                <label className="text-sm font-medium mb-1 block">{isHe ? 'מזהה (Slug)' : 'Slug (ID)'}</label>
                <Input
                  value={plan.slug}
                  onChange={(e) => updatePlan(plan.id, 'slug', e.target.value)}
                  placeholder="e.g. pro-monthly"
                  className="font-mono text-xs"
                />
              </div>
              <div>
                <label className="text-sm font-medium mb-1 block">{isHe ? 'סדר תצוגה' : 'Display Order'}</label>
                <Input
                  type="number"
                  value={plan.sort_order}
                  onChange={(e) => updatePlan(plan.id, 'sort_order', Number(e.target.value))}
                />
              </div>
              <div>
                <label className="text-sm font-medium mb-1 block">{isHe ? 'מחיר (₪)' : 'Price (₪)'}</label>
                <Input
                  type="number"
                  value={plan.price_monthly}
                  onChange={(e) => updatePlan(plan.id, 'price_monthly', Number(e.target.value))}
                />
              </div>
              <div>
                <label className="text-sm font-medium mb-1 block">{isHe ? 'מחיר ($)' : 'Price ($)'}</label>
                <Input
                  type="number"
                  value={plan.price_usd}
                  onChange={(e) => updatePlan(plan.id, 'price_usd', Number(e.target.value))}
                />
              </div>
              <div>
                <label className="text-sm font-medium mb-1 block">{isHe ? 'מחיר מקורי / מחוק (₪)' : 'Original / Strikethrough Price (₪)'}</label>
                <Input
                  type="number"
                  value={plan.original_price_monthly}
                  onChange={(e) => updatePlan(plan.id, 'original_price_monthly', Number(e.target.value))}
                  placeholder="199"
                />
              </div>
              <div>
                <label className="text-sm font-medium mb-1 block">{isHe ? 'מחיר מקורי / מחוק ($)' : 'Original Price ($)'}</label>
                <Input
                  type="number"
                  value={plan.original_price_usd}
                  onChange={(e) => updatePlan(plan.id, 'original_price_usd', Number(e.target.value))}
                  placeholder="59"
                />
              </div>

              {/* Billing period */}
              <div>
                <label className="text-sm font-medium mb-1 block">{isHe ? 'תדירות חיוב' : 'Billing Period'}</label>
                <Select
                  value={plan.billing_period}
                  onValueChange={(v) => updatePlan(plan.id, 'billing_period', v as PricingPlan['billing_period'])}
                >
                  <SelectTrigger className="h-9 text-sm">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="monthly">{isHe ? 'חודשי' : 'Monthly'}</SelectItem>
                    <SelectItem value="yearly">{isHe ? 'שנתי' : 'Yearly'}</SelectItem>
                    <SelectItem value="one_time">{isHe ? 'תשלום חד-פעמי' : 'One-time'}</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Subscription tier */}
              <div>
                <label className="text-sm font-medium mb-1 block">{isHe ? 'רמת גישה (Tier)' : 'Access Tier'}</label>
                <Select
                  value={plan.subscription_tier || ''}
                  onValueChange={(v) => updatePlan(plan.id, 'subscription_tier', v || null)}
                >
                  <SelectTrigger className="h-9 text-sm">
                    <SelectValue placeholder={isHe ? 'בחרי רמה...' : 'Select tier...'} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="lite">Lite (Free)</SelectItem>
                    <SelectItem value="professional">Professional (Elite)</SelectItem>
                    <SelectItem value="master">Master (VIP)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Promo spots for yearly plans */}
              {plan.billing_period === 'yearly' && (
                <div>
                  <label className="text-sm font-medium mb-1 block">{isHe ? '🔥 סה״כ מקומות פרומו' : '🔥 Total Promo Spots'}</label>
                  <Input
                    type="number"
                    value={plan.total_promo_spots}
                    onChange={(e) => updatePlan(plan.id, 'total_promo_spots', Number(e.target.value))}
                    placeholder="50"
                  />
                </div>
              )}
            </div>

            {/* Lemon Squeezy Variant IDs */}
            <div className="grid grid-cols-2 gap-4 p-4 rounded-xl bg-yellow-50 border border-yellow-200">
              <div className="col-span-2">
                <p className="text-xs font-semibold text-yellow-700 mb-2">🍋 Lemon Squeezy Variant IDs</p>
              </div>
              <div>
                <label className="text-sm font-medium mb-1 block text-yellow-800">{isHe ? 'Variant ID — בדיקה (Test)' : 'Variant ID — Test'}</label>
                <Input
                  value={plan.ls_variant_id_test || ''}
                  onChange={(e) => updatePlan(plan.id, 'ls_variant_id_test', e.target.value || null)}
                  placeholder="123456"
                  className="font-mono text-xs"
                />
              </div>
              <div>
                <label className="text-sm font-medium mb-1 block text-yellow-800">{isHe ? 'Variant ID — ייצור (Live)' : 'Variant ID — Live'}</label>
                <Input
                  value={plan.ls_variant_id_live || ''}
                  onChange={(e) => updatePlan(plan.id, 'ls_variant_id_live', e.target.value || null)}
                  placeholder="789012"
                  className="font-mono text-xs"
                />
              </div>
            </div>

            {plan.is_highlighted && (
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium mb-1 block">{isHe ? 'תגית (עברית)' : 'Badge (Hebrew)'}</label>
                  <Input
                    value={plan.badge_he || ''}
                    onChange={(e) => updatePlan(plan.id, 'badge_he', e.target.value)}
                    dir="rtl"
                    placeholder={isHe ? 'הכי פופולרי' : 'Most Popular in Hebrew'}
                  />
                </div>
                <div>
                  <label className="text-sm font-medium mb-1 block">{isHe ? 'תגית (אנגלית)' : 'Badge (English)'}</label>
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
                <label className="text-sm font-medium mb-1 block">{isHe ? 'כפתור CTA (עברית)' : 'CTA Button (Hebrew)'}</label>
                <Input value={plan.cta_he} onChange={(e) => updatePlan(plan.id, 'cta_he', e.target.value)} dir="rtl" />
              </div>
              <div>
                <label className="text-sm font-medium mb-1 block">{isHe ? 'כפתור CTA (אנגלית)' : 'CTA Button (English)'}</label>
                <Input value={plan.cta_en} onChange={(e) => updatePlan(plan.id, 'cta_en', e.target.value)} />
              </div>
            </div>

            {/* Feature Keys (M:N linkage) */}
            <div>
              <label className="text-sm font-medium mb-2 block">{isHe ? '🔑 פיצ׳רים מערכתיים' : '🔑 System Features'}</label>
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
                  <SelectValue placeholder={isHe ? 'הוסיפי פיצ׳ר...' : 'Add a feature...'} />
                </SelectTrigger>
                <SelectContent>
                  {masterFeatures.map((feature) => {
                    const alreadyLinked = planKeys.includes(feature.key);
                    return (
                      <SelectItem key={feature.key} value={feature.key} disabled={alreadyLinked}>
                        {featureLabel(feature.key, feature)}{alreadyLinked ? (isHe ? ' (כבר משויך)' : ' (linked)') : ''}
                      </SelectItem>
                    );
                  })}
                </SelectContent>
              </Select>
            </div>

            {/* Display Features (marketing copy) */}
            <div>
              <label className="text-sm font-medium mb-2 block">{isHe ? '📝 פיצ׳רים לתצוגה' : '📝 Display Features (Marketing Copy)'}</label>
              <div className="space-y-2">
                {plan.features_he.map((feat, idx) => (
                  <div key={idx} className="flex items-center gap-2">
                    <Input
                      value={feat}
                      onChange={(e) => updateFeature(plan.id, 'he', idx, e.target.value)}
                      placeholder={isHe ? 'פיצ׳ר בעברית' : 'Feature in Hebrew'}
                      dir="rtl"
                      className="flex-1"
                    />
                    <Input
                      value={plan.features_en[idx] || ''}
                      onChange={(e) => updateFeature(plan.id, 'en', idx, e.target.value)}
                      placeholder={isHe ? 'פיצ׳ר באנגלית' : 'Feature in English'}
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
                <Plus className="w-3.5 h-3.5 ml-1" /> {isHe ? 'הוסיפי טקסט תצוגה' : 'Add Display Text'}
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
          {saving ? (isHe ? 'שומר...' : 'Saving...') : (isHe ? 'שמור שינויים' : 'Save Changes')}
        </Button>
      </div>
    </div>
  );
}
