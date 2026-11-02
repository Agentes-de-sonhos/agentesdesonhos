-- Curti Viagens go-live (approved by Fernando, 02/11/2026).
INSERT INTO public.agency_public_domains (hostname, user_id, agency_slug, is_primary, is_active, admin_portal_enabled)
VALUES
  ('www.curtiviagens.com.br', 'be17e92f-03d7-4f17-acf2-e2ab4d135edb', 'curti', true, true, true),
  ('curtiviagens.com.br', 'be17e92f-03d7-4f17-acf2-e2ab4d135edb', 'curti', false, true, true)
ON CONFLICT (hostname) DO NOTHING;
