
CREATE OR REPLACE FUNCTION public.increment_promo_usage(promo_code_value TEXT)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  UPDATE promo_codes
  SET current_uses = current_uses + 1
  WHERE code = promo_code_value AND is_active = true;
END;
$$;
