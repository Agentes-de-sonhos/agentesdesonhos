# Auditoria (somente leitura) — Envio de formulário da landing Transamérica Comandatuba

Nada foi alterado. Nenhum lead de teste foi criado. Tudo abaixo foi conferido em código e no banco (definições reais de funções, políticas RLS, triggers e publicação de realtime).

## 1. Campos do formulário → onde ficam gravados
Arquivo: `src/components/landing/comandatuba/QuoteFormSection.tsx` chama a RPC `submit_product_landing_lead(p_product_key, p_slug, p_payload, p_idempotency_key)`.

Payload → colunas de `public.product_landing_leads` (mapeamento comprovado no corpo da função):
- Nome → `lead_name` (2–120 chars) · WhatsApp → `lead_phone` (10–15 dígitos) · E-mail → `lead_email` (regex)
- Cidade/aeroporto → `origin_city` (120) · Período → `travel_period` (120)
- Adultos → `adults` · Crianças → `children` · Idades → `children_ages` (120)
- Acomodação de interesse → `interest_category` (160) · Observações → `message` (2000)
- Consentimento → `consent_accepted` + `consent_at`
- Metadados: `utm_source/medium/campaign/content/term` (160 cada), `referrer` (500), `page_url` (500), `user_agent` (300), `idempotency_key` (120), `is_test`
- Vínculos: `landing_id`, `user_id` (agência), `product_key`, `client_id`, `opportunity_id`

Observações: o campo `destination` do payload NÃO é coluna do lead — é usado só para o destino da oportunidade (default "Transamerica Comandatuba"). Na rota demo (`/experiencias/transamerica-comandatuba/demo`) nada é persistido (o próprio componente retorna antes da RPC).

## 2. Determinação do tenant e proteção contra tenant errado
- Host define o produto e o 1º segmento do path define a agência: `src/config/landingProducts.ts` (`productForHostname`, prefixo `comandatuba.`), `src/App.tsx` (rota `/:slug` → `ProductLandingResolver`), `src/components/routing/ProductLandingResolver.tsx`.
- O backend não confia no cliente: `submit_product_landing_lead` (SECURITY DEFINER) resolve `agency_product_landings` por `product_key + lower(slug) + status='active'` e usa `v_landing.user_id` como dono. Não há parâmetro de `user_id` vindo do navegador.
- Se slug/produto não existirem ou a página estiver `draft/disabled`: retorna `{"error":"Página não encontrada"}` e nada é gravado.
- Reforço extra: trigger `trg_force_user_id_agency` (`force_user_id_to_agency_owner`) em `opportunities`.
- RLS: `product_landing_leads` → SELECT/UPDATE/DELETE apenas `user_id = auth.uid()` (authenticated); sem policy de INSERT (grava só via RPC definer). `agency_product_landings` → `user_id = auth.uid()`. `clients`/`opportunities` → `is_agency_member(user_id)`.

## 3. O que o envio cria
Sim, em uma única transação:
1. `product_landing_leads` (1 registro);
2. cliente e oportunidade via `ensure_client_and_opportunity_for_lead(user_id, nome, telefone, email, destino)`:
   - `clients`: `status='lead'`, `last_interaction_at=now()`;
   - `opportunities`: `destination` = destino da landing, `passengers_count=1`, `estimated_value=0`, `notes='Criada automaticamente a partir de lead recebido.'`;
   - funil/etapa: **primeira coluna do funil do titular** — `pipeline_stages` do `user_id` ordenado por `position ASC`; `stage_id` = essa etapa e `stage` = `legacy_key` (fallback `'new_contact'`). Não é um funil separado de leads.
3. Contador `agency_product_landings.leads_count` +1 **somente se não estiver em modo de teste** (`test_mode_until > now()` → `is_test=true` e contador não sobe).
4. Efeitos colaterais de triggers em `opportunities`: `update_client_last_interaction`, `sync_opportunity_stage_text`, `trg_auto_create_operation` (só dispara operação em etapa de fechamento).

## 4. Deduplicação e idempotência
- **Idempotência**: `idempotencyRef` gerado uma vez por montagem do formulário; se já existe lead com `landing_id + idempotency_key`, retorna `{success:true, duplicate:true}` sem gravar nada novo.
- **Janela anti-duplicidade**: mesmo `landing_id` + telefone normalizado (`_normalize_phone`) nos **últimos 30 minutos** → retorna `duplicate:true` e não cria lead, cliente nem oportunidade.
- **Reaproveitamento de cliente**: sempre que existir cliente do mesmo `user_id` com telefone normalizado igual (o mais antigo); nesse caso só atualiza `last_interaction_at` e completa `email` se estava vazio. Fora da janela de 30 min, **cria nova oportunidade** para o cliente existente (não deduplica oportunidade).
- Front-end: `submittingRef` bloqueia duplo clique; em duplicate a tela de sucesso aparece igual (usuário não percebe).
- Validações que rejeitam antes de gravar: nome curto/longo, telefone fora de 10–15 dígitos, e-mail inválido, consentimento não aceito.

## 5–8. Como a agência é avisada (implementado vs. não implementado)

