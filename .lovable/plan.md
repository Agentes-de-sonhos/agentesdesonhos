# FASE 2 — Auditoria e plano do White Label Comandatuba

## 1. Resumo executivo do estado atual

Auditado no código e no banco reais:

- A landing existe apenas como **página estática de demonstração**: rota pública `/experiencias/transamerica-comandatuba/demo` (`src/App.tsx:184`), renderizando `src/pages/ComandatubaLandingPage.tsx`.
- O white label hoje é **fake**: `src/hooks/useComandatubaAgency.ts` lê `?agencia`, `?logo`, `?cor`, `?whatsapp` etc. da query string, com fallback em `DEFAULT_AGENCY` (`content.ts:23`). Nada vem do banco. Qualquer visitante pode falsificar a marca pela URL.
- O formulário **não grava lead**: `QuoteFormSection.tsx` faz `console.info` e salva o payload em `localStorage` (`comandatuba_leads`). Zero integração com CRM/notificações.
- Já existe uma mecânica madura e reutilizável de landing pages white label: tabela `sales_landings` + RPCs `get_public_sales_landing`, `track_sales_landing_view`, `submit_sales_landing_lead`, páginas `SalesLandings.tsx` / `SalesLandingEditor.tsx` / `SalesLandingPublic.tsx`, roteamento por hostname `lp.` e leads unificados em `useLeadAlerts.ts`.
- O `submit_sales_landing_lead` já cria cliente + oportunidade na primeira etapa e registra o lead — é o molde correto, mas tem **duas falhas conhecidas** que não devem ser replicadas (detalhe no item 4).
- `comandatuba.proximaviagem.tur.br` aparece na lista de domínios do projeto, porém o app é **SPA client-side**: o hostname só pode ser lido em `window.location.hostname`. Não há SSR, então não há nada no código que prove DNS/SSL — isso precisa de validação externa.

## 2. Fluxo atual vs. proposto

```text
ATUAL (demo)
visitante -> /experiencias/transamerica-comandatuba/demo?agencia=X&cor=Y
          -> useComandatubaAgency (query string, sem validação)
          -> submit form -> console.info + localStorage  [lead perdido]

PROPOSTO
visitante -> comandatuba.proximaviagem.tur.br/{slug-agencia}
          -> App.tsx: hostname começa com "comandatuba." => ProductLandingResolver
          -> RPC get_public_product_landing(p_product, p_slug)  [SECURITY DEFINER, só campos públicos]
             |- inativa/inexistente/agência inativa -> tela "página não disponível" (mensagem única)
          -> render ComandatubaLandingPage com AgencyConfig vinda do banco
          -> track_product_landing_view(p_landing_id, p_session_hash)
          -> submit -> RPC submit_product_landing_lead(p_product, p_slug, payload, p_idempotency_key)
             |- resolve user_id da agência NO BANCO pelo slug (nunca do browser)
             |- dedupe por telefone + janela de tempo + idempotency_key
             |- ensure_client_and_opportunity_for_lead -> cliente + oportunidade na 1ª etapa do funil
             |- insere em product_landing_leads (origem, UTM, referrer, metadados)
          -> Realtime já existente -> NewLeadAlertProvider (toast + contador + Meus Leads)
```

## 3. Inventário técnico relevante

**Rotas/roteamento público**
- `src/App.tsx:170-224` — roteamento por hostname (`ativar-cartao`, `lp.`), `/lp/:slug`, `/:agencySlug/:accessCode`, `/:slug`.
- `src/components/routing/PublicCodeResolver.tsx` — resolve produto por hostname (`seuorcamento`, `seuroteiro`, `carteiradigital`) — **padrão a reutilizar**.
- `src/components/routing/SlugResolver.tsx` — resolve slug entre fornecedor/vitrine/cartão.

