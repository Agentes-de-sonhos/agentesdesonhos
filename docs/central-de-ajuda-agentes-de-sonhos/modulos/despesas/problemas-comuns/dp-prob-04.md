---
id: dp-prob-04
titulo: Comissão de vendedor não virou despesa
modulo: Despesas
tipo: problema-comum
publico:
  - titular
  - financeiro
nivel: iniciante
plano: não-confirmado
permissoes: titular ou perfil com acesso ao módulo Financeiro/Despesas
intencoes:
  - comissão de vendedor não virou despesa
palavras-chave:
  - problema
  - despesas
status: pronto
confianca: confirmado
ultima-revisao: 2026-06-19
artigos-relacionados: []
fonte-interna: src/components/financial/SmartExpenseManager.tsx | src/hooks/useFinancial.ts | src/utils/expenseRecurrence.ts
---

# Comissão de vendedor não virou despesa

## Sintoma
Esperava uma despesa automática na categoria Comissões e ela não apareceu.

## Causas possíveis
- A venda não foi salva com vendedor ou comissão configurada.
- O vendedor não está cadastrado no sistema.
- A venda foi excluída antes da geração da despesa.

## Como verificar e resolver
1. Abra a venda em **Financeiro → Vendas** e confirme se há vendedor e comissão definidos.
2. Cadastre o vendedor em **Financeiro → Vendedores**.
3. Reabra a venda para que a despesa correspondente seja regerada.

## Resultado esperado
A despesa de comissão passa a aparecer em **Despesas** com a descrição **Comissão - Nome do Vendedor**.

## Quando procurar o suporte
Se o problema persistir, abra um ticket informando o módulo, o ID do registro envolvido e o horário. Não compartilhe senhas, tokens ou dados sensíveis.
