---
id: dp-tut-05
titulo: Editar uma despesa existente
modulo: Despesas
tipo: tutorial
publico:
  - titular
  - financeiro
nivel: iniciante
plano: não-confirmado
permissoes: titular ou perfil com acesso ao módulo Financeiro/Despesas
intencoes:
  - editar uma despesa existente
palavras-chave:
  - tutorial
  - despesas
status: pronto
confianca: confirmado
ultima-revisao: 2026-06-19
artigos-relacionados: []
fonte-interna: src/components/financial/SmartExpenseManager.tsx | src/hooks/useFinancial.ts | src/utils/expenseRecurrence.ts
---

# Editar uma despesa existente

## O que você fará
Os dados da despesa são atualizados e impactam a lista, os cards e o dashboard.

## Antes de começar
- A despesa precisa estar cadastrada.
- Acesso ao módulo Financeiro/Despesas.

## Passo a passo
1. Em **Financeiro → Despesas**, localize a despesa.
2. Clique no ícone de **lápis** à direita.
3. Ajuste os campos no diálogo **Editar Despesa**.
4. Clique em **Salvar**.

## Resultado esperado
Os dados da despesa são atualizados e impactam a lista, os cards e o dashboard.

## Atenção
- Editar uma projeção abre a despesa-mãe; mudanças valem a partir do mês corrente.

## Próximos passos
- [Perguntas frequentes do módulo](../faq/00-perguntas-frequentes.md)
