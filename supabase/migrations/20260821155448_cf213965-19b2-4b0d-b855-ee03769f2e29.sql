CREATE OR REPLACE FUNCTION public.guard_tour_operator_approval()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS NULL OR public.has_role(auth.uid(), 'admin'::app_role) THEN
    RETURN NEW;
  END IF;

  IF TG_OP = 'INSERT' THEN
    NEW.approval_status := 'pending';
    NEW.is_published := false;
    NEW.is_public_visible := false;
    RETURN NEW;
  END IF;

  IF NEW.approval_status IS DISTINCT FROM OLD.approval_status
     OR NEW.is_published IS DISTINCT FROM OLD.is_published
     OR NEW.is_public_visible IS DISTINCT FROM OLD.is_public_visible THEN
    RAISE EXCEPTION 'Somente administradores podem alterar aprovação ou visibilidade pública';
  END IF;
  RETURN NEW;
END;
$$;