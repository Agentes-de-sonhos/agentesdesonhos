---
id: en-tut-05
titulo: Excluir uma entrada
modulo: Entradas
tipo: tutorial
publico:
  - titular
  - financeiro
nivel: iniciante
plano: não-confirmado
permissoes: titular ou perfil com acesso ao módulo Financeiro/Entradas
intencoes:
  - excluir uma entrada
palavras-chave:
  - tutorial
  - entradas
status: pronto
confianca: confirmado
ultima-revisao: 2026-06-19
artigos-relacionados: []
fonte-interna: src/components/financial/EntradasManager.tsx | src/hooks/useFinancial.ts
---

# Excluir uma entrada

## O que você fará
A entrada é removida da lista e deixa de impactar os indicadores do mês.

## Antes de começar
- A entrada precisa existir.
- Conferir se a exclusão não compromete o fechamento do mês.
- Acesso ao módulo Financeiro/Entradas.

## Passo a passo
1. Em **Financeiro → Entradas**, localize a entrada.
2. Clique no ícone de **lixeira** vermelha à direita.
3. No diálogo **Excluir entrada?**, clique em **Excluir** para confirmar.

## Resultado esperado
A entrada é removida da lista e deixa de impactar os indicadores do mês.

## Atenção
- A ação é irreversível. Não exclua entradas recebidas sem antes registrar o motivo.

## Próximos passos
- [Perguntas frequentes do módulo](../faq/00-perguntas-frequentes.md)
