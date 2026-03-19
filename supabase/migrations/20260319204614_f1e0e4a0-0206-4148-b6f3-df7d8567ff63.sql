
-- Courses marketplace tables

CREATE TABLE public.marketplace_courses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  creator_id uuid NOT NULL,
  title text NOT NULL,
  description text,
  cover_image_url text,
  product_type text NOT NULL DEFAULT 'course' CHECK (product_type IN ('course', 'mentorship', 'hybrid')),
  price numeric NOT NULL DEFAULT 0,
  category text NOT NULL DEFAULT 'geral',
  level text NOT NULL DEFAULT 'iniciante' CHECK (level IN ('iniciante', 'intermediario', 'avancado')),
  status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'pending_review', 'approved', 'rejected')),
  rejection_reason text,
  is_active boolean NOT NULL DEFAULT false,
  total_lessons integer NOT NULL DEFAULT 0,
  total_duration_minutes integer NOT NULL DEFAULT 0,
  enrolled_count integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.marketplace_modules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id uuid NOT NULL REFERENCES public.marketplace_courses(id) ON DELETE CASCADE,
  title text NOT NULL,
  description text,
  order_index integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.marketplace_lessons (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  module_id uuid NOT NULL REFERENCES public.marketplace_modules(id) ON DELETE CASCADE,
  title text NOT NULL,
  description text,
  video_url text,
  duration_minutes integer NOT NULL DEFAULT 0,
  material_url text,
  material_name text,
  order_index integer NOT NULL DEFAULT 0,
  is_preview boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.marketplace_meetings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id uuid NOT NULL REFERENCES public.marketplace_courses(id) ON DELETE CASCADE,
  title text NOT NULL,
  description text,
  meeting_date timestamptz NOT NULL,
  meeting_url text,
  recording_url text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.marketplace_enrollments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id uuid NOT NULL REFERENCES public.marketplace_courses(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  stripe_session_id text,
  amount_paid numeric NOT NULL DEFAULT 0,
  enrolled_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(course_id, user_id)
);

CREATE TABLE public.marketplace_lesson_progress (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  enrollment_id uuid NOT NULL REFERENCES public.marketplace_enrollments(id) ON DELETE CASCADE,
  lesson_id uuid NOT NULL REFERENCES public.marketplace_lessons(id) ON DELETE CASCADE,
  completed_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(enrollment_id, lesson_id)
);

CREATE TABLE public.marketplace_comments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id uuid NOT NULL REFERENCES public.marketplace_courses(id) ON DELETE CASCADE,
  lesson_id uuid REFERENCES public.marketplace_lessons(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  content text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.marketplace_courses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.marketplace_modules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.marketplace_lessons ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.marketplace_meetings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.marketplace_enrollments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.marketplace_lesson_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.marketplace_comments ENABLE ROW LEVEL SECURITY;

-- Courses: anyone authenticated can read approved, creator can read own, admin can read all
CREATE POLICY "Anyone can read approved courses" ON public.marketplace_courses
  FOR SELECT TO authenticated
  USING (status = 'approved' AND is_active = true);

CREATE POLICY "Creator can read own courses" ON public.marketplace_courses
  FOR SELECT TO authenticated
  USING (creator_id = auth.uid());

CREATE POLICY "Creator can insert own courses" ON public.marketplace_courses
  FOR INSERT TO authenticated
  WITH CHECK (creator_id = auth.uid());

CREATE POLICY "Creator can update own courses" ON public.marketplace_courses
  FOR UPDATE TO authenticated
  USING (creator_id = auth.uid());

CREATE POLICY "Creator can delete own draft courses" ON public.marketplace_courses
  FOR DELETE TO authenticated
  USING (creator_id = auth.uid() AND status = 'draft');

CREATE POLICY "Admin can manage all courses" ON public.marketplace_courses
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- Modules: read if enrolled or creator or admin; write if creator
CREATE POLICY "Read modules of accessible courses" ON public.marketplace_modules
  FOR SELECT TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.marketplace_courses c WHERE c.id = course_id AND (c.creator_id = auth.uid() OR (c.status = 'approved' AND c.is_active = true)))
    OR EXISTS (SELECT 1 FROM public.marketplace_enrollments e WHERE e.course_id = marketplace_modules.course_id AND e.user_id = auth.uid())
    OR public.has_role(auth.uid(), 'admin')
  );

