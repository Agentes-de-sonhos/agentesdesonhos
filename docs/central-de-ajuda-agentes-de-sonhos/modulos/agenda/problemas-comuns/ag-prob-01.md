---
id: ag-prob-01
titulo: Evento criado não aparece no calendário
modulo: Agenda
tipo: problema-comum
publico:
  - titular
  - agente
nivel: iniciante
plano: não-confirmado
permissoes: depende do perfil
intencoes:
  - evento criado não aparece no calendário
palavras-chave:
  - Evento criado não aparece no calendário
  - problema
status: pronto
confianca: confirmado
ultima-revisao: 2026-06-22
artigos-relacionados: []
fonte-interna: src/pages/Agenda.tsx | src/components/agenda/EventModal.tsx | src/components/agenda/GoogleCalendarSyncButton.tsx | src/hooks/useAgenda.ts | src/hooks/useGoogleCalendar.ts | src/types/agenda.ts
---
# Evento criado não aparece no calendário

## Sintoma
Você salva um novo evento, mas ele não aparece no calendário.

## Causas possíveis
- Filtro por tipo de evento está escondendo o tipo escolhido.
- A visualização ativa não contempla a data do evento.
- A página precisa ser atualizada.

## Como verificar
1. Abra o **Filtro por tipo de evento** e confirme se o tipo está visível.
2. Mude para a visão **Mês** e navegue até a data do evento.
3. Atualize a página.

## Solução
1. Reative o tipo no filtro.
2. Confirme a data do evento.
3. Refaça o login se persistir.

## Quando procurar suporte
Se o evento aparecer no filtro e na data corretos e ainda assim não exibir, abra um chamado em **Suporte** com o ID/título do evento.
