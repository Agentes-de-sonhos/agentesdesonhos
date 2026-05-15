## Objetivo

Substituir o card atual `CommunityQACard` (perguntas/respostas) por um novo card `CommunitySocialFeed` — um feed social profissional onde qualquer membro autenticado publica livremente texto, imagem ou texto+imagem, com curtidas e comentários, sem aprovação prévia. Mesma identidade visual (lilás/roxo, cards arredondados).

A área "Perguntas da Comunidade" no `Dashboard.tsx` e no `DashboardFornecedor.tsx` passa a renderizar o novo feed social. O sistema antigo de Q&A continua acessível em outras páginas (não removemos `qa_questions`); apenas a seção do dashboard muda.

## 1. Banco de dados (nova migration)

Três tabelas novas em `public`:

**`community_posts`**
- `id uuid pk`, `user_id uuid not null`, `content text` (até 5000 chars), `image_url text` (opcional), `likes_count int default 0`, `comments_count int default 0`, `created_at`, `updated_at`
- Constraint: `content` ou `image_url` obrigatórios

**`community_post_comments`**
- `id`, `post_id uuid fk -> community_posts on delete cascade`, `user_id`, `content text not null` (até 2000 chars), `created_at`, `updated_at`

**`community_post_likes`**
- `id`, `post_id uuid fk on delete cascade`, `user_id`, `created_at`
- `unique(post_id, user_id)` — impede curtida duplicada

**Triggers**
- `update_updated_at_column` em posts e comments
- `update_community_post_likes_count` (AFTER INSERT/DELETE em likes → atualiza `likes_count`)
- `update_community_post_comments_count` (AFTER INSERT/DELETE em comments → atualiza `comments_count`)

**RLS**
- Posts/comments/likes: SELECT liberado para qualquer usuário autenticado (`auth.uid() is not null`)
- INSERT exige `auth.uid() = user_id`
- UPDATE/DELETE: somente autor OU admin (`has_role(auth.uid(), 'admin')`)

**Storage**
- Novo bucket público `community-feed` para imagens das publicações
- Política: SELECT público; INSERT/UPDATE/DELETE somente em pastas `{auth.uid()}/...`

## 2. Novo componente `CommunitySocialFeed`

Arquivo: `src/components/dashboard/CommunitySocialFeed.tsx`

Mantém o mesmo container visual do card atual (gradient lilás `--section-community`, header colapsável, mesmo padding) para parecer evolução natural.

**Cabeçalho**
- Ícone `Users` ou `MessageCircle`
- Título: "Comunidade"
- Subtítulo: "Compartilhe dúvidas, novidades, indicações, experiências e oportunidades com outros agentes de viagem."
- Mantém o botão chevron de colapsar e o badge "X novas publicações" baseado em `localStorage` (mesma lógica de `lastViewedAt` do card atual)

**Caixa de criação (Composer)**
- Card branco arredondado
- Avatar do usuário logado à esquerda
- `Textarea` autosize com placeholder: "O que você quer compartilhar com a comunidade?"
- Linha de ações: botão "Adicionar foto" (ícone `ImageIcon`) que abre file picker; preview da imagem selecionada com botão remover
- Botão "Publicar" em roxo, desabilitado se não houver texto nem imagem
- Ao publicar:
  1. Se houver imagem, upload para `community-feed/{user_id}/{timestamp}-{filename}` → pega `publicUrl`
  2. Insert em `community_posts`
  3. Limpa o composer; React Query invalida `["community-feed"]`; novo post aparece no topo

**Lista de posts (ordenada por `created_at desc`)**
- Paginação: 10 por página com botão "Carregar mais" (ou infinite scroll simples)
- Cada post mostra:
  - Avatar + nome do autor + role badge (Agente/Fornecedor/Admin via `user_roles`)
  - Tempo relativo via `formatDistanceToNow(date, { locale: ptBR, addSuffix: true })`
  - Texto (preserva quebras de linha com `whitespace-pre-wrap`)
  - Imagem (se houver) com `object-cover` e `rounded-xl`
  - Linha de ações: botão Curtir (filled quando o usuário curtiu), Comentar (toggle expand), Compartilhar (copia link do dashboard ou usa Web Share API se disponível)
  - Contadores "X curtidas · Y comentários"
  - Menu `...` para autor/admin com "Excluir publicação"

**Seção de comentários (expansível)**
- Lista de comentários do post (avatar, nome, tempo, texto)
- Campo "Escreva um comentário..." com botão enviar
- Comentários aparecem imediatamente via optimistic update + invalidate
- Autor/admin pode excluir o próprio comentário

**Estado vazio**
- Ilustração leve + título "Seja o primeiro a movimentar a comunidade"
- Texto: "Compartilhe uma dúvida, indicação, novidade ou experiência com outros profissionais de viagem."
- Botão "Criar publicação" (foca o composer)

## 3. Hooks novos

`src/hooks/useCommunityFeed.ts` (substitui parte do uso de `useQA` no dashboard):
- `useFeedPosts(limit, offset)` — query lista
- `useCreatePost()` — mutation com upload + insert
- `useDeletePost()`
- `usePostComments(postId)` — query
- `useAddComment(postId)` — mutation
- `useDeleteComment()`
- `useToggleLike(postId)` — mutation com optimistic update; lê `community_post_likes` filtrado por `user_id` para saber se curtiu

Roles dos autores: hook auxiliar `useUsersRoles(userIds[])` consultando `user_roles` em batch (single query `in('user_id', userIds)`), com cache de 10 min.

## 4. Substituições

- `src/pages/Dashboard.tsx`: trocar import de `CommunityQACard` por `CommunitySocialFeed` no mesmo lugar.
- `src/pages/DashboardFornecedor.tsx`: idem.
- `CommunityQACard.tsx` permanece no projeto por enquanto (caso seja referenciado em outras telas), mas não será mais renderizado no dashboard. Se nenhuma outra página usar, removemos o arquivo.

## 5. Detalhes técnicos

```text
community_posts 1───* community_post_comments
       │
       └──* community_post_likes (unique post_id+user_id)
```

- Imagens: máx 5 MB, tipos `image/jpeg|png|webp`; validação client-side antes do upload.
- Texto: trim + limite 5000 chars no client e via check constraint no DB.
- Real-time opcional (fora do escopo inicial): pode ser adicionado depois com `supabase.channel` em `community_posts`.
- Acessibilidade: botões com `aria-label`, foco visível, alt text na imagem ("Imagem da publicação de {nome}").
- Responsividade: composer e cards em `w-full`; imagens com `max-h-[480px] object-cover`; ações em `flex-wrap` no mobile.

## 6. Permissões resumidas

- Qualquer usuário autenticado: ler feed, criar post, comentar, curtir
- Autor: editar/excluir próprio post e próprios comentários
- Admin (`has_role(auth.uid(),'admin')`): excluir qualquer post/comentário (moderação reativa, não preventiva)
- Sem fluxo de aprovação. Posts aparecem imediatamente.

## 7. Entregáveis

1. Migration SQL (tabelas + RLS + triggers + bucket + storage policies)
2. `src/hooks/useCommunityFeed.ts`
3. `src/components/dashboard/CommunitySocialFeed.tsx` (composer + feed + comments + likes + estado vazio)
4. Substituição no `Dashboard.tsx` e `DashboardFornecedor.tsx`
5. Remoção opcional do `CommunityQACard.tsx` se ficar órfão