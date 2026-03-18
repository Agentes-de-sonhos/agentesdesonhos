
-- Mission completions table for tracking daily/weekly/strategic missions
CREATE TABLE IF NOT EXISTS public.gamification_mission_completions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  mission_key text NOT NULL,
  period_key text NOT NULL,
  completed_at timestamptz DEFAULT now(),
  UNIQUE(user_id, mission_key, period_key)
);

ALTER TABLE public.gamification_mission_completions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own mission completions"
  ON public.gamification_mission_completions FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own mission completions"
  ON public.gamification_mission_completions FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Weekly ranking function
CREATE OR REPLACE FUNCTION public.get_gamification_ranking_weekly(limit_count integer DEFAULT 20)
RETURNS TABLE(user_id uuid, user_name text, avatar_url text, agency_name text, total_points bigint)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    gp.user_id,
    COALESCE(p.name, 'Usuário')::text as user_name,
    p.avatar_url::text,
    p.agency_name::text,
    COALESCE(SUM(gp.points), 0)::bigint as total_points
  FROM gamification_points gp
  LEFT JOIN profiles p ON p.user_id = gp.user_id
  WHERE gp.created_at >= date_trunc('week', now())
  GROUP BY gp.user_id, p.name, p.avatar_url, p.agency_name
  ORDER BY total_points DESC
  LIMIT limit_count;
END;
$$;

-- Category ranking function
CREATE OR REPLACE FUNCTION public.get_gamification_ranking_by_category(category_name text, limit_count integer DEFAULT 20)
RETURNS TABLE(user_id uuid, user_name text, avatar_url text, agency_name text, total_points bigint)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $$
DECLARE
  action_list text[];
BEGIN
  CASE category_name
    WHEN 'vendas' THEN action_list := ARRAY['create_quote','finalize_quote','send_quote','update_quote','create_opportunity','move_pipeline_stage','reach_quote_sent','reach_followup','create_client'];
    WHEN 'conteudo' THEN action_list := ARRAY['generate_content','use_material','create_showcase','add_showcase_item','create_business_card','use_lamina_customizer','create_itinerary','publish_itinerary'];
    WHEN 'educacao' THEN action_list := ARRAY['start_trail','complete_module','complete_trail','earn_certificate'];
    ELSE action_list := ARRAY[]::text[];
  END CASE;

  RETURN QUERY
  SELECT 
    gp.user_id,
    COALESCE(p.name, 'Usuário')::text as user_name,
    p.avatar_url::text,
    p.agency_name::text,
    COALESCE(SUM(gp.points), 0)::bigint as total_points
  FROM gamification_points gp
  LEFT JOIN profiles p ON p.user_id = gp.user_id
  WHERE gp.action = ANY(action_list)
  GROUP BY gp.user_id, p.name, p.avatar_url, p.agency_name
  ORDER BY total_points DESC
  LIMIT limit_count;
END;
$$;
