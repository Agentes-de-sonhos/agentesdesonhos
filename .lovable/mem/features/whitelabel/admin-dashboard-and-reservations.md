---
name: White-label admin dashboard e Central de Reservas
description: Dashboard operacional /gestao (RPC única, sem valores), paginação server-side de reservas e permissões reservations.*
type: feature
---

Painel white label (`/gestao`) — Etapa 4.

- Home (`AgencyAdminHome.tsx`) consome APENAS `get_agency_admin_dashboard(_time_zone)` via `useAgencyAdminDashboard`: pendências, meu dia (agenda + follow-ups), próximas viagens, continue de onde parou e contadores. A home NUNCA exibe valores financeiros. Atalhos abrem fluxos reais (`QuickAddClientDialog`, `CreateOperationDialog`) e há estado de erro com "Tentar novamente".
- Central de Reservas (`ReservasTab.tsx`) usa `travel_files_page(_search,_statuses,_from,_to,_responsible,_unread,_page,_page_size,_sort)`: leitura única (sem tabela temporária, função STABLE), busca por nº do file/cliente/destino/serviço/fornecedor/protocolo/etapa, filtro "não lidas", ordenação (`recent|oldest|updated|travel|number`) e paginação. A URL é a fonte da verdade (`q,status,from,to,resp,unread,sort,page`) com debounce de 300ms; nada de filtro em memória. Valores só aparecem com `can.revenue`.
- Escritas do file passam só por RPCs seguras: `travel_file_set_status` (motivo obrigatório no cancelamento; datas de cancelamento/confirmação/conclusão coerentes e bloqueio de voltar a "Solicitação recebida" após venda confirmada), `travel_file_set_responsibles`, `travel_file_service_save`, `travel_file_note_add/delete`. Responsáveis aceitam apenas colaboradores ativos da própria agência (`private.assert_team_member_of_agency`).
- Permissões: `reservations.view`, `reservations.manage`, `reservations.assign` e `reservations.financial.manage` (sensível) — catálogo em `src/lib/teamPermissions.ts` E em `public.team_permission_catalog`. Permissão de VER valor nunca autoriza ALTERAR: vendido/custo exigem `reservations.financial.manage`, comissão exige `financial.commissions.manage`, reconfirmado é operacional (`reservations.manage`).
- Navegação sempre por `useAdminNav()`; Comunidade, Academy, Notícias e gamificação continuam fora do painel.
