-- 0022: corrige SQLSTATE 22P02 ("malformed array literal") em
-- public.confirm_travel_file_sale. As variáveis _created, _reused e _warnings são
-- text[] e recebiam concatenação com literais escalares de tipo desconhecido
-- (`_created := _created || 'operation'`), que o Postgres interpreta como literal
-- de array. A correção substitui todas essas concatenações por array_append,
-- preservando integralmente corpo, assinatura, SECURITY DEFINER, search_path,
-- idempotência, locks e permissões: a definição atual é lida com
-- pg_get_functiondef e apenas esses trechos são reescritos.
DO $do$
DECLARE
  _def text;
  _new text;
BEGIN
  SELECT pg_get_functiondef(p.oid) INTO _def
  FROM pg_proc p
  JOIN pg_namespace n ON n.oid = p.pronamespace
  WHERE n.nspname = 'public'
    AND p.proname = 'confirm_travel_file_sale'
    AND pg_get_function_identity_arguments(p.oid)
        = 'p_file_id uuid, p_idempotency_key text, p_acceptance jsonb, p_expected_updated_at timestamp with time zone';

  IF _def IS NULL THEN
    RAISE EXCEPTION 'confirm_travel_file_sale(uuid,text,jsonb,timestamptz) não encontrada';
  END IF;

  -- 1) format(...) em _warnings
  _new := regexp_replace(
    _def,
    '_warnings := _warnings \|\| (format\([^;]*\));',
    '_warnings := array_append(_warnings, \1);',
    'g');

  -- 2) literais escalares em _created / _reused / _warnings
  _new := regexp_replace(
    _new,
    '_(created|reused|warnings) := _(created|reused|warnings) \|\| (''[^'']*'');',
    '_\1 := array_append(_\1, \3);',
    'g');

  IF _new = _def THEN
    RAISE EXCEPTION 'nenhuma concatenação escalar encontrada: revise a função antes de aplicar';
  END IF;

  IF _new ~ '_(created|reused|warnings) := _(created|reused|warnings) \|\|' THEN
    RAISE EXCEPTION 'ainda restam concatenações escalares em arrays text[]';
  END IF;

  EXECUTE _new;
END
$do$;
