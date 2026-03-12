
-- Convert subscription_tier from ENUM to TEXT to allow dynamic tier names
ALTER TABLE public.profiles 
  ALTER COLUMN subscription_tier TYPE TEXT USING subscription_tier::text;

-- Convert subscription_status from ENUM to TEXT as well for consistency
ALTER TABLE public.profiles 
  ALTER COLUMN subscription_status TYPE TEXT USING subscription_status::text;

-- Set defaults
ALTER TABLE public.profiles 
  ALTER COLUMN subscription_tier SET DEFAULT 'lite';
ALTER TABLE public.profiles 
  ALTER COLUMN subscription_status SET DEFAULT 'trial';
