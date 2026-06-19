---
id: dp-prob-02
titulo: A despesa não aparece no mês esperado
modulo: Despesas
tipo: problema-comum
publico:
  - titular
  - financeiro
nivel: iniciante
plano: não-confirmado
permissoes: titular ou perfil com acesso ao módulo Financeiro/Despesas
intencoes:
  - a despesa não aparece no mês esperado
palavras-chave:
  - problema
  - despesas
status: pronto
confianca: confirmado
ultima-revisao: 2026-06-19
artigos-relacionados: []
fonte-interna: src/components/financial/SmartExpenseManager.tsx | src/hooks/useFinancial.ts | src/utils/expenseRecurrence.ts
---

# A despesa não aparece no mês esperado

## Sintoma
A despesa registrada não consta nos cards ou na lista do mês desejado.

## Causas possíveis
- A **Data** está em outro mês.
- Tipo **Variável** lançado em mês diferente do esperado.
- Filtro de mês selecionado é diferente do mês da despesa.

## Como verificar e resolver
1. Edite a despesa e revise a data.
2. Confirme se o tipo deveria ser **Fixa** para projetar nos próximos meses.
3. Mude a navegação por mês para o período correto.

## Resultado esperado
A despesa volta a aparecer no card e na lista do mês correspondente.

## Quando procurar o suporte
Se o problema persistir, abra um ticket informando o módulo, o ID do registro envolvido e o horário. Não compartilhe senhas, tokens ou dados sensíveis.
