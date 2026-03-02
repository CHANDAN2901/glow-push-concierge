-- Drop the overly permissive policy
DROP POLICY "Anyone can update client push_opted_in" ON public.clients;

-- Create a more targeted approach using a security definer function
CREATE OR REPLACE FUNCTION public.mark_client_push_opted_in(p_client_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.clients SET push_opted_in = true WHERE id = p_client_id;
END;
$$;
