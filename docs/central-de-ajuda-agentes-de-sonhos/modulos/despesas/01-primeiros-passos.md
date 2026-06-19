---
id: despesas-primeiros-passos
titulo: Despesas — Primeiros passos
modulo: Despesas
tipo: tutorial
publico:
  - titular
  - financeiro
nivel: iniciante
plano: não-confirmado
permissoes: titular ou perfil com acesso ao módulo Financeiro/Despesas
intencoes:
  - como começar em Despesas
  - primeiros passos Despesas
palavras-chave:
  - Despesas
  - primeiros passos
  - financeiro
status: pronto
confianca: confirmado
ultima-revisao: 2026-06-19
artigos-relacionados:
  - despesas-visao-geral
fonte-interna: src/components/financial/SmartExpenseManager.tsx | src/hooks/useFinancial.ts | src/utils/expenseRecurrence.ts
---

# Primeiros passos em Despesas

## O que você fará
Criar a primeira despesa, configurar uma despesa fixa e ler os cards de resumo.

## Antes de começar
- Estar logado com perfil **Titular** ou **Financeiro**.
- Ter acesso a **Financeiro → Despesas**.

## Passo a passo
1. Abra **Financeiro → Despesas**.
2. Clique em **Nova Despesa**.
3. Preencha descrição, categoria, valor e data.
4. Escolha **Tipo: Variável** para um gasto pontual ou **Fixa** para algo recorrente.
5. Em despesas fixas, defina a **Duração**.
6. Clique em **Criar**.

## Resultado esperado
A despesa aparece na lista do mês, com badge **Variável** ou **Fixa**, e compõe o card **Total do Mês**.
