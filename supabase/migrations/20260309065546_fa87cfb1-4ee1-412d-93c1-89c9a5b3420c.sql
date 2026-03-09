
CREATE TABLE public.user_feedback (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  topic TEXT NOT NULL,
  message TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.user_feedback ENABLE ROW LEVEL SECURITY;

-- Anyone can insert feedback (no auth required for accessibility)
CREATE POLICY "Anyone can insert feedback"
  ON public.user_feedback
  FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

-- Only admins can view feedback
CREATE POLICY "Admins can view all feedback"
  ON public.user_feedback
  FOR SELECT
  TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role));

-- Only admins can delete feedback
CREATE POLICY "Admins can delete feedback"
  ON public.user_feedback
  FOR DELETE
  TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role));
