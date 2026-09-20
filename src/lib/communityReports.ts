/**
 * Fase 4 da Comunidade: motivos de denúncia, estados administrativos e regras de
 * transição compartilhadas entre o fluxo do usuário e a central administrativa.
 * Os mesmos valores são validados no banco (CHECKs e triggers da migração 0009).
 */

export type CommunityReportReason =
  | "harassment"
  | "fraud"
  | "spam"
  | "misinformation"
  | "hate_speech"
  | "threat"
  | "self_harm"
  | "explicit_content"
  | "dangerous_organizations"
  | "sexual_content"
  | "fake_account"
  | "child_exploitation"
  | "restricted_goods"
  | "non_consensual_intimate_images";

export type CommunityReportStatus =
  | "pending"
  | "in_review"
  | "resolved_action"
  | "closed_no_action";

export type CommunityReportTargetKind = "post" | "comment";

export type CommunityReportResolution = "content_removed" | "content_kept";

export const COMMUNITY_REPORT_REASONS: { value: CommunityReportReason; label: string }[] = [
  { value: "harassment", label: "Assédio" },
  { value: "fraud", label: "Fraude" },
  { value: "spam", label: "Spam" },
  { value: "misinformation", label: "Desinformação" },
  { value: "hate_speech", label: "Discurso de ódio" },
  { value: "threat", label: "Ameaça" },
  { value: "self_harm", label: "Automutilação" },
  { value: "explicit_content", label: "Conteúdo explícito" },
  { value: "dangerous_organizations", label: "Organizações perigosas ou extremistas" },
  { value: "sexual_content", label: "Conteúdo sexual" },
  { value: "fake_account", label: "Conta falsa" },
  { value: "child_exploitation", label: "Exploração infantil" },
  { value: "restricted_goods", label: "Produtos e serviços restritos" },
  { value: "non_consensual_intimate_images", label: "Imagens íntimas sem consentimento" },
];

export const COMMUNITY_REPORT_STATUS_LABELS: Record<CommunityReportStatus, string> = {
  pending: "Pendente",
  in_review: "Em análise",
  resolved_action: "Resolvida com ação",
  closed_no_action: "Encerrada sem ação",
};

export const COMMUNITY_REPORT_TARGET_LABELS: Record<CommunityReportTargetKind, string> = {
  post: "Publicação",
  comment: "Comentário",
};

export const MAX_REPORT_DETAILS = 500;

export function reportReasonLabel(reason: string): string {
  return COMMUNITY_REPORT_REASONS.find((item) => item.value === reason)?.label ?? "Outro motivo";
}

export function reportStatusLabel(status: string): string {
  return COMMUNITY_REPORT_STATUS_LABELS[status as CommunityReportStatus] ?? status;
}

export function isAllowedReportReason(reason: string): reason is CommunityReportReason {
  return COMMUNITY_REPORT_REASONS.some((item) => item.value === reason);
}

/** Estados em que a denúncia continua ativa (impede duplicidade do mesmo autor). */
export function isActiveReportStatus(status: string): boolean {
  return status === "pending" || status === "in_review";
}

/** Mesmas transições validadas pelo gatilho do banco. */
export function canTransitionReport(
  from: CommunityReportStatus,
  to: CommunityReportStatus,
): boolean {
  if (from === to) return false;
  if (from === "pending") return to === "in_review" || to === "resolved_action" || to === "closed_no_action";
  if (from === "in_review") return to === "resolved_action" || to === "closed_no_action";
  return false;
}

/** Remove marcação e excesso de espaços do texto opcional antes de enviar. */
export function sanitizeReportDetails(input: string): string | null {
  const clean = input
    .replace(/<[^>]*>/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, MAX_REPORT_DETAILS);
  return clean.length > 0 ? clean : null;
}

/** Mensagem exibida ao denunciante, sem notas internas nem identidade de moderadores. */
export function reportStatusMessage(status: string): string {
  switch (status) {
    case "in_review":
      return "Sua denúncia entrou em análise.";
    case "resolved_action":
      return "Sua denúncia foi concluída com ação.";
    case "closed_no_action":
      return "Sua denúncia foi encerrada sem ação.";
    default:
      return "Sua denúncia foi registrada.";
  }
}

/** Remove das listas os ids ocultados pelo próprio usuário, sem buracos artificiais. */
export function filterHiddenPosts<T extends { id: string }>(items: T[], hiddenIds: string[]): T[] {
  if (hiddenIds.length === 0) return items;
  const hidden = new Set(hiddenIds);
  return items.filter((item) => !hidden.has(item.id));
}
