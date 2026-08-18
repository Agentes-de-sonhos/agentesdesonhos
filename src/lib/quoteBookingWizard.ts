/**
 * Regras puras da ESCOLHA ASSISTIDA de serviços no orçamento público.
 *
 * O cliente avalia um serviço por vez, na mesma ordem em que os serviços
 * aparecem no orçamento (seções → blocos de escolha → serviços). Nada aqui faz
 * I/O nem conhece React: a seleção final continua sendo validada pelo servidor.
 */
import type { QuoteChoiceGroup, QuoteSection, QuoteSelectionMode, QuoteService } from "@/types/quote";
import { buildQuoteSectionLayout } from "@/lib/quoteSections";
import type { BookingSelectionModel } from "@/lib/quoteBookingSelection";

export type BookingDecision = "yes" | "no";
export type BookingDecisionMap = Record<string, BookingDecision>;

export interface BookingWizardStep {
  service: QuoteService;
  serviceId: string;
  /** Nome da seção do orçamento, quando houver. */
  sectionTitle: string | null;
  /** Nome do bloco de escolha (grupo), quando houver. */
  blockTitle: string | null;
  groupId: string | null;
  groupType: "alternative" | "free" | null;
  /** Posição 1-based dentro do fluxo. */
  position: number;
}

const modeOf = (s: QuoteService): QuoteSelectionMode =>
  (s.selection_mode as QuoteSelectionMode) || "optional";

/** Serviços incluídos na proposta não entram no fluxo: não há decisão a tomar. */
export function isDecidableService(model: BookingSelectionModel, service: QuoteService): boolean {
  if (model.packageMode) return false;
  return modeOf(service) !== "required";
}

/**
 * Passos do fluxo na ordem real do orçamento.
 * Seções na ordem salva, serviços na ordem salva, blocos de escolha mantidos
 * juntos na posição do seu primeiro serviço. Itens sem decisão são ignorados.
 */
export function buildBookingWizardSteps(
  model: BookingSelectionModel,
  sections: QuoteSection[] = [],
  groups: QuoteChoiceGroup[] = [],
): BookingWizardStep[] {
  const layout = buildQuoteSectionLayout(sections, model.allServices);
  const groupById = new Map((groups || []).map((g) => [g.id, g]));

  const ordered: { service: QuoteService; sectionTitle: string | null }[] = [];
  for (const group of layout.groups) {
    for (const service of group.services) {
      ordered.push({ service, sectionTitle: group.section.title || null });
    }
  }
  for (const service of layout.unsectioned) ordered.push({ service, sectionTitle: null });

  // Mantém cada bloco de escolha contíguo, começando onde seu 1º serviço aparece.
  const emitted = new Set<string>();
  const sequence: { service: QuoteService; sectionTitle: string | null }[] = [];
  for (const entry of ordered) {
    if (emitted.has(entry.service.id)) continue;
    const groupId = entry.service.choice_group_id || null;
    if (groupId && groupById.has(groupId)) {
      for (const sibling of ordered) {
        if (sibling.service.choice_group_id === groupId && !emitted.has(sibling.service.id)) {
          emitted.add(sibling.service.id);
          sequence.push(sibling);
        }
      }
      continue;
    }
    emitted.add(entry.service.id);
    sequence.push(entry);
  }

  const steps: BookingWizardStep[] = [];
  for (const entry of sequence) {
    if (!isDecidableService(model, entry.service)) continue;
    const groupId = entry.service.choice_group_id || null;
    const group = groupId ? groupById.get(groupId) : undefined;
    steps.push({
      service: entry.service,
      serviceId: entry.service.id,
      sectionTitle: entry.sectionTitle,
      blockTitle: group?.title || null,
      groupId: group ? group.id : null,
      groupType: group ? group.group_type : null,
      position: steps.length + 1,
    });
  }
  return steps;
}

/**
 * Registra a decisão de um serviço. Em bloco de escolha única, aceitar um item
 * recusa automaticamente os concorrentes daquele bloco.
 */
export function applyBookingDecision(
  steps: BookingWizardStep[],
  decisions: BookingDecisionMap,
  serviceId: string,
  decision: BookingDecision,
): BookingDecisionMap {
  const step = steps.find((s) => s.serviceId === serviceId);
  if (!step) return decisions;
  const next: BookingDecisionMap = { ...decisions, [serviceId]: decision };
  if (decision === "yes" && step.groupType === "alternative" && step.groupId) {
    for (const sibling of steps) {
      if (sibling.groupId === step.groupId && sibling.serviceId !== serviceId) {
        next[sibling.serviceId] = "no";
      }
    }
  }
  return next;
}

/** Remove decisões de serviços que já não existem no orçamento. */
export function pruneBookingDecisions(
  steps: BookingWizardStep[],
  decisions: BookingDecisionMap,
): BookingDecisionMap {
  const valid = new Set(steps.map((s) => s.serviceId));
  const next: BookingDecisionMap = {};
  for (const [id, decision] of Object.entries(decisions || {})) {
    if (valid.has(id) && (decision === "yes" || decision === "no")) next[id] = decision;
  }
  return next;
}

