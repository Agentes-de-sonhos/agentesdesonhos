/**
 * Domínio da jornada única de cotação White Label.
 *
 * A experiência antiga abria a Central de Solicitações inteira (com abas de
 * todos os serviços) e repetia os campos já preenchidos na primeira dobra.
 * Aqui centralizamos:
 *  - o CONTEXTO COMPARTILHADO da viagem (origem, destino, datas-base, viajantes
 *    e idade exata de cada criança);
 *  - a herança inteligente desse contexto para cada serviço, sem apagar
 *    alterações manuais;
 *  - a elegibilidade dos complementos (pacotes nunca é complemento; carro e
 *    transfer são mutuamente exclusivos);
 *  - a montagem de UM ÚNICO payload compatível com o endpoint atual
 *    (`service_key` continua sendo o serviço principal).
 *
 * Nada aqui fala com o backend: o envio segue por `useAgencySiteRequest`.
 */
import {
  REQUEST_SERVICES,
  serviceByKey,
  describeServiceValues,
  buildDetailsPayload,
  type RequestService,
  type ServiceValues,
} from "@/lib/agencySiteRequests";

/** Serviços que só existem como pedido INICIAL (nunca como complemento). */
export const PRIMARY_ONLY_SERVICES = ["pacotes"] as const;

/** Pares mutuamente exclusivos entre si dentro da mesma solicitação. */
export const EXCLUSIVE_PAIRS: readonly (readonly [string, string])[] = [["carro", "transfer"]];

export const MAX_CHILDREN = 12;
export const MAX_ADULTS = 30;

/** 0 é exibido como "Menos de 1 ano" — cada fornecedor tem sua classificação. */
export const CHILD_AGE_OPTIONS: { value: string; label: string }[] = Array.from(
  { length: 18 },
  (_, age) => ({ value: String(age), label: age === 0 ? "Menos de 1 ano" : `${age} anos` }),
);

export const CHILD_AGE_HELP =
  "Informe a idade na data da viagem. Cada fornecedor aplica sua própria classificação.";

export interface RouteLeg {
  destino: string;
  data: string;
}

export interface TripContext {
  origem: string;
  destino: string;
  data_inicio: string;
  data_fim: string;
  adultos: number;
  criancas: number;
  /** Uma idade (string "0".."17") por criança — sempre com `criancas` itens. */
  idades_criancas: string[];
  /** Somente para aéreo multidestinos. */
  rota: RouteLeg[];
}

export function emptyTripContext(): TripContext {
  return {
    origem: "",
    destino: "",
    data_inicio: "",
    data_fim: "",
    adultos: 2,
    criancas: 0,
    idades_criancas: [],
    rota: [],
  };
}

/** Ajusta a lista de idades ao número de crianças, preservando o que já existe. */
export function syncChildAges(ages: string[], count: number): string[] {
  const total = Math.max(0, Math.min(MAX_CHILDREN, Math.floor(count) || 0));
  const out: string[] = [];
  for (let i = 0; i < total; i += 1) out.push(ages[i] ?? "");
  return out;
}

export function childAgeLabel(value: string): string {
  const found = CHILD_AGE_OPTIONS.find((o) => o.value === String(value).trim());
  return found ? found.label : "";
}

/** "Menos de 1 ano, 4 anos e 12 anos" — legível para o consultor. */
export function formatChildAges(ages: string[]): string {
  const labels = ages.map(childAgeLabel).filter(Boolean);
  if (!labels.length) return "";
  if (labels.length === 1) return labels[0];
  return `${labels.slice(0, -1).join(", ")} e ${labels[labels.length - 1]}`;
}

export function totalTravelers(context: TripContext): number {
  return Math.max(1, (context.adultos || 0) + (context.criancas || 0));
}

export function describeTravelers(context: TripContext): string {
  const parts = [`${context.adultos} ${context.adultos === 1 ? "adulto" : "adultos"}`];
  if (context.criancas > 0) {
    parts.push(`${context.criancas} ${context.criancas === 1 ? "criança" : "crianças"}`);
    const ages = formatChildAges(context.idades_criancas);
    if (ages) parts.push(`idades: ${ages}`);
  }
  return parts.join(", ");
}

