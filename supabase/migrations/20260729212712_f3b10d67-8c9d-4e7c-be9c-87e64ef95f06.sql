CREATE INDEX IF NOT EXISTS idx_clients_user_name_id ON public.clients (user_id, name, id);
CREATE INDEX IF NOT EXISTS idx_clients_user_status_name ON public.clients (user_id, status, name);
CREATE INDEX IF NOT EXISTS idx_clients_name_trgm ON public.clients USING gin (name gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_clients_email_trgm ON public.clients USING gin (email gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_clients_city_trgm ON public.clients USING gin (city gin_trgm_ops);