/** IDs escolhidos pelo cliente (sem os incluídos, que o modelo adiciona depois). */
export function decidedSelectionIds(decisions: BookingDecisionMap): string[] {
  return Object.entries(decisions || {})
    .filter(([, decision]) => decision === "yes")
    .map(([id]) => id);
}

/** Índice do primeiro passo ainda sem decisão, a partir de `from`. -1 quando não há. */
export function firstPendingStepIndex(
  steps: BookingWizardStep[],
  decisions: BookingDecisionMap,
  from = 0,
): number {
  for (let i = Math.max(0, from); i < steps.length; i++) {
    if (!decisions[steps[i].serviceId]) return i;
  }
  for (let i = 0; i < Math.min(from, steps.length); i++) {
    if (!decisions[steps[i].serviceId]) return i;
  }
  return -1;
}

export interface BookingWizardProgress {
  decided: number;
  total: number;
  /** true quando todos os serviços do fluxo já receberam uma decisão. */
  complete: boolean;
}

export function bookingWizardProgress(
  steps: BookingWizardStep[],
  decisions: BookingDecisionMap,
): BookingWizardProgress {
  const decided = steps.filter((s) => !!decisions[s.serviceId]).length;
  return { decided, total: steps.length, complete: steps.length > 0 && decided === steps.length };
}

/* ---------------------------------------------------------------------------
 * Contagens e navegação por índice.
 * `steps` é a fonte imutável: nada aqui filtra a lista por decisão.
 * ------------------------------------------------------------------------ */

export interface BookingWizardDecisionCounts {
  selected: number;
  rejected: number;
  pending: number;
  decided: number;
  total: number;
}

export function bookingWizardDecisionCounts(
  steps: BookingWizardStep[],
  decisions: BookingDecisionMap,
): BookingWizardDecisionCounts {
  let selected = 0;
  let rejected = 0;
  for (const step of steps) {
    const decision = decisions?.[step.serviceId];
    if (decision === "yes") selected++;
    else if (decision === "no") rejected++;
  }
  const total = steps.length;
  const decided = selected + rejected;
  return { selected, rejected, pending: Math.max(0, total - decided), decided, total };
}

const plural = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`;

/** "3 selecionados, 1 recusado e 2 pendentes" (singular correto quando 1). */
export function bookingWizardCountsLabel(counts: BookingWizardDecisionCounts): string {
  return [
    plural(counts.selected, "selecionado", "selecionados"),
    plural(counts.rejected, "recusado", "recusados"),
    plural(counts.pending, "pendente", "pendentes"),
  ]
    .slice(0, 2)
    .join(", ")
    .concat(` e ${plural(counts.pending, "pendente", "pendentes")}`);
}

/** Mantém o índice dentro dos limites reais da lista de passos. */
export function clampStepIndex(steps: BookingWizardStep[], index: number): number {
  if (!steps.length) return 0;
  if (!Number.isFinite(index)) return 0;
  return Math.max(0, Math.min(steps.length - 1, Math.trunc(index)));
}

/** Próximo serviço por posição, ignorando o status yes/no/pendente. */
export function nextStepIndex(steps: BookingWizardStep[], index: number): number {
  return clampStepIndex(steps, clampStepIndex(steps, index) + 1);
}

/** Serviço anterior por posição, ignorando o status yes/no/pendente. */
export function previousStepIndex(steps: BookingWizardStep[], index: number): number {
  return clampStepIndex(steps, clampStepIndex(steps, index) - 1);
}

/** true quando o índice é o último passo (rodapé mostra "Ir para o resumo"). */
export function isLastStepIndex(steps: BookingWizardStep[], index: number): boolean {
  return steps.length > 0 && clampStepIndex(steps, index) === steps.length - 1;
}

/** Rótulo de progresso amigável: "Serviço 3 de 10". */
export function stepProgressLabel(step: BookingWizardStep | undefined, total: number): string {
  if (!step || total === 0) return "";
  return `Serviço ${step.position} de ${total}`;
}

/* ---------------------------------------------------------------------------
 * Persistência local das escolhas (o cliente pode fechar e voltar depois).
 * ------------------------------------------------------------------------ */

export function bookingWizardStorageKey(quoteId: string): string {
  return `booking-wizard:${quoteId}`;
}

export interface StoredBookingWizardState {
  decisions: BookingDecisionMap;
  reviewed: boolean;
}

export function parseStoredWizardState(raw: string | null): StoredBookingWizardState {
  if (!raw) return { decisions: {}, reviewed: false };
  try {
    const parsed = JSON.parse(raw) as Partial<StoredBookingWizardState>;
    const decisions: BookingDecisionMap = {};
    for (const [id, value] of Object.entries(parsed?.decisions || {})) {
      if (value === "yes" || value === "no") decisions[id] = value;
    }
    return { decisions, reviewed: parsed?.reviewed === true };
  } catch {
    return { decisions: {}, reviewed: false };
  }
}