import { describe, it, expect } from "vitest";
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";

/**
 * Contratos da camada segura da Central de Reservas (revisão independente).
 * Lê a migration efetivamente aplicada — nenhum dado real é tocado.
 */
const DIR = join(process.cwd(), "supabase/migrations");
const files = readdirSync(DIR).filter((f) => f.endsWith(".sql")).sort();
const fix = readFileSync(join(DIR, "20260910134125_05c03245-a001-46b1-83e0-9608a866005b.sql"), "utf8");
const all = files.map((f) => readFileSync(join(DIR, f), "utf8")).join("\n");

/** Corpo da última definição de uma função no conjunto das migrations. */
function lastDefinition(sql: string, name: string): string {
  const parts = sql.split(new RegExp(`CREATE OR REPLACE FUNCTION (?:public|private)\\.${name}\\b`));
  const tail = parts[parts.length - 1];
  const end = tail.search(/\n(REVOKE|GRANT|DROP|CREATE|ALTER|-- ----)/);
  return end > 0 ? tail.slice(0, end) : tail;
}

describe("1) responsável da reserva", () => {
  const def = lastDefinition(all, "travel_file_create_manual");

  it("valida vínculo pela coluna agency_id existente e exige membro ativo", () => {
    expect(def).toMatch(/tm\.agency_id = v_agency/);
    expect(def).toMatch(/tm\.status = 'active'/);
  });

  it("não usa mais a coluna inexistente agency_owner_id", () => {
    expect(def).not.toMatch(/agency_owner_id/);
  });

  it("continua exigindo reservations.assign para definir responsável", () => {
    expect(def).toMatch(/can_team\('reservations\.assign'\)/);
  });
});

describe("2) serviços congelados do fluxo do site", () => {
  const def = lastDefinition(all, "travel_file_service_manual_save");

  it("rejeita qualquer gravação em reserva de origem web, inclusive edição", () => {
    const guard = def.indexOf("v_file.origin <> 'manual'");
    const insert = def.indexOf("INSERT INTO public.travel_file_services");
    const update = def.indexOf("UPDATE public.travel_file_services");
    expect(guard).toBeGreaterThan(-1);
    expect(guard).toBeLessThan(insert);
    expect(guard).toBeLessThan(update);
  });
});

describe("3) etapas: regras legadas preservadas + rascunho", () => {
  const def = lastDefinition(all, "travel_file_set_status");

  it("mantém o bloqueio legado de voltar para Solicitação recebida após a venda", () => {
    expect(def).toMatch(/_status = 'request_received' AND _file\.status = ANY\(_sold\)/);
  });

  it("confirma a venda em todas as etapas vendidas e limpa só na pré-venda", () => {
    expect(def).toMatch(/WHEN _status = ANY\(_sold\) THEN COALESCE\(f\.confirmed_at, now\(\)\)/);
    expect(def).toMatch(/WHEN _status = ANY\(_pre_sale\) THEN NULL/);
  });

  it("preserva completed_at ao cancelar, como no comportamento antigo", () => {
    expect(def).toMatch(/WHEN _status = 'cancelled' THEN f\.completed_at/);
  });

  it("acrescenta draft sem permitir rascunho em reserva do site nem após a venda", () => {
    expect(def).toMatch(/_status = 'draft' AND _file\.origin <> 'manual'/);
    expect(def).toMatch(/_status = 'draft' AND _file\.status = ANY\(_sold\)/);
  });
});

describe("4) fornecedor permitido", () => {
  it("aceita apenas catálogo global aprovado ou fornecedor da própria agência", () => {
    const def = lastDefinition(all, "reservations_supplier_allowed");
    expect(def).toMatch(/owner_agency_id IS NULL/);
    expect(def).toMatch(/approval_status, 'approved'\) = 'approved'/);
    expect(def).toMatch(/owner_agency_id = ANY\(_agencies\)/);
  });

  it("a gravação de serviço usa a validação por agência, não um EXISTS simples", () => {
    const def = lastDefinition(all, "travel_file_service_manual_save");
    expect(def).toMatch(/private\.reservations_supplier_allowed\(\s*v_supplier, private\.agency_owner_ids\(\)\)/);
  });
});

describe("5) busca de empresas", () => {
  const def = lastDefinition(all, "agency_companies_search");

  it("só compara CNPJ quando o texto contém números", () => {
    expect(def).toMatch(/v_digits IS NOT NULL\s*\n\s*AND COALESCE\(c\.cnpj_normalized,''\) ILIKE/);
  });

  it("não descarta as letras: nome e nome fantasia continuam comparados", () => {
    expect(def).toMatch(/c\.name ILIKE '%' \|\| v_q \|\| '%'/);
    expect(def).toMatch(/trade_name,''\) ILIKE '%' \|\| v_q \|\| '%'/);
  });
});

