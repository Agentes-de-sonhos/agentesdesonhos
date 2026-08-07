# Jornada VIP: site integrado, Área do Cliente e Pedido de Reserva pelo orçamento web

## 1. Diagnóstico da arquitetura atual (verificado)

- `quotes`: dono em `user_id`, publicação por `status='published'` + `share_token` + `public_access_code`; flags de apresentação (`show_detailed_prices`, `use_service_payment`, `hide_investment_total`, `investment_summary_layout`). Não existe hoje nenhum campo/tabela de reserva.
- `quote_services`: `quote_id`, `service_type`, `service_data jsonb`, `amount`, `order_index`, `section_id`, `option_label`, campos de pagamento por serviço. Não há campos de obrigatoriedade nem agrupamento de alternativas.
- `quote_sections`: agrupamento visual por seção, com RLS pública de leitura para orçamentos publicados.
- Leitura pública é feita pela RPC `get_quote_by_public_code(p_agency_slug, p_code)` (SECURITY DEFINER), consumida por `src/pages/OrcamentoPublicoV2.tsx` → `OrcamentoPublico.tsx`.
- `opportunities` → trigger `auto_create_operation_on_close` cria `operations` quando a oportunidade entra em `closed` (payment_status `pendente`).
- `operations` referencia `quote_id`/`opportunity_id`; `operation_services` guarda `source_quote_service_id` e os status de execução `is_confirmed/is_paid/is_issued/is_delivered`. `useOperationServices.ts` já faz import idempotente do orçamento por `source_quote_service_id`.
- Entitlement hoje: `subscriptions.plan` (enum `subscription_plan`), `user_feature_access` (grants por usuário, aditivos, lidos em `useFeatureAccess`), e equipe via `agency_membership`/`current_agency_id()` + `agency_team_members`. `useSubscription.hasFeature` libera tudo para admin, promotor e membros de equipe.
- Padrão de escrita pública já existente: Edge Function `verify_jwt = false` + `_shared/rate-limiter.ts` + RPC SECURITY DEFINER + `idempotency_key` (ver `submit-lead-form`). E-mails por Edge Function (`product-landing-lead-emails`).

Conclusão: o novo domínio encaixa como camada entre `quotes` e `operations`, reaproveitando RPC pública, rate limiter e o import idempotente já existente em `operation_services`.

## 2. Decisões arquiteturais recomendadas

1. **Entitlement VIP em nível de agência, não de plano.** Nova tabela `agency_entitlements` (chave `agency_id` + `entitlement_key`, ex.: `vip_client_portal`, `booking_requests`), com vigência e concessão por admin. Motivo: `subscription_plan` é por usuário e alterar Premium contaminaria assinantes atuais; `user_feature_access` também é por usuário e não herda para equipe. A checagem passa por uma função `public.agency_has_entitlement(_agency_id, _key)` (SECURITY DEFINER) e um hook `useAgencyEntitlements`, aditivo a `hasFeature`. Membros de equipe herdam via `current_agency_id()`.
2. **Pedido como entidade própria e imutável** (`quote_booking_requests` + itens), com snapshot completo de serviço e valor. Nada de recomputar a partir de `quote_services`.
3. **Versionamento por novo pedido**, nunca update destrutivo: cada envio cria `version = max+1` e mantém os anteriores; a versão anterior vira `superseded`.
4. **Proposta revisada como nova versão do mesmo pedido-raiz** (`root_request_id`), exigindo aceite explícito do cliente registrado em campo dedicado + evento.
5. **Portal único VIP**: rota `/{agency_slug}/area-do-cliente/{portal_token}` resolvendo por token de cliente, agregando orçamentos, pedidos, propostas e operação. Os links por orçamento continuam funcionando (fallback não-VIP).
6. **Escrita pública sempre via Edge Function sem JWT + RPC SECURITY DEFINER**, com rate limit e idempotência — nunca INSERT direto do anon.
7. **Transição para Operações somente por RPC dedicada**, chamada quando o item está `approved` e (se houve revisão) aceito.

