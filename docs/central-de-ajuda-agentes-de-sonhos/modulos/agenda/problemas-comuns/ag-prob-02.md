---
id: ag-prob-02
titulo: Evento aparece em data ou horário errados
modulo: Agenda
tipo: problema-comum
publico:
  - titular
  - agente
nivel: iniciante
plano: não-confirmado
permissoes: depende do perfil
intencoes:
  - evento aparece em data ou horário errados
palavras-chave:
  - Evento aparece em data ou horário errados
  - problema
status: pronto
confianca: confirmado
ultima-revisao: 2026-06-22
artigos-relacionados: []
fonte-interna: src/pages/Agenda.tsx | src/components/agenda/EventModal.tsx | src/components/agenda/GoogleCalendarSyncButton.tsx | src/hooks/useAgenda.ts | src/hooks/useGoogleCalendar.ts | src/types/agenda.ts
---
# Evento aparece em data ou horário errados

## Sintoma
O evento aparece num dia diferente do esperado.

## Causas possíveis
- Erro de digitação na data.
- Fuso horário do dispositivo difere do esperado.
- Evento sincronizado do Google com hora incorreta.

## Como verificar
1. Abra o evento e confira **Data** e **Hora**.
2. Verifique o fuso horário do seu computador/celular.
3. Se vier do Google, confira no Google Calendar.

## Solução
1. Corrija data e hora no evento.
2. Ajuste o fuso do dispositivo se necessário.
3. Para eventos do Google, corrija na origem e sincronize novamente.

## Quando procurar suporte
Se data/hora estiverem corretas e ainda assim aparecerem trocadas, abra um chamado em **Suporte**.
