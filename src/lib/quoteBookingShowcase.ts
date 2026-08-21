/**
 * Vitrine de serviços do ORÇAMENTO PÚBLICO — regras puras.
 *
 * Substitui o fluxo sequencial "quero/não quero" por explorar → comparar →
 * selecionar → revisar → solicitar. Nada aqui faz I/O nem conhece React, e o
 * servidor (`submit_quote_booking_request`) continua sendo a autoridade final:
 * este módulo apenas espelha as mesmas regras para dar feedback imediato.
 *
 * Pertencimento a um conjunto de escolha vem SEMPRE de `choice_group_id`.
 * Destino, período e tipo da seção são apenas apresentação.
 */
import type { QuoteChoiceGroup, QuoteSection, QuoteSelectionMode, QuoteService } from "@/types/quote";
import { buildQuoteSectionLayout } from "@/lib/quoteSections";
import type { BookingSelectionModel } from "@/lib/quoteBookingSelection";
import { SERVICE_TYPE_LABELS } from "@/lib/quoteServiceDigest";
import { parseStoredWizardState, decidedSelectionIds } from "@/lib/quoteBookingWizard";

const modeOf = (s: QuoteService): QuoteSelectionMode =>
  ((s as any).selection_mode as QuoteSelectionMode) || "optional";

/* ------------------------------------------------------------------ seções */

export interface SectionMeta {
  /** Nome da seção (sempre presente quando há seção). */
  title: string;
  destination: string | null;
  period: string | null;
  typeLabel: string | null;
  /** true quando a seção não tem nenhum metadado — "Grupo livre" (legado). */
  free: boolean;
}

const str = (v: unknown): string | null => {
  if (typeof v !== "string") return null;
  const t = v.trim();
  return t.length > 0 ? t : null;
};

/** "YYYY-MM-DD" → "dd/mm/aaaa" sem deslocamento de fuso. */
function fmtDate(value?: unknown): string | null {
  const raw = str(value);
  if (!raw) return null;
  const iso = raw.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (!iso) return /^\d{2}\/\d{2}\/\d{4}$/.test(raw) ? raw : null;
  const y = Number(iso[1]);
  const m = Number(iso[2]);
  const d = Number(iso[3]);
  const dt = new Date(y, m - 1, d);
  if (dt.getFullYear() !== y || dt.getMonth() !== m - 1 || dt.getDate() !== d) return null;
  return `${String(d).padStart(2, "0")}/${String(m).padStart(2, "0")}/${y}`;
}

export function sectionPeriodLabel(section: Partial<QuoteSection> | null | undefined): string | null {
  const start = fmtDate((section as any)?.start_date);
  const end = fmtDate((section as any)?.end_date);
  if (start && end) return start === end ? start : `${start} a ${end}`;
  if (start) return `a partir de ${start}`;
  if (end) return `até ${end}`;
  return null;
}

export function sectionMeta(section: QuoteSection | null | undefined): SectionMeta | null {
  if (!section) return null;
  const destination = str((section as any).destination);
  const period = sectionPeriodLabel(section);
  const typeKey = str((section as any).service_type);
  const typeLabel = typeKey ? SERVICE_TYPE_LABELS[typeKey as keyof typeof SERVICE_TYPE_LABELS] || null : null;
  return {
    title: section.title,
    destination,
    period,
    typeLabel,
    free: !destination && !period && !typeLabel,
  };
}

/** Chips discretos de contexto da seção, na ordem de leitura. */
export function sectionMetaChips(meta: SectionMeta | null): string[] {
  if (!meta) return [];
  return [meta.destination, meta.period, meta.typeLabel].filter((v): v is string => !!v);
}

/* ------------------------------------------------------------------ vitrine */

export type ShowcaseBlockKind = "included" | "choice" | "single";

export interface ShowcaseOption {
  service: QuoteService;
  /** "Opção N" — reinicia em cada conjunto. null fora de conjuntos. */
  optionNumber: number | null;
}

export interface ShowcaseBlock {
  key: string;
  kind: ShowcaseBlockKind;
  sectionId: string | null;
  sectionTitle: string | null;
  sectionMeta: SectionMeta | null;
  group: QuoteChoiceGroup | null;
  /** Título exibido no cabeçalho do bloco. */
  title: string;
  options: ShowcaseOption[];
}

export interface ShowcaseModel {
  blocks: ShowcaseBlock[];
  hasSections: boolean;
  hasChoiceSets: boolean;
  /** Pacote fechado: nada é selecionável, tudo é solicitado em conjunto. */
  packageMode: boolean;
}

/**
 * Obrigatoriedade vem SEMPRE de `min_select`, nunca do tipo do conjunto.
 * Escolha única opcional = min 0 / max 1. Obrigatória = min 1 / max 1.
 */
