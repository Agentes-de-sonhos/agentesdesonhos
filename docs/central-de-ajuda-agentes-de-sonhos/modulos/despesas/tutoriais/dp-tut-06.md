---
id: dp-tut-06
titulo: Excluir uma despesa
modulo: Despesas
tipo: tutorial
publico:
  - titular
  - financeiro
nivel: iniciante
plano: não-confirmado
permissoes: titular ou perfil com acesso ao módulo Financeiro/Despesas
intencoes:
  - excluir uma despesa
palavras-chave:
  - tutorial
  - despesas
status: pronto
confianca: confirmado
ultima-revisao: 2026-06-19
artigos-relacionados: []
fonte-interna: src/components/financial/SmartExpenseManager.tsx | src/hooks/useFinancial.ts | src/utils/expenseRecurrence.ts
---

# Excluir uma despesa

## O que você fará
A despesa some da lista e, se for recorrente, deixa de ser projetada nos meses futuros.

## Antes de começar
- A despesa precisa existir.
- Conferir o impacto antes de remover.

## Passo a passo
1. Em **Financeiro → Despesas**, localize a despesa na lista.
2. Clique no ícone de **lixeira** vermelha.
3. No diálogo **Excluir despesa?**, clique em **Excluir**.

## Resultado esperado
A despesa some da lista e, se for recorrente, deixa de ser projetada nos meses futuros.

## Atenção
- Meses já realizados não são alterados retroativamente.

## Próximos passos
- [Perguntas frequentes do módulo](../faq/00-perguntas-frequentes.md)
