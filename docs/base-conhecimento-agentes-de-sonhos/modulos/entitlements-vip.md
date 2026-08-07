# Módulo: Entitlements VIP (capacidades por agência)

[← Índice](../00-LEIA-ME-E-INDICE.md)

- **Estado:** CONFIRMADO (Fase 1 implementada).
- **Conceito:** camada de *capabilities* concedidas por AGÊNCIA, separada de plano de assinatura e de permissões por usuário.

## Premium != VIP

`subscription_plan` (Start, Profissional, Premium, Fundador, etc.) continua controlando o produto SaaS padrão.
O pacote **VIP** (site administrado/integrado no domínio da agência + Área do Cliente) é comercial e **não** é liberado por plano.
Nenhum usuário Premium recebe VIP automaticamente: a concessão é sempre manual, por agência, no Admin.

Também é distinto de `user_feature_access`, que é aditivo e **por usuário** — não herda para a equipe.

## Banco

Tabela `public.agency_entitlements`:
`id`, `agency_id`, `entitlement_key`, `is_active`, `starts_at`, `ends_at`, `granted_by`, `notes`, `created_at`, `updated_at`.
Unique `(agency_id, entitlement_key)`; índices por `agency_id`, por `(entitlement_key, is_active)` e parcial `(agency_id, entitlement_key) WHERE is_active`.
Trigger `update_updated_at_column`.

Chaves iniciais:
- `vip_client_portal` — Área do Cliente VIP / site integrado.
- `booking_requests` — Pedidos de reserva pelo orçamento web.

Funções (SECURITY DEFINER, `search_path = public`, EXECUTE apenas para `authenticated`/`service_role`):
- `agency_has_entitlement(_agency_id uuid, _key text) → boolean`
- `current_agency_has_entitlement(_key text) → boolean`
- `current_agency_entitlements() → (entitlement_key, ends_at)`

Vigência: ativo quando `is_active` e `starts_at IS NULL OR <= now()` e `ends_at IS NULL OR > now()`.

## RLS

- SELECT: agência própria (`agency_id = auth.uid()` ou `= current_agency_id()`) ou admin.
- INSERT/UPDATE/DELETE: somente `has_role(auth.uid(), 'admin')`. O titular **não** pode se auto-conceder VIP.

## Frontend

- `src/hooks/useAgencyEntitlements.ts` — `hasAgencyEntitlement('vip_client_portal')`, resolve a agência via `useAgencyOwnerId` e a RPC `current_agency_entitlements` (titular e equipe compartilham `agency_id`).
- `src/components/permissions/AgencyEntitlementGate.tsx` — gate de UI, sem acoplamento a `useSubscription.hasFeature`.

## Admin

`Admin → Usuários`: botão coroa (âmbar) na linha do titular abre "Pacote VIP", com switch por entitlement, vigência opcional (início/fim) e notas internas.

## Fase 2 — Preparar orçamentos para seleção de serviços

Entitlement usado: `booking_requests`. Sem ele, nada muda para a agência.

### Banco
- `quotes.booking_requests_enabled` (bool, default `false`), `quotes.booking_disclaimer` (texto padrão de reconfirmação), `quotes.booking_deadline` (date, opcional).
- Trigger `trg_enforce_quote_booking_entitlement`: bloqueia persistir `booking_requests_enabled = true` sem entitlement ativo na agência (resolvida por `resolve_agency_id_for_user`). Não depende da UI.
- `quote_services.selection_mode` (`optional` | `required` | `alternative` | `free`, default `optional`) e `quote_services.choice_group_id`.
- `quote_service_choice_groups` (quote_id, user_id, title, group_type, min_select, max_select, order_index) com RLS por dono do orçamento, sem acesso `anon`.
- Triggers de integridade:
  - `trg_normalize_quote_choice_group`: força `min_select=1/max_select=1` em grupos `alternative` e carimba `user_id` do dono do orçamento.
  - `trg_enforce_quote_service_selection_rules`: exige grupo para `alternative`/`free`, garante grupo do MESMO orçamento e tipo compatível; limpa `choice_group_id` em `optional`/`required`.
  - `trg_reset_services_on_choice_group_delete`: ao excluir grupo, serviços voltam para `optional` (nada é apagado).
