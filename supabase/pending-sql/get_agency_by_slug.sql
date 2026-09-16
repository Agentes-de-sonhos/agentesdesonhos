-- Etapa 4 — PENDENTE DE APLICAÇÃO (por decisão do usuário: nenhuma migração
-- executada nesta rodada). Resolve o tenant pelo agency_slug no host
-- compartilhado sites.agentesdesonhos.com.br/{agency_slug}.
--
-- Mesmo payload de get_agency_domain, selecionando pelo slug do domínio ATIVO
-- da agência (preferindo o primário). Somente leitura: expõe exatamente os
-- mesmos campos públicos que o site white label já mostra.
CREATE OR REPLACE FUNCTION public.get_agency_by_slug(p_slug text)
RETURNS jsonb
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT jsonb_build_object(
    'user_id', d.user_id,
    'agency_slug', d.agency_slug,
    'hostname', d.hostname,
    'is_primary', d.is_primary,
    'agency_name', COALESCE(p.agency_name, p.name),
    'owner_name', p.name,
    'logo_url', p.agency_logo_url,
    'cover_image_url', p.cover_image_url,
    'primary_color', p.agency_primary_color,
    'secondary_color', p.agency_secondary_color,
    'tertiary_color', p.agency_tertiary_color,
    'phone', p.phone,
    'city', p.city,
    'state', p.state,
    'bio', p.bio,
    'public_slug', p.public_slug,
    'cnpj', p.cnpj
  )
  FROM public.agency_public_domains d
  LEFT JOIN public.profiles p ON p.user_id = d.user_id
  WHERE d.is_active
    AND lower(btrim(d.agency_slug)) = lower(btrim(p_slug))
  ORDER BY d.is_primary DESC, d.created_at ASC
  LIMIT 1
$$;

GRANT EXECUTE ON FUNCTION public.get_agency_by_slug(text) TO anon, authenticated, service_role;
