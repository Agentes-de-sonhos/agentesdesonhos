
-- Performance indexes for the most frequently queried columns

-- Trips: filtered by user_id constantly
CREATE INDEX IF NOT EXISTS idx_trips_user_id ON public.trips (user_id);
CREATE INDEX IF NOT EXISTS idx_trips_slug ON public.trips (slug);
CREATE INDEX IF NOT EXISTS idx_trips_short_code ON public.trips (short_code);

-- Trip services: always fetched by trip_id
CREATE INDEX IF NOT EXISTS idx_trip_services_trip_id ON public.trip_services (trip_id);

-- Materials: filtered by is_active, trail_id, and created_at
CREATE INDEX IF NOT EXISTS idx_materials_active_created ON public.materials (is_active, created_at DESC) WHERE is_active = true;

-- Benefits: filtered by is_active
CREATE INDEX IF NOT EXISTS idx_benefits_active ON public.benefits (is_active, created_at DESC) WHERE is_active = true;

-- Profiles: joined frequently by user_id
CREATE INDEX IF NOT EXISTS idx_profiles_user_id ON public.profiles (user_id);

-- Subscriptions: checked for plan and is_active constantly
CREATE INDEX IF NOT EXISTS idx_subscriptions_user_active ON public.subscriptions (user_id, is_active) WHERE is_active = true;

-- User presence: queried by last_active_at and is_online
CREATE INDEX IF NOT EXISTS idx_user_presence_online ON public.user_presence (is_online, last_active_at DESC) WHERE is_online = true;

-- Community messages: fetched by room_id ordered by created_at
CREATE INDEX IF NOT EXISTS idx_community_messages_room ON public.community_messages (room_id, created_at);

-- Community posts: ordered by is_pinned and created_at
CREATE INDEX IF NOT EXISTS idx_community_posts_feed ON public.community_posts (is_pinned DESC, created_at DESC);

-- Gamification points: aggregated by user_id
CREATE INDEX IF NOT EXISTS idx_gamification_points_user ON public.gamification_points (user_id);

-- Clients: filtered by user_id
CREATE INDEX IF NOT EXISTS idx_clients_user_id ON public.clients (user_id);

-- Sales: queried by user_id and sale_date
CREATE INDEX IF NOT EXISTS idx_sales_user_date ON public.sales (user_id, sale_date);

-- Opportunities: queried by user_id and stage
CREATE INDEX IF NOT EXISTS idx_opportunities_user_stage ON public.opportunities (user_id, stage);

-- Agency events: queried by user_id and event_date
CREATE INDEX IF NOT EXISTS idx_agency_events_user_date ON public.agency_events (user_id, event_date);

-- QA questions and answers
CREATE INDEX IF NOT EXISTS idx_qa_questions_created ON public.qa_questions (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_qa_answers_question ON public.qa_answers (question_id);
