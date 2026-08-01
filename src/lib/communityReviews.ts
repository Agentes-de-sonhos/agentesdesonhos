/**
 * Regras puras do sistema único de avaliações ("Reconhecimento da comunidade")
 * do Mapa do Turismo. A escala pública vai de 3 a 5 estrelas — notas 1 e 2 não
 * são graváveis e disparam orientação para o Suporte.
 */

export const REVIEW_MIN_RATING = 3;
export const REVIEW_MAX_RATING = 5;
export const REVIEW_COMMENT_MAX_LENGTH = 500;
export const REVIEW_SCALE_HINT = "Escala pública de 3 a 5 estrelas";

/**
 * Fontes avaliáveis. "travelmeet" não entra: são dados de uma API externa, sem
 * entidade local que possa ser validada pelo servidor.
 */
export type CommunityReviewSource = "operator" | "supplier" | "guide" | "cruise";

export const REVIEWABLE_SOURCES: readonly CommunityReviewSource[] = [
  "operator",
  "supplier",
  "guide",
  "cruise",
] as const;

/** Só fornecedores com entidade local validável podem receber avaliação. */
export function isReviewableSource(source: string | null | undefined): boolean {
  return REVIEWABLE_SOURCES.includes(String(source) as CommunityReviewSource);
}
export type ReviewCommentStatus = "none" | "pending" | "approved" | "rejected";

export const LOW_STAR_GUIDANCE = {
  title: "Um espaço de reconhecimento",
  body:
    "O Mapa do Turismo é um ambiente colaborativo de reconhecimento entre profissionais. " +
    "As avaliações públicas vão de 3 a 5 estrelas. Para relatar um problema, utilize o Suporte, " +
    "onde a situação poderá ser analisada com responsabilidade.",
  confirmLabel: "Entendi",
  supportLabel: "Ir para o Suporte",
  supportRoute: "/suporte",
} as const;

export const REVIEW_COMMENT_LABEL = "O que essa empresa fez bem?";
export const REVIEW_COMMENT_PLACEHOLDER =
  "Compartilhe um elogio ou destaque uma experiência positiva…";

/** Rótulo semântico da nota. */
export function ratingLabel(rating: number | null | undefined): string {
  switch (rating) {
    case 3:
      return "Bom";
    case 4:
      return "Muito bom";
    case 5:
      return "Excelente";
    default:
      return "";
  }
}

/** Notas graváveis: apenas 3, 4 ou 5. */
export function isSelectableRating(rating: number): boolean {
  return Number.isInteger(rating) && rating >= REVIEW_MIN_RATING && rating <= REVIEW_MAX_RATING;
}

/** Nota 3 nunca aceita comentário. */
export function allowsComment(rating: number): boolean {
  return rating === 4 || rating === 5;
}

/** Média com uma casa decimal em formato pt-BR ("4,8"). */
export function formatAverage(average: number | null | undefined): string | null {
  if (average === null || average === undefined || Number.isNaN(average)) return null;
  return average.toFixed(1).replace(".", ",");
}

/** Resumo compacto exibido nos cards: "4,8 (23)". */
export function formatRatingSummary(
  average: number | null | undefined,
  count: number | null | undefined,
): string | null {
  const total = count ?? 0;
  const avg = formatAverage(average);
  if (!total || !avg) return null;
  return `${avg} (${total})`;
}

/** Chave polimórfica usada nos mapas de agregados. */
export function reviewTargetKey(source: string, supplierId: string): string {
  return `${source}:${supplierId}`;
}

/**
 * Texto de comentário sempre tratado como texto puro: sem HTML, sem entidades
 * ativas, colapsando espaços em excesso e respeitando o limite de caracteres.
 */
export function sanitizeReviewComment(input: string | null | undefined): string | null {
  if (!input) return null;
  const withoutTags = String(input)
    .replace(/<[^>]*>/g, " ")
    .replace(/[\u0000-\u001F\u007F]/g, " ")
    .replace(/[ \t]{2,}/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
  if (!withoutTags) return null;
  return withoutTags.slice(0, REVIEW_COMMENT_MAX_LENGTH);
}

/** Normaliza (nota, comentário) conforme as regras da escala. */
export function normalizeReviewPayload(rating: number, comment?: string | null) {
  const safeComment = allowsComment(rating) ? sanitizeReviewComment(comment) : null;
  return { rating, comment: safeComment };
}

export type EligibilityReason =
  | "ok"
  | "unauthenticated"
  | "email_unconfirmed"
  | "incomplete_profile"
  | "sem_vinculo_agencia"
  | "sem_assinatura"
  | "own_company";

export function eligibilityMessage(reason: string | null | undefined): string {
  switch (reason) {
    case "unauthenticated":
      return "Entre na plataforma para participar do reconhecimento da comunidade.";
    case "email_unconfirmed":
      return "Confirme seu e-mail para poder avaliar fornecedores.";
    case "incomplete_profile":
      return "Complete seu perfil com nome e foto para avaliar. Assim sua avaliação aparece com identificação real.";
    case "sem_vinculo_agencia":
      return "O reconhecimento da comunidade é feito por profissionais vinculados a uma agência. Finalize a configuração da sua agência para participar.";
    case "sem_assinatura":
      return "As avaliações são exclusivas de assinantes ativos da plataforma. Ative ou renove seu plano para reconhecer parceiros.";
    case "own_company":
      return "Você não pode avaliar um fornecedor vinculado à sua própria agência.";
    default:
      return "Não foi possível registrar sua avaliação agora.";
  }
}

/** Traduz erros das RPCs em mensagens amigáveis. */
export function reviewErrorMessage(message: string | null | undefined): string {
  const raw = String(message || "");
  if (raw.includes("own_company")) return eligibilityMessage("own_company");
  if (raw.includes("not_eligible:")) {
    const reason = raw.split("not_eligible:")[1]?.split(/[^a-z_]/)[0];
    return eligibilityMessage(reason);
  }
  if (raw.includes("invalid_rating")) return "Selecione uma nota entre 3 e 5 estrelas.";
  if (raw.includes("invalid_supplier") || raw.includes("invalid_source"))
    return "Este fornecedor não está disponível para avaliação no diretório.";
  if (raw.includes("unauthenticated")) return eligibilityMessage("unauthenticated");
  if (raw.includes("rate_limited")) return "Muitas denúncias em pouco tempo. Tente novamente mais tarde.";
  if (raw.includes("own_review")) return "Você não pode denunciar sua própria avaliação.";
  if (raw.includes("forbidden")) return "Ação permitida apenas para administradores.";
  return "Não foi possível concluir a ação. Tente novamente.";
}

export const COMMENT_STATUS_LABEL: Record<ReviewCommentStatus, string> = {
  none: "Sem comentário",
  pending: "Em análise",
  approved: "Publicado",
  rejected: "Não aprovado",
};

export const REPORT_REASONS = [
  { value: "inappropriate", label: "Conteúdo inapropriado" },
  { value: "offensive", label: "Ofensivo ou desrespeitoso" },
  { value: "spam", label: "Spam ou propaganda" },
  { value: "false", label: "Informação falsa" },
  { value: "other", label: "Outro motivo" },
] as const;

export const REVIEW_SOURCE_LABEL: Record<string, string> = {
  operator: "Operadoras / Diretório",
  supplier: "Fornecedores do trade",
  guide: "Guias de turismo",
  cruise: "Companhias marítimas",
};