---
id: ag-prob-04
titulo: Sincronização com Google Calendar não atualiza eventos
modulo: Agenda
tipo: problema-comum
publico:
  - titular
  - agente
nivel: iniciante
plano: não-confirmado
permissoes: depende do perfil
intencoes:
  - sincronização com google calendar não atualiza eventos
palavras-chave:
  - Sincronização com Google Calendar não atualiza eventos
  - problema
status: pronto
confianca: confirmado
ultima-revisao: 2026-06-22
artigos-relacionados: []
fonte-interna: src/pages/Agenda.tsx | src/components/agenda/EventModal.tsx | src/components/agenda/GoogleCalendarSyncButton.tsx | src/hooks/useAgenda.ts | src/hooks/useGoogleCalendar.ts | src/types/agenda.ts
---
# Sincronização com Google Calendar não atualiza eventos

## Sintoma
Você clica em **Sincronizar**, mas os eventos novos do Google não aparecem na Agenda.

## Causas possíveis
- Conexão com o Google expirou.
- Eventos estão em um calendário do Google que não é o principal.
- A última sincronização ocorreu há poucos segundos.

## Como verificar
1. Veja o horário da última sincronização ao lado do botão.
2. Verifique no Google Calendar em qual calendário o evento está.
3. Tente **Desconectar** e **Conectar** novamente.

## Solução
1. Reconecte a integração.
2. Confirme o calendário usado para sincronização.
3. Aguarde alguns segundos e clique em **Sincronizar** novamente.

## Quando procurar suporte
Se nada disso resolver, abra um chamado em **Suporte** informando data/hora da tentativa.
