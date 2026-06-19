---
id: vd-prob-02
titulo: O cliente desejado não aparece no seletor
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
  - o cliente desejado não aparece no seletor
palavras-chave:
  - problema
  - vendas
status: pronto
confianca: confirmado
ultima-revisao: 2026-06-19
artigos-relacionados:
fonte-interna: src/components/financial/*
---

# O cliente desejado não aparece no seletor

## Sintoma
Ao buscar o cliente no ClientSelector, ele não é exibido.

## Causas possíveis
- Cliente ainda não foi cadastrado.
- Cliente foi marcado como inativo.
- Pertence a outra agência.

## Como verificar e resolver
1. Cadastre o cliente em **CRM → Clientes**.
2. Reative o cliente, se aplicável.
3. Confirme que está logado na agência correta.

## Resultado esperado
A situação descrita deixa de ocorrer e o registro financeiro reflete a realidade.

## Quando procurar o suporte
Se o problema persistir após os passos acima, abra um ticket informando o módulo, o ID da venda/comissão envolvida e o horário. Não compartilhe senhas.
