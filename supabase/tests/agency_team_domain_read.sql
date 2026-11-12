-- LOCAL DISPOSABLE DATABASE ONLY, after migrations. Never run against production.
-- Transactional synthetic fixtures, no real domains or users; all changes roll back.
BEGIN;
INSERT INTO public.agency_membership (user_id, agency_id, role) VALUES
('f1111111-1111-4111-8111-111111111111', 'f2222222-2222-4222-8222-222222222222', 'team');
INSERT INTO public.agency_public_domains (hostname, user_id, agency_slug, is_active) VALUES
('team-domain-test.invalid', 'f2222222-2222-4222-8222-222222222222', 'team-domain-test', true),
('other-domain-test.invalid', 'f3333333-3333-4333-8333-333333333333', 'other-domain-test', true),
('inactive-domain-test.invalid', 'f2222222-2222-4222-8222-222222222222', 'inactive-domain-test', false);
SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claim.sub', 'f1111111-1111-4111-8111-111111111111', true);
DO $$ BEGIN
  IF (SELECT count(*) FROM public.agency_public_domains WHERE hostname = 'team-domain-test.invalid') <> 1 THEN
    RAISE EXCEPTION 'Active team member cannot read own agency hostname';
  END IF;
  IF EXISTS (SELECT 1 FROM public.agency_public_domains WHERE hostname IN ('other-domain-test.invalid', 'inactive-domain-test.invalid')) THEN
    RAISE EXCEPTION 'Cross-agency or inactive hostname exposed';
  END IF;
END $$;
RESET ROLE;
DELETE FROM public.agency_membership WHERE user_id = 'f1111111-1111-4111-8111-111111111111';
SET LOCAL ROLE authenticated;
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM public.agency_public_domains WHERE hostname = 'team-domain-test.invalid') THEN
    RAISE EXCEPTION 'Removed member retained agency domain access';
  END IF;
END $$;
RESET ROLE;
ROLLBACK;
