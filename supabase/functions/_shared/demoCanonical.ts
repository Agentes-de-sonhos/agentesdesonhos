/**
 * Carga demonstrativa CANÔNICA — motor puro de cópia profunda entre tenants.
 *
 * Regras invioláveis:
 * - a carga canônica vive no tenant TÉCNICO do SiteLab e é editável pelas telas
 *   reais da Gestão; nada aqui é "seed estático" de conteúdo;
 * - copiar significa SNAPSHOT: lê a versão MAIS RECENTE das linhas mapeadas no
 *   cenário de origem e grava linhas novas (IDs novos) no tenant de destino;
 * - nunca copia identidade: profile, domínio, logo, cores, textos institucionais
 *   e contatos da agência ficam de fora do grafo autorizado;
 * - nenhuma referência pode apontar para o tenant de origem depois da cópia;
 * - idempotência: o vínculo `record_role = "<tabela>:<id_de_origem>"` permite
 *   reexecutar sem duplicar nada (a linha de destino já existente é reutilizada);
 * - as datas são recalculadas NO MOMENTO da cópia pelo mesmo mecanismo de datas
 *   relativas já existente (`demo-dates/date-shift.ts`) — sem segundo mecanismo.
 *
 * Módulo PURO (sem Deno, sem rede) para ser testado diretamente.
 */

import { rowPatch, type ScenarioRow } from "./dateShift.ts";

/** Cenário canônico (fonte de verdade editável, no tenant técnico do SiteLab). */
export const CANONICAL_SLUG = "sitelab-base-canonical";
export const CANONICAL_HOSTNAME = "sitelab.local";
/** Cenário de referência usado UMA vez para materializar a carga canônica. */
export const REFERENCE_SLUG = "casa-nova-tur";

/** Prefixo do cenário de cada white label demonstrativo criado por cópia. */
export function demoLoadSlug(targetUserId: string): string {
  return `demo-load-${targetUserId}`;
}

/** Papel estável do vínculo: amarra a linha de destino à linha de origem. */
export function copyRole(table: string, sourceId: string): string {
  return `${table}:${sourceId}`;
}

export type CopySpec = {
  table: string;
  /** Coluna que amarra a linha ao tenant (null = filha de um pai já mapeado). */
  tenant: "user_id" | "agency_id" | null;
  /** Colunas de FK que devem ser remapeadas: coluna → tabela do grafo. */
  refs?: Record<string, string>;
  /** FKs obrigatórias: sem remapeamento resolvido, a linha é ignorada. */
  required?: string[];
  /** Colunas extras que também recebem o id do tenant de destino. */
  tenantAlso?: string[];
  /** Colunas descartadas além do bloqueio comum (vínculos de outro tenant). */
  strip?: string[];
  /** Linhas que nunca são copiadas (ex.: geradas por trigger no destino). */
  skip?: (row: Record<string, unknown>) => boolean;
};

/**
 * Colunas nunca copiadas: identidade da linha, auditoria, tokens, códigos
 * públicos, senhas e numerações sequenciais por agência (o destino regenera).
 */
export const STRIP_ALWAYS = [
  "id",
  "created_at",
  "updated_at",
  "share_token",
  "share_expires_at",
  "public_access_code",
  "access_password",
  "slug",
  "short_code",
  "token_hash",
  "file_number",
  /** Colunas GERADAS pelo banco: nunca podem ser gravadas. */
  "file_number_display",
  "phone_normalized",
  "import_fingerprint",
  "manual_key",
  "failed_password_attempts",
  "is_locked",
  "stage_entered_at",
  "last_interaction_at",
  "created_by_team_member_id",
  "assigned_team_member_id",
  "responsible_team_member_id",
  "original_responsible_team_member_id",
  "operations_responsible_team_member_id",
  "assigned_user_id",
] as const;

/**
 * Grafo AUTORIZADO, em ordem de dependência. Qualquer tabela fora desta lista
 * não é copiada — e a limitação é documentada em vez de simulada.
 */
