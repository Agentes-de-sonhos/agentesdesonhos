---
id: ag-tut-03
titulo: Excluir um evento
modulo: Agenda
tipo: tutorial
publico:
  - titular
  - agente
nivel: iniciante
plano: não-confirmado
permissoes: depende do perfil
intencoes:
  - excluir um evento
palavras-chave:
  - Excluir um evento
  - tutorial
status: pronto
confianca: confirmado
ultima-revisao: 2026-06-22
artigos-relacionados: []
fonte-interna: src/pages/Agenda.tsx | src/components/agenda/EventModal.tsx | src/components/agenda/GoogleCalendarSyncButton.tsx | src/hooks/useAgenda.ts | src/hooks/useGoogleCalendar.ts | src/types/agenda.ts
---
# Excluir um evento

## O que você fará
Remover um evento da Agenda.

## Antes de começar
- Lembre-se: eventos pré-definidos do sistema só podem ser **ocultados**, não excluídos.

## Passo a passo
1. Clique no evento.
2. No modal aberto, clique no ícone **Excluir**.
3. Confirme.

## Resultado esperado
O evento desaparece do calendário.
