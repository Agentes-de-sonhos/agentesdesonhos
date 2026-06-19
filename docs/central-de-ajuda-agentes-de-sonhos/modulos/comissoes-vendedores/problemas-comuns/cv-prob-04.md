---
id: cv-prob-04
titulo: Comissão aparece como atrasada mesmo após o recebimento
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
  - comissão aparece como atrasada mesmo após o recebimento
palavras-chave:
  - problema
  - comissões e vendedores
status: pronto
confianca: confirmado
ultima-revisao: 2026-06-19
artigos-relacionados:
fonte-interna: src/components/financial/*
---

# Comissão aparece como atrasada mesmo após o recebimento

## Sintoma
Mesmo já tendo recebido, a comissão continua marcada como atrasada.

## Causas possíveis
- Comissão não foi marcada como recebida no sistema.
- Foi marcada na venda errada.

## Como verificar e resolver
1. Em **Comissões**, abra o item e atualize o status para recebida.
2. Verifique se a entrada correspondente está registrada em **Entradas**.

## Resultado esperado
A situação descrita deixa de ocorrer e o registro financeiro reflete a realidade.

## Quando procurar o suporte
Se o problema persistir após os passos acima, abra um ticket informando o módulo, o ID da venda/comissão envolvida e o horário. Não compartilhe senhas.
