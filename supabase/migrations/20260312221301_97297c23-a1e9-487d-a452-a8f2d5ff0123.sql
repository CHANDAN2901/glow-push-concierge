
-- Master policy template (one row, managed by super admin)
CREATE TABLE public.clinic_policy_master (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  content_he text NOT NULL DEFAULT '',
  content_en text NOT NULL DEFAULT '',
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.clinic_policy_master ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage master policy" ON public.clinic_policy_master FOR ALL USING (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Anyone can read master policy" ON public.clinic_policy_master FOR SELECT TO anon USING (true);
CREATE POLICY "Authenticated can read master policy" ON public.clinic_policy_master FOR SELECT TO authenticated USING (true);

-- Artist-specific policy overrides
CREATE TABLE public.clinic_policies (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  artist_profile_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  content_he text NOT NULL DEFAULT '',
  content_en text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(artist_profile_id)
);

ALTER TABLE public.clinic_policies ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Artists can view own policy" ON public.clinic_policies FOR SELECT TO authenticated USING (artist_profile_id IN (SELECT id FROM profiles WHERE user_id = auth.uid()));
CREATE POLICY "Artists can insert own policy" ON public.clinic_policies FOR INSERT TO authenticated WITH CHECK (artist_profile_id IN (SELECT id FROM profiles WHERE user_id = auth.uid()));
CREATE POLICY "Artists can update own policy" ON public.clinic_policies FOR UPDATE TO authenticated USING (artist_profile_id IN (SELECT id FROM profiles WHERE user_id = auth.uid()));
CREATE POLICY "Admins can manage all policies" ON public.clinic_policies FOR ALL USING (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Anon can read policies" ON public.clinic_policies FOR SELECT TO anon USING (true);

-- Seed initial master template
INSERT INTO public.clinic_policy_master (content_he, content_en) VALUES (
'# מדיניות הקליניקה ותנאי שירות

## 🎯 לפני הטיפול
- יש להגיע עם עור נקי, ללא איפור באזור הטיפול
- יש להימנע משימוש בתכשירים מעל אזור הטיפול 48 שעות לפני
- יש לדווח על כל שינוי בריאותי / תרופות חדשות

## 💰 מדיניות מחירים
- מחיר הטיפול כולל פגישת תיקון אחת בתוך 45 יום
- תיקון לאחר 45 יום ועד 3 חודשים — בתשלום מופחת
- ריטאצ׳ אחרי 3 חודשים — מחיר מלא

## 🔄 ביטולים ודחיות
- ביטול עד 24 שעות לפני — ללא חיוב
- ביטול בהתראה קצרה יותר — חיוב של 50% מעלות הטיפול
- אי-הגעה ללא הודעה — חיוב מלא

## 🩹 אחריות ותיקונים
- תוצאות הטיפול תלויות בהקפדה על הוראות ההחלמה
- אין החזר כספי לאחר ביצוע הטיפול
- תיקונים מעבר לפגישת התיקון הכלולה — בתשלום נוסף

## 📱 יצירת קשר
- לשאלות או בעיות לאחר הטיפול — ניתן ליצור קשר בוואטסאפ
- זמני מענה: ימים א׳-ה׳, 09:00-18:00',

'# Clinic Policy & Terms of Service

## 🎯 Before Treatment
- Arrive with clean skin, no makeup on the treatment area
- Avoid products on the treatment area 48 hours before
- Report any health changes or new medications

## 💰 Pricing Policy
- Treatment price includes one touch-up within 45 days
- Touch-up after 45 days up to 3 months — reduced price
- Retouch after 3 months — full price

## 🔄 Cancellations & Rescheduling
- Cancellation up to 24 hours before — no charge
- Late cancellation — 50% charge
- No-show — full charge

## 🩹 Warranty & Touch-ups
- Results depend on following aftercare instructions
- No refunds after treatment
- Additional touch-ups beyond the included session — extra charge

## 📱 Contact
- For questions after treatment — contact via WhatsApp
- Response hours: Sun-Thu, 09:00-18:00'
);
