
CREATE TABLE public.agency_wallet_settings (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  show_calendar boolean NOT NULL DEFAULT true,
  show_next_service boolean NOT NULL DEFAULT true,
  show_next_activity boolean NOT NULL DEFAULT true,
  show_support_tools boolean NOT NULL DEFAULT true,
  show_signature boolean NOT NULL DEFAULT true,
  show_whatsapp boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.agency_wallet_settings TO authenticated;
GRANT ALL ON public.agency_wallet_settings TO service_role;

ALTER TABLE public.agency_wallet_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Owner manages own wallet settings"
  ON public.agency_wallet_settings
  FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE TRIGGER trg_agency_wallet_settings_updated_at
  BEFORE UPDATE ON public.agency_wallet_settings
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE OR REPLACE FUNCTION public.get_agency_wallet_settings(_user_id uuid)
RETURNS TABLE (
  show_calendar boolean,
  show_next_service boolean,
  show_next_activity boolean,
  show_support_tools boolean,
  show_signature boolean,
  show_whatsapp boolean
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    COALESCE(s.show_calendar,      true) AS show_calendar,
    COALESCE(s.show_next_service,  true) AS show_next_service,
    COALESCE(s.show_next_activity, true) AS show_next_activity,
    COALESCE(s.show_support_tools, true) AS show_support_tools,
    COALESCE(s.show_signature,     true) AS show_signature,
    COALESCE(s.show_whatsapp,      true) AS show_whatsapp
  FROM (SELECT _user_id AS uid) q
  LEFT JOIN public.agency_wallet_settings s ON s.user_id = q.uid;
$$;

GRANT EXECUTE ON FUNCTION public.get_agency_wallet_settings(uuid) TO anon, authenticated, service_role;
