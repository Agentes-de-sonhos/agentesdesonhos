---
name: Extensão Chrome (browser-extension-api)
description: Ponte 0.3/0.4 da extensão WhatsApp — follow-up com horário/fuso, empresas opcionais, painel Hoje e deep links
type: feature
---
- Edge Function única: `supabase/functions/browser-extension-api`. Guardas puras em `_shared/extensionBridge.ts`; toda action precisa estar em `ACTIONS`.
- Autenticação só por Bearer JWT; `agencyId`/`teamMemberId` derivados no servidor. Service role apenas para as 3 tabelas de permissões de equipe.
- Follow-up 0.4: `follow_up_at` + `time_zone` (ISO 8601 COM offset obrigatório). `follow_up_date` continua sincronizado pela data civil do fuso (default America/Sao_Paulo). Legado só com data = all-day, nunca inventar horário.
- Empresas opcionais: `companies` + `client_companies` (N:N) e `opportunities.travel_context` (personal|corporate) + `company_id`. Corporativo exige empresa; pessoal exige nulo. Cliente nunca é obrigado a ter empresa.
- Privacidade: follow-ups e agenda são individuais (`created_by`/`user_id` = auth.uid()); operações/viagens sem campos financeiros; empresa devolve só `cnpj_masked`.
- Deep links calculados no servidor a partir de `APP_BASE_URL`. `/ferramentas-ia/gerar-orcamento?opportunity=<uuid>` pré-preenche via RLS (só UUID na URL); `location.state` mantém prioridade.
