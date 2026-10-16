/**
 * Comparação campo a campo entre o serviço atual e o lido do PDF.
 * Nada é aplicado sem seleção explícita; campo vazio no documento nunca apaga o atual.
 */

export interface FieldDiffRow {
  key: string;
  current: string;
  incoming: string;
  changed: boolean;
}

const isEmpty = (v: unknown) =>
  v == null || v === "" || (Array.isArray(v) && v.length === 0) || (typeof v === "object" && !Array.isArray(v) && Object.keys(v as object).length === 0);

const show = (v: unknown): string => {
  if (isEmpty(v)) return "";
  if (typeof v === "object") return JSON.stringify(v);
  return String(v);
};

const META = new Set(["confianca_extracao", "campos_nao_identificados"]);

export function diffServiceFields(current: Record<string, any>, incoming: Record<string, any>): FieldDiffRow[] {
  const rows: FieldDiffRow[] = [];
  for (const key of Object.keys(incoming || {})) {
    if (META.has(key)) continue;
    const inc = incoming[key];
    if (isEmpty(inc)) continue;
    const cur = current?.[key];
    const c = show(cur), i = show(inc);
    rows.push({ key, current: c, incoming: i, changed: c !== i });
  }
  return rows.filter((r) => r.changed);
}

export function applySelectedFields(
  current: Record<string, any>,
  incoming: Record<string, any>,
  selected: Iterable<string>,
): Record<string, any> {
  const out = { ...(current || {}) };
  for (const key of selected) {
    const v = incoming?.[key];
    if (isEmpty(v)) continue;
    out[key] = v;
  }
  return out;
}
