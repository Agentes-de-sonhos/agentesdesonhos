-- Drica Viagens go-live (approved by Fernando, 28/10/2026).
INSERT INTO public.agency_public_domains (hostname, user_id, agency_slug, is_primary, is_active, admin_portal_enabled)
VALUES
  ('www.dricaviagens.com.br', '1c604e3c-01db-4587-88e6-ea7eccf55230', 'drica', true, true, true),
  ('dricaviagens.com.br', '1c604e3c-01db-4587-88e6-ea7eccf55230', 'drica', false, true, true)
ON CONFLICT (hostname) DO NOTHING;
