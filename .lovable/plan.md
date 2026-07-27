
# Auditoria — Módulo Comunidade

Diagnóstico somente-leitura para preparar a unificação em uma única experiência baseada no Travel Experts. Nenhum arquivo, rota ou dado será alterado nesta etapa.

## 1. Rotas relacionadas (src/App.tsx)

| Rota | Componente | Papel atual |
|---|---|---|
| `/comunidade` | `TradeConnectHub` | Hub social (perfil, conexões) com **QAFeed** no centro |
| `/comunidade/chat` | `Community` | Experiência **Travel Experts** completa (feed, membros, eventos, workshops, highlights) |
| `/comunidade/perfil` | `TradeConnectProfile` | Edição do perfil Trade Connect |
| `/comunidade/comunidades` | `TradeConnectCommunities` | Lista "Minhas comunidades" (aponta para Travel Experts) |
| `/comunidade/agente/:userId` | `AgentProfile` | Perfil público de agente |
| `/perguntas-respostas` | `PerguntasRespostas` | Página dedicada com **QAFeed** + `QARankingSidebar` |
| `/trade-connect`, `/trade-connect/perfil`, `/trade-connect/comunidades`, `/trade-connect/agente/:userId` | Redirects | Redirecionam para `/comunidade/*` |

Pontos de entrada:
- Menu lateral ("Comunidade") → `/comunidade` (Hub).
- Dashboard, botão **"Ver toda a comunidade"** (`CommunitySocialFeed.tsx`) → `/comunidade` (Hub, não a experiência Travel Experts).
- Dashboard, card `CommunityQACard` "Ver todas as perguntas" → `/perguntas-respostas`.

## 2. Componentes React por fluxo

**Dashboard (widgets)**
- `src/components/dashboard/CommunitySocialFeed.tsx` (feed social resumido, usa `useCommunityFeed`, `EditPostDialog`, `PostImageGallery`)
- `src/components/dashboard/CommunityQACard.tsx` (perguntas em destaque)

**Hub `/comunidade` (TradeConnectHub)**
- `src/pages/TradeConnectHub.tsx`
- `src/components/qa/QAFeed.tsx` (coluna central)
- `src/components/qa/QAQuestionDetail.tsx`, `QARanking.tsx`, `QARankingSidebar.tsx`
- Hooks: `useTradeConnect` (perfil + conexões), `useCommunityMembership`

**Perguntas e Respostas `/perguntas-respostas`**
- `src/pages/PerguntasRespostas.tsx`
- Reaproveita `QAFeed` + `QARankingSidebar` (mesmos componentes do Hub)

**Travel Experts `/comunidade/chat`**
- `src/pages/Community.tsx`
- `src/components/community/*`: `CommunityGate`, `CommunityFeedSection`, `CommunityLeftSidebar`, `CommunityRightSidebar`, `MemberDirectory`, `MemberProfileDialog`, `MemberCard`, `CreatePostForm`, `PostCard`, `PostImageGallery`, `EditPostDialog`, `EditCommunityProfileDialog`, `FamTripsSection`, `OnlineMeetingsSection`, `InPersonEventsSection`, `WorkshopsSection`, `PaidTrainingsSection`, `WhatsAppSection`, `HighlightsSection`
- `src/components/community-chat/*`: `ChatFloatingButton`, `ChatInput`, `ChatMessageList`, `OnlineAgentsStrip`
- Hooks: `useCommunity`, `useCommunityFeed`, `useCommunityMembership`, `useCommunityChat`

**Compartilhados**
- `useTradeConnect` (conexões + perfil, usado em Hub e perfil de agente)
- `useCommunityFeed` (usado no dashboard e em Travel Experts)

## 3. Tabelas Supabase por módulo

**Dashboard `CommunitySocialFeed`** — `community_posts`, `community_post_comments`, `community_post_likes`, `profiles_public`, `community_members` (para specialties/status)

