/**
 * Visibilidade das publicações da Comunidade (Agentes de Sonhos).
 * "public" = qualquer pessoa com acesso à Comunidade; "network" = autor + conexões aceitas.
 * "internal" permanece reservado à comunidade interna das agências e não é oferecido aqui.
 */
export type CommunityVisibility = "public" | "network" | "internal";

export const DEFAULT_COMMUNITY_VISIBILITY: CommunityVisibility = "public";

export const COMMUNITY_VISIBILITY_OPTIONS: {
  value: Exclude<CommunityVisibility, "internal">;
  label: string;
  description: string;
}[] = [
  {
    value: "public",
    label: "Qualquer pessoa",
    description: "Visível para quem já acessa a Comunidade.",
  },
  {
    value: "network",
    label: "Minha rede",
    description: "Visível apenas para você e suas conexões aceitas.",
  },
];

export function visibilityLabel(visibility?: string | null): string {
  const found = COMMUNITY_VISIBILITY_OPTIONS.find((o) => o.value === visibility);
  return found?.label ?? "Qualquer pessoa";
}

/** Dica de UI (a regra real é aplicada por RLS no banco). */
export function canViewCommunityPost(
  post: { user_id: string; visibility?: string | null },
  currentUserId: string | null | undefined,
  acceptedConnectionIds: string[],
  isAdmin = false,
): boolean {
  if (post.visibility !== "network") return true;
  if (!currentUserId) return false;
  if (post.user_id === currentUserId) return true;
  if (isAdmin) return true;
  return acceptedConnectionIds.includes(post.user_id);
}