CREATE POLICY "Creator can manage modules" ON public.marketplace_modules
  FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.marketplace_courses c WHERE c.id = course_id AND c.creator_id = auth.uid()));

CREATE POLICY "Admin can manage all modules" ON public.marketplace_modules
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- Lessons: same pattern
CREATE POLICY "Read lessons of accessible modules" ON public.marketplace_lessons
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.marketplace_modules m
      JOIN public.marketplace_courses c ON c.id = m.course_id
      WHERE m.id = module_id AND (c.creator_id = auth.uid() OR (c.status = 'approved' AND c.is_active = true))
    )
    OR EXISTS (
      SELECT 1 FROM public.marketplace_modules m
      JOIN public.marketplace_enrollments e ON e.course_id = m.course_id
      WHERE m.id = module_id AND e.user_id = auth.uid()
    )
    OR public.has_role(auth.uid(), 'admin')
  );

CREATE POLICY "Creator can manage lessons" ON public.marketplace_lessons
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.marketplace_modules m
      JOIN public.marketplace_courses c ON c.id = m.course_id
      WHERE m.id = module_id AND c.creator_id = auth.uid()
    )
  );

CREATE POLICY "Admin can manage all lessons" ON public.marketplace_lessons
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- Meetings
CREATE POLICY "Read meetings of accessible courses" ON public.marketplace_meetings
  FOR SELECT TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.marketplace_courses c WHERE c.id = course_id AND (c.creator_id = auth.uid() OR (c.status = 'approved' AND c.is_active = true)))
    OR EXISTS (SELECT 1 FROM public.marketplace_enrollments e WHERE e.course_id = marketplace_meetings.course_id AND e.user_id = auth.uid())
    OR public.has_role(auth.uid(), 'admin')
  );

CREATE POLICY "Creator can manage meetings" ON public.marketplace_meetings
  FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.marketplace_courses c WHERE c.id = course_id AND c.creator_id = auth.uid()));

CREATE POLICY "Admin can manage all meetings" ON public.marketplace_meetings
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- Enrollments
CREATE POLICY "User can read own enrollments" ON public.marketplace_enrollments
  FOR SELECT TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Creator can read enrollments for own courses" ON public.marketplace_enrollments
  FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.marketplace_courses c WHERE c.id = course_id AND c.creator_id = auth.uid()));

CREATE POLICY "User can insert own enrollment" ON public.marketplace_enrollments
  FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Admin can manage all enrollments" ON public.marketplace_enrollments
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- Lesson progress
CREATE POLICY "User can manage own progress" ON public.marketplace_lesson_progress
  FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.marketplace_enrollments e WHERE e.id = enrollment_id AND e.user_id = auth.uid()));

CREATE POLICY "Admin can read all progress" ON public.marketplace_lesson_progress
  FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- Comments
CREATE POLICY "Enrolled users can read comments" ON public.marketplace_comments
  FOR SELECT TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.marketplace_enrollments e WHERE e.course_id = marketplace_comments.course_id AND e.user_id = auth.uid())
    OR EXISTS (SELECT 1 FROM public.marketplace_courses c WHERE c.id = course_id AND c.creator_id = auth.uid())
    OR public.has_role(auth.uid(), 'admin')
  );

CREATE POLICY "Enrolled users can insert comments" ON public.marketplace_comments
  FOR INSERT TO authenticated
  WITH CHECK (
    user_id = auth.uid() AND (
      EXISTS (SELECT 1 FROM public.marketplace_enrollments e WHERE e.course_id = marketplace_comments.course_id AND e.user_id = auth.uid())
      OR EXISTS (SELECT 1 FROM public.marketplace_courses c WHERE c.id = course_id AND c.creator_id = auth.uid())
    )
  );

CREATE POLICY "User can delete own comments" ON public.marketplace_comments
  FOR DELETE TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Admin can manage all comments" ON public.marketplace_comments
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- Trigger for updated_at
CREATE TRIGGER update_marketplace_courses_updated_at
  BEFORE UPDATE ON public.marketplace_courses
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_marketplace_modules_updated_at
  BEFORE UPDATE ON public.marketplace_modules
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_marketplace_lessons_updated_at
  BEFORE UPDATE ON public.marketplace_lessons
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_marketplace_meetings_updated_at
  BEFORE UPDATE ON public.marketplace_meetings
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