**Landing pages (Ferramentas de Marketing)**
- `src/pages/SalesLandings.tsx`, `SalesLandingEditor.tsx`, `SalesLandingPublic.tsx`, `src/hooks/useSalesLandings.ts`.
- Menu: `src/config/menuConfig.ts` (`section_marketing`); rotas `/meus-leads/landings*`.

**Leads / CRM / notificações**
- `src/hooks/useLeadCapture.ts` (realtime em `lead_captures`), `src/hooks/useLeadAlerts.ts` (união `lead_captures` + `sales_landing_leads`), `src/components/leads/NewLeadAlertProvider.tsx`.
- Edge Function `supabase/functions/lead-wizard-ai/index.ts` (formulário conversacional, IA + rate limit).

**Banco**
- `sales_landings(id, user_id, slug, headline, subheadline, description, cta_text, image_url, primary_color, agent_whatsapp, agent_name, views_count, leads_count, is_active, ...)`
- `sales_landing_leads(landing_id, user_id, client_id, opportunity_id, lead_name, lead_phone, is_read, attended_at)`; `sales_landing_views(landing_id, session_hash, viewed_date)` com unique.
- `lead_capture_forms`, `lead_captures`, `clients`, `opportunities`, `pipeline_stages(user_id, position, legacy_key)`.
- `profiles`: `agency_name, agency_logo_url, agency_primary_color, phone, city, state, cnpj, avatar_url, name, cover_image_url`.

**Funções**
- `submit_sales_landing_lead(p_slug, p_lead_name, p_lead_phone)`, `get_public_sales_landing(p_slug)`, `track_sales_landing_view(...)`.
- `ensure_client_and_opportunity_for_lead(_user_id,_name,_phone,_email,_destination)` — já normaliza telefone (`_normalize_phone`), reaproveita cliente e usa a **primeira etapa real** do funil (`pipeline_stages` por `position`). É a função correta para "Nova oportunidade".
- `get_agency_slug_for_user(p_user_id)` — deriva slug do `agency_name` (sem unicidade garantida).
- `enforce_sales_landing_quota()` — trigger de quota por plano (Profissional 2/mês, Premium ilimitado).

## 4. Gaps identificados

1. **Sem catálogo de produtos de landing.** `sales_landings` é conteúdo livre criado pela agência; não modela "produto pronto habilitável". Falta uma noção de `product_key`.
2. **Sem tabela de instância por agência** para a landing Comandatuba (status, slug, overrides, horários).
3. **Slug de agência não é entidade real.** `get_agency_slug_for_user` deriva do nome, sem unicidade, sem reservados, sem normalização persistida. Duas agências com nomes iguais colidiriam.
4. **Formulário Comandatuba não persiste nada.**
5. **Falhas no molde `submit_sales_landing_lead` que não devem ser copiadas:** (a) compara `clients.phone` cru em vez de `_normalize_phone`, criando clientes duplicados; (b) grava `stage='new_contact'` fixo sem `stage_id`, ignorando funis customizados; (c) `EXCEPTION WHEN OTHERS` mascara erro real. A nova RPC deve delegar a `ensure_client_and_opportunity_for_lead`.
6. **Sem idempotência**: duplo clique/retry gera lead duplicado (nada previne hoje).
7. **Sem consentimento/LGPD persistido** — o checkbox existe na UI, mas não há coluna para registrar aceite, IP/UA, timestamp.
8. **Sem UTM/referrer persistidos** em nenhuma tabela de lead.
9. **Sem horário de atendimento**: `agency.hours` é texto livre; não há dias/janelas/timezone estruturados.
10. **Sem notificação para landings de produto** — o realtime atual escuta apenas `lead_captures` e `sales_landing_leads`.
11. **Sem canonical/sitemap por tenant**; a demo usa `useNoindex()` (correto), mas as páginas white label precisam de política explícita.
12. **Nenhuma verificação possível de DNS/TLS pelo código.**

## 5. Arquitetura recomendada (máximo reaproveitamento)

