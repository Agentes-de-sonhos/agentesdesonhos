---
id: dp-tut-03
titulo: Criar uma despesa fixa com número de parcelas
modulo: Despesas
tipo: tutorial
publico:
  - titular
  - financeiro
nivel: iniciante
plano: não-confirmado
permissoes: titular ou perfil com acesso ao módulo Financeiro/Despesas
intencoes:
  - criar uma despesa fixa com número de parcelas
palavras-chave:
  - tutorial
  - despesas
status: pronto
confianca: confirmado
ultima-revisao: 2026-06-19
artigos-relacionados: []
fonte-interna: src/components/financial/SmartExpenseManager.tsx | src/hooks/useFinancial.ts | src/utils/expenseRecurrence.ts
---

# Criar uma despesa fixa com número de parcelas

## O que você fará
O sistema projeta a despesa pelo número de meses informado.

## Antes de começar
- Acesso ao módulo Financeiro/Despesas.
- Saber a quantidade de parcelas (incluindo a primeira).

## Passo a passo
1. Em **Financeiro → Despesas**, clique em **Nova Despesa**.
2. Preencha **Descrição**, **Categoria** e **Valor da parcela**.
3. Escolha **Tipo: Fixa (recorrente)**.
4. Em **Duração**, selecione **Quantidade de parcelas** e informe o número.
5. Clique em **Criar**.

## Resultado esperado
O sistema projeta a despesa pelo número de meses informado.

## Atenção
- O valor da parcela é replicado igual em todos os meses.

## Próximos passos
- [Perguntas frequentes do módulo](../faq/00-perguntas-frequentes.md)
