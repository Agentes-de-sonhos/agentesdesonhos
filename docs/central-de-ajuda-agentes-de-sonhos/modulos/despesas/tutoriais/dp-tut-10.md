---
id: dp-tut-10
titulo: Identificar e revisar uma despesa de comissão de vendedor
modulo: Despesas
tipo: tutorial
publico:
  - titular
  - financeiro
nivel: iniciante
plano: não-confirmado
permissoes: titular ou perfil com acesso ao módulo Financeiro/Despesas
intencoes:
  - identificar e revisar uma despesa de comissão de vendedor
palavras-chave:
  - tutorial
  - despesas
status: pronto
confianca: confirmado
ultima-revisao: 2026-06-19
artigos-relacionados: []
fonte-interna: src/components/financial/SmartExpenseManager.tsx | src/hooks/useFinancial.ts | src/utils/expenseRecurrence.ts
---

# Identificar e revisar uma despesa de comissão de vendedor

## O que você fará
A despesa de comissão fica conferida e o valor passa a refletir a realidade do pagamento ao vendedor.

## Antes de começar
- Ter vendedores cadastrados e vendas com comissão.
- Acesso ao módulo Financeiro/Despesas.

## Passo a passo
1. Em **Financeiro → Despesas**, use o seletor **Filtrar** e escolha o nome do vendedor.
2. Localize a linha com categoria **Comissões** e descrição **Comissão - Nome do Vendedor**.
3. Clique em **lápis** para revisar valor, data e observação.
4. Salve qualquer ajuste necessário.

## Resultado esperado
A despesa de comissão fica conferida e o valor passa a refletir a realidade do pagamento ao vendedor.

## Atenção
- A geração automática vem do módulo de Vendas/Comissões. Alterações manuais não recriam a comissão automática.

## Próximos passos
- [Perguntas frequentes do módulo](../faq/00-perguntas-frequentes.md)