**Implementado e comprovado**
- **Realtime + pop-up in-app**: `product_landing_leads` está na publicação `supabase_realtime` (verificado em `pg_publication_tables`). `src/hooks/useLeadAlerts.ts` abre canal `leads-realtime-<userId>` com filtro `user_id=eq.<userId>` e `NewLeadAlertProvider` (montado no `App.tsx`, envolve toda a app) exibe o modal "Novo Lead Recebido" com nome, telefone, destino (aqui = `product_key`), data/hora, som suave, botões: "Entrar em contato" (abre wa.me e marca `attended_at`), "Visualizar Lead" (navega para `/meus-leads`) e "Fechar".
- **Sino de notificações + contador**: `NotificationsDropdown.tsx` e `LeadsAwaitingCard.tsx` usam `useLeads()` (que inclui `product_landing_leads`) → contador de não lidos e "Leads aguardando atendimento".
- **Modo teste**: leads `is_test` **também** notificam (nenhum filtro de `is_test` no realtime/queries) — validação de CRM/notificação preservada, métrica comercial não.

**Somente dado / parcial**
- O clique em "Visualizar Lead" leva a `/meus-leads`, mas o hub `CaptacaoLeads.tsx` usa `useAllLeads.ts`, que consulta apenas `lead_captures` e `sales_landing_leads` — **não lista `product_landing_leads`**. O lead existe e é contado no sino, mas não aparece na lista do hub.
- No pop-up, `sourceBadge()` não trata `product_landing`: cai no `else` e rotula erroneamente "Página de Vendas Personalizada".
- O rótulo "destino" no pop-up mostra o `product_key` (`transamerica-comandatuba`), não o destino comercial.

**NÃO implementado** (nenhuma evidência em código, funções ou Edge Functions)
- E-mail de aviso de novo lead (só existem `send-crm-email` e `stripe-webhook`, sem gatilho de lead).
- Push/web push, WhatsApp automático para o agente, SMS, webhook externo.
- Preferências/filtros de notificação por usuário ou por landing.
- Roteamento/atribuição de responsável: notificação e RLS são sempre do **titular** (`user_id` da landing). Membros de equipe só veem se operarem sob a sessão do titular (RLS de leads é `user_id = auth.uid()`, sem `is_agency_member`).

**Situações em que o lead é criado e a agência NÃO é notificada**
1. Titular sem nenhuma aba da plataforma aberta no momento do insert: sem pop-up (não há fila de notificações persistente nem e-mail); só verá o contador no sino ao entrar.
2. Membro de equipe com usuário próprio: RLS não devolve o lead → nem contador nem pop-up.
3. Lead duplicado (idempotency ou janela de 30 min): visitante vê sucesso, agência não recebe nada — comportamento intencional, mas cego se o cliente mudou informações.
4. Ao ir para `/meus-leads`, o lead não é encontrado na lista (lacuna do `useAllLeads`).

## 9. Evidências
- Front: `QuoteFormSection.tsx`, `usePublicProductLanding.ts`, `ProductLandingResolver.tsx`, `landingProducts.ts`, `App.tsx`, `useLeadAlerts.ts`, `NewLeadAlertProvider.tsx`, `NotificationsDropdown.tsx`, `LeadsAwaitingCard.tsx`, `CaptacaoLeads.tsx`, `useAllLeads.ts`, `useProductLandings.ts`.
- Banco: RPCs `submit_product_landing_lead`, `get_public_product_landing`, `track_product_landing_view`, `ensure_client_and_opportunity_for_lead`, `_normalize_phone`; tabelas `agency_product_landings`, `product_landing_leads`, `product_landing_views`, `clients`, `opportunities`, `pipeline_stages`; policies citadas no item 2; triggers de `opportunities`; publicação `supabase_realtime`.
- Doc: `docs/homologacao-landings-produto.md`.

## Ponto de atenção de segurança (não corrigido, apenas relatado)
`ensure_client_and_opportunity_for_lead` é SECURITY DEFINER e tem EXECUTE concedido a `anon`/`authenticated`, recebendo `_user_id` como parâmetro. Em teoria, qualquer visitante pode chamá-la diretamente e criar cliente + oportunidade em qualquer agência cujo `user_id` conheça. A RPC pública de lead não expõe isso, mas o grant direto é uma superfície indevida.

## Fluxo cronológico
```text
visitante abre comandatuba.proximaviagem.tur.br/<slug-da-agencia>
  → get_public_product_landing resolve agência ativa (marca, WhatsApp, horários)
  → track_product_landing_view (dedupe por sessão/dia; is_test se homologação)
visitante preenche e envia formulário
  → validação no front (nome, WhatsApp, e-mail, consentimento)
  → RPC submit_product_landing_lead (definer) revalida tudo no servidor
  → resolve tenant pelo slug+produto (ignora qualquer user_id do cliente)
  → checa idempotency_key e telefone nos últimos 30 min → se duplicado, para aqui
  → reaproveita ou cria cliente (status lead)
  → cria oportunidade na 1ª etapa do funil do titular
  → grava product_landing_leads (+ metadados/UTM) e soma leads_count (se não for teste)
  → realtime INSERT (filtro user_id) chega ao titular logado
  → pop-up "Novo Lead Recebido" + som + contador no sino
ação da agência: "Entrar em contato" (WhatsApp, marca attended_at)
  ou "Visualizar Lead" (/meus-leads — hoje não lista leads de landing de produto)
  ou tratar a oportunidade no CRM/Oportunidades
```

## Se quiser, o próximo passo (não executado)
Correções sugeridas, todas fora do escopo desta auditoria: incluir `product_landing_leads` em `useAllLeads`, tratar o badge `product_landing` no pop-up, exibir destino comercial em vez de `product_key`, revogar EXECUTE de `anon` em `ensure_client_and_opportunity_for_lead` e avaliar e-mail de aviso de novo lead.
