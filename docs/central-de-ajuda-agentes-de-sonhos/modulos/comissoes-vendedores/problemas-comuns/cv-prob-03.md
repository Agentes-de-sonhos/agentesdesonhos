---
id: cv-prob-03
titulo: A comissão do vendedor não virou despesa
modulo: Comissões e Vendedores
tipo: problema-comum
publico:
  - agente
  - titular
  - financeiro
nivel: iniciante
plano: não-confirmado
permissoes: usar módulo Comissões e Vendedores
intencoes:
  - a comissão do vendedor não virou despesa
palavras-chave:
  - problema
  - comissões e vendedores
status: pronto
confianca: confirmado
ultima-revisao: 2026-06-19
artigos-relacionados:
fonte-interna: src/components/financial/*
---

# A comissão do vendedor não virou despesa

## Sintoma
Não há despesa de comissão correspondente à venda.

## Causas possíveis
- Vendedor não foi vinculado à venda.
- Percentual definido como zero.
- A despesa foi excluída manualmente após a criação.

## Como verificar e resolver
1. Edite a venda, selecione o vendedor e defina o percentual.
2. Salve para regenerar a despesa.
3. Se o problema persistir, abra um ticket informando ID da venda.

## Resultado esperado
A situação descrita deixa de ocorrer e o registro financeiro reflete a realidade.

## Quando procurar o suporte
Se o problema persistir após os passos acima, abra um ticket informando o módulo, o ID da venda/comissão envolvida e o horário. Não compartilhe senhas.
