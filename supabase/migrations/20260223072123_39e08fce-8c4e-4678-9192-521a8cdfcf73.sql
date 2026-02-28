
-- Create health_questions table for dynamic health declaration form
CREATE TABLE public.health_questions (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  question_he text NOT NULL,
  question_en text NOT NULL DEFAULT '',
  risk_level text NOT NULL DEFAULT 'green' CHECK (risk_level IN ('red', 'yellow', 'green')),
  icon text NOT NULL DEFAULT '❓',
  has_detail_field boolean NOT NULL DEFAULT false,
  detail_placeholder_he text DEFAULT '',
  detail_placeholder_en text DEFAULT '',
  sort_order integer NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.health_questions ENABLE ROW LEVEL SECURITY;

-- Anyone can view active questions (needed for public health form)
CREATE POLICY "Anyone can view active health questions"
  ON public.health_questions FOR SELECT
  USING (is_active = true);

-- Admins can view all questions
CREATE POLICY "Admins can view all health questions"
  ON public.health_questions FOR SELECT
  USING (has_role(auth.uid(), 'admin'::app_role));

-- Admins can insert
CREATE POLICY "Admins can insert health questions"
  ON public.health_questions FOR INSERT
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- Admins can update
CREATE POLICY "Admins can update health questions"
  ON public.health_questions FOR UPDATE
  USING (has_role(auth.uid(), 'admin'::app_role));

-- Admins can delete
CREATE POLICY "Admins can delete health questions"
  ON public.health_questions FOR DELETE
  USING (has_role(auth.uid(), 'admin'::app_role));

-- Trigger for updated_at
CREATE TRIGGER update_health_questions_updated_at
  BEFORE UPDATE ON public.health_questions
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Seed default questions
INSERT INTO public.health_questions (question_he, question_en, risk_level, icon, has_detail_field, detail_placeholder_he, detail_placeholder_en, sort_order) VALUES
  ('הריון או הנקה', 'Pregnancy or breastfeeding', 'red', '🤰', false, '', '', 1),
  ('אלרגיות', 'Allergies', 'yellow', '⚠️', true, 'פרטי אלרגיות...', 'Allergy details...', 2),
  ('מחלות כרוניות', 'Chronic diseases', 'red', '🏥', true, 'פרטי מחלות...', 'Disease details...', 3),
  ('רואקוטן (חצי שנה אחרונה)', 'Roaccutane (last 6 months)', 'red', '💊', false, '', '', 4),
  ('מדללי דם', 'Blood thinners', 'red', '🩸', false, '', '', 5),
  ('תרופות אחרות', 'Other medications', 'yellow', '💉', true, 'פרטי תרופות...', 'Medication details...', 6),
  ('בעיות עור (פסוריאזיס, אקזמה)', 'Skin conditions (psoriasis, eczema)', 'yellow', '🧴', false, '', '', 7),
  ('מחלות אוטואימוניות', 'Autoimmune diseases', 'red', '🛡️', false, '', '', 8),
  ('אנטיביוטיקה בשבועיים האחרונים', 'Antibiotics in the last 2 weeks', 'yellow', '💊', true, 'פרטי אנטיביוטיקה...', 'Antibiotic details...', 9),
  ('בוטוקס או חומצה היאלורונית בשבועיים האחרונים', 'Botox or hyaluronic acid in the last 2 weeks', 'yellow', '💉', false, '', '', 10),
  ('חוסר באנזים G6PD', 'G6PD enzyme deficiency', 'red', '🧬', false, '', '', 11),
  ('רגישות מיוחדת בעיניים, דלקות חוזרות או יובש קיצוני', 'Eye sensitivity, recurring infections, or extreme dryness', 'yellow', '👁️', false, '', '', 12);
