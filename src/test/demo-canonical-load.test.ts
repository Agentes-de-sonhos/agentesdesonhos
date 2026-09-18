import { describe, expect, it } from "vitest";
import {
  CANONICAL_HOSTNAME,
  CANONICAL_SLUG,
  COPY_ORDER,
  copyRole,
  copySpec,
  copyTables,
  crossTenantRefs,
  demoLoadSlug,
  idMapSet,
  remapRow,
  STRIP_ALWAYS,
  type IdMap,
} from "../../supabase/functions/_shared/demoCanonical";

const SOURCE = "11111111-1111-1111-1111-111111111111";
const TARGET = "22222222-2222-2222-2222-222222222222";

function mapWith(entries: [string, string, string][]): IdMap {
  const map: IdMap = new Map();
  for (const [table, from, to] of entries) idMapSet(map, table, from, to);
  return map;
}

describe("Carga canônica — grafo autorizado", () => {
  it("nunca copia identidade da agência", () => {
    for (const forbidden of [
      "profiles",
      "agency_public_domains",
      "agency_site_requests",
      "subscriptions",
      "agency_membership",
      "sitelab_templates",
    ]) {
      expect(copyTables()).not.toContain(forbidden);
    }
  });

  it("mantém pais antes dos filhos na ordem de cópia", () => {
    const seen: string[] = [];
    for (const spec of COPY_ORDER) {
      for (const parent of Object.values(spec.refs ?? {})) {
        if (parent !== spec.table) expect(seen).toContain(parent);
      }
      seen.push(spec.table);
    }
  });

  it("identifica o conjunto canônico por cenário estável, não por nome solto", () => {
    expect(CANONICAL_SLUG).toBe("sitelab-base-canonical");
    expect(CANONICAL_HOSTNAME).toBe("sitelab.local");
    expect(demoLoadSlug(TARGET)).toBe(`demo-load-${TARGET}`);
    expect(copyRole("trips", "abc")).toBe("trips:abc");
  });
});

describe("Carga canônica — remapeamento de linhas", () => {
  it("descarta identidade, tokens e códigos públicos da linha de origem", () => {
    const out = remapRow(
      copySpec("trips")!,
      {
        id: "t1",
        user_id: SOURCE,
        client_id: "c1",
        trip_title: "Orlando",
        start_date: "2026-01-10",
        end_date: "2026-01-17",
        share_token: "tok",
        public_access_code: "ABC123",
        access_password: "1234",
        slug: "orlando",
        short_code: "xy",
        created_at: "2026-01-01T00:00:00.000Z",
      },
      { tenantId: TARGET, idMap: mapWith([["clients", "c1", "c9"]]), delta: 0 },
    );
    expect(out.ok).toBe(true);
    if (!out.ok) return;
    for (const col of STRIP_ALWAYS) expect(out.row).not.toHaveProperty(col);
    expect(out.row.user_id).toBe(TARGET);
    expect(out.row.client_id).toBe("c9");
    expect(out.row.trip_title).toBe("Orlando");
  });

  it("aplica o delta de datas no momento da cópia", () => {
    const out = remapRow(
      copySpec("trips")!,
      { id: "t1", user_id: SOURCE, client_id: "c1", start_date: "2026-01-10", end_date: "2026-01-17" },
      { tenantId: TARGET, idMap: mapWith([["clients", "c1", "c9"]]), delta: 5 },
    );
    expect(out.ok && out.row.start_date).toBe("2026-01-15");
    expect(out.ok && out.row.end_date).toBe("2026-01-22");
  });

  it("ignora a linha quando um vínculo obrigatório não foi copiado", () => {
    const out = remapRow(
      copySpec("travelers")!,
      { id: "v1", user_id: SOURCE, client_id: "c1", nome_completo: "Ana Martins" },
      { tenantId: TARGET, idMap: new Map(), delta: 0 },
    );
    expect(out).toEqual({ ok: false, reason: "missing_required", column: "client_id" });
  });

  it("zera vínculos opcionais não copiados, sem apontar para o tenant de origem", () => {
    const out = remapRow(
      copySpec("quotes")!,
      { id: "q1", user_id: SOURCE, client_id: "c1", opportunity_id: "o-fora", total_amount: 100 },
      { tenantId: TARGET, idMap: mapWith([["clients", "c1", "c9"]]), delta: 0 },
    );
    expect(out.ok && out.row.opportunity_id).toBeNull();
    expect(out.ok && out.row.client_id).toBe("c9");
  });

  it("força o tenant também nas colunas de responsável da ficha", () => {
    const out = remapRow(
      copySpec("travel_files")!,
      {
        id: "f1",
        agency_id: SOURCE,
        client_id: "c1",
        responsible_user_id: SOURCE,
        created_by_user_id: SOURCE,
        file_number: 12,
        manual_key: "demo-orlando-ana",
      },
      { tenantId: TARGET, idMap: mapWith([["clients", "c1", "c9"]]), delta: 0 },
    );
    expect(out.ok && out.row.agency_id).toBe(TARGET);
    expect(out.ok && out.row.responsible_user_id).toBe(TARGET);
    expect(out.ok && out.row.created_by_user_id).toBe(TARGET);
    expect(out.ok && out.row).not.toHaveProperty("file_number");
  });

  it("não copia as comissões automáticas, apenas o recebimento manual", () => {
    const spec = copySpec("income_entries")!;
    const auto = remapRow(
      spec,
      { id: "i1", user_id: SOURCE, sale_id: "s1", sale_product_id: "p1", amount: 100 },
      { tenantId: TARGET, idMap: mapWith([["sales", "s1", "s9"]]), delta: 0 },
    );
    expect(auto).toEqual({ ok: false, reason: "skipped" });

    const manual = remapRow(
      spec,
      { id: "i2", user_id: SOURCE, sale_id: "s1", sale_product_id: null, amount: 12540 },
      { tenantId: TARGET, idMap: mapWith([["sales", "s1", "s9"]]), delta: 0 },
    );
    expect(manual.ok && manual.row.sale_id).toBe("s9");
    expect(manual.ok && manual.row.amount).toBe(12540);
  });
});

describe("Carga canônica — isolamento", () => {
  it("detecta qualquer referência que ainda aponte para fora do destino", () => {
    const targetIds = new Set(["c9", "o9"]);
    expect(crossTenantRefs("quotes", { client_id: "c9", opportunity_id: "o9" }, targetIds)).toEqual([]);
    expect(
      crossTenantRefs("quotes", { client_id: "c1", opportunity_id: "o9" }, targetIds),
    ).toEqual(["client_id"]);
  });

  it("aceita vínculo nulo como isolado", () => {
    expect(crossTenantRefs("trips", { client_id: null, opportunity_id: null }, new Set())).toEqual([]);
  });
});
