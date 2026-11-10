-- Preserve public asset reads; scope destructive writes and personal raw records.
ALTER POLICY "Authenticated users can delete academy files" ON storage.objects USING (bucket_id = 'academy-files' AND (public.has_role(auth.uid(), 'admin') OR (owner = auth.uid() AND (storage.foldername(name))[1] = 'certificates' AND (storage.foldername(name))[2] = auth.uid()::text)));
ALTER POLICY "Authenticated users can upload academy files" ON storage.objects WITH CHECK (bucket_id = 'academy-files' AND (public.has_role(auth.uid(), 'admin') OR ((storage.foldername(name))[1] = 'certificates' AND (storage.foldername(name))[2] = auth.uid()::text)));
ALTER POLICY "Authenticated users can delete supplier logos" ON storage.objects USING (bucket_id = 'supplier-logos' AND (owner = auth.uid() OR public.has_role(auth.uid(), 'admin')));
ALTER POLICY "Authenticated users can update supplier logos" ON storage.objects USING (bucket_id = 'supplier-logos' AND (owner = auth.uid() OR public.has_role(auth.uid(), 'admin'))) WITH CHECK (bucket_id = 'supplier-logos' AND (owner = auth.uid() OR public.has_role(auth.uid(), 'admin')));
ALTER POLICY "Agency updates own media objects" ON storage.objects WITH CHECK (bucket_id = 'media-files' AND (public.same_agency_as(owner) OR public.has_role(auth.uid(), 'admin')));
-- Registration removes URLs from its local form; only the server/admin needs object deletion.
DROP POLICY "Anon delete temp tour guide files" ON storage.objects;
ALTER POLICY "Authenticated view attendees" ON public.community_meeting_attendees USING (user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));
ALTER POLICY "Anyone authenticated can view confirmations" ON public.benefit_confirmations USING (user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));
ALTER POLICY "Users can view all votes" ON public.community_votes USING (voter_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));
ALTER POLICY "Anyone can view achievements for ranking" ON public.user_achievements TO authenticated USING (user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));
ALTER POLICY "Authenticated view progress for ranking" ON public.user_training_progress USING (user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));
ALTER POLICY "Authenticated view certificates for ranking" ON public.user_certificates USING (user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));
-- Same audience predicates as existing restrictive policies, which remain intact.
ALTER POLICY "Authenticated can view presence" ON public.user_presence USING (user_id = auth.uid() OR (public.can_see_agency_user(user_id) AND public.can_team('online_users.view')));
ALTER POLICY "Authenticated users can read posts" ON public.community_posts USING ((user_id = auth.uid()) OR ((visibility = 'internal') AND agency_id IS NOT NULL AND agency_id = public.user_agency_id(auth.uid()) AND public.can_use_internal_community()) OR ((visibility <> 'internal') AND public.can_use_public_community() AND public.can_team('community.public.view') AND COALESCE((SELECT f.public_community_enabled FROM public.agency_community_flags(public.user_agency_id(community_posts.user_id)) f), true)));
ALTER POLICY "Poll votes readable by authenticated" ON public.community_post_poll_votes USING (public.can_view_community_post(post_id));
ALTER POLICY "Authenticated can view rooms" ON public.community_rooms USING (public.has_role(auth.uid(), 'admin') OR (is_active AND auth.uid() IS NOT NULL AND public.can_use_public_community() AND public.can_team('community.public.view')));
ALTER POLICY "Authenticated can read room messages" ON public.community_messages USING (public.has_role(auth.uid(), 'admin') OR EXISTS (SELECT 1 FROM public.community_rooms r WHERE r.id = room_id AND r.is_active AND public.can_use_public_community() AND public.can_team('community.public.view')));
ALTER POLICY "Authenticated can send room messages" ON public.community_messages WITH CHECK (user_id = auth.uid() AND EXISTS (SELECT 1 FROM public.community_rooms r WHERE r.id = room_id AND r.is_active AND public.can_use_public_community() AND public.can_team('community.public.view')));
-- perfis_cliente is a cruise audience taxonomy, NOT agency customers.
ALTER POLICY "Leitura pública perfis" ON public.perfis_cliente USING (ativo OR public.has_role(auth.uid(), 'admin'));
-- Preserve the shared ranking without exposing certificate URLs, numbers, or raw progress.
CREATE FUNCTION public.academy_ranking_summary()
RETURNS TABLE(user_id uuid, name text, avatar_url text, agency_name text, trails_completed bigint, total_score numeric, avg_exam_score numeric)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  WITH certs AS (SELECT c.user_id, count(*) AS n FROM public.user_certificates c GROUP BY c.user_id),
  exams AS (SELECT e.user_id, round(avg(e.score)) AS avg_score FROM public.user_exam_attempts e WHERE e.passed GROUP BY e.user_id),
  ids AS (SELECT c.user_id FROM certs c UNION SELECT e.user_id FROM exams e)
  SELECT i.user_id, COALESCE(p.name, 'Usuário')::text, p.avatar_url::text, p.agency_name::text,
    COALESCE(c.n, 0), COALESCE(c.n, 0) * 100 + COALESCE(e.avg_score, 0), COALESCE(e.avg_score, 0)
  FROM ids i LEFT JOIN certs c ON c.user_id = i.user_id LEFT JOIN exams e ON e.user_id = i.user_id
  LEFT JOIN public.profiles_public p ON p.user_id = i.user_id
  WHERE auth.uid() IS NOT NULL
  ORDER BY COALESCE(c.n, 0) DESC, COALESCE(e.avg_score, 0) DESC
$$;
REVOKE ALL ON FUNCTION public.academy_ranking_summary() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.academy_ranking_summary() TO authenticated, service_role;
COMMENT ON FUNCTION public.academy_ranking_summary() IS 'Authenticated shared Academy ranking; aggregate scores only, never certificate paths or raw progress.';