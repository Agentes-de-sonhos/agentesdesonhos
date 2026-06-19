---
id: dp-tut-01
titulo: Registrar uma despesa variável
modulo: Despesas
tipo: tutorial
publico:
  - titular
  - financeiro
nivel: iniciante
plano: não-confirmado
permissoes: titular ou perfil com acesso ao módulo Financeiro/Despesas
intencoes:
  - registrar uma despesa variável
palavras-chave:
  - tutorial
  - despesas
status: pronto
confianca: confirmado
ultima-revisao: 2026-06-19
artigos-relacionados: []
fonte-interna: src/components/financial/SmartExpenseManager.tsx | src/hooks/useFinancial.ts | src/utils/expenseRecurrence.ts
---

# Registrar uma despesa variável

## O que você fará
A despesa aparece na lista do mês com badge **Variável** e entra no card **Total do Mês**.

## Antes de começar
- Acesso ao módulo Financeiro/Despesas.
- Saber descrição, valor e data do gasto.

## Passo a passo
1. Em **Financeiro → Despesas**, clique em **Nova Despesa**.
2. Preencha **Descrição** (o sistema pode sugerir uma categoria).
3. Confirme **Categoria** e informe o **Valor**.
4. Defina a **Data** do gasto e mantenha **Tipo: Variável**.
5. Clique em **Criar**.

## Resultado esperado
A despesa aparece na lista do mês com badge **Variável** e entra no card **Total do Mês**.

## Atenção
- A despesa variável aparece apenas no mês da data informada.

## Próximos passos
- [Perguntas frequentes do módulo](../faq/00-perguntas-frequentes.md)
