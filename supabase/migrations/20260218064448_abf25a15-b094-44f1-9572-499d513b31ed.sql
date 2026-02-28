
-- Healing phases managed by Super Admin
CREATE TABLE public.healing_phases (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  treatment_type text NOT NULL CHECK (treatment_type IN ('eyebrows', 'lips')),
  day_start integer NOT NULL,
  day_end integer NOT NULL,
  title_he text NOT NULL,
  title_en text NOT NULL,
  icon text NOT NULL DEFAULT '💧',
  severity text NOT NULL DEFAULT 'medium' CHECK (severity IN ('high', 'medium', 'low')),
  steps_he text[] NOT NULL DEFAULT '{}',
  steps_en text[] NOT NULL DEFAULT '{}',
  sort_order integer NOT NULL DEFAULT 0,
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE (treatment_type, day_start)
);

ALTER TABLE public.healing_phases ENABLE ROW LEVEL SECURITY;

-- Anyone authenticated can read
CREATE POLICY "Authenticated users can view healing phases"
  ON public.healing_phases FOR SELECT
  TO authenticated
  USING (true);

-- Also allow anonymous/public read for client view (clients aren't logged in)
CREATE POLICY "Public can view healing phases"
  ON public.healing_phases FOR SELECT
  TO anon
  USING (true);

-- Only admins can modify
CREATE POLICY "Admins can insert healing phases"
  ON public.healing_phases FOR INSERT
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can update healing phases"
  ON public.healing_phases FOR UPDATE
  USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can delete healing phases"
  ON public.healing_phases FOR DELETE
  USING (has_role(auth.uid(), 'admin'::app_role));

-- Seed with current hardcoded data: Eyebrows
INSERT INTO public.healing_phases (treatment_type, day_start, day_end, title_he, title_en, icon, severity, steps_he, steps_en, sort_order) VALUES
('eyebrows', 1, 3, 'ימים ראשונים — שמירה והרגעה 💧', 'Protection & Calm 💧', '💧', 'high',
 ARRAY['🧻 לספוג הפרשות בעדינות עם גזה נקייה.', '🧴 למרוח שכבה דקה מאוד של משחה.', '❌💧 אסור להרטיב את האזור במים זורמים!'],
 ARRAY['🧻 Gently blot secretions with clean gauze.', '🧴 Apply a very thin layer of ointment.', '❌💧 Do NOT wet the area with running water!'],
 1),
('eyebrows', 4, 10, 'שלב הקילופים — זהירות! 🛡️', 'Peeling Stage — Caution! 🛡️', '🛡️', 'high',
 ARRAY['❌ אסור לגרד או לקלף את הגלד (זה יתלוש פיגמנט!).', '🧴 להמשיך למרוח משחה כשהאזור יבש.', '👀 הצבע ייראה דהוי או מוזר — זה תקין לחלוטין.'],
 ARRAY['❌ Don''t scratch or peel the scab (it pulls pigment!)', '🧴 Keep applying ointment when the area is dry.', '👀 Color may look faded or odd — completely normal.'],
 2),
('eyebrows', 11, 20, 'שלב ה-Ghosting 👻', 'Ghosting Phase 👻', '👻', 'medium',
 ARRAY['👻 הצבע נראה כאילו נעלם? אל דאגה, הוא יחזור.', '🧼 אפשר לחזור לשטוף פנים כרגיל.', '❌☀️ עדיין להימנע משמש ישירה.'],
 ARRAY['👻 Color disappeared? Don''t worry, it''ll come back.', '🧼 You can go back to washing your face normally.', '❌☀️ Still avoid direct sunlight.'],
 3),
('eyebrows', 21, 30, 'החשיפה הסופית ✨', 'Final Result ✨', '✨', 'low',
 ARRAY['✨ הצבע מתייצב וחוזר לעצמו.', '📅 זה הזמן לקבוע תור לטאץ׳-אפ אם צריך.', '🎉 תיהני מהגבות החדשות שלך!'],
 ARRAY['✨ The color is stabilizing and coming back.', '📅 Time to book a touch-up if needed.', '🎉 Enjoy your new brows!'],
 4),

-- Seed: Lips
('lips', 1, 3, 'נפיחות והגנה 👄', 'Swelling & Protection 👄', '👄', 'high',
 ARRAY['💧 נפיחות היא נורמלית — היא תרד.', '🥤 שתי רק באמצעות קשית.', '🌶️❌ המנעי ממאכלים חמים או חריפים.'],
 ARRAY['💧 Swelling is normal — it will subside.', '🥤 Drink only through a straw.', '🌶️❌ Avoid hot or spicy foods.'],
 1),
('lips', 4, 7, 'שלב היובש — שמרי על לחות! 🧴', 'Dryness Phase — Keep Moist! 🧴', '🛡️', 'high',
 ARRAY['🧴 השפתיים ירגישו יבשות מאוד. מרחי משחה בקביעות.', '❌ אל תקלפי את העור!', '👀 הצבע עשוי להיראות כהה או לא אחיד — זה תקין.'],
 ARRAY['🧴 Lips will feel very dry — apply ointment regularly.', '❌ Do NOT peel or pick at the skin!', '👀 Color may look dark or uneven — this is normal.'],
 2),
('lips', 8, 14, 'קילוף ודהייה 👻', 'Peeling & Fading 👻', '👻', 'medium',
 ARRAY['👻 הקילוף מסתיים — הצבע עשוי להיראות בהיר מאוד.', '🧴 המשיכי ללחלח את השפתיים.', '💄❌ הימנעי משפתון או מוצרי שפתיים באזור.'],
 ARRAY['👻 Peeling is finishing — color may look very light.', '🧴 Continue moisturizing the lips.', '💄❌ Avoid lipstick or lip products on the area.'],
 3),
('lips', 15, 30, 'הצבע חוזר לעצמו ✨', 'Color Blooming ✨', '✨', 'low',
 ARRAY['✨ הצבע האמיתי חוזר בהדרגה.', '📅 קבעי תור לטאץ׳-אפ אם צריך.', '🎉 תיהני מהשפתיים החדשות שלך!'],
 ARRAY['✨ The true color is gradually returning.', '📅 Book a touch-up if needed.', '🎉 Enjoy your new lips!'],
 4);
