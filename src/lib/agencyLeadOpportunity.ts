/**
 * Espelho testável do mapeamento SQL `apply_agency_request_to_opportunity`
 * (migration drizzle/migrations/0002_agency_site_request_opportunity_mapping.sql).
 *
 * Regras (idênticas às do banco, que é a origem em produção):
 *  - datas/viajantes/destino vão para os campos ESTRUTURADOS da oportunidade;
 *  - `notes` recebe SOMENTE observações digitadas pelo cliente, com rótulo humano
 *    por serviço/ocorrência, mais a observação final do checkout;
 *  - sem observações, `notes` fica null (nenhum texto automático).
 */

const SERVICE_LABELS: Record<string, string> = {
  aereo: "Aéreo",
  hospedagem: "Hospedagem",
  carro: "Aluguel de Carro",
  transfer: "Transfer",
  ingressos: "Ingressos e Atrações",
  seguro: "Seguro Viagem",
  cruzeiros: "Cruzeiros",
  pacotes: "Pacotes e Circuitos",
  inspiracoes: "Inspirações",
};

export const START_DATE_KEYS = [
  "ctx_data_inicio",
  "check_in",
  "data_ida",
  "retirada_data",
  "data",
  "inicio",
  "embarque",
];
export const END_DATE_KEYS = ["ctx_data_fim", "check_out", "data_volta", "devolucao_data", "fim"];

export interface LeadOpportunityFields {
  destination: string | null;
  start_date: string | null;
  end_date: string | null;
  adults_count: number;
  children_count: number;
  passengers_count: number;
  notes: string | null;
}

type Details = Record<string, string>;

export function serviceLabel(key: string): string | null {
  const k = (key ?? "").trim().toLowerCase();
  return SERVICE_LABELS[k] ?? (k ? k : null);
}

function detail(details: Details, keys: string[]): string | null {
  for (const key of keys) {
    const value = (details[key] ?? "").trim();
    if (value) return value;
  }
  return null;
}

function dateValue(details: Details, keys: string[]): string | null {
  for (const key of keys) {
    const value = (details[key] ?? "").trim();
    if (/^\d{4}-\d{2}-\d{2}$/.test(value)) return value;
  }
  return null;
}

function intValue(raw: string | null, min: number): number {
  const digits = (raw ?? "").replace(/[^0-9]/g, "");
  const parsed = digits ? Number.parseInt(digits, 10) : NaN;
  return Number.isFinite(parsed) ? Math.max(min, parsed) : min;
}

const OBS_KEY_RE = /(^|_)observacoes(_\d+)?$/;

export function clientNotes(details: Details, checkoutNotes?: string | null): string | null {
  const keysRaw = (details.servicos_keys ?? "").trim();
  const keys = keysRaw ? keysRaw.replace(/\s/g, "").split(",") : [""];
  const labelsRaw = (details.servicos ?? "").trim();
  const labels = labelsRaw ? labelsRaw.split(", ") : [];

  const primaryLabel = labels[0]?.trim() || serviceLabel(keys[0] ?? "") || "Serviço";
  const lines: string[] = [];
  const used = new Set<string>();
  const counts = new Map<string, number>();

  keys.forEach((rawKey, index) => {
    const key = (rawKey ?? "").trim().toLowerCase();
    const occurrence = (counts.get(key) ?? 0) + 1;
    counts.set(key, occurrence);
    const suffix = occurrence > 1 ? `_${occurrence}` : "";
    const label =
      labels[index]?.trim() ||
      `${serviceLabel(key) ?? "Serviço"}${occurrence > 1 ? ` ${occurrence}` : ""}`;

    const primaryKey = index === 0 ? `observacoes${suffix}` : key ? `${key}${suffix}_observacoes` : `observacoes${suffix}`;
    const altKey = index === 0 ? (key ? `${key}${suffix}_observacoes` : null) : `observacoes${suffix}`;

    let detailKey = primaryKey;
    let text = (details[primaryKey] ?? "").trim();
    if (!text && altKey) {
      text = (details[altKey] ?? "").trim();
      if (text) detailKey = altKey;
    }
    if (text) {
      lines.push(`Observações — ${label}: ${text}`);
      used.add(detailKey);
    }
  });

  for (const key of Object.keys(details).sort()) {
    if (!OBS_KEY_RE.test(key) || used.has(key)) continue;
    const text = (details[key] ?? "").trim();
    if (!text) continue;
    used.add(key);
    let base = key.replace(/_?observacoes(_\d+)?$/, "");
    const occurrence =
      Number.parseInt(base.match(/_(\d+)$/)?.[1] ?? key.match(/observacoes_(\d+)$/)?.[1] ?? "1", 10) || 1;
    base = base.replace(/_\d+$/, "").toLowerCase();
    const label = `${serviceLabel(base) ?? primaryLabel}${occurrence > 1 ? ` ${occurrence}` : ""}`;
    lines.push(`Observações — ${label}: ${text}`);
  }

  const checkout = (checkoutNotes ?? "").trim();
  if (checkout) lines.push(`Observações — Checkout: ${checkout}`);

  return lines.length ? lines.join("\n") : null;
}

export function opportunityFieldsFromRequest(request: {
  destination?: string | null;
  details?: Details | null;
  notes?: string | null;
}): LeadOpportunityFields {
  const details = request.details ?? {};
  const adults = intValue(detail(details, ["ctx_adultos", "adultos"]), 1);
  const children = intValue(detail(details, ["ctx_criancas", "criancas"]), 0);
  return {
    destination:
      (request.destination ?? "").trim() || detail(details, ["ctx_destino", "destino"]) || null,
    start_date: dateValue(details, START_DATE_KEYS),
    end_date: dateValue(details, END_DATE_KEYS),
    adults_count: adults,
    children_count: children,
    passengers_count: adults + children,
    notes: clientNotes(details, request.notes),
  };
}
