-- Nenhuma dessas tabelas deve ser alcançável pelo navegador: senhas (hash),
-- sessões e eventos de segurança só são lidos pelo serviço autorizado ou por
-- funções internas com verificação de permissão.
REVOKE ALL ON public.client_area_accounts FROM anon, authenticated;
REVOKE ALL ON public.client_area_sessions FROM anon, authenticated;
REVOKE ALL ON public.client_area_login_attempts FROM anon, authenticated;
REVOKE ALL ON public.client_area_origin_attempts FROM anon, authenticated;
REVOKE ALL ON public.client_area_audit_log FROM anon, authenticated;

GRANT ALL ON public.client_area_accounts TO service_role;
GRANT ALL ON public.client_area_sessions TO service_role;
GRANT ALL ON public.client_area_login_attempts TO service_role;
GRANT ALL ON public.client_area_origin_attempts TO service_role;
GRANT ALL ON public.client_area_audit_log TO service_role;