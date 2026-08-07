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