**Hub `/comunidade` (TradeConnectHub)** — `profiles` (via `useTradeProfile`), `profiles_public`, `connections`, `community_members` (só p/ badge de membro), + tabelas de Q&A via `QAFeed`

**Perguntas e Respostas** — `qa_questions`, `qa_answers`, `qa_answer_likes`, `qa_answer_votes`

**Travel Experts `/comunidade/chat`** — `community_members`, `community_posts`, `community_post_comments`, `community_post_likes`, `community_rooms`, `community_messages`, `community_highlights`, `community_votes`, `monthly_prizes`, `fun_trips`, `online_meetings`, `in_person_events`, `professional_workshops`, `paid_trainings`, `whatsapp_community`, `profiles_public`

**DMs (transversal)** — `direct_conversations`, `direct_messages`

## 4. Edge Functions / APIs

Nenhuma Edge Function é chamada pelos hooks de Comunidade / Q&A / Trade Connect / Chat (verificado com `rg "functions.invoke"` em `useQA`, `useCommunity`, `useCommunityFeed`, `useCommunityMembership`, `useCommunityChat`, `useTradeConnect`). Todo o tráfego é PostgREST direto do cliente com RLS. Storage: bucket `avatars` (upload de capa/foto).

## 5. Tabelas compartilhadas × exclusivas

- **Compartilhadas por Dashboard + Travel Experts:** `community_posts`, `community_post_comments`, `community_post_likes`, `community_members`, `profiles_public`.
- **Compartilhadas por Hub + Perfis de Agente:** `connections`, `profiles`, `profiles_public`.
- **Exclusivas do Q&A:** `qa_questions`, `qa_answers`, `qa_answer_likes`, `qa_answer_votes` (usadas em `/perguntas-respostas` **e** também dentro do Hub via `QAFeed`).
- **Exclusivas do Travel Experts:** `community_rooms`, `community_messages`, `community_highlights`, `community_votes`, `monthly_prizes`, `fun_trips`, `online_meetings`, `in_person_events`, `professional_workshops`, `paid_trainings`, `whatsapp_community`.
- **Transversal (DMs, independe de comunidade):** `direct_conversations`, `direct_messages`.

## 6. Dados existentes só no Q&A

Sim. Dados vivos exclusivos das tabelas `qa_*`:
- `qa_questions`: **19**
- `qa_answers`: **43**
- `qa_answer_likes`: **9**
- `qa_answer_votes`: **15**
- Autores únicos em perguntas/respostas: **27**

Esses dados não existem em `community_posts/comments/likes` e precisam ser tratados na unificação (migrar para posts+comentários, manter como coleção paralela dentro do Travel Experts, ou preservar a rota Q&A).

## 7. Dados a considerar em migração

Volumes atuais no banco:
- `community_posts` **5**, `community_post_comments` **1**, `community_post_likes` **14**, `community_members` **13** (base do Travel Experts).
- `community_rooms` **7**, `community_messages` **0**, `community_highlights` **0**, `community_votes` **0**.
- `connections` **10**, `direct_conversations` **78**, `direct_messages` **94** (transversais — permanecem).
- Q&A: ver item 6.

Volume baixo em posts/comments favorece consolidação; o Q&A é o único conjunto com massa relevante que hoje NÃO vive em Travel Experts.

## 8. Travel Experts já suporta o necessário?

Feed social do Travel Experts (via `useCommunityFeed`/`CommunityFeedSection`/`PostCard`) já cobre:
- Posts com texto, tags, `is_pinned`, `edited_at`.
- Múltiplas imagens (`image_urls`) + lightbox (`PostImageGallery`).
- Curtidas (`community_post_likes`) com toggle otimista.
- Comentários (`community_post_comments`) com fetch on-demand.
- Edição/remoção pelo autor (`EditPostDialog`, `updatePost`, `deletePost`).
- Perfil enriquecido do autor (`profiles_public` + `community_members`).

