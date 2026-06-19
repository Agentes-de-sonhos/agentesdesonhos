---
id: dp-tut-07
titulo: Filtrar despesas por vendedor
modulo: Despesas
tipo: tutorial
publico:
  - titular
  - financeiro
nivel: iniciante
plano: não-confirmado
permissoes: titular ou perfil com acesso ao módulo Financeiro/Despesas
intencoes:
  - filtrar despesas por vendedor
palavras-chave:
  - tutorial
  - despesas
status: pronto
confianca: confirmado
ultima-revisao: 2026-06-19
artigos-relacionados: []
fonte-interna: src/components/financial/SmartExpenseManager.tsx | src/hooks/useFinancial.ts | src/utils/expenseRecurrence.ts
---

# Filtrar despesas por vendedor

## O que você fará
A lista mostra apenas as despesas correspondentes ao filtro escolhido.

## Antes de começar
- Ter despesas de comissão geradas para vendedores.
- Acesso ao módulo Financeiro/Despesas.

## Passo a passo
1. Em **Financeiro → Despesas**, abra o seletor **Filtrar** no topo da lista.
2. Escolha **Todas**, **Sem comissões** ou o nome do vendedor desejado.
3. Confira a lista filtrada.

## Resultado esperado
A lista mostra apenas as despesas correspondentes ao filtro escolhido.

## Atenção
- O filtro de vendedor só aparece quando há despesas na categoria Comissões.

## Próximos passos
- [Perguntas frequentes do módulo](../faq/00-perguntas-frequentes.md)
