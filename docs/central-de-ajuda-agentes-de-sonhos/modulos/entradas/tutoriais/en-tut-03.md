---
id: en-tut-03
titulo: Marcar uma entrada como recebida
modulo: Entradas
tipo: tutorial
publico:
  - titular
  - financeiro
nivel: iniciante
plano: não-confirmado
permissoes: titular ou perfil com acesso ao módulo Financeiro/Entradas
intencoes:
  - marcar uma entrada como recebida
palavras-chave:
  - tutorial
  - entradas
status: pronto
confianca: confirmado
ultima-revisao: 2026-06-19
artigos-relacionados: []
fonte-interna: src/components/financial/EntradasManager.tsx | src/hooks/useFinancial.ts
---

# Marcar uma entrada como recebida

## O que você fará
O valor sai de **A caminho** e entra em **Já no bolso** no mês corrente.

## Antes de começar
- A entrada precisa estar com status **A receber**.
- Acesso ao módulo Financeiro/Entradas.

## Passo a passo
1. Em **Financeiro → Entradas**, abra a aba **A Receber**.
2. Localize a entrada desejada na lista.
3. Clique no botão **Recebido** ao lado da entrada.
4. Confirme que o status muda para **Recebida** e a data passa a ser a de hoje.

## Resultado esperado
O valor sai de **A caminho** e entra em **Já no bolso** no mês corrente.

## Atenção
- Se a entrada tinha **data prevista** em outro mês, conferir o dashboard do mês correto após a baixa.

## Próximos passos
- [Perguntas frequentes do módulo](../faq/00-perguntas-frequentes.md)
