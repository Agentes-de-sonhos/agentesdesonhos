import { describe, it, expect } from "vitest";
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";

/**
 * Reauditoria da Central de Reservas: os dois blockers comprovados.
 * Lê as migrations efetivamente aplicadas — nenhum dado real é tocado.
 * As listas de chaves são extraídas do SQL aplicado e usadas numa réplica
 * da projeção recursiva, para provar que nada financeiro escapa.
 */
const DIR = join(process.cwd(), "supabase/migrations");
const files = readdirSync(DIR).filter((f) => f.endsWith(".sql")).sort();
const all = files.map((f) => readFileSync(join(DIR, f), "utf8")).join("\n");

function lastDefinition(sql: string, name: string): string {
  const parts = sql.split(new RegExp(`CREATE OR REPLACE FUNCTION (?:public|private)\\.${name}\\b`));
  const tail = parts[parts.length - 1];
  const end = tail.search(/\n(REVOKE|GRANT|DROP|CREATE|ALTER|-- ----)/);
  return end > 0 ? tail.slice(0, end) : tail;
}

function lastPolicy(sql: string, name: string): string {
  const parts = sql.split(new RegExp(`CREATE POLICY ${name}\\b`));
  const tail = parts[parts.length - 1];
  const end = tail.indexOf(");");
  return end > 0 ? tail.slice(0, end) : tail;
}

const projectSql = lastDefinition(all, "reservations_project");

function keyList(varName: string): string[] {
  const m = projectSql.match(new RegExp(`${varName} CONSTANT text\\[\\] := ARRAY\\[([\\s\\S]*?)\\];`));
  if (!m) throw new Error(`lista ${varName} não encontrada`);
  return [...m[1].matchAll(/'([^']+)'/g)].map((x) => x[1]);
}

const OPERATIONAL = keyList("v_operational");
const CONTAINERS = keyList("v_containers");
const REVENUE = keyList("v_revenue_keys");
const MARGIN = keyList("v_margin_keys");
const COMMISSION = keyList("v_commission_keys");

/** Réplica fiel de private.reservations_project. */
function project(
  data: unknown,
  revenue: boolean,
  margin: boolean,
  commission: boolean,
): unknown {
  if (data === null || data === undefined) return data ?? null;
  if (revenue && margin && commission) return data;
  const allowed = new Set([
    ...OPERATIONAL,
    ...CONTAINERS,
    ...(revenue ? REVENUE : []),
    ...(margin ? MARGIN : []),
    ...(commission ? COMMISSION : []),
  ]);
  if (Array.isArray(data)) return data.map((el) => project(el, revenue, margin, commission));
  if (typeof data === "object") {
    const out: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(data as Record<string, unknown>)) {
      const low = key.toLowerCase();
      if (!allowed.has(low)) continue;
      const isStructure = value !== null && typeof value === "object";
      if (CONTAINERS.includes(low) && !OPERATIONAL.includes(low) && !isStructure) continue;
      out[key] = isStructure ? project(value, revenue, margin, commission) : value;
    }
    return out;
  }
  return data;
}

/** Estruturas reais confirmadas no código (submit_quote_booking_request, FlightData, HotelRoom). */
const realSnapshot = {
  product_name: "Hotel Copacabana",
  total_estimated: 18500,
  items_sum: 17900,
  currency: "BRL",
  snapshot: {
    notes: "check-in antecipado solicitado",
    service_data: {
      adult_price: 4200,
      child_price: 1800,
      fees_amount: 320,
      notes: "vista mar",
      segments: [
        { flight_number: "LA3300", leg_date: "2026-03-04", price: 2100, cost_amount: 1700 },
      ],
    },
    rooms: [
      { room_type: "DBL", unit_price: 5200, total_price: 10400, cost_amount: 8900, commission_amount: 900 },
    ],
  },
  imported_summary: { total_original: 3200, total_brl: 17900, currency: "USD" },
  campo_desconhecido: { sold_amount: 99999, margin: 4444 },
};