- Desativar o recurso no orçamento NÃO apaga grupos nem modos — a configuração fica pronta para reativação.

### Link público
`get_quote_by_public_code` agora retorna `choice_groups` e, dentro de `quote`, uma flag **efetiva**: `booking_requests_enabled` só é `true` quando o orçamento está marcado E a agência tem o entitlement ativo. `selection_mode` / `choice_group_id` vêm em cada serviço. Backward-compatible: nenhuma chave anterior mudou. Esta fase NÃO renderiza seleção no público.

### Editor
`src/components/quote/QuoteBookingRequestSettings.tsx` aparece em Configurar apresentação → Avançado, apenas com `hasAgencyEntitlement('booking_requests')`. Toggle, prazo, disclaimer editável, criação/renomeação/exclusão de grupos e modo de seleção por serviço. Regras puras em `src/lib/quoteBookingRules.ts` (testadas em `src/test/quote-booking-rules.test.ts`).

### Correção da Fase 1
O dialog de VIP no admin passou a receber `userId` e resolver o titular real via RPC `admin_resolve_agency_owner` (usa `agency_membership` e `agency_team_members.auth_user_id`). Se o usuário selecionado for membro de equipe, o entitlement é concedido ao titular e o dialog avisa isso — nunca cria entitlement para user_id de membro.

### Hardening da Fase 2

- `admin_resolve_agency_owner` não referencia mais `profiles.email` (coluna inexistente). O `owner_email` é lido de `auth.users` por subselect explícito, apenas dentro dessa RPC admin `SECURITY DEFINER` (checagem `has_role(auth.uid(),'admin')` no topo). Se o titular não tiver `profiles`, a função ainda retorna o `agency_owner_id` resolvido com nome/agência nulos. Não há sessão admin disponível no ambiente de exec (psql roda em role restrita que não executa funções), então a validação foi feita por inspeção da definição — a execução real precisa de uma sessão de admin no app.
- Equipe autorizada: adicionadas policies escopadas por agência em `quote_service_choice_groups` e `quote_services`. Leitura exige `can_team('quotes.view')`, escrita exige `can_team('quotes.edit')`, e ambas exigem `quotes.user_id = resolve_agency_id_for_user(auth.uid())` — nunca `can_team()` isolado. Somente role `authenticated`; nenhuma escrita para `anon`. Policies do proprietário permanecem intactas. `quote_sections` não foi alterado.
- Trigger de entitlement revisado: valida somente a transição `false -> true` (e inserts com `true`). Se o entitlement expirar depois, a flag persistida continua, mas `get_quote_by_public_code` já devolve a flag efetiva `false` — o público não expõe o recurso.

## Fase 3 — Domínio do pedido de reserva + submissão pública

Regra fundamental: **pedido != reserva confirmada**. O cliente solicita; a agência reconfirma disponibilidade e valores.

### Tabelas
- `quote_booking_requests`: protocolo `PR-YYYYMMDD-XXXXXXXX` (gerado no servidor), `version`/`root_request_id`, `status` (12 estados da máquina futura), contato do cliente, `disclaimer_accepted_at` + `disclaimer_text_snapshot`, `currency`, `total_estimated`, `revised_total`/`client_final_accepted_at` (fases futuras), `expires_at` derivado do `booking_deadline`, `idempotency_key` UNIQUE, `public_access_token` UNIQUE, `source_ip_hash` (SHA-256, IP cru nunca é salvo). Índices: `quote_id`, `agency_id+status`, `opportunity_id`, `(quote_id, lower(trim(client_email)))` e UNIQUE parcial `(root_request_id, version)`.
- `quote_booking_request_items`: `snapshot jsonb` da linha real de `quote_services` no envio + `amount_snapshot`, `selection_mode_snapshot`, `choice_group_snapshot`, `quantity` (MVP sempre 1). `source_quote_service_id` é `ON DELETE SET NULL` para o histórico sobreviver. Trigger `trg_booking_item_snapshot_immutable` bloqueia alteração de request/origem/tipo/nome/snapshot/valor/modo/grupo/quantidade; só campos de análise (`review_status`, `revised_amount`, `replacement_snapshot`, `agency_note`, `client_accepted`, `operation_service_id`) podem mudar.
- `quote_booking_request_events`: append-only. Trigger `trg_booking_events_append_only` rejeita UPDATE/DELETE e não existe policy de escrita — só `service_role`/RPC insere.