- **Catálogo estático em código** (`src/config/landingProducts.ts`) com `product_key: "transamerica-comandatuba"`, nome, thumb, componente. Evita CMS desnecessário; o admin controla disponibilidade por flag/plano.
- **Instância no banco** (`agency_product_landings`) guardando apenas status, slug e overrides — branding herdado de `profiles` em tempo de leitura, com override opcional por landing (sem duplicar cadastro).
- **Resolução por hostname** no `App.tsx`, no mesmo padrão de `PublicCodeResolver`: `comandatuba.` → `ProductLandingResolver` que lê o primeiro segmento como slug da agência.
- **Leitura pública via RPC `SECURITY DEFINER`** retornando somente campos públicos (nunca `select` direto na tabela pelo anon).
- **Escrita de lead via RPC `SECURITY DEFINER`** que resolve a agência pelo slug e delega ao `ensure_client_and_opportunity_for_lead` já existente.
- **Notificação**: estender `useLeadAlerts`/`NewLeadAlertProvider` para incluir a nova tabela — sem criar um segundo pipeline.
- A rota `/experiencias/transamerica-comandatuba/demo` permanece, mas passa a ser **demo explícita** com `DEFAULT_AGENCY` e sem leitura de query string de branding (ou apenas em modo preview autenticado).

## 6. Modelo de dados proposto

**`agency_landing_slugs`** (ou coluna `public_slug` única em `profiles` — decisão em aberto no item 13)
- `user_id uuid unique`, `slug citext unique`, `created_at/updated_at`
- Justificativa: slug precisa ser estável, único e desacoplado do nome da agência.

**`agency_product_landings`**
- `id`, `user_id` (owner), `product_key text`, `status text` (`draft|active|disabled`), `slug text` (denormalizado do slug da agência para lookup rápido), `unique(user_id, product_key)`, `unique(product_key, slug)`
- overrides opcionais: `override_whatsapp`, `override_phone`, `override_email`, `override_logo_url`, `override_primary_color`, `override_consultant_name`, `override_consultant_role`, `override_consultant_photo_url`, `whatsapp_message_template`, `city`
- `timezone text default 'America/Sao_Paulo'`, `office_hours jsonb` (ver item 9)
- `views_count int`, `leads_count int`, `created_at/updated_at` + trigger de `updated_at`
- GRANT: `select, insert, update, delete` para `authenticated`; `all` para `service_role`; **sem grant para anon** (leitura pública só pela RPC).

**`product_landing_leads`**
- `id`, `landing_id`, `user_id`, `product_key`, `client_id`, `opportunity_id`
- `lead_name, lead_phone, lead_email, origin_city, travel_period, adults, children, children_ages, interest_category, message`
- `consent_accepted bool`, `consent_at timestamptz`
- `utm_source/medium/campaign/content/term`, `referrer`, `page_url`, `user_agent`
- `idempotency_key text` + `unique(landing_id, idempotency_key)`
- `is_read bool default false`, `attended_at`, `created_at`
- GRANT: `select, update` para `authenticated`; `all` para `service_role`; sem anon.

**`product_landing_views`** — `(landing_id, session_hash, viewed_date)` unique, espelhando `sales_landing_views`.

## 7. Contratos de backend

`get_public_product_landing(p_product_key text, p_slug text) returns json` — STABLE, SECURITY DEFINER
- valida tamanho/formato do slug; exige `status='active'`; retorna branding efetivo (override ?? profile ?? default), `office_hours`, `timezone`, `landing_id`.
- Erro genérico único (`{"error":"Página não encontrada"}`) para inexistente/desativada/agência inativa — evita enumeração.

`track_product_landing_view(p_landing_id uuid, p_session_hash text)` — dedupe por dia, incrementa contador.

