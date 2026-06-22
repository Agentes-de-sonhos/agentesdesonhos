---
id: ag-tut-08
titulo: Conectar o Google Calendar
modulo: Agenda
tipo: tutorial
publico:
  - titular
  - agente
nivel: iniciante
plano: não-confirmado
permissoes: depende do perfil
intencoes:
  - conectar o google calendar
palavras-chave:
  - Conectar o Google Calendar
  - tutorial
status: pronto
confianca: confirmado
ultima-revisao: 2026-06-22
artigos-relacionados: []
fonte-interna: src/pages/Agenda.tsx | src/components/agenda/EventModal.tsx | src/components/agenda/GoogleCalendarSyncButton.tsx | src/hooks/useAgenda.ts | src/hooks/useGoogleCalendar.ts | src/types/agenda.ts
---
# Conectar o Google Calendar

## O que você fará
Integrar sua conta Google para sincronizar eventos.

## Antes de começar
- Estar logado em uma conta Google que deseja usar.

## Passo a passo
1. Em **Agenda**, clique em **Conectar Google Calendar**.
2. Autorize o acesso na janela do Google.
3. Aguarde a confirmação de conexão.

## Resultado esperado
O botão muda para **Sincronizar** e exibe quando ocorreu a última sincronização.
