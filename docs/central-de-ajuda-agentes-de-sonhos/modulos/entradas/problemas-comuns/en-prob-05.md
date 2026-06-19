---
id: en-prob-05
titulo: Não consigo encontrar a venda no seletor de 'Venda vinculada'
modulo: Entradas
tipo: problema-comum
publico:
  - titular
  - financeiro
nivel: iniciante
plano: não-confirmado
permissoes: titular ou perfil com acesso ao módulo Financeiro/Entradas
intencoes:
  - não consigo encontrar a venda no seletor de 'venda vinculada'
palavras-chave:
  - problema
  - entradas
status: pronto
confianca: confirmado
ultima-revisao: 2026-06-19
artigos-relacionados: []
fonte-interna: src/components/financial/EntradasManager.tsx | src/hooks/useFinancial.ts
---

# Não consigo encontrar a venda no seletor de 'Venda vinculada'

## Sintoma
A lista do seletor não mostra a venda que eu quero vincular.

## Causas possíveis
- A venda ainda não foi cadastrada em **Financeiro → Vendas**.
- O perfil não tem acesso à venda específica.
- A venda foi excluída.

## Como verificar e resolver
1. Cadastre a venda em **Financeiro → Vendas → Nova Venda** antes de vincular.
2. Peça ao titular para revisar suas permissões.
3. Atualize a página após cadastrar a venda.

## Resultado esperado
A venda passa a aparecer no seletor da entrada.

## Quando procurar o suporte
Se o problema persistir, abra um ticket informando o módulo, o ID do registro envolvido e o horário. Não compartilhe senhas, tokens ou dados sensíveis.
