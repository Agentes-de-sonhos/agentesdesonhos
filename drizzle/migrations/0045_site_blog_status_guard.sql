-- Status/versão publicada só mudam pelas funções editoriais SECURITY DEFINER (executadas como dono, não como authenticated/anon).
CREATE OR REPLACE FUNCTION public.site_blog_posts_guard()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
DECLARE v_cat text; v_client boolean := current_user IN ('authenticated','anon');
BEGIN
  IF TG_OP = 'INSERT' AND v_client THEN
    IF NEW.status <> 'draft' OR NEW.published IS NOT NULL OR NEW.scheduled IS NOT NULL
       OR NEW.published_at IS NOT NULL OR NEW.scheduled_at IS NOT NULL THEN
      RAISE EXCEPTION 'Novos artigos começam como rascunho.';
    END IF;
  END IF;
  IF TG_OP = 'UPDATE' THEN
    IF NEW.agency_id <> OLD.agency_id THEN RAISE EXCEPTION 'Agência não pode ser alterada.'; END IF;
    IF NEW.slug <> OLD.slug AND OLD.published_at IS NOT NULL THEN
      RAISE EXCEPTION 'O endereço de um artigo já publicado não pode ser alterado.';
    END IF;
    IF v_client AND (
      NEW.status IS DISTINCT FROM OLD.status OR NEW.published IS DISTINCT FROM OLD.published
      OR NEW.published_at IS DISTINCT FROM OLD.published_at OR NEW.published_updated_at IS DISTINCT FROM OLD.published_updated_at
      OR NEW.scheduled IS DISTINCT FROM OLD.scheduled OR NEW.scheduled_at IS DISTINCT FROM OLD.scheduled_at
      OR NEW.schedule_timezone IS DISTINCT FROM OLD.schedule_timezone) THEN
      RAISE EXCEPTION 'Use as ações de publicação para alterar o status do artigo.';
    END IF;
  END IF;
  v_cat := NULLIF(NEW.draft->>'category_id','');
  IF v_cat IS NOT NULL AND NOT EXISTS (
    SELECT 1 FROM public.site_blog_categories c WHERE c.id::text = v_cat AND c.agency_id = NEW.agency_id
  ) THEN
    RAISE EXCEPTION 'Categoria inválida para esta agência.';
  END IF;
  NEW.updated_at := now();
  RETURN NEW;
END $$;
