# Módulo: Equipe e Permissões

[← Índice](../00-LEIA-ME-E-INDICE.md)

- **Rota:** `/minha-conta` (aba Equipe).
- **Estado:** CONFIRMADO.

## Funcionalidades
- Cadastro de membros (`agency_team_members`) com senha (`agency_team_member_secrets`).
- Permissões por módulo (`agency_team_permissions`) e por estágio do funil (`agency_team_stage_permissions`).
- Sessões dedicadas (`agency_team_sessions`).
- Auditoria (`agency_team_audit_log`).
- Login isolado via `team-login`/`team-resolve-login`/`team-session`.

## Evidências
`src/components/team/*`, `src/lib/teamPermissions.ts`, `src/contexts/TeamSessionContext.tsx`, Edge Functions `team-*`.