export const COPY_ORDER: CopySpec[] = [
  { table: "clients", tenant: "user_id", strip: ["category_id", "subcategory_id"] },
  { table: "travelers", tenant: "user_id", refs: { client_id: "clients" }, required: ["client_id"] },
  {
    table: "opportunities",
    tenant: "user_id",
    refs: { client_id: "clients" },
    required: ["client_id"],
    strip: ["stage_id", "company_id"],
  },
  {
    table: "opportunity_history",
    tenant: null,
    refs: { opportunity_id: "opportunities" },
    required: ["opportunity_id"],
  },
  {
    table: "quotes",
    tenant: "user_id",
    refs: { client_id: "clients", opportunity_id: "opportunities" },
  },
  {
    table: "quote_services",
    tenant: null,
    refs: { quote_id: "quotes" },
    required: ["quote_id"],
    strip: ["section_id", "choice_group_id"],
  },
  { table: "itineraries", tenant: "user_id", refs: { client_id: "clients" }, strip: ["source_itinerary_id"] },
  {
    table: "itinerary_days",
    tenant: null,
    refs: { itinerary_id: "itineraries" },
    required: ["itinerary_id"],
  },
  {
    table: "itinerary_activities",
    tenant: null,
    refs: { day_id: "itinerary_days" },
    required: ["day_id"],
    strip: ["linked_trip_service_id"],
  },
  {
    table: "trips",
    tenant: "user_id",
    refs: {
      client_id: "clients",
      opportunity_id: "opportunities",
      itinerary_id: "itineraries",
    },
  },
  { table: "trip_services", tenant: null, refs: { trip_id: "trips" }, required: ["trip_id"] },
  {
    table: "operations",
    tenant: "user_id",
    refs: {
      client_id: "clients",
      opportunity_id: "opportunities",
      quote_id: "quotes",
      itinerary_id: "itineraries",
      trip_id: "trips",
    },
    required: ["client_id"],
  },
  {
    table: "operation_services",
    tenant: "user_id",
    refs: { operation_id: "operations", source_quote_service_id: "quote_services" },
    required: ["operation_id"],
  },
  {
    table: "travel_files",
    tenant: "agency_id",
    tenantAlso: ["responsible_user_id", "created_by_user_id"],
    refs: {
      client_id: "clients",
      contact_client_id: "clients",
      opportunity_id: "opportunities",
      quote_id: "quotes",
      operation_id: "operations",
    },
    strip: ["root_request_id", "current_request_id", "company_id"],
  },
  {
    table: "travel_file_services",
    tenant: "agency_id",
    refs: { file_id: "travel_files", source_quote_service_id: "quote_services" },
    required: ["file_id"],
    strip: ["request_item_id", "supplier_id"],
  },
  {
    table: "sales",
    tenant: "user_id",
    refs: {
      client_id: "clients",
      opportunity_id: "opportunities",
      source_quote_id: "quotes",
      source_trip_id: "trips",
      source_operation_id: "operations",
    },
    strip: ["seller_id"],
  },
  {
    table: "sale_products",
    tenant: "user_id",
    refs: { sale_id: "sales", source_service_id: "quote_services" },
    required: ["sale_id"],
    strip: ["operator_id"],
  },
  {
    /**
     * Financeiro: as comissões são geradas por TRIGGER quando o produto da venda
     * é inserido no destino. Copiá-las duplicaria o lançamento — por isso apenas
     * os lançamentos manuais (entrada recebida) são copiados, e as comissões
     * automáticas do destino são mapeadas depois pelo provisionamento.
     */
    table: "income_entries",
    tenant: "user_id",
    refs: { sale_id: "sales", sale_product_id: "sale_products" },
    skip: (row) => row.sale_product_id != null,
  },
];

export function copySpec(table: string): CopySpec | undefined {
  return COPY_ORDER.find((s) => s.table === table);
}

export function copyTables(): string[] {
  return COPY_ORDER.map((s) => s.table);
}

/** Mapa origem→destino por tabela. */
export type IdMap = Map<string, Map<string, string>>;

export function idMapGet(map: IdMap, table: string, sourceId: string): string | undefined {
  return map.get(table)?.get(sourceId);
}

export function idMapSet(map: IdMap, table: string, sourceId: string, targetId: string): void {
  const inner = map.get(table) ?? new Map<string, string>();
  inner.set(sourceId, targetId);
  map.set(table, inner);
}

export type RemapResult =
  | { ok: true; row: Record<string, unknown> }
  | { ok: false; reason: "missing_required" | "skipped"; column?: string };

/**
 * Converte uma linha de origem na linha a gravar no tenant de destino:
 * descarta identidade/auditoria, remapeia FKs, força o tenant e desloca as datas
 * pelo delta do momento da cópia.
 */
export function remapRow(
  spec: CopySpec,
  source: Record<string, unknown>,
  ctx: { tenantId: string; idMap: IdMap; delta: number },
): RemapResult {
  if (spec.skip?.(source)) return { ok: false, reason: "skipped" };

  const row: Record<string, unknown> = { ...source };
  for (const col of [...STRIP_ALWAYS, ...(spec.strip ?? [])]) delete row[col];

  for (const [col, table] of Object.entries(spec.refs ?? {})) {
    const value = source[col];
    if (typeof value !== "string" || !value) {
      row[col] = null;
      if ((spec.required ?? []).includes(col)) {
        return { ok: false, reason: "missing_required", column: col };
      }
      continue;
    }
    const mapped = idMapGet(ctx.idMap, table, value);
    if (!mapped) {
      if ((spec.required ?? []).includes(col)) {
        return { ok: false, reason: "missing_required", column: col };
      }
      row[col] = null;
      continue;
    }
    row[col] = mapped;
  }

  if (spec.tenant) row[spec.tenant] = ctx.tenantId;
  for (const col of spec.tenantAlso ?? []) {
    if (col in source) row[col] = ctx.tenantId;
  }

  /** Datas relativas: mesmo motor do deslocamento diário do cenário. */
  const patch = rowPatch(spec.table, { ...(source as ScenarioRow), id: String(source.id ?? "") }, ctx.delta);
  if (patch) Object.assign(row, patch);

  return { ok: true, row };
}

/**
 * Auditoria de isolamento: nenhuma coluna de FK do grafo pode continuar
 * apontando para um id que não pertence ao tenant de destino.
 */
export function crossTenantRefs(
  table: string,
  row: Record<string, unknown>,
  targetIds: Set<string>,
): string[] {
  const spec = copySpec(table);
  if (!spec) return [];
  const leaks: string[] = [];
  for (const col of Object.keys(spec.refs ?? {})) {
    const value = row[col];
    if (typeof value === "string" && value && !targetIds.has(value)) leaks.push(col);
  }
  return leaks;
}
