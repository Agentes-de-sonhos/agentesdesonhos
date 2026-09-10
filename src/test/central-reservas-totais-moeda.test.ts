import { describe, it, expect } from "vitest";
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";

import {
  groupServiceFinancialsByCurrency,
  manualTotalsLabel,
} from "@/lib/travelFileWorkflow";
import type { TravelFileService } from "@/types/travelFile";

/** Serviço sintético: nenhuma reserva, cliente ou fornecedor real. */
const service = (over: Partial<TravelFileService>): TravelFileService =>
  ({
    id: `svc-${Math.random().toString(16).slice(2)}`,
    file_id: "00000000-0000-4000-8000-000000000000",
    service_type: "hotel",
    product_name: "Serviço Teste",
    supplier_name: null,
    city: null,
    destination: null,
    country: null,
    start_date: null,
    end_date: null,
    quantity: 1,
    passengers_count: null,
    currency: "BRL",
    requested_amount: 0,
    reconfirmed_amount: null,
    sold_amount: null,
    cost_amount: null,
    commission_amount: null,
    responsible_team_member_id: null,
    is_required: false,
    status: "requested",
    snapshot: {},
    created_at: "2026-01-01T00:00:00.000Z",
    ...over,
  }) as TravelFileService;

const money = (value: number, currency: string) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency, maximumFractionDigits: 2 }).format(
    Number(value) || 0,
  );

describe("valor efetivo da reserva manual vem dos serviços", () => {
  it("serviço de R$ 1.500 resulta em total solicitado de 1500 na moeda do serviço", () => {
    const groups = groupServiceFinancialsByCurrency(
      [service({ currency: "BRL", requested_amount: 1500 })],
      "BRL",
    );
    expect(groups).toHaveLength(1);
    expect(groups[0].currency).toBe("BRL");
    expect(groups[0].requested).toBe(1500);
    // requested_amount já é o total do serviço: quantidade não multiplica de novo
    expect(groups[0].servicesCount).toBe(1);
    expect(manualTotalsLabel(groups, money)).toBe(money(1500, "BRL"));
  });

  it("quantidade maior não multiplica o valor total do serviço", () => {
    const groups = groupServiceFinancialsByCurrency(
      [service({ currency: "BRL", requested_amount: 1500, quantity: 3 })],
      "BRL",
    );
    expect(groups[0].requested).toBe(1500);
  });

  it("editar o serviço para 1.600 atualiza o total apresentado", () => {
    const groups = groupServiceFinancialsByCurrency(
      [service({ currency: "BRL", requested_amount: 1600 })],
      "BRL",
    );
    expect(groups[0].requested).toBe(1600);
    expect(manualTotalsLabel(groups, money)).toBe(money(1600, "BRL"));
  });

  it("USD 100 + BRL 200 aparecem como dois grupos, nunca como 300", () => {
    const groups = groupServiceFinancialsByCurrency(
      [
        service({ currency: "USD", requested_amount: 100 }),
        service({ currency: "BRL", requested_amount: 200 }),
      ],
      "BRL",
    );
    expect(groups.map((g) => [g.currency, g.requested])).toEqual([
      ["BRL", 200],
      ["USD", 100],
    ]);
    const label = manualTotalsLabel(groups, money);
    expect(label).toContain(money(200, "BRL"));
    expect(label).toContain(money(100, "USD"));
    expect(label).not.toContain(money(300, "BRL"));
  });

  it("serviço cancelado não entra em nenhum total", () => {
    const groups = groupServiceFinancialsByCurrency(
      [
        service({ currency: "BRL", requested_amount: 1500 }),
        service({ currency: "BRL", requested_amount: 900, status: "cancelled" }),
      ],
      "BRL",
    );
    expect(groups[0].requested).toBe(1500);
  });

  it("reserva sem serviços não inventa valor", () => {
    expect(groupServiceFinancialsByCurrency([], "BRL")).toEqual([]);
    expect(manualTotalsLabel([], money)).toBe("Sem valores lançados");
  });

  it("moeda em branco cai na moeda da reserva, sem criar grupo vazio", () => {
    const groups = groupServiceFinancialsByCurrency(
      [service({ currency: "", requested_amount: 50 })],
      "USD",
    );
    expect(groups).toEqual([expect.objectContaining({ currency: "USD", requested: 50 })]);
  });
});

