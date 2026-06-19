---
id: dp-tut-09
titulo: Conferir o resumo do mês em Despesas
modulo: Despesas
tipo: tutorial
publico:
  - titular
  - financeiro
nivel: iniciante
plano: não-confirmado
permissoes: titular ou perfil com acesso ao módulo Financeiro/Despesas
intencoes:
  - conferir o resumo do mês em despesas
palavras-chave:
  - tutorial
  - despesas
status: pronto
confianca: confirmado
ultima-revisao: 2026-06-19
artigos-relacionados: []
fonte-interna: src/components/financial/SmartExpenseManager.tsx | src/hooks/useFinancial.ts | src/utils/expenseRecurrence.ts
---

# Conferir o resumo do mês em Despesas

## O que você fará
Você visualiza rapidamente a composição do gasto do período.

## Antes de começar
- Ter despesas registradas no mês selecionado.
- Acesso ao módulo Financeiro/Despesas.

## Passo a passo
1. Em **Financeiro → Despesas**, observe os três cards no topo.
2. **Total do Mês** mostra a soma das despesas (incluindo projeções).
3. **Despesas Fixas** mostra o subtotal das fixas.
4. **Despesas Variáveis** mostra o subtotal das variáveis.

## Resultado esperado
Você visualiza rapidamente a composição do gasto do período.

## Atenção
- Os cards consideram o mês exibido na navegação financeira.

## Próximos passos
- [Perguntas frequentes do módulo](../faq/00-perguntas-frequentes.md)