describe("6) validações no servidor e histórico", () => {
  it("rejeita valores não finitos e negativos", () => {
    const def = lastDefinition(all, "reservations_amount");
    expect(def).toMatch(/'NaN'::numeric/);
    expect(def).toMatch(/'Infinity'::numeric/);
    expect(def).toMatch(/não pode ser negativo/);
  });

  it("aceita apenas moedas suportadas", () => {
    const def = lastDefinition(all, "reservations_currency");
    expect(def).toMatch(/NOT IN \('BRL','USD','EUR'\)/);
  });

  it("valida intervalo de datas", () => {
    const def = lastDefinition(all, "reservations_check_dates");
    expect(def).toMatch(/_end < _start/);
  });

  it("não inventa adulto no rascunho e soma passageiros de forma coerente", () => {
    const def = lastDefinition(all, "travel_file_create_manual");
    expect(def).toMatch(/reservations_count\(_payload, 'adults_count', 0\)/);
    expect(def).toMatch(/v_adults \+ v_children/);
    expect(def).not.toMatch(/GREATEST\(v_adults \+ v_children, 1\)/);
  });

  it("registra no histórico tipo, quantidade, moeda, fornecedor, datas, notas e valores", () => {
    const def = lastDefinition(all, "log_travel_file_service_manual_change");
    for (const key of [
      "service_type",
      "quantity",
      "currency",
      "supplier_id",
      "start_date",
      "end_date",
      "notes_changed",
      "snapshot_changed",
      "cost_amount",
      "commission_amount",
    ]) {
      expect(def).toContain(`'${key}'`);
    }
  });
});

describe("7) sanitização financeira em todos os níveis", () => {
  const redact = lastDefinition(all, "reservations_redact");
  const detail = lastDefinition(all, "travel_file_detail");

  it("é recursiva: objetos e listas aninhadas também são limpos", () => {
    expect(redact).toMatch(/jsonb_typeof\(_data\) = 'array'/);
    expect(redact).toMatch(/private\.reservations_redact\(v_val/);
  });

  it("cobre as chaves dos eventos legados de mudança de valores", () => {
    for (const key of [
      "sold_from",
      "sold_to",
      "cost_from",
      "cost_to",
      "commission_from",
      "commission_to",
      "reconfirmed_from",
      "reconfirmed_to",
    ]) {
      expect(redact).toContain(`'${key}'`);
    }
  });

  it("aplica a limpeza ao file, aos serviços (com snapshot) e aos dois históricos", () => {
    expect(detail).toMatch(/reservations_redact\(to_jsonb\(v_file\)/);
    expect(detail).toMatch(/reservations_redact\(to_jsonb\(s\)/);
    const calls = detail.match(/reservations_redact\(COALESCE\((?:ev|e)\.payload/g) || [];
    expect(calls.length).toBe(2);
  });

  it("não remove apenas seis chaves do nível externo", () => {
    expect(detail).not.toMatch(/v_hidden/);
  });
});

describe("8) bypass de SELECT direto", () => {
  it("protege linhas manuais, seus serviços e o histórico interno", () => {
    expect(fix).toMatch(/travel_files_manual_direct_read_guard[\s\S]*AS RESTRICTIVE FOR SELECT/);
    expect(fix).toMatch(/travel_file_services_manual_direct_read_guard[\s\S]*AS RESTRICTIVE FOR SELECT/);
    expect(fix).toMatch(/travel_file_events_direct_read_guard[\s\S]*AS RESTRICTIVE FOR SELECT/);
  });

  it("mantém as reservas do site legíveis para não quebrar o frontend publicado", () => {
    expect(fix).toMatch(/COALESCE\(origin, 'web_quote'\) <> 'manual'/);
    // A verificação dos serviços foi endurecida na reauditoria (helper seguro):
    // ver central-reservas-reauditoria.test.ts.
    expect(all).toMatch(/private\.travel_file_direct_read_is_web\(file_id\)/);
  });


  it("exige todas as permissões sensíveis para leitura direta", () => {
    const guards = fix.match(/can_team\('financial\.commissions\.view'\)/g) || [];
    expect(guards.length).toBeGreaterThanOrEqual(3);
  });
});

describe("9) empresas e vínculos com permissão real", () => {
  it("remove as políticas amplas que neutralizavam as permissões de clientes", () => {
    expect(fix).toMatch(/DROP POLICY IF EXISTS companies_agency_members_full_access/);
    expect(fix).toMatch(/DROP POLICY IF EXISTS client_companies_agency_members_full_access/);
  });

  it("preserva o proprietário e passa a exigir permissão para os demais", () => {
    expect(fix).toMatch(/user_id = auth\.uid\(\) OR public\.can_team\('clients\.view'\)/);
    expect(fix).toMatch(/user_id = auth\.uid\(\) OR public\.can_team\('clients\.create'\)/);
    expect(fix).toMatch(/user_id = auth\.uid\(\) OR public\.can_team\('clients\.edit'\)/);
    expect(fix).toMatch(/user_id = auth\.uid\(\) OR public\.can_team\('clients\.delete'\)/);
  });

  it("mantém o escopo da agência em todas as operações", () => {
    const scoped = fix.match(/user_id = ANY\(private\.agency_owner_ids\(\)\)/g) || [];
    expect(scoped.length).toBeGreaterThanOrEqual(8);
  });
});

describe("10) nada é criado indiretamente", () => {
  it("as funções da Central não criam operação, carteira, orçamento ou financeiro", () => {
    for (const name of [
      "travel_file_create_manual",
      "travel_file_update_manual",
      "travel_file_service_manual_save",
    ]) {
      const def = lastDefinition(all, name).split("REVOKE ALL")[0];
      expect(def).not.toMatch(/INSERT INTO public\.(operations|trips|quotes|income_entries|expense_entries|opportunities)/);
    }
  });
});
