/**
 * Pure helpers for "Seções do orçamento" — manual, visual-only grouping of
 * quote services into named sections.
 *
 * Sections never change totals, prices or business rules. A service belongs to
 * at most one section (`section_id`), and legacy services simply have `null`.
 */

import type { QuoteSection, QuoteService } from "@/types/quote";

export interface QuoteSectionGroup {
  section: QuoteSection;
  services: QuoteService[];
}

export interface QuoteSectionLayout {
  /** Sections in saved order (may include empty ones). */
  groups: QuoteSectionGroup[];
  /** Services not assigned to any section, in saved order. */
  unsectioned: QuoteService[];
  /** True when at least one section actually contains services. */
  hasSectionedServices: boolean;
}

function sortByOrder<T extends { order_index?: number | null }>(items: T[]): T[] {
  return [...items].sort(
    (a, b) => (Number(a.order_index) || 0) - (Number(b.order_index) || 0)
  );
}

/**
 * Splits services into section groups + unsectioned list, preserving the saved
 * order of both sections and services. Services pointing to a missing/unknown
 * section fall back to the unsectioned area so nothing can disappear.
 */
export function buildQuoteSectionLayout(
  sections: QuoteSection[] | undefined | null,
  services: QuoteService[] | undefined | null
): QuoteSectionLayout {
  const safeSections = Array.isArray(sections) ? sortByOrder(sections) : [];
  const safeServices = Array.isArray(services) ? sortByOrder(services) : [];

  const known = new Set(safeSections.map((s) => s.id));
  const groups: QuoteSectionGroup[] = safeSections.map((section) => ({
    section,
    services: [],
  }));
  const byId = new Map(groups.map((g) => [g.section.id, g]));
  const unsectioned: QuoteService[] = [];

  for (const service of safeServices) {
    const sectionId = (service as any).section_id as string | null | undefined;
    if (sectionId && known.has(sectionId)) {
      byId.get(sectionId)!.services.push(service);
    } else {
      unsectioned.push(service);
    }
  }

  return {
    groups,
    unsectioned,
    hasSectionedServices: groups.some((g) => g.services.length > 0),
  };
}

/** Public link only shows sections that actually have services. */
export function visibleSectionGroups(layout: QuoteSectionLayout): QuoteSectionGroup[] {
  return layout.groups.filter((g) => g.services.length > 0);
}

/**
 * Recomputes global `order_index` values so the persisted service order matches
 * the visual order: section groups first (in section order), then unsectioned.
 * Returns one entry per service that needs an update.
 */
export function flattenServiceOrder(layout: QuoteSectionLayout): {
  id: string;
  section_id: string | null;
  order_index: number;
}[] {
  const rows: { id: string; section_id: string | null; order_index: number }[] = [];
  let index = 0;
  for (const group of layout.groups) {
    for (const service of group.services) {
      rows.push({ id: service.id, section_id: group.section.id, order_index: index++ });
    }
  }
  for (const service of layout.unsectioned) {
    rows.push({ id: service.id, section_id: null, order_index: index++ });
  }
  return rows;
}

/** Moves a service into a target section (or out of sections) at a given position. */
export function moveServiceInLayout(
  layout: QuoteSectionLayout,
  serviceId: string,
  targetSectionId: string | null,
  targetIndex?: number
): QuoteSectionLayout {
  const clone: QuoteSectionLayout = {
    groups: layout.groups.map((g) => ({ section: g.section, services: [...g.services] })),
    unsectioned: [...layout.unsectioned],
    hasSectionedServices: false,
  };

  let moved: QuoteService | null = null;
  for (const group of clone.groups) {
    const i = group.services.findIndex((s) => s.id === serviceId);
    if (i >= 0) {
      moved = group.services.splice(i, 1)[0];
      break;
    }
  }
  if (!moved) {
    const i = clone.unsectioned.findIndex((s) => s.id === serviceId);
    if (i >= 0) moved = clone.unsectioned.splice(i, 1)[0];
  }
  if (!moved) return layout;

  const target = targetSectionId
    ? clone.groups.find((g) => g.section.id === targetSectionId)?.services
    : clone.unsectioned;
  if (!target) return layout;

  const at = targetIndex === undefined || targetIndex < 0 || targetIndex > target.length
    ? target.length
    : targetIndex;
  target.splice(at, 0, { ...moved, section_id: targetSectionId } as QuoteService);

  clone.hasSectionedServices = clone.groups.some((g) => g.services.length > 0);
  return clone;
}

/** Reorders sections by ids, keeping any unknown/missing ids out of the result. */
export function reorderSectionsByIds(
  sections: QuoteSection[],
  orderedIds: string[]
): QuoteSection[] {
  const byId = new Map(sections.map((s) => [s.id, s]));
  const result: QuoteSection[] = [];
  for (const id of orderedIds) {
    const s = byId.get(id);
    if (s) {
      result.push({ ...s, order_index: result.length });
      byId.delete(id);
    }
  }
  // Any section not present in the ordered list keeps trailing positions.
  for (const s of sortByOrder([...byId.values()])) {
    result.push({ ...s, order_index: result.length });
  }
  return result;
}

/** Total service count of a section — used in the section header badge. */
export function sectionServiceCount(group: QuoteSectionGroup): number {
  return group.services.length;
}