export function groupIsRequired(group: QuoteChoiceGroup): boolean {
  return groupMin(group) > 0;
}

export function groupMax(group: QuoteChoiceGroup): number | null {
  if (group.group_type === "alternative") return group.max_select ?? 1;
  return group.max_select ?? null;
}

export function groupMin(group: QuoteChoiceGroup): number {
  const min = Math.max(0, group.min_select ?? 0);
  if (group.group_type === "alternative") return Math.min(min, 1);
  return min;
}


/**
 * Monta os blocos da vitrine na ordem real do orçamento:
 * seções na ordem salva → serviços na ordem salva → serviços sem seção.
 * Serviços obrigatórios formam um bloco "Incluído na proposta" por seção.
 */
export function buildBookingShowcase(
  model: BookingSelectionModel,
  sections: QuoteSection[] = [],
  groups: QuoteChoiceGroup[] = [],
): ShowcaseModel {
  const layout = buildQuoteSectionLayout(sections, model.allServices);
  const groupById = new Map((groups || []).map((g) => [g.id, g]));
  const blocks: ShowcaseBlock[] = [];

  const buildScope = (section: QuoteSection | null, services: QuoteService[]) => {
    const meta = sectionMeta(section);
    const sectionId = section?.id ?? null;
    const sectionTitle = section?.title ?? null;
    const emitted = new Set<string>();
    let includedBlock: ShowcaseBlock | null = null;

    for (const service of services) {
      if (emitted.has(service.id)) continue;

      if (!model.packageMode && modeOf(service) === "required") {
        emitted.add(service.id);
        if (!includedBlock) {
          includedBlock = {
            key: `included:${sectionId ?? "root"}`,
            kind: "included",
            sectionId,
            sectionTitle,
            sectionMeta: meta,
            group: null,
            title: "Incluído na proposta",
            options: [],
          };
          blocks.push(includedBlock);
        }
        includedBlock.options.push({ service, optionNumber: null });
        continue;
      }

      const groupId = (service as any).choice_group_id as string | null | undefined;
      const group = groupId ? groupById.get(groupId) : undefined;
      if (group && !model.packageMode) {
        const siblings = services.filter(
          (s) => (s as any).choice_group_id === group.id && !emitted.has(s.id),
        );
        siblings.forEach((s) => emitted.add(s.id));
        blocks.push({
          key: `group:${group.id}:${sectionId ?? "root"}`,
          kind: "choice",
          sectionId,
          sectionTitle,
          sectionMeta: meta,
          group,
          title: group.title,
          options: siblings.map((service, index) => ({ service, optionNumber: index + 1 })),
        });
        continue;
      }

      emitted.add(service.id);
      blocks.push({
        key: `single:${service.id}`,
        kind: model.packageMode ? "included" : "single",
        sectionId,
        sectionTitle,
        sectionMeta: meta,
        group: null,
        title: model.packageMode ? "Incluído no pacote" : "Serviço",
        options: [{ service, optionNumber: null }],
      });
    }
  };

  for (const group of layout.groups) {
    if (group.services.length === 0) continue;
    buildScope(group.section, group.services);
  }
  if (layout.unsectioned.length > 0) buildScope(null, layout.unsectioned);

  return {
    blocks,
    hasSections: layout.groups.some((g) => g.services.length > 0),
    hasChoiceSets: blocks.some((b) => b.kind === "choice"),
    packageMode: model.packageMode,
  };
}

/* -------------------------------------------------------------- seleção UI */

export function blockSelectedCount(block: ShowcaseBlock, selected: readonly string[]): number {
  const set = new Set(selected);
  return block.options.filter((o) => set.has(o.service.id)).length;
}

export type BlockStatusTone = "neutral" | "pending" | "done";

export interface BlockStatus {
  label: string;
  tone: BlockStatusTone;
}

/** Status discreto exibido no cabeçalho do conjunto/serviço. */
export function blockStatus(block: ShowcaseBlock, selected: readonly string[]): BlockStatus {
  if (block.kind === "included") {
    return { label: "Incluído na proposta", tone: "neutral" };
  }
  const count = blockSelectedCount(block, selected);
  if (block.kind === "single") {
    return count > 0
      ? { label: "Selecionado", tone: "done" }
      : { label: "Opcional", tone: "neutral" };
  }
  const group = block.group!;
  const isSingleChoice = groupMax(group) === 1;
  if (isSingleChoice) {
    if (count === 1) return { label: "1 opção escolhida", tone: "done" };
    return groupMin(group) > 0
      ? { label: "Escolha 1 opção", tone: "pending" }
      : { label: "Opcional · escolha 1", tone: "neutral" };
  }

  const min = groupMin(group);
  const max = groupMax(group);
  if (min > 0 && count < min) {
    return { label: `Escolha pelo menos ${min}`, tone: "pending" };
  }
  if (count === 0) {
    return { label: max ? `Opcional · até ${max}` : "Opcional · escolha à vontade", tone: "neutral" };
  }
  return {
    label: max ? `${count} de ${max} selecionados` : `${count} selecionado${count > 1 ? "s" : ""}`,
    tone: "done",
  };
}

