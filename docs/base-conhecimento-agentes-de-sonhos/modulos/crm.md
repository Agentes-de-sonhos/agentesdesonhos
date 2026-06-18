# Módulo: CRM e Oportunidades

[← Índice](../00-LEIA-ME-E-INDICE.md)

## Identificação
- **Nome oficial:** CRM (no menu: **Oportunidades**)
- **Objetivo:** acompanhar negociações em funil Kanban.
- **Rota:** `/crm` · também usado o submenu **Clientes → Oportunidades** em `/gestao-clientes/funil`.
- **Público:** agentes titulares e membros de equipe com permissão.
- **Estado:** CONFIRMADO.

## Funcionalidades
- Visualização **Kanban** com colunas configuráveis (`pipeline_stages`).
- Criação, edição, exclusão de oportunidades.
- Drag-and-drop entre etapas.
- Etiquetas (`opportunity_labels` + assignments).
- Histórico (`opportunity_history`), notas (`opportunity_notes`) e follow-ups (`opportunity_followups`).
- Adicionar/editar cliente vinculado.
- Importar contatos.
- Atalhos rápidos para criar viagem ou orçamento.

## Campos principais (INFERIDOS)
| Campo | Descrição | Obrigatório |
|---|---|---|
| Cliente | FK para `clients` | Sim |
| Título / Destino | Texto livre | Sim |
| Etapa | FK para `pipeline_stages` | Sim |
| Valor estimado | Numérico | Não |
| Data prevista de viagem | Data | Não |
| Etiquetas | Lista | Não |
| Responsável | Usuário | Não |
| Anotações | Texto | Não |

## Regras de negócio
- Cliente é pré-requisito.
- Mudança de etapa registra histórico.
- Etapas personalizadas por agência.
- PENDENTE: criação automática de venda ao marcar oportunidade como ganha.

## Permissões
- Titular: tudo. Membro: depende de `agency_team_permissions` e `agency_team_stage_permissions`. RLS por `user_id`.

## Fluxo típico
1. Captar lead. 2. Criar cliente. 3. Criar oportunidade. 4. Mover entre etapas. 5. Vincular orçamento/viagem. 6. Marcar como ganha/perdida.

## Evidências técnicas
`src/pages/CRM.tsx`, `src/components/crm/*`, tabelas `opportunities`, `pipeline_stages`, `opportunity_history`, `opportunity_notes`, `opportunity_followups`, `opportunity_labels`.