---
id: ag-prob-05
titulo: Tipo de evento personalizado não aparece na lista
modulo: Agenda
tipo: problema-comum
publico:
  - titular
  - agente
nivel: iniciante
plano: não-confirmado
permissoes: depende do perfil
intencoes:
  - tipo de evento personalizado não aparece na lista
palavras-chave:
  - Tipo de evento personalizado não aparece na lista
  - problema
status: pronto
confianca: confirmado
ultima-revisao: 2026-06-22
artigos-relacionados: []
fonte-interna: src/pages/Agenda.tsx | src/components/agenda/EventModal.tsx | src/components/agenda/GoogleCalendarSyncButton.tsx | src/hooks/useAgenda.ts | src/hooks/useGoogleCalendar.ts | src/types/agenda.ts
---
# Tipo de evento personalizado não aparece na lista

## Sintoma
Você criou um tipo personalizado, mas ele não aparece ao escolher o tipo de um novo evento.

## Causas possíveis
- Erro de salvamento no momento da criação.
- O tipo foi criado em outra agência (sessão multi-conta).

## Como verificar
1. Tente criar o tipo novamente e confirme a mensagem de sucesso.
2. Confirme que está logado na conta correta.

## Solução
1. Recrie o tipo personalizado.
2. Atualize a página.
3. Tente criar um evento desse tipo logo em seguida.

## Quando procurar suporte
Se o tipo continuar não aparecendo, abra um chamado em **Suporte** com o nome do tipo tentado.