/**
 * Revisão do SQL efetivamente aplicado: o agregado é derivado na consulta e
 * projetado por permissão. Nenhum valor gravado é alterado.
 */
describe("SQL: agregado por moeda é derivação, não gravação", () => {
  const DIR = join(process.cwd(), "supabase/migrations");
  const files = readdirSync(DIR).filter((f) => f.endsWith(".sql")).sort();
  const all = files.map((f) => readFileSync(join(DIR, f), "utf8")).join("\n");
  const helper = all.split("private.travel_file_manual_currency_totals(\n  _file_id").pop() || "";

  it("agrupa por moeda do serviço e ignora cancelados", () => {
    expect(helper).toMatch(/GROUP BY 1/);
    expect(helper).toMatch(/s\.status <> 'cancelled'/);
  });

  it("receita, custo e comissão dependem de permissões separadas", () => {
    expect(helper).toMatch(/CASE WHEN _revenue THEN jsonb_build_object\(\s*'requested'/);
    expect(helper).toMatch(/CASE WHEN _margin THEN jsonb_build_object\('cost'/);
    expect(helper).toMatch(/CASE WHEN _commission THEN jsonb_build_object\('commission'/);
  });

  it("margem exige receita e margem: nunca é calculada com venda zerada", () => {
    expect(helper).toMatch(/_margin AND _revenue THEN jsonb_build_object\('margin'/);
  });

  it("sem nenhuma permissão financeira o agregado é vazio", () => {
    expect(helper).toMatch(/NOT \(_revenue OR _margin OR _commission\) THEN '\[\]'::jsonb/);
  });

  it("o agregado só é calculado para reservas de origem manual", () => {
    expect(all).toMatch(
      /CASE WHEN f\.origin = 'manual'\s*\n\s*THEN private\.travel_file_manual_currency_totals/,
    );
    expect(all).toMatch(/IF v_file\.origin = 'manual' THEN/);
  });

  it("não altera valores gravados do file nem dos serviços", () => {
    const migration = readFileSync(
      join(DIR, files[files.length - 1]),
      "utf8",
    );
    expect(migration).not.toMatch(/UPDATE\s+public\.travel_files/i);
    expect(migration).not.toMatch(/UPDATE\s+public\.travel_file_services/i);
  });
});

describe("mapeamento da listagem preserva a projeção do servidor", async () => {
  const { mapTravelFileRow } = await import("@/hooks/useTravelFiles");

  it("sem permissão financeira não há agregados numéricos no item", () => {
    const item = mapTravelFileRow({
      id: "f1",
      origin: "manual",
      currency: "BRL",
      manual_totals: [{ currency: "brl", services_count: 2 }],
    });
    expect(item.manual_totals).toEqual([{ currency: "BRL", services_count: 2 }]);
    expect(item.manual_totals?.[0]).not.toHaveProperty("requested");
    expect(item.manual_totals?.[0]).not.toHaveProperty("margin");
  });

  it("reserva do site não recebe agregado derivado", () => {
    const item = mapTravelFileRow({
      id: "f2",
      origin: "web_quote",
      currency: "BRL",
      requested_amount: "2500",
      manual_totals: null,
    });
    expect(item.manual_totals).toBeNull();
    expect(item.requested_amount).toBe(2500);
  });

  it("agregados presentes são convertidos para número", () => {
    const item = mapTravelFileRow({
      id: "f3",
      origin: "manual",
      currency: "BRL",
      manual_totals: [{ currency: "USD", services_count: 1, requested: "100.5", cost: "20" }],
    });
    expect(item.manual_totals?.[0]).toEqual({
      currency: "USD",
      services_count: 1,
      requested: 100.5,
      cost: 20,
    });
  });
});
