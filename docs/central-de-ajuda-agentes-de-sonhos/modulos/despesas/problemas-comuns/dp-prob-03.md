---
id: dp-prob-03
titulo: Despesa fixa não está se projetando nos meses futuros
modulo: Despesas
tipo: problema-comum
publico:
  - titular
  - financeiro
nivel: iniciante
plano: não-confirmado
permissoes: titular ou perfil com acesso ao módulo Financeiro/Despesas
intencoes:
  - despesa fixa não está se projetando nos meses futuros
palavras-chave:
  - problema
  - despesas
status: pronto
confianca: confirmado
ultima-revisao: 2026-06-19
artigos-relacionados: []
fonte-interna: src/components/financial/SmartExpenseManager.tsx | src/hooks/useFinancial.ts | src/utils/expenseRecurrence.ts
---

# Despesa fixa não está se projetando nos meses futuros

## Sintoma
Apesar de marcada como Fixa, a despesa não aparece nos meses seguintes.

## Causas possíveis
- A configuração de **Duração** foi salva como **Até uma data específica** com data muito próxima.
- Foi salva com **Quantidade de parcelas** menor do que o esperado.
- A despesa-mãe foi excluída.

## Como verificar e resolver
1. Edite a despesa-mãe e ajuste a **Duração**.
2. Confirme se o tipo continua como **Fixa**.
3. Salve e navegue até o mês futuro para conferir a projeção.

## Resultado esperado
A projeção volta a aparecer com badge **Recorrência** nos meses seguintes.

## Quando procurar o suporte
Se o problema persistir, abra um ticket informando o módulo, o ID do registro envolvido e o horário. Não compartilhe senhas, tokens ou dados sensíveis.