/**
 * Mensagem específica de validação do bloco (null quando válido).
 * O servidor rejeita apenas abaixo de `min_select` ou acima de `max_select`.
 */
export function blockValidation(block: ShowcaseBlock, selected: readonly string[]): string | null {
  if (block.kind !== "choice" || !block.group) return null;
  const group = block.group;
  const count = blockSelectedCount(block, selected);
  const min = groupMin(group);
  const max = groupMax(group);
  if (count < min) {
    return min === 1 && max === 1
      ? `Escolha 1 opção em "${group.title}".`
      : `Escolha pelo menos ${min} opção(ões) em "${group.title}".`;
  }
  if (max != null && count > max) return `Escolha no máximo ${max} opção(ões) em "${group.title}".`;
  return null;
}


/** true quando o bloco já atingiu o máximo e novas escolhas apenas trocam. */
export function blockAtLimit(block: ShowcaseBlock, selected: readonly string[]): boolean {
  if (block.kind !== "choice" || !block.group) return false;
  const max = groupMax(block.group);
  if (max == null) return false;
  return blockSelectedCount(block, selected) >= max;
}

/**
 * Ação de um card. `radio` = conjunto de escolha única (máx. 1 opção),
 * `locked` = incluído na proposta, `toggle` = adicionar/remover.
 */
export type CardAction = "radio" | "toggle" | "locked";

export function cardAction(block: ShowcaseBlock): CardAction {
  if (block.kind === "included") return "locked";
  if (block.kind === "choice" && block.group && groupMax(block.group) === 1) return "radio";
  return "toggle";
}

/** true quando a escolha única do bloco é obrigatória (não pode ficar vazia). */
export function blockRequiresChoice(block: ShowcaseBlock): boolean {
  if (block.kind !== "choice" || !block.group) return false;
  return groupMin(block.group) > 0;
}

/**
 * Motivo pelo qual o clique não pode ser aplicado (null quando pode).
 * Nunca removemos nada em silêncio: o cliente precisa decidir.
 */
export function selectionBlockedReason(
  block: ShowcaseBlock,
  selected: readonly string[],
  serviceId: string,
): string | null {
  if (block.kind !== "choice" || !block.group) return null;
  const isSelected = selected.includes(serviceId);
  const group = block.group;
  const max = groupMax(group);

  // Escolha única obrigatória: clicar na opção já escolhida não esvazia o conjunto.
  if (max === 1 && isSelected && groupMin(group) > 0) {
    return `"${group.title}" exige 1 opção. Selecione outra opção para trocar.`;
  }
  // Múltipla escolha no limite: mantém a seleção e pede remoção consciente.
  if (!isSelected && max != null && max > 1 && blockSelectedCount(block, selected) >= max) {
    return `Você já escolheu ${max} opção(ões) em "${group.title}". Remova uma opção para escolher esta.`;
  }
  return null;
}

/**
 * Aplica o clique em um card da vitrine.
 * - escolha única: seleciona esta e remove a concorrente (troca automática);
 *   quando obrigatória, clicar na já selecionada não esvazia o conjunto;
 *   quando opcional, o clique remove;
 * - múltipla escolha: alterna respeitando `max_select` — ao atingir o limite o
 *   clique é ignorado (nada é removido em silêncio, ver `selectionBlockedReason`);
 * - avulso: alterna;
 * - incluído/pacote: sem efeito.
 */
export function applyShowcaseSelection(
  block: ShowcaseBlock,
  selected: readonly string[],
  serviceId: string,
): string[] {
  const action = cardAction(block);
  if (action === "locked") return [...selected];
  const inBlock = block.options.some((o) => o.service.id === serviceId);
  if (!inBlock) return [...selected];
  if (selectionBlockedReason(block, selected, serviceId)) return [...selected];

  if (action === "radio") {
    const others = new Set(block.options.map((o) => o.service.id));
    const rest = selected.filter((id) => !others.has(id));
    return selected.includes(serviceId) ? rest : [...rest, serviceId];
  }

  if (selected.includes(serviceId)) return selected.filter((id) => id !== serviceId);
  return [...selected, serviceId];
}