## 3. Modelo de dados proposto

- `agency_entitlements(id, agency_id, entitlement_key text, is_active bool, starts_at, ends_at, granted_by, notes, created_at, updated_at)` — unique `(agency_id, entitlement_key)`.
- `quote_booking_settings` (ou colunas em `quotes`): `booking_requests_enabled bool`, `booking_disclaimer text`, `booking_deadline date`. Recomendação: colunas em `quotes` (menos joins na RPC pública).
- `quote_services` (aditivo, defaults seguros): `selection_mode text default 'optional'` (`optional|required|free`), `choice_group_id uuid null`, `min_qty int`, `max_qty int`.
- `quote_service_choice_groups(id, quote_id, title, order_index, min_select int default 1, max_select int default 1)` — modela “alternativa: escolha 1 de N”.
- `quote_booking_requests(id, root_request_id, version int, quote_id, user_id (agência), agency_id, client_id null, opportunity_id null, protocol text unique, status text, client_name, client_email, client_whatsapp, client_notes, disclaimer_accepted_at, disclaimer_text_snapshot, currency, total_estimated numeric, revised_total numeric null, client_final_accepted_at null, expires_at, idempotency_key text, source_ip_hash, created_at, updated_at)` — unique `(root_request_id, version)`, unique `idempotency_key`, índices em `quote_id`, `agency_id, status`, `protocol`.
- `quote_booking_request_items(id, request_id, source_quote_service_id null, service_type, name, supplier, destination, start_date, end_date, snapshot jsonb, amount_snapshot numeric, quantity int default 1, choice_group_id null, review_status text default 'pending', revised_amount numeric null, replacement_snapshot jsonb null, agency_note text, client_accepted bool null, operation_service_id uuid null, created_at, updated_at)` — unique `(request_id, source_quote_service_id)` quando não nulo; unique parcial em `operation_service_id` evita duplicidade em Operações.
- `quote_booking_request_events(id, request_id, item_id null, actor_type text (client|agency|system), actor_user_id null, actor_team_member_id null, event_type text, payload jsonb, created_at)` — append-only, sem UPDATE/DELETE.
- `quote_booking_notifications(id, request_id, channel text default 'email', recipient text, template text, status text, provider_message_id, dedupe_key text unique, created_at)` — canal preparado para WhatsApp na fase 2.
- `client_portal_access(id, agency_id, client_id, portal_token text unique, last_seen_at, revoked_at, created_at)` — Área do Cliente.

## 4. Máquinas de estado

Pedido: `received → under_review → awaiting_reconfirmation → (approved | partially_approved | unavailable) → awaiting_client_acceptance → accepted → converted` e ainda `cancelled`, `expired`, `superseded`. Transições apenas por RPC, cada uma gravando evento.

Item: `pending → available | unavailable | repriced | replaced`; depois `approved`/`rejected`; e, quando exigir aceite, `client_accepted true/false`. Só `approved` + (aceite quando necessário) habilita conversão.

Execução operacional continua separada em `operation_services` (`is_confirmed/is_paid/is_issued/is_delivered`) — sem mistura com status de solicitação.

## 5. Fluxos UX

- **Agência (montagem)**: nova etapa/painel no editor de orçamento (`GerarOrcamento.tsx` + `QuoteAdvancedSettings.tsx`) para ligar o recurso, definir modo por serviço e criar grupos de alternativa. Visível somente com entitlement VIP.
- **Cliente (orçamento web/portal)**: checkbox/radio nos cards (`ServiceCard.tsx`), validação de obrigatórios e de grupos, barra fixa “N selecionados · Revisar pedido”, tela de revisão com valores, dados de contato, observações, aceite obrigatório do aviso e CTA “Enviar pedido de reserva”, seguida de tela de protocolo.
- **Agência (análise)**: nova aba em Gestão de Clientes → “Pedidos de reserva”, com lista por status e um painel item a item (disponível/indisponível/valor alterado/substituído), aprovação total ou parcial, geração de proposta revisada e botão “Enviar para Operações”.
- **Área do Cliente**: timeline por versões — orçamento inicial → pedido enviado → análise → proposta revisada → aceite final → viagem confirmada → documentos —, com badges explícitos “Solicitação” vs “Confirmado” e versões antigas em modo somente leitura.

