import type { QuoteChoiceGroup, QuoteSelectionMode, QuoteService } from "@/types/quote";

/** Modos que obrigam vínculo com um grupo de escolha. */
export const GROUPED_MODES: QuoteSelectionMode[] = ["alternative", "free"];

export const requiresGroup = (mode: QuoteSelectionMode) => GROUPED_MODES.includes(mode);

/** Grupos "alternative" sempre operam como escolha única. */
export function normalizeGroupLimits(group_type: "alternative" | "free") {
  return group_type === "alternative"
    ? { min_select: 1, max_select: 1 as number | null }
    : { min_select: 0, max_select: null as number | null };
}

export function groupHint(group_type: "alternative" | "free") {
  return group_type === "alternative"
    ? "cliente escolherá 1 opção"
    : "cliente poderá escolher várias opções";
}

/**
 * Valida a configuração de seleção de um serviço.
 * Retorna null quando válida, ou uma mensagem amigável.
 */
export function validateServiceSelection(
  mode: QuoteSelectionMode,
  groupId: string | null | undefined,
  groups: QuoteChoiceGroup[]
): string | null {
  if (!requiresGroup(mode)) return null;
  if (!groupId) return "Escolha ou crie um grupo para este serviço.";
  const group = groups.find((g) => g.id === groupId);
  if (!group) return "Grupo de escolha inválido para este orçamento.";
  if (group.group_type !== mode) {
    return `O grupo "${group.title}" é do tipo ${groupHint(group.group_type)} e não aceita este modo.`;
  }
  return null;
}

/** Lista de erros amigáveis antes de ativar/salvar a configuração de pedidos. */
export function validateBookingConfig(
  services: Pick<QuoteService, "id" | "option_label" | "service_type" | "selection_mode" | "choice_group_id">[],
  groups: QuoteChoiceGroup[]
): string[] {
  const errors: string[] = [];
  services.forEach((s) => {
    const err = validateServiceSelection(
      (s.selection_mode || "optional") as QuoteSelectionMode,
      s.choice_group_id,
      groups
    );
    if (err) errors.push(`${s.option_label || s.service_type}: ${err}`);
  });
  return errors;
}
