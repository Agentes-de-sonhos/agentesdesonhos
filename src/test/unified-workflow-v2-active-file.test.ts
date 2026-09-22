import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { isActiveTravelFileStatus, V2_TERMINAL_FILE_STATUSES } from "@/lib/travelFileConversion";

/**
 * Guardas ESTÁTICAS (leitura do SQL aplicado) da migration 0020 + teste
 * comportamental do espelho na interface: "processo ativo" é status fora de
 * cancelled e trip_completed, em banco e tela.
 */
const sql = readFileSync(
  resolve(process.cwd(), "drizzle/migrations/0020_unified_workflow_v2_active_file_definition.sql"),
  "utf8",
);

describe("migration 0020 — definição de processo ativo (teste estático de SQL)", () => {
  it("define travel_file_is_active excluindo cancelled e trip_completed", () => {
    expect(sql).toContain("FUNCTION public.travel_file_is_active");
    expect(sql).toMatch(/NOT IN \('cancelled', 'trip_completed'\)/);
  });

  it("no funil: 0 ativos = legado, 1 ativo exige vínculo canônico, 2+ bloqueiam", () => {
    expect(sql).toContain("MULTIPLE_ACTIVE_TRAVEL_FILES");
    expect(sql).toContain("USE_CONFIRM_SALE");
    expect(sql).toContain("WORKFLOW_LINK_CONFLICT");
    expect(sql).toContain("'file:'");
  });

  it("a contagem de ativos acontece antes de qualquer escrita da confirmação", () => {
    const count = sql.indexOf("MULTIPLE_ACTIVE_TRAVEL_FILES");
    const firstWrite = sql.indexOf("INSERT INTO public.operations");
    expect(count).toBeGreaterThan(-1);
    expect(firstWrite).toBeGreaterThan(count);
  });

  it("a ordem de travas (processo, depois oportunidade) é preservada", () => {
    const fileLock = sql.indexOf("FROM public.travel_files WHERE id = p_file_id FOR UPDATE");
    const oppLock = sql.indexOf("FROM public.opportunities");
    expect(fileLock).toBeGreaterThan(-1);
    expect(oppLock).toBeGreaterThan(fileLock);
    expect(sql).toContain("IDEMPOTENCY_KEY_REUSED_WITH_DIFFERENT_PAYLOAD");
    expect(sql).toContain("canonical_sale_product_type");
  });
});

describe("espelho na interface (teste comportamental)", () => {
  it("cancelled e trip_completed não são ativos; os demais são", () => {
    expect(V2_TERMINAL_FILE_STATUSES).toEqual(["cancelled", "trip_completed"]);
    expect(isActiveTravelFileStatus("cancelled")).toBe(false);
    expect(isActiveTravelFileStatus("trip_completed")).toBe(false);
    for (const s of ["draft", "request_received", "awaiting_client", "sale_confirmed", "in_operation"]) {
      expect(isActiveTravelFileStatus(s)).toBe(true);
    }
  });
});
