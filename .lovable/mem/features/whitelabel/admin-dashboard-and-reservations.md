---
name: White-label admin dashboard e Central de Reservas
description: Dashboard operacional /gestao (RPC única, sem valores), paginação server-side de reservas e permissões reservations.*
type: feature
---

Painel white label (`/gestao`) — Etapa 4.

- Home (`AgencyAdminHome.tsx`) consome APENAS `get_agency_admin_dashboard(_time_zone)` via `useAgencyAdminDashboard`: pendências, meu dia (agenda + follow-ups), próximas viagens, continue de onde parou e contadores. A home NUNCA exibe valores financeiros.
- Central de Reservas (`ReservasTab.tsx`) usa `travel_files_page` (busca, status, período, responsável, página, ordenação) com busca debounced de 300ms; nada de filtro em memória. Valores só aparecem com `can.revenue` do servidor.
- Escritas do file passam só por RPCs seguras: `travel_file_set_status` (motivo obrigatório no cancelamento), `travel_file_set_responsibles`, `travel_file_service_save`, `travel_file_note_add/delete`.
- Permissões: `reservations.view`, `reservations.manage`, `reservations.assign` (catálogo em `src/lib/teamPermissions.ts`); finanças seguem `financial.view_revenue`, `financial.view_margin`, `financial.commissions.*`.
- Navegação sempre por `useAdminNav()`; Comunidade, Academy, Notícias e gamificação continuam fora do painel.
