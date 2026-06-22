---
id: ag-tut-10
titulo: Desconectar o Google Calendar
modulo: Agenda
tipo: tutorial
publico:
  - titular
  - agente
nivel: iniciante
plano: não-confirmado
permissoes: depende do perfil
intencoes:
  - desconectar o google calendar
palavras-chave:
  - Desconectar o Google Calendar
  - tutorial
status: pronto
confianca: confirmado
ultima-revisao: 2026-06-22
artigos-relacionados: []
fonte-interna: src/pages/Agenda.tsx | src/components/agenda/EventModal.tsx | src/components/agenda/GoogleCalendarSyncButton.tsx | src/hooks/useAgenda.ts | src/hooks/useGoogleCalendar.ts | src/types/agenda.ts
---
# Desconectar o Google Calendar

## O que você fará
Encerrar a integração com o Google Calendar.

## Antes de começar
- Confirmar que não deseja mais sincronização.

## Passo a passo
1. Em **Agenda**, clique em **Desconectar**.
2. Confirme a operação.

## Resultado esperado
O botão volta para **Conectar Google Calendar** e a sincronização automática cessa.
