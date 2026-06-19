---
id: cv-prob-01
titulo: O vendedor não aparece no seletor de Nova Venda
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
  - o vendedor não aparece no seletor de nova venda
palavras-chave:
  - problema
  - comissões e vendedores
status: pronto
confianca: confirmado
ultima-revisao: 2026-06-19
artigos-relacionados:
fonte-interna: src/components/financial/*
---

# O vendedor não aparece no seletor de Nova Venda

## Sintoma
Ao tentar selecionar o vendedor na etapa Revisão, ele não consta na lista.

## Causas possíveis
- Vendedor ainda não foi cadastrado.
- Vendedor foi desativado.
- Você está logado em outra agência.

## Como verificar e resolver
1. Cadastre o vendedor em **Financeiro → Vendedores**.
2. Reative o vendedor (atualmente isso requer novo cadastro, pois a remoção desativa).
3. Confirme a agência atual.

## Resultado esperado
A situação descrita deixa de ocorrer e o registro financeiro reflete a realidade.

## Quando procurar o suporte
Se o problema persistir após os passos acima, abra um ticket informando o módulo, o ID da venda/comissão envolvida e o horário. Não compartilhe senhas.