`submit_product_landing_lead(p_product_key, p_slug, p_payload jsonb, p_idempotency_key text) returns json`
- resolve `user_id` **pelo slug no banco**; ignora qualquer id vindo do cliente;
- valida nome ≥2, telefone ≥10 dígitos, e-mail opcional válido, `consent = true` obrigatório, tamanhos máximos, sanitização de texto;
- rate limit por `session_hash`/telefone em janela curta;
- `ON CONFLICT (landing_id, idempotency_key) DO NOTHING` → retorna sucesso idempotente;
- dedupe adicional: mesmo telefone normalizado + mesma landing em < 30 min reaproveita a oportunidade existente;
- chama `ensure_client_and_opportunity_for_lead` (cliente + oportunidade na 1ª etapa real do funil);
- sem `EXCEPTION WHEN OTHERS` cego: erros de validação retornam mensagem em português, erros inesperados são logados.

Nenhuma Edge Function nova é necessária (a IA do wizard conversacional não se aplica aqui).

## 8. UI/UX

**Painel da agência** — nova aba/seção "Modelos prontos" na página existente `/meus-leads/landings`:
- card do produto Comandatuba com preview, status e botão **Habilitar**;
- ao habilitar: modal com slug sugerido (validação de disponibilidade em tempo real), WhatsApp, telefone, e-mail, logo, dias/horários de atendimento e mensagem padrão do WhatsApp;
- após ativa: botões **Ver página**, **Copiar URL**, **Editar**, **Desativar**; contadores de visitas e leads (reutilizando o padrão de `sales_landings`);
- respeitar gate por plano (mesma lógica de `enforce_sales_landing_quota`; a decidir se Comandatuba é liberada em planos menores).

**Página pública**
- mesmo layout atual; branding vindo da RPC; skeleton durante carregamento; tela neutra para landing indisponível;
- rodapé com dados da agência; CTA de WhatsApp com comportamento por horário (item 9); `noindex` por padrão nas instâncias white label, com canonical self-referente por tenant.

## 9. Regra do WhatsApp por horário

`office_hours jsonb`: `{"mon":[["08:00","20:00"]], ..., "sun":[]}` + `timezone` (default `America/Sao_Paulo`).

- A RPC pública retorna `office_hours`, `timezone` e um `server_now_iso` (hora do servidor). O cliente calcula a janela usando o horário do servidor + timezone da agência via `Intl.DateTimeFormat`, nunca o relógio local do visitante.
- **Overnight**: janela cujo fim ≤ início (ex. `22:00–02:00`) é tratada como dois intervalos: `[22:00,24:00)` no dia e `[00:00,02:00)` no dia seguinte — a verificação considera também a janela do dia anterior.
- Dia sem faixas = fechado. Feriados ficam fora do MVP (campo `closed_dates` previsto, não usado).
- **Dentro do horário**: CTA abre `wa.me` com mensagem pré-montada; `aria-label` "Falar no WhatsApp com {agência}".
- **Fora do horário**: mesmo CTA muda o rótulo para "Solicitar contato", não abre WhatsApp, faz scroll/foco no formulário; `aria-label` reflete a ação real. Recalcula a cada minuto para virar o comportamento sem reload.

## 10. RLS e segurança multi-tenant

- `agency_product_landings`: policies `TO authenticated` com `user_id = auth.uid()` para select/insert/update/delete. Sem grant a `anon`.
- `product_landing_leads`: select/update apenas do dono (`user_id = auth.uid()`); insert somente via RPC `SECURITY DEFINER`.
- `product_landing_views`: sem acesso direto a anon; escrita via RPC.
- Toda leitura/escrita pública passa por RPC com `SET search_path = public`, validação de entrada e retorno de campos brancos (whitelist) — nunca `select *`.
- Slug: normalização (lowercase, sem acento, `[a-z0-9-]`, 3–40 chars), lista de reservados (`admin`, `api`, `demo`, `lp`, `www`, `assets`, `politicasdeprivacidade`, `termosdeuso`, `experiencias`, etc.), unicidade por índice.
- Anti-enumeração: mensagem única para slug inexistente/desativado + rate limit na RPC de leitura.
- Nunca aceitar `agency_id`/`user_id` do browser. Remover a leitura de branding por query string na rota pública white label.

