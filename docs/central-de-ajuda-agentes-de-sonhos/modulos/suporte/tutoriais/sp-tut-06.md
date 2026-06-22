---
id: sp-tut-06
titulo: Marcar um chamado como Resolvido
modulo: Suporte
tipo: tutorial
publico:
  - titular
  - agente
  - financeiro
nivel: iniciante
plano: não-confirmado
permissoes: qualquer usuário autenticado
intencoes:
  - marcar um chamado como resolvido
palavras-chave:
  - tutorial
  - suporte
status: pronto
confianca: confirmado
ultima-revisao: 2026-06-22
artigos-relacionados: []
fonte-interna: src/pages/Suporte.tsx | src/hooks/useSupportTickets.ts | src/types/support.ts
---
# Marcar um chamado como Resolvido

## O que você fará
O chamado é encerrado e sai da fila ativa de atendimento.

## Antes de começar
- O problema precisa estar realmente resolvido.
- O chamado deve estar com status **Aberto** ou **Em andamento**.

## Passo a passo
1. Abra o chamado pela lista.
2. Clique em **Resolvido** no topo da conversa.
3. Confirme a ação.
4. Verifique que o status mudou para **Resolvido**.

## Resultado esperado
O chamado fica registrado no histórico, encerrado, e libera espaço para os próximos.

## Próximos passos
- [Perguntas frequentes do módulo](../faq/00-perguntas-frequentes.md)
