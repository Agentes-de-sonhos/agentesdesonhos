# Módulo: Operações

[← Índice](../00-LEIA-ME-E-INDICE.md)

- **Rota:** `/gestao-clientes/operacoes`.
- **Objetivo:** acompanhamento pós-venda da viagem (tarefas, checklist, prazos, anexos).
- **Estado:** CONFIRMADO.

## Funcionalidades
- Pipeline próprio (`operation_pipeline_stages`).
- Tarefas (`operation_tasks`), checklist por estágio (`operation_stage_checklist_templates`, `operation_checklist_templates`).
- Timeline (`operation_timeline`), etiquetas (`operation_labels`), anexos (`operation_attachments`).

## Regras
- Operação é tipicamente criada a partir de uma venda/cliente.
- Templates de checklist podem ser globais (`*_templates`) ou por estágio.

## Evidências
`src/components/crm/operations/*`, tabelas `operations`, `operation_*`.