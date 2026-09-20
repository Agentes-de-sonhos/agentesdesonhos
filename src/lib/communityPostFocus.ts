/**
 * Navegação para uma publicação específica da Comunidade a partir da busca.
 * Não cria página nova: usa a própria rota do feed com o parâmetro `post`,
 * carregando páginas seguintes até localizar a publicação.
 */
export const COMMUNITY_POST_PARAM = "post";

/** Rota do feed já apontando para a publicação buscada. */
export function buildCommunityPostUrl(postId: string): string {
  return `/comunidade/feed?${COMMUNITY_POST_PARAM}=${encodeURIComponent(postId)}`;
}

/** Id estável do elemento que envolve a publicação no feed. */
export function communityPostElementId(postId: string): string {
  return `community-post-${postId}`;
}

/** Lê o id da publicação alvo a partir da query string. */
export function readTargetPostId(search: string): string | null {
  const value = new URLSearchParams(search).get(COMMUNITY_POST_PARAM);
  return value && value.trim() ? value.trim() : null;
}

export interface PostFocusDecision {
  /** Publicação está carregada e deve receber rolagem/foco. */
  focus: boolean;
  /** Precisa carregar a próxima página para continuar procurando. */
  loadMore: boolean;
}

/** Decide entre focar a publicação, carregar mais páginas ou desistir. */
export function decidePostFocus(params: {
  targetPostId: string | null;
  loadedPostIds: string[];
  hasNextPage: boolean;
  isFetchingNextPage: boolean;
  alreadyFocused: boolean;
}): PostFocusDecision {
  const { targetPostId, loadedPostIds, hasNextPage, isFetchingNextPage, alreadyFocused } = params;
  if (!targetPostId || alreadyFocused) return { focus: false, loadMore: false };
  if (loadedPostIds.includes(targetPostId)) return { focus: true, loadMore: false };
  return { focus: false, loadMore: hasNextPage && !isFetchingNextPage };
}
