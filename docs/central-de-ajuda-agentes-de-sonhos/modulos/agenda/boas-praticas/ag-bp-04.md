---
id: ag-bp-04
titulo: Evite duplicidades com o Google Calendar
modulo: Agenda
tipo: boas-praticas
publico:
  - titular
  - agente
nivel: iniciante
plano: não-confirmado
permissoes: depende do perfil
intencoes:
  - evite duplicidades com o google calendar
palavras-chave:
  - Evite duplicidades com o Google Calendar
  - boa prática
status: pronto
confianca: confirmado
ultima-revisao: 2026-06-22
artigos-relacionados: []
fonte-interna: src/pages/Agenda.tsx | src/components/agenda/EventModal.tsx | src/components/agenda/GoogleCalendarSyncButton.tsx | src/hooks/useAgenda.ts | src/hooks/useGoogleCalendar.ts | src/types/agenda.ts
---
# Evite duplicidades com o Google Calendar

## Por que importa
Quando a integração está ativa, lançar o mesmo evento manualmente em ambas as plataformas gera duplicidade.

## Como aplicar
1. Defina uma origem padrão (Agenda OU Google).
2. Para eventos que precisam estar nos dois, crie em uma só plataforma e use a sincronização.
3. Em caso de duplicidade, exclua a versão errada.

## Evita
- Notificações repetidas.
- Confusão de horários.
