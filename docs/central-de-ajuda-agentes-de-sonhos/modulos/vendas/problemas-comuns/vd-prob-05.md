---
id: vd-prob-05
titulo: A comissão do vendedor não virou despesa
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
  - a comissão do vendedor não virou despesa
palavras-chave:
  - problema
  - vendas
status: pronto
confianca: confirmado
ultima-revisao: 2026-06-19
artigos-relacionados:
fonte-interna: src/components/financial/*
---

# A comissão do vendedor não virou despesa

## Sintoma
Após salvar a venda, a despesa correspondente não aparece em Despesas.

## Causas possíveis
- Vendedor não foi selecionado na venda.
- Percentual de comissão de vendedor está zerado.
- Despesa foi excluída manualmente.

## Como verificar e resolver
1. Edite a venda e selecione um vendedor.
2. Defina um percentual maior que zero.
3. Salve novamente: a despesa será regenerada.

## Resultado esperado
A situação descrita deixa de ocorrer e o registro financeiro reflete a realidade.

## Quando procurar o suporte
Se o problema persistir após os passos acima, abra um ticket informando o módulo, o ID da venda/comissão envolvida e o horário. Não compartilhe senhas.
