---
id: vd-prob-03
titulo: O fornecedor não aparece no seletor de produtos
modulo: Vendas
tipo: problema-comum
publico:
  - agente
  - titular
  - financeiro
nivel: iniciante
plano: não-confirmado
permissoes: usar módulo Vendas
intencoes:
  - o fornecedor não aparece no seletor de produtos
palavras-chave:
  - problema
  - vendas
status: pronto
confianca: confirmado
ultima-revisao: 2026-06-19
artigos-relacionados:
fonte-interna: src/components/financial/*
---

# O fornecedor não aparece no seletor de produtos

## Sintoma
O SupplierSelector não retorna o fornecedor procurado.

## Causas possíveis
- Fornecedor não cadastrado em **Fornecedores**.
- Termo de busca digitado de forma diferente do cadastro.

## Como verificar e resolver
1. Cadastre o fornecedor antes de salvar a venda.
2. Use parte do nome ou refine a busca.

## Resultado esperado
A situação descrita deixa de ocorrer e o registro financeiro reflete a realidade.

## Quando procurar o suporte
Se o problema persistir após os passos acima, abra um ticket informando o módulo, o ID da venda/comissão envolvida e o horário. Não compartilhe senhas.
