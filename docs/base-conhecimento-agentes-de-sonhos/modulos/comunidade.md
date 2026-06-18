# Módulo: Comunidade (Trade Connect)

[← Índice](../00-LEIA-ME-E-INDICE.md)

- **Rotas:** `/comunidade`, `/comunidade/chat`, `/comunidade/perfil`, `/comunidade/comunidades`, `/comunidade/agente/:userId`. Rotas antigas `/trade-connect/*` redirecionam.
- **Estado:** CONFIRMADO.

## Funcionalidades
- Feed social + perfis públicos com tags de nicho.
- Chat com bottom sheet mobile, swipe-down.
- Salas (`community_rooms`), mensagens (`community_messages`), posts (`community_posts`) e interações.
- Comunidades temáticas com membership (`community_members`).
- Mensagens diretas (`direct_conversations`, `direct_messages`).
- Conexões (`connections`).
- Área Travel Experts (premium gated).
- Highlights (`community_highlights`), votos (`community_votes`).

## Evidências
`src/pages/TradeConnectHub.tsx`, `Community.tsx`, `TradeConnectProfile.tsx`, `TradeConnectCommunities.tsx`, `AgentProfile.tsx`, `src/components/community/*`, `community-chat/*`, `trade-connect/*`.