## 6. Integração com Oportunidades e Operações

Ao receber o pedido: vincula à `opportunity` do orçamento (sem mover estágio) e registra evento. Na aprovação final aceita: RPC `convert_booking_request_to_operation` garante a `operation` (reaproveitando a existente por `opportunity_id`/`quote_id`, ou criando) e insere em `operation_services` só os itens elegíveis, gravando `operation_service_id` no item — idempotente, e alinhado ao dedup por `source_quote_service_id` já usado em `useOperationServices.ts`.

## 7. Segurança, RLS, idempotência e auditoria

- Leitura pública por RPC SECURITY DEFINER estendida (`get_quote_by_public_code` passa a expor config de seleção) e nova `get_booking_request_by_protocol`; sem GRANT de `anon` nas novas tabelas.
- Escrita pública por Edge Functions `verify_jwt=false`: `submit-booking-request`, `accept-revised-proposal`, usando `_shared/rate-limiter.ts` e `idempotency_key` único (replay retorna o mesmo protocolo).
- RLS autenticada por agência: `user_id = auth.uid() OR agency_id = current_agency_id()`, respeitando permissões de equipe já existentes; eventos com policy só de INSERT/SELECT.
- Imutabilidade: trigger que bloqueia UPDATE de itens/pedidos em versões `superseded` ou já convertidas.
- Auditoria: todo evento em `quote_booking_request_events`; e-mails com `dedupe_key`.

## 8. Fases de implementação

1. **Fase 0** — Entitlement VIP (tabela, função, hook, admin) e gate de UI.
2. **Fase 1** — Configuração de seleção no orçamento (colunas, grupos, editor).
3. **Fase 2** — Domínio do pedido (3 tabelas + protocolo + RPCs) e Edge Function de envio com idempotência.
4. **Fase 3** — Seleção e revisão no orçamento público + tela de protocolo.
5. **Fase 4** — E-mails cliente/agência com log.
6. **Fase 5** — Painel de análise da agência, aprovação parcial, proposta revisada.
7. **Fase 6** — Aceite final do cliente e conversão para Operações.
8. **Fase 7** — Área do Cliente com timeline e versionamento.
9. **Fase 8** — Preparo (sem ativar) do canal WhatsApp.

## 9. Critérios de aceite do MVP

Recurso invisível para não-VIP; obrigatórios e grupos de alternativa validados; aceite obrigatório antes do envio; protocolo único e reenvio idempotente; e-mails únicos para as duas pontas; aprovação parcial funcional; proposta revisada exigindo aceite; nenhum item entra em Operações sem aprovação (e aceite quando houver mudança); histórico íntegro e versões antigas imutáveis; membros da equipe da agência VIP com acesso correto.

## 10. Riscos e mitigação

- **Contaminação de planos** → entitlement por agência separado do enum de plano.
- **Duplicidade em Operações** → dedup por `source_quote_service_id` + `operation_service_id` único.
- **Divergência de valores** → snapshot obrigatório e proibição de recomputar.
- **Abuso do endpoint público** → rate limit por IP, deadline/`expires_at`, idempotência.
- **Confusão “solicitado vs confirmado”** → vocabulário e badges padronizados no portal.
- **Crescimento de RPC pública** → payload versionado, mantendo compatibilidade com o link atual.

## 11. Testes essenciais

E2E: seleção com obrigatório/alternativa → envio → protocolo; reenvio duplicado devolve mesmo protocolo; novo envio cria versão 2 sem alterar a 1; aprovação parcial + revisão + aceite → só itens elegíveis em Operações; segunda conversão não duplica; acesso ao portal de outro cliente é negado; e-mails não duplicam.
