---
id: ag-tut-01
titulo: Criar um novo evento na Agenda
modulo: Agenda
tipo: tutorial
publico:
  - titular
  - agente
nivel: iniciante
plano: não-confirmado
permissoes: depende do perfil
intencoes:
  - criar um novo evento na agenda
palavras-chave:
  - Criar um novo evento na Agenda
  - tutorial
status: pronto
confianca: confirmado
ultima-revisao: 2026-06-22
artigos-relacionados: []
fonte-interna: src/pages/Agenda.tsx | src/components/agenda/EventModal.tsx | src/components/agenda/GoogleCalendarSyncButton.tsx | src/hooks/useAgenda.ts | src/hooks/useGoogleCalendar.ts | src/types/agenda.ts
---
# Criar um novo evento na Agenda

## O que você fará
Registrar um novo evento no calendário da agência.

## Antes de começar
- Ter título, data e (opcional) horário.

## Passo a passo
1. Em **Agenda**, clique em um dia do calendário ou no botão **Novo evento**.
2. Preencha **Título**, **Tipo**, **Data** e, se houver, **Hora**.
3. (Opcional) Preencha **Descrição**, **Cidade**, **Endereço**, **Link do evento** e **Cor**.
4. Clique em **Salvar**.

## Resultado esperado
O evento aparece no calendário com o tipo e a cor escolhidos.
