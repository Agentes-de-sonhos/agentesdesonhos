import { describe, expect, it } from "vitest";
import {
  addDays,
  computeDelta,
  END_OFFSET_DAYS,
  LOCK_TTL_MS,
  NEVER_SHIFTED,
  planUpdates,
  rollbackPlan,
  rowPatch,
  saoPauloToday,
  shiftableTables,
  shiftJsonDates,
  shouldShift,
  START_OFFSET_DAYS,
  targetWindow,
} from "../../supabase/functions/demo-dates/date-shift";
import {
  demoScenarioForHost,
  markTriggeredToday,
  shouldTriggerToday,
} from "@/lib/demoDates";

const TODAY = "2026-09-16";

function fakeStorage() {
  const store = new Map<string, string>();
  return {
    getItem: (k: string) => (store.has(k) ? store.get(k)! : null),
    setItem: (k: string, v: string) => void store.set(k, v),
  };
}

describe("Datas relativas do cenário demo — janela e delta", () => {
  it("coloca embarque em hoje+7 e retorno em hoje+14", () => {
    expect(START_OFFSET_DAYS).toBe(7);
    expect(END_OFFSET_DAYS).toBe(14);
    expect(END_OFFSET_DAYS - START_OFFSET_DAYS).toBe(7);
    const w = targetWindow(TODAY);
    expect(w.start).toBe("2026-09-23");
    expect(w.end).toBe("2026-09-30");
  });

  it("usa um único delta para levar o embarque atual até hoje+7", () => {
    expect(computeDelta("2026-09-09", TODAY)).toBe(14);
    expect(computeDelta("2026-10-19", TODAY)).toBe(-26);
    expect(computeDelta("2026-09-23", TODAY)).toBe(0);
  });

  it("calcula 'hoje' no fuso America/Sao_Paulo", () => {
    // 03:00 UTC ainda é o dia anterior em São Paulo (UTC-3).
    expect(saoPauloToday(new Date("2026-09-17T02:30:00Z"))).toBe("2026-09-16");
    expect(saoPauloToday(new Date("2026-09-17T04:30:00Z"))).toBe("2026-09-17");
  });
});

describe("Datas relativas — once per day, lock e tenant não-demo", () => {
  it("não roda em tenant que não é de demonstração", () => {
    expect(shouldShift({ is_demo: false }, TODAY)).toEqual({ shift: false, reason: "not_demo" });
    expect(shouldShift(null, TODAY)).toEqual({ shift: false, reason: "not_demo" });
  });

  it("roda apenas uma vez por dia", () => {
    expect(shouldShift({ is_demo: true, dates_shifted_on: null }, TODAY).shift).toBe(true);
    expect(shouldShift({ is_demo: true, dates_shifted_on: TODAY }, TODAY)).toEqual({
      shift: false,
      reason: "already_today",
    });
    expect(shouldShift({ is_demo: true, dates_shifted_on: "2026-09-15" }, TODAY).shift).toBe(true);
  });

  it("respeita o lock em andamento e o libera após o TTL", () => {
    const now = new Date("2026-09-16T12:00:00Z");
    const fresh = new Date(now.getTime() - 5_000).toISOString();
    const stale = new Date(now.getTime() - LOCK_TTL_MS - 1_000).toISOString();
    expect(shouldShift({ is_demo: true, dates_locked_at: fresh }, TODAY, now)).toEqual({
      shift: false,
      reason: "locked",
    });
    expect(shouldShift({ is_demo: true, dates_locked_at: stale }, TODAY, now).shift).toBe(true);
  });

  it("o gatilho do navegador dispara no máximo uma vez por dia", () => {
    const storage = fakeStorage();
    expect(shouldTriggerToday(storage, "casa-nova-tur", TODAY)).toBe(true);
    markTriggeredToday(storage, "casa-nova-tur", TODAY);
    expect(shouldTriggerToday(storage, "casa-nova-tur", TODAY)).toBe(false);
    expect(shouldTriggerToday(storage, "casa-nova-tur", "2026-09-17")).toBe(true);
  });

  it("só reconhece hosts de demonstração", () => {
    expect(demoScenarioForHost("casanovatur.demo.local")).toBe("casa-nova-tur");
    expect(demoScenarioForHost("www.agentesdesonhos.com.br")).toBeNull();
    expect(demoScenarioForHost(null)).toBeNull();
  });
});

