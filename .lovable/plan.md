# Fase 2 — Permissões Reais e Controle de Acesso

## Princípio fundamental

O sistema tem dois tipos de usuário autenticado:
- **Master (dono da agência)**: sem linha em `agency_team_members` → acesso total irrestrito.
- **Team member**: tem linha em `agency_team_members` + linhas em `agency_team_permissions` / `agency_team_stage_permissions` → acesso filtrado.

Toda checagem deve ser: *"se não for team member → permitido; se for team member → consultar permissão"*.

---

## Etapa 1 — Camada central `usePermissions`

Novo arquivo: `src/hooks/usePermissions.ts`

```ts
const { can, canStage, isTeamMember, isMaster } = usePermissions();
can('clients.edit')               // boolean
canStage('opportunities', stageId, 'move')
```

Implementação encapsula `useTeamSession` e aplica a regra master-bypass. Hook único para todo o app.

Também expõe `useCan(key)` (atalho) e `<PermissionGate permission="…" fallback={…}>`.

---

## Etapa 2 — CRM (aplicação por módulo)

### 2.1 Roteamento `/gestao-clientes/*` (`src/pages/GestaoClientes.tsx`)

Adicionar guard por tab usando `can('dashboard.view')`, `can('clients.view')`, `can('opportunities.view')`, `can('operations.view')`, `can('goals.view')`. Se a tab atual estiver bloqueada, redireciona para a primeira tab permitida. Se nenhuma permitida → `/team-dashboard`.

### 2.2 Clientes — `ClientsModule.tsx` + `useCRM.ts`

| Permissão | Aplicação |
|-----------|-----------|
| `clients.view` | Guard no topo do componente: sem permissão → mensagem "Sem acesso" + não monta lista. Desabilita query `useClients()` via `enabled`. |
| `clients.create` | Esconde botão "Novo Cliente" e "Importar". Bloqueia `createClientMutation` (throw com mensagem padrão). |
| `clients.edit` | Esconde botão Edit. Bloqueia `updateClientMutation`. |
| `clients.delete` | Esconde ícone Delete. Bloqueia `deleteClientMutation`. |

### 2.3 Oportunidades / Kanban — `KanbanBoard.tsx` + `useCRM.ts`

| Permissão | Aplicação |
|-----------|-----------|
| `opportunities.view` | Guard de tela. |
| `opportunities.create` | Esconde "Nova Oportunidade"; bloqueia mutation. |
| `opportunities.edit` | Esconde edit em `OpportunityCard`/`OpportunityDetailsDrawer`; bloqueia `updateOpportunityMutation`. |
| `opportunities.delete` | Esconde delete; bloqueia mutation. |
| `opportunities.generate_quote` / `generate_wallet` | Esconde itens de menu de geração; bloqueia chamadas. |

### 2.4 Operações — `OperationsModule.tsx` + `useOperations.ts`

`operations.view / create / edit / delete` aplicados nos mesmos pontos (botão "Nova Operação", edit, delete, mutations).

### 2.5 Metas — `SalesGoalsModule.tsx`

`goals.view` (guard de tela) e `goals.edit` (esconde edição + bloqueia mutations).

---

## Etapa 3 — Permissões por etapa do funil (Kanban)

No `KanbanBoard.tsx`:

- **Filtragem de colunas**: `stages.filter(s => canStage('opportunities', s.id, 'view'))` antes de renderizar `SortableColumn`.
- **Bloqueio de edição de cards**: dentro de cada coluna, `canStage(..., stage.id, 'edit')` controla botões edit/delete por card.
- **Bloqueio de drag**: em `handleDragStart` (HTML5), checar `canStage(fromStage, 'move')` no card de origem **E** `canStage(toStage, 'move')` em `handleDrop` no destino. Se faltar qualquer um → toast padrão e abort.
- **Drop zones invalidadas**: visualmente sinalizar (opacity reduzida) colunas sem `can_move` do destino.

Mesma lógica em `OperationsModule` para `pipeline_type='operations'`.

---

## Etapa 4 — Gestão Financeira

`Financeiro.tsx`:

- Guard no topo: se team member e `!can('financial.access')` → tela "Sem acesso" + não monta nada (desabilita todas as queries).
- `TeamRouteGuard` já bloqueia rota externa; reforçar bloqueio aqui evita acesso de query mesmo se tab renderizada.

Todas as sub-tabs (Dashboard, Entradas, Despesas, Vendas, Faturas, Comissões, Fornecedores, Vendedores) ficam sob o mesmo gate único (granularidade financeira fica para Fase 3, conforme schema atual só expõe `financial.access`).

---

## Etapa 5 — Proteção server-side de ações

Não confiar só em UI. Cada mutation crítica nos hooks (`useCRM`, `useOperations`, `useFinancial`) ganha **guard no início**:

```ts
mutationFn: async (input) => {
  if (!ensurePermission('clients.create')) throw new PermissionDeniedError();
  // ... insert
}
```

