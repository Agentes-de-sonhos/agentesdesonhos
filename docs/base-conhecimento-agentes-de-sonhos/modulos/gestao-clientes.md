# Módulo: Gestão de Clientes

[← Índice](../00-LEIA-ME-E-INDICE.md)

- **Rota:** `/gestao-clientes` com abas `/dashboard`, `/clientes`, `/funil`, `/metas`, `/operacoes`.
- **Objetivo:** hub consolidado dos clientes, funil simplificado, metas e operações.
- **Estado:** CONFIRMADO.

## Funcionalidades
- Cadastro de **clientes** (`clients`) com categoria/subcategoria, dados de contato, viagens vinculadas.
- **Dashboard de clientes** com KPIs.
- **Funil** alternativo ao `/crm`.
- **Metas de vendas** (`sales_goals`).
- **Operações** (`operations`) com tarefas, timeline, anexos.
- Importação de contatos.

## Regras
- Cliente é a entidade central; é exigido para criar orçamentos, roteiros, carteiras e oportunidades.
- Cada cliente pode ter múltiplas viagens (`AddTripDialog`).
- Excluir cliente: PENDENTE — comportamento exato com vendas/operações vinculadas.

## Permissões
RLS por `user_id`; membros conforme `agency_team_permissions`.

## Evidências
`src/pages/GestaoClientes.tsx`, `src/components/crm/ClientsModule.tsx`, `ClientsManager.tsx`, `DashboardModule.tsx`, `SalesGoalsModule.tsx`, tabelas `clients`, `client_categories`, `client_subcategories`, `perfis_cliente`, `sales_goals`.