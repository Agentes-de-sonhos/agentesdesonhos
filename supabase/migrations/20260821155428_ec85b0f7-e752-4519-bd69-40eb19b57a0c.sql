-- Impede auto-aprovação em community_members
CREATE OR REPLACE FUNCTION public.guard_community_member_status()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- service_role / operações internas (sem usuário autenticado) e admins passam
  IF auth.uid() IS NULL OR public.has_role(auth.uid(), 'admin'::app_role) THEN
    RETURN NEW;
  END IF;

  IF TG_OP = 'INSERT' THEN
    IF NEW.status IS NULL OR NEW.status <> 'approved_unverified' THEN
      NEW.status := 'approved_unverified';
    END IF;
    RETURN NEW;
  END IF;

  IF NEW.status IS DISTINCT FROM OLD.status THEN
    RAISE EXCEPTION 'Somente administradores podem alterar o status da associação';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_guard_community_member_status ON public.community_members;
CREATE TRIGGER trg_guard_community_member_status
BEFORE INSERT OR UPDATE ON public.community_members
FOR EACH ROW EXECUTE FUNCTION public.guard_community_member_status();

-- Impede fornecedor de aprovar/publicar a própria operadora
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
    NEW.approval_status := COALESCE(
      (SELECT column_default FROM information_schema.columns
        WHERE table_schema = 'public' AND table_name = 'tour_operators'
          AND column_name = 'approval_status' AND false),
      'pending'
    );
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

DROP TRIGGER IF EXISTS trg_guard_tour_operator_approval ON public.tour_operators;
CREATE TRIGGER trg_guard_tour_operator_approval
BEFORE INSERT OR UPDATE ON public.tour_operators
FOR EACH ROW EXECUTE FUNCTION public.guard_tour_operator_approval();

-- Impede guia de se aprovar/verificar/destacar
CREATE OR REPLACE FUNCTION public.guard_tour_guide_review()
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
    NEW.status := 'pending';
    NEW.is_verified := false;
    NEW.is_featured := false;
    NEW.search_priority := 0;
    RETURN NEW;
  END IF;

  IF NEW.status IS DISTINCT FROM OLD.status
     OR NEW.is_verified IS DISTINCT FROM OLD.is_verified
     OR NEW.is_featured IS DISTINCT FROM OLD.is_featured
     OR NEW.search_priority IS DISTINCT FROM OLD.search_priority THEN
    RAISE EXCEPTION 'Somente administradores podem alterar status, verificação ou destaque';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_guard_tour_guide_review ON public.tour_guides;
CREATE TRIGGER trg_guard_tour_guide_review
BEFORE INSERT OR UPDATE ON public.tour_guides
FOR EACH ROW EXECUTE FUNCTION public.guard_tour_guide_review();