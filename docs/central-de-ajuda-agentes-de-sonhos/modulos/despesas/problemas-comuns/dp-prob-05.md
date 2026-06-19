---
id: dp-prob-05
titulo: Filtro de vendedor não aparece
modulo: Despesas
tipo: problema-comum
publico:
  - titular
  - financeiro
nivel: iniciante
plano: não-confirmado
permissoes: titular ou perfil com acesso ao módulo Financeiro/Despesas
intencoes:
  - filtro de vendedor não aparece
palavras-chave:
  - problema
  - despesas
status: pronto
confianca: confirmado
ultima-revisao: 2026-06-19
artigos-relacionados: []
fonte-interna: src/components/financial/SmartExpenseManager.tsx | src/hooks/useFinancial.ts | src/utils/expenseRecurrence.ts
---

# Filtro de vendedor não aparece

## Sintoma
Espero ver o seletor **Filtrar** por vendedor, mas ele não está disponível.

## Causas possíveis
- Ainda não existem despesas da categoria **Comissões** cadastradas.
- As comissões existentes não seguem o formato **Comissão - Nome**.

## Como verificar e resolver
1. Registre vendas com comissão e vendedor para gerar despesas automáticas.
2. Padronize a descrição manual das comissões para **Comissão - Nome do Vendedor**.
3. Atualize a página após o cadastro.

## Resultado esperado
O seletor **Filtrar** aparece com a lista de vendedores.

## Quando procurar o suporte
Se o problema persistir, abra um ticket informando o módulo, o ID do registro envolvido e o horário. Não compartilhe senhas, tokens ou dados sensíveis.