### RLS
Zero acesso `anon` nas três tabelas. `authenticated` só tem SELECT (titular, admin, ou equipe com `quotes.view` **e** `agency_id = resolve_agency_id_for_user(auth.uid())`). O único UPDATE liberado é nos itens, para titular ou equipe com `quotes.edit`, e ainda assim os snapshots são imutáveis pelo trigger.

### RPC `submit_quote_booking_request`
`SECURITY DEFINER`, `REVOKE` de PUBLIC/anon/authenticated e `GRANT EXECUTE` só para `service_role`. Recebe `agency_slug` + `public_access_code` (nunca `quote_id` do browser) e resolve tudo no banco:
1. Replay da mesma `idempotency_key` devolve o mesmo pedido/protocolo/token, sem duplicar itens/eventos (garantia real pelo UNIQUE, não só pela aplicação).
2. Exige `status='published'`, slug da agência conferido pelo mesmo algoritmo do link público, `booking_requests_enabled` **e** entitlement ativo no momento do envio, `booking_deadline` válido até o fim do dia, aceite do disclaimer e presença de nome/e-mail/WhatsApp.
3. Normaliza a seleção: dedup, descarta ids de outro orçamento, inclui automaticamente os `required`. Grupos `alternative` exigem exatamente 1; grupos `free` respeitam `min_select`/`max_select`.
4. Snapshot criado das linhas reais; `total_estimated = sum(amount_snapshot * quantity)`; `currency` e `disclaimer_text_snapshot` vêm do orçamento.
5. Versionamento com `SELECT ... FOR UPDATE` na linha do quote (serializa concorrência): se existir pedido não-terminal do mesmo quote + mesmo `lower(trim(email))`, reutiliza `root_request_id`, `version = max+1`, marca o anterior como `superseded` e registra evento nele. Estados terminais (`converted`, `cancelled`, `expired`, `superseded`) e, por decisão conservadora, `accepted`, iniciam nova raiz com `version=1`.
6. Eventos: `request_received` (versão, nº de itens, total, moeda) e `request_superseded` (aponta para a nova versão). Sem PII desnecessária no payload.

### Edge Function `submit-booking-request`
`verify_jwt = false` no `config.toml`, CORS padrão, rate limit de 8/min por IP via `_shared/rate-limiter.ts`. Validação pura em `validate.ts` (slug, código, até 100 uuids válidos, nome, e-mail, WhatsApp 10–15 dígitos, notas ≤ 2000, `idempotency_key` `[A-Za-z0-9._:-]{8,120}`), chamada da RPC com service role e `source_ip_hash` = SHA-256 de `IP_HASH_SALT` (fallback: service-role key) + IP. Resposta pública mínima: `request_id`, `protocol`, `version`, `status`, `total_estimated`, `currency`, `public_access_token`, `duplicate` e mensagem explicando que não é confirmação. Erros nunca vazam SQL/schema.

### Tipos e testes
`src/types/bookingRequest.ts` (status, itens, eventos, resposta pública). Testes em `src/test/booking-request-payload.test.ts`. Fase 3 não inclui UI pública, e-mails, painel de análise, proposta revisada, Operações ou Área do Cliente.