Ausente hoje no feed do Travel Experts: **fluxo de "Pergunta & Resposta" estruturado** (título, múltiplas respostas com voto/ranking, "melhor resposta") — hoje só existe em `qa_*`. Precisará ser ou preservado como aba, ou remodelado como tipo de post.

## 9. Comportamento atual dos pontos de entrada

- **Menu "Comunidade"** → `/comunidade` renderiza `TradeConnectHub`: capa + perfil no topo, coluna esquerda com progresso/nichos/parcerias, **centro com `QAFeed` (perguntas e respostas)**, direita com solicitações/conexões. Não mostra o feed social do Travel Experts.
- **Dashboard, "Ver toda a comunidade"** → `/comunidade` (mesmo Hub acima). Ou seja, o usuário sai de um feed social no dashboard e cai em uma tela de Q&A — descontinuidade evidente.
- **Dashboard, `CommunityQACard` "Ver todas as perguntas"** → `/perguntas-respostas` (Q&A puro).
- **Travel Experts propriamente dito** só é acessível via `/comunidade/chat` (ou `/comunidade/comunidades` → card "Travel Experts") e é gated por `SubscriptionGuard feature="community"` + `CommunityGate` de membership.

## 10. Componentes/rotas potencialmente removíveis após unificação

Candidatos a descontinuação (dependem das decisões do item 12):
- Rotas: `/comunidade/chat` (absorvida por `/comunidade`), `/comunidade/comunidades` (perde sentido com única comunidade), `/perguntas-respostas` (se Q&A virar aba/tipo de post) e todos os `/trade-connect/*` já legados.
- Páginas: `TradeConnectHub.tsx`, `TradeConnectCommunities.tsx`, `PerguntasRespostas.tsx`.
- Componentes: `CommunityQACard.tsx` do dashboard (se substituído pelo novo widget unificado), `QARanking.tsx`/`QARankingSidebar.tsx` (se ranking migrar para engajamento de posts).
- Trade-Connect UI genérica: `src/components/trade-connect/TagSelector.tsx` (avaliar reuso).
- Widget dashboard: `CommunitySocialFeed.tsx` mantém utilidade, mas o CTA "Ver toda a comunidade" deve apontar para o feed do Travel Experts.

O que **não** deve ser removido: `useCommunityFeed`, `useCommunityMembership`, `useTradeConnect` (conexões), `direct_*`, `MemberDirectory`, `AgentProfile`, `PostCard`/`EditPostDialog`, todas as tabelas `community_*` (base do Travel Experts).

## 11. Riscos técnicos e dependências

- **Preservação do Q&A**: 19 perguntas + 43 respostas + 24 interações reais. Excluir sem plano perde histórico e reputação de autores.
- **Gate de assinatura**: `/comunidade/chat` hoje exige `SubscriptionGuard feature="community"` + `CommunityGate` (membership `approved_unverified`/`verified`). Unificar tudo sob esse gate pode **cortar acesso** de usuários que hoje veem `/comunidade` (Hub) e `/perguntas-respostas` sem serem membros. Requer decisão de negócio antes de mover o gate.
- **Menu e deep links**: componentes de layout (`AppSidebar`, `MobileSidebar`, `MobileDrawerMenu`) codificam `/comunidade` como URL "Start-plan-locked" — mudar rotas exige atualizar essas listas.
- **Redirects legados**: `/trade-connect/*` já redirecionam; incluir novos redirects para `/comunidade/chat`, `/comunidade/comunidades`, `/perguntas-respostas` para não quebrar links compartilhados.
- **RLS**: `qa_*` têm 5 policies cada e `community_*` políticas próprias. Qualquer migração de dados Q&A → `community_posts` precisa validar que autores mantêm autoria (mesmo `user_id`) para não violar policies de edit/delete.
- **Widgets dashboard**: `CommunityQACard` faz agregações próprias sobre `qa_*`; se Q&A migrar para posts, o widget precisa ser refeito ou substituído.
- **Realtime/chat**: `community_rooms`/`community_messages` está zerado, mas o `ChatFloatingButton` está integrado ao layout do Travel Experts — validar se será mantido.
- **Perfil "Trade Connect" vs "Community Member"**: hoje coexistem `profiles` (com campos Trade Connect) e `community_members` (bio/segments/specialties próprios). Unificar exige reconciliar os dois modelos ou definir um como fonte de verdade.
- **Baixo volume atual de posts (5)** reduz risco de migração, mas indica que a experiência principal hoje é o Q&A — a unificação precisa de estratégia clara para não parecer "vazia".

