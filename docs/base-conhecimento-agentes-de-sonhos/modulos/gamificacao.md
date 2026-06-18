# Módulo: Gamificação

[← Índice](../00-LEIA-ME-E-INDICE.md)

- **Rota:** `/gamificacao`.
- **Estado:** CONFIRMADO.

## Funcionalidades
- Pontos por ação (`gamification_points`), missões (`gamification_mission_completions`), login diário (`gamification_daily_login`), visitas diárias (`gamification_daily_visits`).
- Conquistas (`achievement_definitions`, `user_achievements`).
- Prêmios mensais (`monthly_prizes`).
- Níveis (0–1200+) com resets de ranking.

## Evidências
`src/pages/Gamificacao.tsx`, `src/components/gamification/*`, `src/lib/gamification.ts`, `src/hooks/useGamification.ts`.