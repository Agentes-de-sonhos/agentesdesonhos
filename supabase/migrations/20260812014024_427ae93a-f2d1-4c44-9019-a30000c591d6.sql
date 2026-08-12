ALTER TABLE public.clients
  ADD COLUMN IF NOT EXISTS phone_normalized text
  GENERATED ALWAYS AS (regexp_replace(COALESCE(phone, ''), '[^0-9]', '', 'g')) STORED;

CREATE INDEX IF NOT EXISTS clients_user_id_phone_normalized_idx
  ON public.clients (user_id, phone_normalized);