## 11. Plano de testes

- **Unitários**: normalização de slug; reservados; regra de horário (dentro, fora, overnight, dia fechado, timezone diferente); montagem da mensagem de WhatsApp; parsing de UTM.
- **Integração/DB**: `submit_product_landing_lead` cria cliente + oportunidade na 1ª etapa do funil customizado; reaproveita cliente por telefone normalizado; idempotência (duas chamadas com mesma key = 1 lead); landing desativada rejeita; consentimento ausente rejeita.
- **RLS**: agência A não lê/edita landing nem leads da agência B; `anon` não consegue `select` direto nas tabelas novas.
- **E2E (Playwright)**: fluxo habilitar → copiar URL → abrir `comandatuba.proximaviagem.tur.br/{slug}` → enviar formulário → lead aparece em Meus Leads e como oportunidade no CRM; desktop e mobile; CTA dentro/fora do horário; slug inexistente; demo continua funcionando.
- **Domínio**: validação externa obrigatória de DNS/TLS do subdomínio e de que o SPA fallback serve `index.html` em `/{slug}` (não verificável só pelo código).

## 12. Rollout e rollback

1. **Etapa 1 — Fundação de slug** (migração + backfill a partir de `agency_name`, resolvendo colisões). Rollback: coluna/tabela isolada, sem impacto em rotas.
2. **Etapa 2 — Tabelas + RPCs** (sem UI). Rollback: drop das novas entidades.
3. **Etapa 3 — Roteamento por hostname + página pública lendo do banco**, atrás de flag; demo intocada. Rollback: remover o branch de hostname.
4. **Etapa 4 — Painel da agência** (habilitar/editar/desativar/preview/métricas).
5. **Etapa 5 — Formulário real + CRM + notificações**; piloto com 1–2 agências antes de liberar no catálogo.
6. **Etapa 6 — Horário de atendimento e refinamentos de SEO/canonical.**

Rollback global: desativar as instâncias (`status='disabled'`) desliga todas as páginas públicas sem deploy.

## 13. Perguntas bloqueadoras

1. **Slug**: criar `public_slug` único e editável no perfil da agência (usado também por outros produtos futuros) ou um slug por landing? A primeira opção é mais coerente com a URL pedida.
2. **Planos**: Comandatuba é liberada para todos os planos ou segue o gate de Páginas de Vendas (Profissional/Premium)?
3. **Cores da agência**: aplicar `agency_primary_color` na landing ou fixar a identidade do produto no MVP (recomendo fixar cor de produto e permitir apenas logo/nome, para não descaracterizar)?
4. **Consultor**: usar o titular da conta (`profiles.name` + `avatar_url`) ou permitir escolher um vendedor da equipe?
5. **Indexação**: as páginas white label devem ser indexáveis pelo Google (uma por agência) ou `noindex` como as demais páginas públicas atuais?
6. **Colisão de rota**: confirmar que `comandatuba.proximaviagem.tur.br` só serve este produto (o mesmo apex `proximaviagem.tur.br` já é usado por outras páginas públicas).

## 14. Complexidade por etapa

| Etapa | Complexidade |
|---|---|
| 1. Slug único da agência + backfill | Média (dados legados) |
| 2. Tabelas + RLS + GRANTs | Baixa |
| 3. RPCs públicas (leitura, view, lead idempotente) | Média |
| 4. Roteamento por hostname + página pública dinâmica | Média |
| 5. Painel da agência (catálogo, habilitar, editar, métricas) | Média |
| 6. Integração CRM + notificações | Baixa (reaproveita `ensure_client_and_opportunity_for_lead` e o realtime existente) |
| 7. Horário de atendimento com timezone/overnight | Média |
| 8. SEO/canonical/sitemap multi-tenant | Baixa |
| 9. Validação de DNS/TLS do subdomínio | Baixa (externa) |