Onde `ensurePermission` é função sincrona pura que lê o snapshot atual do `TeamSessionContext` (via store leve em módulo ou via parâmetro). 

> Nota: a defesa real fica na RLS do banco (a ser endurecida na Fase 3). Esta etapa garante que a UI não dispare a chamada — proteção UX e contra acidentes; não substitui RLS.

---

## Etapa 6 — UX de erro padronizada

Helper `denyAction(label?: string)`:
```ts
toast.error('Você não possui permissão para executar esta ação.')
throw new PermissionDeniedError()
```

`PermissionDeniedError` é capturada globalmente em `App.tsx` (ou wrappers de mutation) para não vazar stack/erro técnico.

---

## Etapa 7 — Navegação (`AppSidebar.tsx`)

Adicionar campo opcional `requiredPermission?: string` no `MenuItem`. No render dos menu items, ao lado da checagem `useFeatureAccess`, aplicar `usePermissions().can(item.requiredPermission)` quando o item tiver a propriedade. Mapping:

- `dashboard_clientes` → `dashboard.view`
- `gestao_clientes` → `clients.view`
- `oportunidades` → `opportunities.view`
- `operacoes` → `operations.view`
- `meta_vendas` → `goals.view`
- Todos `*_fin` → `financial.access`

Seções inteiras viram vazias se nada visível → ocultar header da seção também.

---

## Etapa 8 — Auditoria

Edge Function nova: `supabase/functions/team-audit/index.ts` — recebe `{ action, entity_type, entity_id, details }`, valida sessão, insere em `agency_team_audit_log` com `team_member_id` derivado de `auth.uid()`. Service role no servidor (RLS write fica negada para `authenticated`).

Helper client-side `logTeamAction(action, payload)` chamado **após sucesso** de mutations críticas:
- `client.create`, `client.update`, `client.delete`
- `opportunity.create`, `opportunity.update`, `opportunity.delete`, `opportunity.stage_move`
- `sale.create`, `sale.update`, `sale.delete`
- `expense.create`, `expense.update`, `expense.delete`
- `income.create`, `income.update`, `income.delete`

Chamada fire-and-forget (não bloqueia UX, falha silenciosa apenas com `console.warn`).

Migração SQL: garantir índice `(agency_id, created_at DESC)` em `agency_team_audit_log` se não existir; criar RPC `team_audit_log_list(limit, offset)` retornando últimos eventos da agência (master only via RLS já existente).

---

## Etapa 9 — Arquivos alterados (estimativa)

**Novos:**
- `src/hooks/usePermissions.ts`
- `src/components/permissions/PermissionGate.tsx`
- `src/lib/audit.ts`
- `supabase/functions/team-audit/index.ts`
- `supabase/migrations/<ts>_phase2_audit.sql`

**Editados:**
- `src/pages/GestaoClientes.tsx` (tab guard)
- `src/pages/Financeiro.tsx` (financial.access guard)
- `src/components/crm/ClientsModule.tsx`
- `src/components/crm/KanbanBoard.tsx`
- `src/components/crm/operations/OperationsModule.tsx`
- `src/components/crm/SalesGoalsModule.tsx`
- `src/components/crm/DashboardModule.tsx`
- `src/hooks/useCRM.ts` (mutation guards + audit calls)
- `src/hooks/useOperations.ts` (idem)
- `src/hooks/useFinancial.ts` (audit calls em vendas/despesas/entradas)
- `src/components/layout/AppSidebar.tsx` (filtragem por permissão)
- `src/contexts/TeamSessionContext.tsx` (expor snapshot global p/ guards de mutation)

---

## Fora do escopo (Fase 3)

- RLS endurecida com checagem de permissão no DB (hoje team member tem mesmos direitos SQL do master via `is_agency_member()` — Fase 3 deve filtrar por `agency_team_permissions`).
- Granularidade fina no Financeiro (`finance.sales.create`, etc.).
- Rate-limit no `team-login`.
- Password policy reforçada.
- Tela admin para visualizar log de auditoria.
- Bulk operations (importar contatos) ganharem checagem de permissão.

---

## Critério de aceite

- [ ] Team member sem `clients.view` não vê o card "Clientes" no `/team-dashboard` nem o menu, e `/gestao-clientes/clientes` redireciona.
- [ ] Team member com `clients.view` mas sem `clients.create` vê a lista, mas sem botão "Novo Cliente". Tentativa via console → toast de negação.
- [ ] Kanban com stage `can_view=false` não exibe a coluna.
- [ ] Kanban com stage `can_move=false` no destino impede o drop.
- [ ] Team member sem `financial.access` redirecionado ao tentar `/financeiro`.
- [ ] Master continua vendo tudo normalmente.
- [ ] Linha aparece em `agency_team_audit_log` após criação de cliente / movimento de card / criação de venda por team member.
- [ ] Mensagem "Você não possui permissão para executar esta ação." padronizada em toda negação.
