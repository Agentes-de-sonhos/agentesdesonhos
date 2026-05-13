
-- Mapeamento canal Telegram -> fornecedor
CREATE TABLE public.telegram_supplier_channels (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  chat_id BIGINT NOT NULL UNIQUE,
  chat_title TEXT,
  supplier_id UUID NOT NULL REFERENCES public.tour_operators(id) ON DELETE CASCADE,
  category_default TEXT NOT NULL DEFAULT 'Promocional',
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_tg_channels_supplier ON public.telegram_supplier_channels(supplier_id);
CREATE INDEX idx_tg_channels_chat ON public.telegram_supplier_channels(chat_id);

ALTER TABLE public.telegram_supplier_channels ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage telegram channels"
  ON public.telegram_supplier_channels
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER trg_telegram_channels_updated
  BEFORE UPDATE ON public.telegram_supplier_channels
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Idempotência por update_id do Telegram
CREATE TABLE public.telegram_processed_updates (
  update_id BIGINT PRIMARY KEY,
  processed_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.telegram_processed_updates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins read processed updates"
  ON public.telegram_processed_updates
  FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- Canais detectados que ainda não foram vinculados
CREATE TABLE public.telegram_pending_chats (
  chat_id BIGINT PRIMARY KEY,
  chat_title TEXT,
  chat_type TEXT,
  first_seen_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  last_seen_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  message_count INTEGER NOT NULL DEFAULT 1
);

ALTER TABLE public.telegram_pending_chats ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage pending chats"
  ON public.telegram_pending_chats
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));