/** Primeira mensagem de validação da vitrine inteira (null quando pode enviar). */
export function showcaseValidation(
  showcase: ShowcaseModel,
  model: BookingSelectionModel,
  selected: readonly string[],
): string | null {
  if (showcase.packageMode) {
    return model.allServices.length > 0 ? null : "Selecione pelo menos um serviço.";
  }
  for (const block of showcase.blocks) {
    const error = blockValidation(block, selected);
    if (error) return error;
  }
  const set = new Set(selected);
  const effective = model.allServices.filter((s) => set.has(s.id) || modeOf(s) === "required");
  if (effective.length === 0) return "Selecione pelo menos um serviço para solicitar.";
  return null;
}

/** Remove ids que não existem mais no orçamento ou que não são selecionáveis. */
export function pruneShowcaseSelection(
  model: BookingSelectionModel,
  selected: readonly string[],
): string[] {
  const selectable = new Set(
    model.allServices.filter((s) => modeOf(s) !== "required").map((s) => s.id),
  );
  const out: string[] = [];
  for (const id of selected) {
    if (selectable.has(id) && !out.includes(id)) out.push(id);
  }
  return out;
}

/* --------------------------------------------------- resumo "Minha seleção" */

export interface SelectionSummaryGroup {
  key: string;
  sectionTitle: string | null;
  sectionMeta: SectionMeta | null;
  entries: {
    service: QuoteService;
    /** true quando o serviço não pode ser removido (obrigatório/pacote). */
    locked: boolean;
    /** Conjunto de origem, quando houver (para "trocar"). */
    block: ShowcaseBlock | null;
  }[];
}

/** Resumo organizado por seção (destino/período/tipo), na ordem da vitrine. */
export function buildSelectionSummary(
  showcase: ShowcaseModel,
  selected: readonly string[],
): SelectionSummaryGroup[] {
  const set = new Set(selected);
  const groups: SelectionSummaryGroup[] = [];
  const indexByKey = new Map<string, SelectionSummaryGroup>();

  for (const block of showcase.blocks) {
    const key = block.sectionId ?? "__root__";
    let entry = indexByKey.get(key);
    if (!entry) {
      entry = {
        key,
        sectionTitle: block.sectionTitle,
        sectionMeta: block.sectionMeta,
        entries: [],
      };
      indexByKey.set(key, entry);
      groups.push(entry);
    }
    const locked = block.kind === "included";
    for (const option of block.options) {
      if (!locked && !set.has(option.service.id)) continue;
      entry.entries.push({
        service: option.service,
        locked,
        block: block.kind === "choice" ? block : null,
      });
    }
  }

  return groups.filter((g) => g.entries.length > 0);
}

/** Quantidade exibida no contador de "Minha seleção" (inclui os obrigatórios). */
export function selectionCount(
  model: BookingSelectionModel,
  selected: readonly string[],
): number {
  if (model.packageMode) return model.allServices.length;
  const set = new Set(selected);
  return model.allServices.filter((s) => set.has(s.id) || modeOf(s) === "required").length;
}

/* ------------------------------------------------------------ persistência */

export const SHOWCASE_STORAGE_VERSION = 1;

export function showcaseStorageKey(quoteId: string): string {
  return `booking-selection:${quoteId}`;
}

/** Chave do fluxo antigo (wizard "quero/não quero"), migrada uma única vez. */
export function legacyWizardStorageKey(quoteId: string): string {
  return `booking-wizard:${quoteId}`;
}

export function parseStoredSelection(raw: string | null): string[] {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    const list = Array.isArray(parsed) ? parsed : parsed?.selected;
    if (!Array.isArray(list)) return [];
    const out: string[] = [];
    for (const id of list) {
      if (typeof id === "string" && id && !out.includes(id)) out.push(id);
    }
    return out;
  } catch {
    return [];
  }
}

export function serializeSelection(selected: readonly string[]): string {
  return JSON.stringify({ v: SHOWCASE_STORAGE_VERSION, selected: [...selected] });
}

/** Converte as decisões do wizard antigo (`yes`) em ids da nova seleção. */
export function migrateLegacySelection(rawLegacy: string | null): string[] {
  const stored = parseStoredWizardState(rawLegacy);
  return decidedSelectionIds(stored.decisions);
}

/**
 * Seleção inicial: novo formato quando existir; senão migra o formato antigo.
 * Sempre normalizada contra os serviços realmente selecionáveis.
 */
export function resolveInitialSelection(
  model: BookingSelectionModel,
  rawNew: string | null,
  rawLegacy: string | null,
): { selected: string[]; migrated: boolean } {
  const fromNew = parseStoredSelection(rawNew);
  if (fromNew.length > 0 || rawNew) {
    return { selected: pruneShowcaseSelection(model, fromNew), migrated: false };
  }
  const legacy = migrateLegacySelection(rawLegacy);
  return { selected: pruneShowcaseSelection(model, legacy), migrated: legacy.length > 0 };
}
