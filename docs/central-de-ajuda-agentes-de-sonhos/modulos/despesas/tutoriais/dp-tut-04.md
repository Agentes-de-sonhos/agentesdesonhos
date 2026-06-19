---
id: dp-tut-04
titulo: Criar uma despesa fixa indeterminada
modulo: Despesas
tipo: tutorial
publico:
  - titular
  - financeiro
nivel: iniciante
plano: não-confirmado
permissoes: titular ou perfil com acesso ao módulo Financeiro/Despesas
intencoes:
  - criar uma despesa fixa indeterminada
palavras-chave:
  - tutorial
  - despesas
status: pronto
confianca: confirmado
ultima-revisao: 2026-06-19
artigos-relacionados: []
fonte-interna: src/components/financial/SmartExpenseManager.tsx | src/hooks/useFinancial.ts | src/utils/expenseRecurrence.ts
---

# Criar uma despesa fixa indeterminada

## O que você fará
A despesa passa a aparecer em todos os meses futuros até você alterar ou excluir.

## Antes de começar
- Acesso ao módulo Financeiro/Despesas.

## Passo a passo
1. Em **Financeiro → Despesas**, clique em **Nova Despesa**.
2. Preencha **Descrição**, **Categoria** e **Valor mensal**.
3. Escolha **Tipo: Fixa (recorrente)**.
4. Em **Duração**, selecione **Sem data final (indeterminada)**.
5. Clique em **Criar**.

## Resultado esperado
A despesa passa a aparecer em todos os meses futuros até você alterar ou excluir.

## Atenção
- Use para gastos permanentes (aluguel, sistema). Reveja periodicamente para ajustar valor.

## Próximos passos
- [Perguntas frequentes do módulo](../faq/00-perguntas-frequentes.md)
