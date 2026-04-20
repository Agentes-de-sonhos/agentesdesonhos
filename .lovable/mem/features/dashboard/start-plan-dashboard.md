---
name: Start Plan Dashboard
description: Custom dashboard layout for Start (free) plan users at /dashboard-start with upsell sections and limited Academy access
type: feature
---
Usuários do plano **Start** são redirecionados automaticamente após login para `/dashboard-start` (rota dedicada, página `src/pages/StartDashboard.tsx`). Profissional/Premium continuam em `/dashboard`. Admin vai para `/admin`.

## Estrutura do dashboard Start (na ordem):
1. **Header**: saudação + agentes online + gamificação + cotação + notificações + perfil + logout (igual ao /dashboard)
2. **Mapa do Turismo** (`MapaTurismoCard`): grid 5x2 (mobile) / 10 colunas (desktop) com cards quadrados coloridos das 10 categorias. Clique navega para `/mapa-turismo?categoria=<nome>`.
3. **Radar do Turismo + Minha Agenda**: lado a lado (componentes `CuratedNewsFeed` + `UpcomingAgendaEventsCard` reaproveitados).
4. **EducaTravel Academy**: mostra apenas as **3 trilhas mais recentes** (limite real, aplicado também em `/educa-academy` via `visibleTrails = trailsWithProgress.slice(0, 3)` quando `plan === "start"`). Card mostra rodapé com CTA para upgrade.
5. **Materiais de Divulgação** (`MateriaisRecentesCard`): grid responsivo dos últimos 7 dias (4 itens) + botão "Ver todos" → `/materiais`.
6. **+Recursos Plano Profissional** e **+Recursos Plano Premium** (`PlanUpsellSection`): cards coloridos clicáveis → todos navegam para `/planos`. Replica visual do mockup com tags "*Limitado".

## Restrição Academy no plano Start
Aplicada tanto no /dashboard-start quanto em `/educa-academy`. Em /educa-academy, abaixo do grid de trilhas aparece um card pontilhado com `Lock` icon e CTA "Ver planos" quando há mais trilhas que as 3 visíveis.

## Componentes criados
- `src/components/dashboard/start/MapaTurismoCard.tsx`
- `src/components/dashboard/start/MateriaisRecentesCard.tsx`
- `src/components/dashboard/start/PlanUpsellSection.tsx`
- `src/pages/StartDashboard.tsx`

## Roteamento
Em `src/pages/Auth.tsx`, redirect lógica decide entre `/admin`, `/dashboard-start` (start) ou `/dashboard` (demais).