## 12. Plano de migração proposto (sem execução)

**Etapa 0 — Decisões de produto (bloqueante)**
- Q&A vira: (a) aba dedicada dentro do Travel Experts mantendo tabelas `qa_*`, ou (b) tipo de post estruturado migrando para `community_posts` + `community_post_comments`. Recomendação técnica: (a) no curto prazo, (b) como evolução.
- Definir se Travel Experts será obrigatoriamente gated (membership + assinatura) ou se haverá "modo leitura" público para não-membros.
- Definir fonte de verdade do perfil (Trade Connect em `profiles` vs `community_members`).

**Etapa 1 — Consolidação de rotas**
- Fazer `/comunidade` renderizar a experiência atual de `/comunidade/chat` (Travel Experts).
- Manter `/comunidade/chat`, `/comunidade/comunidades` e `/perguntas-respostas` como redirects temporários para `/comunidade` (com fragmentos/aba correspondente, ex.: `/comunidade?tab=qa`).
- Ajustar `CommunitySocialFeed` (dashboard) para apontar "Ver toda a comunidade" para a nova rota unificada.

**Etapa 2 — Absorção do Hub Trade Connect**
- Reaproveitar cabeçalho de perfil, progresso, solicitações e conexões do `TradeConnectHub` como novas seções/laterais dentro do layout do Travel Experts (mantendo `CommunityLeftSidebar`/`CommunityRightSidebar`).
- Descontinuar `TradeConnectCommunities` (única comunidade) e remover card duplicado do menu.

**Etapa 3 — Integração do Q&A**
- Cenário (a): incorporar `QAFeed` como aba "Perguntas" dentro de `Community.tsx`, preservando tabelas `qa_*` e ranking. Ajustar `CommunityQACard` do dashboard para apontar para essa aba.
- Cenário (b) — futuro: script de migração idempotente `qa_questions → community_posts` (com tag `pergunta`) e `qa_answers → community_post_comments`, mantendo `user_id`, `created_at`, contagens e curtidas (`qa_answer_likes → community_post_likes` no comentário). Rodar em staging, validar RLS, prever rollback.

**Etapa 4 — Gate & permissões**
- Alinhar `SubscriptionGuard` e `CommunityGate` à decisão da Etapa 0. Se houver "modo leitura", refatorar `CommunityGate` para permitir visualização sem membership e bloquear apenas ações de escrita.
- Atualizar `AppSidebar`/`MobileSidebar`/`MobileDrawerMenu` (lista `startPlanLockedUrls`) e telemetria (`user_feature_access`, `subscription`).

**Etapa 5 — Limpeza**
- Remover páginas/rotas obsoletas listadas no item 10, mantendo redirects até 1–2 releases.
- Remover `CommunityQACard` (ou refatorar) e dependências não usadas em `src/components/trade-connect/`.
- Atualizar documentação: `docs/base-conhecimento-agentes-de-sonhos/modulos/comunidade.md`, `perguntas-respostas.md` e memórias `mem://features/comunidade/*`.

**Etapa 6 — QA e observabilidade**
- Testes E2E cobrindo: acesso via menu, gate de assinatura, criação de post, criação de pergunta, curtidas, comentários, edição, redirects legados.
- Monitorar `app_error_logs` e engajamento (posts, likes, comments) por 1–2 semanas antes de remover redirects.

Nenhuma das etapas foi executada. Este documento é somente diagnóstico.
