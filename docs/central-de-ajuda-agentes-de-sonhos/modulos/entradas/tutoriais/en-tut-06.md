---
id: en-tut-06
titulo: Vincular uma entrada a uma venda
modulo: Entradas
tipo: tutorial
publico:
  - titular
  - financeiro
nivel: iniciante
plano: não-confirmado
permissoes: titular ou perfil com acesso ao módulo Financeiro/Entradas
intencoes:
  - vincular uma entrada a uma venda
palavras-chave:
  - tutorial
  - entradas
status: pronto
confianca: confirmado
ultima-revisao: 2026-06-19
artigos-relacionados: []
fonte-interna: src/components/financial/EntradasManager.tsx | src/hooks/useFinancial.ts
---

# Vincular uma entrada a uma venda

## O que você fará
A entrada passa a exibir cliente e destino da venda associada na lista.

## Antes de começar
- A venda precisa estar registrada em **Financeiro → Vendas**.
- Acesso a Entradas e Vendas.

## Passo a passo
1. Em **Financeiro → Entradas**, clique em **Nova Entrada** ou edite uma entrada existente.
2. No campo **Venda vinculada (opcional)**, escolha a venda desejada na lista.
3. Confirme os demais campos e clique em **Criar** ou **Salvar**.

## Resultado esperado
A entrada passa a exibir cliente e destino da venda associada na lista.

## Atenção
- Se a venda não aparecer no seletor, confirme se ela está cadastrada e visível para seu perfil.

## Próximos passos
- [Perguntas frequentes do módulo](../faq/00-perguntas-frequentes.md)
