---
id: sp-tut-04
titulo: Responder o suporte no mesmo chamado
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
  - responder o suporte no mesmo chamado
palavras-chave:
  - tutorial
  - suporte
status: pronto
confianca: confirmado
ultima-revisao: 2026-06-22
artigos-relacionados: []
fonte-interna: src/pages/Suporte.tsx | src/hooks/useSupportTickets.ts | src/types/support.ts
---
# Responder o suporte no mesmo chamado

## O que você fará
A conversa segue em um único chamado, sem duplicar atendimentos.

## Antes de começar
- O chamado precisa estar com status **Aberto** ou **Em andamento**.

## Passo a passo
1. Em **Suporte**, abra o chamado pela lista.
2. Leia a última mensagem recebida.
3. Escreva sua resposta no campo de mensagem.
4. Se necessário, anexe um arquivo com o ícone de **clipe**.
5. Clique em enviar.

## Resultado esperado
A mensagem aparece no histórico e o suporte continua o atendimento no mesmo chamado.

## Próximos passos
- [Perguntas frequentes do módulo](../faq/00-perguntas-frequentes.md)