describe("Datas relativas — colunas, JSON e preservação", () => {
  it("desloca as colunas de data das tabelas mapeadas", () => {
    const patch = rowPatch("quotes", { id: "q1", start_date: "2026-09-09", end_date: "2026-09-16" }, 10);
    expect(patch).toEqual({ start_date: "2026-09-19", end_date: "2026-09-26" });
    expect(shiftableTables()).toContain("travel_file_services");
    expect(shiftableTables()).toContain("income_entries");
  });

  it("desloca datas dentro do JSON dos serviços sem tocar códigos", () => {
    const before = {
      start_date: "2026-09-09",
      end_date: "2026-09-16",
      localizador: "DEMO-AER-001",
      apolice: "DEMO-SEG-2026",
      nome: "Aéreo GRU ⇄ MCO",
      demo_key: "aereo-gru-mco",
      passengers: [{ nome_completo: "Ana Martins", data_nascimento: "1986-04-12" }],
    };
    const after = shiftJsonDates(before, 10);
    expect(after.start_date).toBe("2026-09-19");
    expect(after.end_date).toBe("2026-09-26");
    expect(after.localizador).toBe("DEMO-AER-001");
    expect(after.apolice).toBe("DEMO-SEG-2026");
    expect(after.nome).toBe("Aéreo GRU ⇄ MCO");
    expect(after.demo_key).toBe("aereo-gru-mco");
    expect(after.passengers[0].data_nascimento).toBe("1986-04-22");
  });

  it("nunca desloca created_at, IDs, tokens ou códigos", () => {
    const row = {
      id: "t1",
      start_date: "2026-09-09",
      created_at: "2026-01-05T10:00:00.000Z",
      updated_at: "2026-01-05T10:00:00.000Z",
      share_token: "abc123",
      public_access_code: "CN-2026",
      access_password: "1234",
    };
    const patch = rowPatch("trips", row, 10)!;
    for (const col of NEVER_SHIFTED) expect(patch).not.toHaveProperty(col);
    expect(Object.keys(patch)).toEqual(["start_date"]);
  });

  it("não gera escrita quando nada muda (evita loop de atualização)", () => {
    expect(rowPatch("trips", { id: "t1", start_date: "2026-09-19" }, 0)).toBeNull();
    expect(rowPatch("opportunity_history", { id: "h1", changed_at: "2026-01-01" }, 10)).toBeNull();
  });

  it("gera plano com valores anteriores e rollback exato", () => {
    const rows = [
      { id: "a", start_date: "2026-09-09", end_date: "2026-09-16" },
      { id: "b", start_date: "2026-09-09", end_date: null },
    ];
    const plan = planUpdates("trips", rows, 10);
    expect(plan).toHaveLength(2);
    expect(plan[0].previous).toEqual({ start_date: "2026-09-09", end_date: "2026-09-16" });
    expect(plan[1].patch).toEqual({ start_date: "2026-09-19" });

    const undo = rollbackPlan(plan);
    // O rollback percorre na ordem inversa e restaura exatamente o estado antigo.
    expect(undo.map((u) => u.id)).toEqual(["b", "a"]);
    expect(undo[1].patch).toEqual({ start_date: "2026-09-09", end_date: "2026-09-16" });
  });

  it("preserva a duração da viagem após o deslocamento", () => {
    const delta = computeDelta("2026-08-01", TODAY);
    expect(addDays("2026-08-01", delta)).toBe(targetWindow(TODAY).start);
    expect(addDays("2026-08-08", delta)).toBe(targetWindow(TODAY).end);
  });
});
