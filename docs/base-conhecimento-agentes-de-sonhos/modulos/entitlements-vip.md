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
