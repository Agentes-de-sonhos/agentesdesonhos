# Módulo: Agenda

[← Índice](../00-LEIA-ME-E-INDICE.md)

- **Rota:** `/agenda`.
- **Estado:** CONFIRMADO.

## Funcionalidades
- Eventos próprios + sincronização Google Calendar (`google_calendar_sync`, `google_calendar_tokens`).
- Tipos personalizados (`custom_event_types`).
- Eventos pré-definidos (`preset_events`), com possibilidade de ocultar (`hidden_preset_events`) ou destacar (`highlighted_events`).
- Reuniões online (`online_meetings`), eventos presenciais (`in_person_events`).

## Evidências
`src/pages/Agenda.tsx`, `src/components/agenda/*`, `src/hooks/useGoogleCalendar.ts`, Edge Functions `google-calendar-*`.