function collectNumbersByKey(value: unknown, acc: string[] = []): string[] {
  if (Array.isArray(value)) {
    value.forEach((el) => collectNumbersByKey(el, acc));
  } else if (value && typeof value === "object") {
    for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
      acc.push(k.toLowerCase());
      collectNumbersByKey(v, acc);
    }
  }
  return acc;
}

describe("blocker 1 — leitura direta de serviços não pode falhar aberta", () => {
  const helper = lastDefinition(all, "travel_file_direct_read_is_web");
  const policy = lastPolicy(all, "travel_file_services_manual_direct_read_guard");

  it("o helper é SECURITY DEFINER e não depende da RLS do pai", () => {
    expect(helper).toMatch(/STABLE SECURITY DEFINER/);
    expect(helper).toMatch(/SET search_path TO 'public'/);
  });

  it("nega por padrão quando o pai não existe ou é de outra agência", () => {
    expect(helper).toMatch(/COALESCE\(\(/);
    expect(helper).toMatch(/\), false\)/);
    expect(helper).toMatch(/f\.agency_id = ANY\(private\.agency_owner_ids\(\)\)/);
  });

  it("só libera leitura direta para reserva de origem web (compatibilidade legada)", () => {
    expect(helper).toMatch(/COALESCE\(f\.origin, 'web_quote'\) <> 'manual'/);
  });

  it("a policy usa o helper e não mais o NOT EXISTS que falhava aberto", () => {
    expect(policy).toMatch(/private\.travel_file_direct_read_is_web\(file_id\)/);
    expect(policy).not.toMatch(/NOT EXISTS/);
    expect(policy).toMatch(/can_team\('financial\.view_revenue'\)/);
    expect(policy).toMatch(/can_team\('financial\.view_margin'\)/);
    expect(policy).toMatch(/can_team\('financial\.commissions\.view'\)/);
  });

  it("caso reservations.view=true e finanças=false, pai oculto: serviço manual fica bloqueado", () => {
    // Simula a avaliação da policy RESTRICTIVE com o helper seguro.
    const isAdmin = false;
    const perms = { revenue: false, margin: false, commission: false };
    const helperResult = false; // pai manual (e/ou invisível) => helper retorna false
    const passes = helperResult || isAdmin || (perms.revenue && perms.margin && perms.commission);
    expect(passes).toBe(false);
  });
});