// ---------------------------------------------------------------------------
// Rota multidestinos (aéreo)
// ---------------------------------------------------------------------------
export function serializeRoute(origem: string, legs: RouteLeg[]): string {
  const clean = legs.filter((l) => l.destino.trim());
  if (!clean.length) return "";
  const points = [origem.trim() || "Origem", ...clean.map((l) => l.destino.trim())];
  const route = points.join(" → ");
  const dates = clean
    .map((l, i) => (l.data ? `${clean[i].destino.trim()}: ${l.data}` : ""))
    .filter(Boolean)
    .join("; ");
  return dates ? `${route} (${dates})` : route;
}

export function routeIsActionable(legs: RouteLeg[]): boolean {
  const filled = legs.filter((l) => l.destino.trim());
  return filled.length >= 2 && filled.every((l) => !!l.data);
}

// ---------------------------------------------------------------------------
// Elegibilidade de complementos
// ---------------------------------------------------------------------------
export function isPrimaryOnlyService(key: string): boolean {
  return (PRIMARY_ONLY_SERVICES as readonly string[]).includes(key);
}

function excludedBy(key: string, chosen: readonly string[]): boolean {
  return EXCLUSIVE_PAIRS.some(
    ([a, b]) => (key === a && chosen.includes(b)) || (key === b && chosen.includes(a)),
  );
}

/**
 * Serviços que ainda podem ser adicionados: fora os já concluídos, os que só
 * existem como pedido inicial e os bloqueados por exclusividade mútua.
 */
export function eligibleComplements(chosen: readonly string[]): RequestService[] {
  return REQUEST_SERVICES.filter(
    (s) => !chosen.includes(s.key) && !isPrimaryOnlyService(s.key) && !excludedBy(s.key, chosen),
  );
}

// ---------------------------------------------------------------------------
// Contexto <-> valores por serviço
// ---------------------------------------------------------------------------
const num = (value: unknown, fallback = 0): number => {
  const parsed = Number(String(value ?? "").trim());
  return Number.isFinite(parsed) ? parsed : fallback;
};
const str = (values: ServiceValues, name: string): string => {
  const raw = values[name];
  return typeof raw === "string" ? raw.trim() : "";
};

/** Campos de data-base (início) e data-fim conhecidos por serviço. */
const START_FIELDS = ["data_ida", "check_in", "retirada_data", "inicio", "data"] as const;
const END_FIELDS = ["data_volta", "check_out", "devolucao_data", "fim"] as const;

/** Extrai/atualiza o contexto global a partir dos valores de um serviço. */
export function contextFromService(
  key: string,
  values: ServiceValues,
  previous: TripContext,
): TripContext {
  const next: TripContext = { ...previous, idades_criancas: [...previous.idades_criancas], rota: [...previous.rota] };

  const origem = str(values, "origem");
  if (origem) next.origem = origem;

  const destino = str(values, "destino") || str(values, "destinos") || str(values, "retirada_local");
  if (destino) next.destino = destino;

  for (const field of START_FIELDS) {
    const value = str(values, field);
    if (value) {
      next.data_inicio = value;
      break;
    }
  }
  for (const field of END_FIELDS) {
    const value = str(values, field);
    if (value) {
      next.data_fim = value;
      break;
    }
  }

  const adultos = str(values, "adultos");
  if (adultos) next.adultos = Math.max(1, Math.min(MAX_ADULTS, num(adultos, previous.adultos)));
  const criancas = str(values, "criancas");
  if (criancas) next.criancas = Math.max(0, Math.min(MAX_CHILDREN, num(criancas, previous.criancas)));
  next.idades_criancas = syncChildAges(next.idades_criancas, next.criancas);

  if (key === "aereo") {
    const rota = str(values, "rota_multidestinos");
    if (!rota) next.rota = previous.rota;
  }

  return next;
}

/** Mapeia contexto -> nome de campo do serviço. */
function contextValueFor(field: string, context: TripContext): string {
  switch (field) {
    case "origem":
      return context.origem;
    case "destino":
    case "destinos":
    case "retirada_local":
      return context.destino;
    case "data_ida":
    case "check_in":
    case "retirada_data":
    case "inicio":
    case "data":
      return context.data_inicio;
    case "data_volta":
    case "check_out":
    case "devolucao_data":
    case "fim":
      return context.data_fim;
    case "adultos":
      return context.adultos ? String(context.adultos) : "";
    case "criancas":
      return context.criancas ? String(context.criancas) : "";
    case "passageiros":
    case "viajantes":
      return String(totalTravelers(context));
    case "idades_criancas":
    case "idades":
      return formatChildAges(context.idades_criancas);
    default:
      return "";
  }
}

