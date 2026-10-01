INSERT INTO public.plan_team_limits (plan, max_members, owner_counts, updated_at) VALUES
  ('ads_gestao'::public.subscription_plan, 2, true, now()),
  ('ads_gestao_equipe'::public.subscription_plan, 5, true, now())
ON CONFLICT (plan) DO NOTHING;