---
id: cv-prob-02
titulo: A comissão da agência está com valor diferente do esperado
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
  - a comissão da agência está com valor diferente do esperado
palavras-chave:
  - problema
  - comissões e vendedores
status: pronto
confianca: confirmado
ultima-revisao: 2026-06-19
artigos-relacionados:
fonte-interna: src/components/financial/*
---

# A comissão da agência está com valor diferente do esperado

## Sintoma
O valor exibido em Comissões não bate com a expectativa do fornecedor.

## Causas possíveis
- Taxas não comissionáveis não preenchidas.
- Tipo de comissão configurado errado (percentual vs fixo).
- Valor de venda incorreto no produto.

## Como verificar e resolver
1. Edite o produto na venda e revise taxas não comissionáveis.
2. Confirme o tipo e valor da comissão.
3. Salve para recalcular.

## Resultado esperado
A situação descrita deixa de ocorrer e o registro financeiro reflete a realidade.

## Quando procurar o suporte
Se o problema persistir após os passos acima, abra um ticket informando o módulo, o ID da venda/comissão envolvida e o horário. Não compartilhe senhas.