/**
 * Propaga o contexto para um serviço SEM sobrescrever o que já foi digitado
 * manualmente: só preenche campos vazios. `force` é usado apenas para os campos
 * derivados (passageiros/viajantes/idades), que são sempre calculados.
 */
export function applyContextToService(
  service: RequestService,
  values: ServiceValues,
  context: TripContext,
): ServiceValues {
  const out: ServiceValues = { ...values };
  const derived = new Set(["passageiros", "viajantes", "idades_criancas"]);
  for (const field of service.fields) {
    const inherited = contextValueFor(field.name, context);
    if (!inherited) continue;
    const current = typeof out[field.name] === "string" ? String(out[field.name]).trim() : "";
    if (!current || derived.has(field.name)) out[field.name] = inherited;
  }
  return out;
}

// ---------------------------------------------------------------------------
// Payload final: UMA solicitação com todos os serviços
// ---------------------------------------------------------------------------
export interface JourneyEntry {
  key: string;
  values: ServiceValues;
}

export interface JourneyPayloadParts {
  service_key: string;
  service_label: string;
  destination: string;
  summary: string;
  details: Record<string, string>;
}

const SUMMARY_LIMIT = 2000;
const DETAIL_LIMIT = 400;

export function describeContext(context: TripContext): { label: string; value: string }[] {
  const out: { label: string; value: string }[] = [];
  if (context.origem) out.push({ label: "Origem", value: context.origem });
  if (context.destino) out.push({ label: "Destino", value: context.destino });
  if (context.data_inicio) out.push({ label: "Início", value: context.data_inicio });
  if (context.data_fim) out.push({ label: "Retorno", value: context.data_fim });
  out.push({ label: "Viajantes", value: describeTravelers(context) });
  if (context.rota.length) {
    const route = serializeRoute(context.origem, context.rota);
    if (route) out.push({ label: "Destinos da viagem", value: route });
  }
  return out;
}

/**
 * Monta o payload compatível com `submit-agency-site-request`:
 *  - `service_key` continua sendo o serviço PRINCIPAL (allowlist do servidor);
 *  - `details` mantém as chaves do serviço principal sem prefixo (compatível com
 *    o CRM atual) e prefixa os complementos com `<servico>_`;
 *  - `summary` lista todos os serviços dentro do limite atual de 2000 chars.
 */
export function buildJourneyPayload(
  entries: JourneyEntry[],
  context: TripContext,
): JourneyPayloadParts {
  const list = entries.filter((e) => !!e.key);
  const primary = serviceByKey(list[0]?.key ?? REQUEST_SERVICES[0].key);
  const details: Record<string, string> = {};

  // Contexto compartilhado, legível e estável.
  for (const [name, value] of Object.entries({
    ctx_origem: context.origem,
    ctx_destino: context.destino,
    ctx_data_inicio: context.data_inicio,
    ctx_data_fim: context.data_fim,
    ctx_adultos: String(context.adultos),
    ctx_criancas: String(context.criancas),
    ctx_idades_criancas: formatChildAges(context.idades_criancas),
    ctx_rota: serializeRoute(context.origem, context.rota),
  })) {
    if (value) details[name] = value.slice(0, DETAIL_LIMIT);
  }

  const summaryBlocks: string[] = [];
  const labels: string[] = [];

  list.forEach((entry, index) => {
    const service = serviceByKey(entry.key);
    labels.push(service.label);
    const flat = buildDetailsPayload(service, entry.values);
    for (const [name, value] of Object.entries(flat)) {
      const target = index === 0 ? name : `${service.key}_${name}`;
      details[target] = value;
    }
    const answers = describeServiceValues(service, entry.values)
      .map((item) => `${item.label}: ${item.value}`)
      .join("; ");
    summaryBlocks.push(`[${service.label}] ${answers}`);
  });

  details.servicos = labels.join(", ").slice(0, DETAIL_LIMIT);
  details.servicos_keys = list.map((e) => e.key).join(",").slice(0, DETAIL_LIMIT);

  const contextLine = describeContext(context)
    .map((item) => `${item.label}: ${item.value}`)
    .join(" | ");

  const summary = [
    `Serviços solicitados: ${labels.join(", ")}`,
    contextLine,
    ...summaryBlocks,
  ]
    .filter(Boolean)
    .join(" || ")
    .slice(0, SUMMARY_LIMIT);

  const destination =
    context.destino ||
    (typeof list[0]?.values.destino === "string" ? String(list[0].values.destino).trim() : "") ||
    "";

  return {
    service_key: primary.key,
    service_label: primary.label,
    destination,
    summary,
    details,
  };
}