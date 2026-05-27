# Novo Módulo "Operações" na Gestão de Clientes

Criar um módulo de pós-venda operacional (funil Kanban) dentro de Gestão de Clientes, **sem alterar** Clientes, Oportunidades ou Meta de Vendas.

## 1. Banco de Dados (migration única, não-destrutiva)

### Tabela `operations`
- `id`, `user_id`, `client_id` (FK clients), `opportunity_id` (FK opportunities, nullable)
- `quote_id`, `itinerary_id`, `trip_id` (carteira digital) — todos nullable
- `title` (texto curto, ex: "Maldivas - Família Silva")
- `destination`, `travel_start_date`, `travel_end_date`
- `passengers_count`, `sale_amount`
- `stage` (texto: `venda_confirmada` | `emissao` | `documentacao` | `entrega` | `pre_embarque` | `em_viagem` | `pos_viagem` | `finalizado`)
- `priority` (`normal` | `alta` | `urgente`)
- `payment_status` (`pendente` | `parcial` | `pago`)
- `assigned_user_id`, `notes`, `position` (ordenação no Kanban)
- `stage_entered_at`, `created_at`, `updated_at`

### Tabela `operation_tasks` (checklists por etapa)
- `id`, `operation_id`, `stage`, `label`, `is_done`, `done_at`, `done_by`, `position`

### Tabela `operation_timeline` (eventos automáticos + manuais)
- `id`, `operation_id`, `user_id`, `event_type`, `description`, `metadata` (jsonb), `created_at`

### Tabela `operation_attachments`
- `id`, `operation_id`, `user_id`, `file_url`, `file_name`, `file_type`, `category` (voucher/comprovante/documento), `created_at`

### Storage bucket `operation-files` (privado, com RLS por user_id)

### Triggers/RLS
- RLS estrita por `auth.uid() = user_id` em todas as tabelas.
- Trigger `on_opportunity_closed_create_operation`: quando `opportunities.stage` mudar para `closed`, cria automaticamente uma `operation` vinculada (se ainda não existir uma para essa opportunity_id), na coluna `venda_confirmada`. Idempotente.
- Trigger registra evento na `operation_timeline` em cada mudança de stage.
- Trigger `update_updated_at_column` padrão.
- GRANTs corretos para `authenticated` e `service_role`.

**Compatibilidade**: nada altera as tabelas existentes (`clients`, `opportunities`, `quotes`, `itineraries`, `trips`). O trigger só adiciona registros em `operations`.

## 2. Frontend — Nova aba

### `src/pages/GestaoClientes.tsx`
Adicionar 4ª aba "Operações" (ícone `Briefcase` ou `Plane`) ao lado de Meta de Vendas, com rota `/gestao-clientes/operacoes`.

### Componentes novos em `src/components/crm/operations/`
- `OperationsModule.tsx` — container com toggle Kanban/Calendário.
- `OperationsKanban.tsx` — Kanban com 8 colunas fixas (padrão visual idêntico ao `KanbanBoard` atual).
- `OperationCard.tsx` — card com nome do cliente, destino, data, passageiros, valor, badges (urgente, doc. pendente, pgto. pendente, viagem próxima), contador "Embarque em X dias".
- `OperationDetailDialog.tsx` — drawer/dialog lateral com tabs:
  - **Visão geral**: dados principais, links rápidos para Carteira Digital / Roteiro / Orçamento, copiar link, abrir WhatsApp.
  - **Checklist**: tarefas da etapa atual (predefinidas + custom).
  - **Timeline**: eventos automáticos e notas manuais.
  - **Anexos**: vouchers, comprovantes, documentos.
- `OperationsCalendar.tsx` — visualização mensal mostrando embarques/retornos (usa mesma lib de calendário do `Agenda.tsx`).
- `OperationStageColumn.tsx` — coluna do Kanban.

### Hook `src/hooks/useOperations.ts`
CRUD + reorder + mudança de stage + checklists + timeline + anexos via React Query.

### Checklists predefinidos
Criar constantes em `src/types/operations.ts` com checklists sugeridos por etapa (conforme briefing — venda confirmada, emissão, documentação, entrega, pré-embarque, etc.). Ao criar uma operação ou mover de etapa, materializar essas tasks em `operation_tasks` para o usuário marcar.

## 3. Integrações com módulos existentes

### Dashboard / Próximas Viagens
Atualizar `src/pages/Dashboard.tsx` (e/ou hook `useTrips`) para incluir operações ativas com `travel_start_date` futuro na seção "Próximas Viagens". Mostrar: cliente, destino, data, dias restantes.

### Agenda
Em `src/pages/Agenda.tsx`, adicionar eventos derivados de `operations` (embarques + retornos). Click no evento abre o `OperationDetailDialog`.

### Menu / Navegação
- `src/config/menuConfig.ts`: adicionar `{ key: "operacoes", label: "Operações" }` em `clientes`.
- Atualizar `App.tsx` se necessário para a rota `/gestao-clientes/operacoes`.

## 4. UX/UI
- Reaproveitar tokens, espaçamentos, tipografia, estilo de cards e animações do `KanbanBoard` atual.
- Badges seguem `STAGE_COLOR_PALETTE` existente.
- Mobile: scroll horizontal suave, drag via `@dnd-kit` (mesmo padrão do Kanban atual de Oportunidades).
- Empty state: "Nenhuma operação ainda. Feche uma oportunidade para começar."

## 5. Notificações (somente arquitetura)
Adicionar coluna `notification_preferences` (jsonb) em `operations` com placeholders para `whatsapp`, `email`, `pre_embarque_alert`, `pos_viagem_alert`. Sem disparos automáticos nesta entrega — somente a estrutura.

## Resumo

```text
DB:
  + table operations (+ trigger on opportunity closed)
  + table operation_tasks
  + table operation_timeline
  + table operation_attachments
  + storage bucket operation-files
  + RLS + GRANTs

Frontend:
  + src/types/operations.ts
  + src/hooks/useOperations.ts
  + src/components/crm/operations/{OperationsModule,OperationsKanban,OperationCard,OperationDetailDialog,OperationsCalendar,OperationStageColumn}.tsx
  ~ src/pages/GestaoClientes.tsx (nova aba)
  ~ src/config/menuConfig.ts (submenu)
  ~ src/pages/Dashboard.tsx + src/pages/Agenda.tsx (integração leve)
```

Aprova esse plano para eu rodar a migration e implementar?
