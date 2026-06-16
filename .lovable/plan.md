# CRM Collaborator Visibility Fix — Phase 1 (applied)

## Problem
DB trigger `trg_force_user_id_agency` forces `user_id` to the agency master id on insert. Frontend hooks filtered by `auth.uid()` (collaborator id) → collaborator never saw records.

## Fix applied (frontend only)
- New `src/hooks/useAgencyOwnerId.ts`: reads `agency_membership.agency_id` for the current user; falls back to `user.id` when no row / on error so masters always work.
- `useCRM.ts` (`useClients`, `useOpportunities`, `useSalesGoals`): SELECTs now filter by `agencyOwnerId`; INSERTs explicitly set `user_id = agencyOwnerId`; query keys are `[name, agencyOwnerId, user.id]` for cache isolation between sessions/users.
- `usePipelineStages.ts`: SELECT + seed RPC + INSERTs use `agencyOwnerId`. RPC signature confirmed: `seed_default_pipeline_stages(_user_id uuid)`.
- `useOperationStages.ts`: same treatment. RPC `ensure_default_operation_stages(_user_id uuid)` confirmed.

## Not changed in this phase
- No SQL / RLS / triggers / Edge Functions touched.
- `useOperations.ts` left as-is (already relies on RLS, no `user_id` filter — collaborators already see operations).
- `useSalesStats`, `useClientDetails` trip mutations, `useFinancial.ts`, `useAgenda.ts` not touched.
- `opportunity_followups` visibility = Phase 2 (needs RLS/shared behavior decision).
- `trips` visibility = Phase 2.
- `owner_user_id` / ownership transfer / advanced history = Phase 2 (structural changes).

## Rollback
Revert the 4 files: `src/hooks/useAgencyOwnerId.ts` (delete), `src/hooks/useCRM.ts`, `src/hooks/usePipelineStages.ts`, `src/hooks/useOperationStages.ts`.

## Manual test checklist
- Master: clients/opportunities/pipeline stages/operations stages/sales goals all visible — unchanged behavior.
- Collaborator: creates client → sees it immediately; opens funnel → sees stages; creates opportunity → lands in first stage and is visible; sets monthly goal → visible to self and master.
- Master sees what collaborator created (already worked, regression check).
- Financeiro: no changes (sales stats untouched).
