---
id: ag-prob-03
titulo: Google Calendar não conecta
modulo: Agenda
tipo: problema-comum
publico:
  - titular
  - agente
nivel: iniciante
plano: não-confirmado
permissoes: depende do perfil
intencoes:
  - google calendar não conecta
palavras-chave:
  - Google Calendar não conecta
  - problema
status: pronto
confianca: confirmado
ultima-revisao: 2026-06-22
artigos-relacionados: []
fonte-interna: src/pages/Agenda.tsx | src/components/agenda/EventModal.tsx | src/components/agenda/GoogleCalendarSyncButton.tsx | src/hooks/useAgenda.ts | src/hooks/useGoogleCalendar.ts | src/types/agenda.ts
---
# Google Calendar não conecta

## Sintoma
Ao clicar em **Conectar Google Calendar**, a autorização falha ou o status não muda.

## Causas possíveis
- Janela de autorização bloqueada pelo navegador.
- Conta Google sem permissão para usar a integração.
- Sessão da plataforma expirada.

## Como verificar
1. Verifique se há pop-up bloqueado.
2. Confirme que está usando a conta Google certa.
3. Faça logout e login na plataforma.

## Solução
1. Permita pop-ups do domínio da plataforma.
2. Repita a autorização do Google.
3. Se sua conta for corporativa, valide com o administrador do Workspace.

## Quando procurar suporte
Se a conexão continuar falhando após esses passos, abra um chamado em **Suporte** com prints da mensagem do Google.
