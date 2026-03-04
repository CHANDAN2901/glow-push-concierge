CREATE OR REPLACE FUNCTION public.save_client_referral_code(p_client_id uuid, p_code text)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  UPDATE public.clients
  SET referral_code = p_code
  WHERE id = p_client_id;
END;
$function$;