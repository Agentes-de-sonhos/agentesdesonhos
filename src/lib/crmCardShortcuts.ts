/**
 * Regras de visibilidade dos atalhos "Gerar orçamento" / "Gerar carteira digital"
 * nos cards do Kanban de Oportunidades e Operações.
 *
 * As regras usam SEMPRE a ordem configurada das colunas (não os nomes visíveis),
 * e a semântica de fechamento vem do identificador legado da etapa.
 */

export const CLOSED_OPPORTUNITY_LEGACY_KEY = "closed";

/** Quantas primeiras colunas de Oportunidades exibem "Gerar orçamento". */
export const QUOTE_SHORTCUT_COLUMNS = 3;
/** Quantas primeiras colunas de Operações exibem "Gerar carteira digital". */
export const OPERATION_WALLET_SHORTCUT_COLUMNS = 2;

export interface ShortcutOpportunityStage {
  id: string;
  legacy_key?: string | null;
}

export function isClosedOpportunityStage(
  stage?: { legacy_key?: string | null } | null
): boolean {
  return stage?.legacy_key === CLOSED_OPPORTUNITY_LEGACY_KEY;
}

export interface OpportunityCardShortcuts {
  /** "Gerar orçamento" (primeiras 3 colunas, exceto a etapa de fechamento). */
  quote: boolean;
  /** "Gerar carteira digital" (somente na etapa de venda ganha). */
  wallet: boolean;
}

/**
 * Fechado tem prioridade: se a etapa de fechamento for reordenada para dentro
 * das 3 primeiras colunas, o card mostra apenas a carteira digital.
 */
export function getOpportunityCardShortcuts(
  stages: ShortcutOpportunityStage[],
  stageId: string | null | undefined
): OpportunityCardShortcuts {
  if (!stageId) return { quote: false, wallet: false };
  const index = stages.findIndex((s) => s.id === stageId);
  if (index < 0) return { quote: false, wallet: false };
  if (isClosedOpportunityStage(stages[index])) return { quote: false, wallet: true };
  return { quote: index < QUOTE_SHORTCUT_COLUMNS, wallet: false };
}

/** Operações: carteira digital somente na 1ª e 2ª colunas da ordem configurada. */
export function operationStageShowsWallet(
  stages: { key: string }[],
  stageKey: string | null | undefined
): boolean {
  if (!stageKey) return false;
  const index = stages.findIndex((s) => s.key === stageKey);
  return index >= 0 && index < OPERATION_WALLET_SHORTCUT_COLUMNS;
}
