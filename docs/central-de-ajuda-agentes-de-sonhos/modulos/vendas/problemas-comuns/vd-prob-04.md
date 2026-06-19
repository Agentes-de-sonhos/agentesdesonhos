---
id: vd-prob-04
titulo: O valor total da venda não corresponde à soma dos produtos
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
  - o valor total da venda não corresponde à soma dos produtos
palavras-chave:
  - problema
  - vendas
status: pronto
confianca: confirmado
ultima-revisao: 2026-06-19
artigos-relacionados:
fonte-interna: src/components/financial/*
---

# O valor total da venda não corresponde à soma dos produtos

## Sintoma
O total exibido na revisão está diferente da soma esperada.

## Causas possíveis
- Algum produto está sem valor de venda preenchido.
- Há valor digitado com vírgula/ponto incorretos.
- Existe produto duplicado.

## Como verificar e resolver
1. Confira o valor de cada produto.
2. Refaça o cálculo manualmente.
3. Remova produtos duplicados antes de salvar.

## Resultado esperado
A situação descrita deixa de ocorrer e o registro financeiro reflete a realidade.

## Quando procurar o suporte
Se o problema persistir após os passos acima, abra um ticket informando o módulo, o ID da venda/comissão envolvida e o horário. Não compartilhe senhas.