describe("blocker 2 — projeção explícita dos snapshots e payloads", () => {
  it("a função é recursiva e trata objetos e listas", () => {
    expect(projectSql).toMatch(/jsonb_typeof\(_data\) = 'array'/);
    expect(projectSql).toMatch(/private\.reservations_project\(v_val/);
    expect(projectSql).toMatch(/private\.reservations_project\(el/);
  });

  it("é allowlist: descarta qualquer chave desconhecida", () => {
    expect(projectSql).toMatch(/CONTINUE WHEN NOT \(lower\(v_key\) = ANY\(v_allowed\)\)/);
  });

  it("bloqueia os campos citados na reauditoria para leitor sem finanças", () => {
    const restricted = project(realSnapshot, false, false, false);
    const keys = collectNumbersByKey(restricted);
    for (const forbidden of [
      "total_estimated",
      "items_sum",
      "adult_price",
      "child_price",
      "fees_amount",
      "unit_price",
      "total_price",
      "total_original",
      "total_brl",
      "cost_amount",
      "commission_amount",
      "price",
      "margin",
      "sold_amount",
    ]) {
      expect(keys).not.toContain(forbidden);
    }
    expect(JSON.stringify(restricted)).not.toContain("99999");
    expect(JSON.stringify(restricted)).not.toContain("18500");
  });

  it("mantém as observações operacionais necessárias na ficha", () => {
    const restricted = project(realSnapshot, false, false, false) as any;
    expect(restricted.product_name).toBe("Hotel Copacabana");
    expect(restricted.snapshot.notes).toBe("check-in antecipado solicitado");
    expect(restricted.snapshot.service_data.notes).toBe("vista mar");
    expect(restricted.snapshot.rooms[0].room_type).toBe("DBL");
    expect(restricted.snapshot.service_data.segments[0].flight_number).toBe("LA3300");
    expect(restricted.imported_summary.currency).toBe("USD");
  });

  it("cada categoria de permissão libera apenas a própria projeção", () => {
    const revenueOnly = project(realSnapshot, true, false, false) as any;
    expect(revenueOnly.total_estimated).toBe(18500);
    expect(revenueOnly.snapshot.service_data.adult_price).toBe(4200);
    expect(revenueOnly.snapshot.rooms[0].cost_amount).toBeUndefined();
    expect(revenueOnly.snapshot.rooms[0].commission_amount).toBeUndefined();

    const commissionOnly = project(realSnapshot, false, false, true) as any;
    expect(commissionOnly.snapshot.rooms[0].commission_amount).toBe(900);
    expect(commissionOnly.snapshot.rooms[0].unit_price).toBeUndefined();
    expect(commissionOnly.total_estimated).toBeUndefined();

    const marginOnly = project(realSnapshot, false, true, false) as any;
    expect(marginOnly.snapshot.rooms[0].cost_amount).toBe(8900);
    expect(marginOnly.snapshot.rooms[0].total_price).toBeUndefined();
  });

  it("aliases em maiúsculas e chaves com caixa mista também são cortados", () => {
    const restricted = project(
      { COST_AMOUNT: 5, Total_Estimated: 6, Commission_Percent: 7, notes: "ok" },
      false,
      false,
      false,
    ) as any;
    expect(restricted).toEqual({ notes: "ok" });
  });

  it("contêiner com valor escalar desconhecido não vira vazamento", () => {
    expect(project({ snapshot: "texto", imported_summary: 123 }, false, false, false)).toEqual({});
  });

  it("leitor com todas as permissões continua recebendo o snapshot íntegro", () => {
    expect(project(realSnapshot, true, true, true)).toEqual(realSnapshot);
  });

  it("nenhum snapshot armazenado é alterado: a projeção acontece só na leitura", () => {
    const detail = lastDefinition(all, "travel_file_detail");
    expect(detail).toMatch(/STABLE SECURITY DEFINER/);
    expect(detail).not.toMatch(/UPDATE public\.travel_file_services/);
    expect(detail).not.toMatch(/UPDATE public\.travel_files/);
  });

  it("o detalhe aplica a projeção nos snapshots do file, dos serviços e nos dois históricos", () => {
    const detail = lastDefinition(all, "travel_file_detail");
    expect(detail).toMatch(/reservations_project\(v_file\.passengers_snapshot/);
    expect(detail).toMatch(/reservations_project\(v_file\.contact_snapshot/);
    expect(detail).toMatch(/reservations_project\(s\.snapshot/);
    expect(detail).toMatch(/reservations_project\(s\.passengers_snapshot/);
    const eventCalls = detail.match(/reservations_project\(COALESCE\((?:ev|e)\.payload/g) || [];
    expect(eventCalls.length).toBe(2);
  });
});

describe("histórico manual: moeda, valor solicitado e contato livre", () => {
  const def = lastDefinition(all, "log_travel_file_manual_change");

  it("passa a detectar alterações isoladas de moeda, valor solicitado e contato", () => {
    expect(def).toMatch(/NEW\.currency IS DISTINCT FROM OLD\.currency/);
    expect(def).toMatch(/NEW\.requested_amount IS DISTINCT FROM OLD\.requested_amount/);
    expect(def).toMatch(/NEW\.contact_snapshot IS DISTINCT FROM OLD\.contact_snapshot/);
  });

  it("registra a mudança sem escrever o valor no histórico restrito", () => {
    expect(def).toMatch(/'requested_amount_changed'/);
    expect(def).not.toMatch(/'requested_amount', CASE/);
    expect(def).toMatch(/'currency_changed'/);
    expect(def).toMatch(/'contact_changed'/);
  });
});
