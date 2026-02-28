
-- Allow users to delete their own profile (needed for account deletion via edge function service role, but also allow RLS)
CREATE POLICY "Users can delete own profile"
ON public.profiles
FOR DELETE
USING (auth.uid() = user_id);

-- Allow users to delete own user_roles
CREATE POLICY "Users can delete own roles"
ON public.user_roles
FOR DELETE
USING (auth.uid() = user_id);

-- Allow admins to delete referrals
CREATE POLICY "Admins can delete referrals"
ON public.referrals
FOR DELETE
USING (has_role(auth.uid(), 'admin'::app_role));

-- Add medical/SMS consent column to health_declarations
ALTER TABLE public.health_declarations
ADD COLUMN IF NOT EXISTS medical_consent_at timestamptz DEFAULT NULL;
