import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { mergeDirectRecord, upsertRecord, shouldDropDirectRecord } from "@/lib/deepLinkRecords";
import { isInMonth } from "@/utils/monthFilter";

type Sale = { id: string; sale_date: string };

/**
 * Testes COMPORTAMENTAIS dos helpers puros que sustentam a tela (mês correto,
 * dedupe, upsert no cache) + guarda ESTÁTICA da migration 0021.
 */
describe("registro aberto por link direto — regras da lista (comportamental)", () => {
  const belongsTo = (month: number, year: number) => (s: Sale) => isInMonth(s.sale_date, month, year);

  it("venda fora do limite da lista aparece no mês a que pertence", () => {
    const direct: Sale = { id: "s-9", sale_date: "2026-03-10" };
    const out = mergeDirectRecord<Sale>([], direct, belongsTo(3, 2026));
    expect(out.map((s) => s.id)).toEqual(["s-9"]);
  });

  it("não aparece em mês ao qual não pertence", () => {
    const direct: Sale = { id: "s-9", sale_date: "2026-03-10" };
    expect(mergeDirectRecord<Sale>([], direct, belongsTo(4, 2026))).toEqual([]);
  });

  it("sem filtro de mês, sempre entra", () => {
    const direct: Sale = { id: "s-9", sale_date: "2026-03-10" };
    expect(mergeDirectRecord<Sale>([], direct).map((s) => s.id)).toEqual(["s-9"]);
  });

  it("nunca duplica: quando a lista já traz o id, a lista é autoridade", () => {
    const fromList: Sale = { id: "s-9", sale_date: "2026-03-11" };
    const direct: Sale = { id: "s-9", sale_date: "2026-03-10" };
    const out = mergeDirectRecord<Sale>([fromList], direct, belongsTo(3, 2026));
    expect(out).toHaveLength(1);
    expect(out[0].sale_date).toBe("2026-03-11");
  });

  it("upsert substitui pelo id preservando a posição e insere quando é novo", () => {
    const list: Sale[] = [
      { id: "a", sale_date: "2026-01-01" },
      { id: "b", sale_date: "2026-01-02" },
    ];
    const replaced = upsertRecord(list, { id: "b", sale_date: "2026-02-02" });
    expect(replaced.map((s) => s.id)).toEqual(["a", "b"]);
    expect(replaced[1].sale_date).toBe("2026-02-02");
    expect(replaced).not.toBe(list);
    const inserted = upsertRecord(list, { id: "c", sale_date: "2026-03-03" });
    expect(inserted.map((s) => s.id)).toEqual(["c", "a", "b"]);
    expect(inserted).toHaveLength(3);
  });

  it("cópia direta é descartada quando a lista passa a trazê-la ou ela foi alterada/excluída", () => {
    const direct: Sale = { id: "s-9", sale_date: "2026-03-10" };
    expect(shouldDropDirectRecord(direct, [{ id: "s-9", sale_date: "2026-03-10" }])).toBe(true);
    expect(shouldDropDirectRecord(direct, [], ["s-9"])).toBe(true);
    expect(shouldDropDirectRecord(direct, [], ["outro"])).toBe(false);
    expect(shouldDropDirectRecord(null, [])).toBe(false);
  });
});

describe("migration 0021 — predicado canônico (teste estático de SQL)", () => {
  const sql = readFileSync(
    resolve(process.cwd(), "drizzle/migrations/0021_unified_workflow_v2_canonical_active_predicate.sql"),
    "utf8",
  );

  it("handle_opportunity_closed usa travel_file_is_active e não o predicado antigo", () => {
    // Ignora linhas de comentário (que citam o predicado antigo só para explicar).
    const code = sql
      .split("\n")
      .filter((l) => !l.trim().startsWith("--"))
      .join("\n");
    expect(code).toContain("FUNCTION public.handle_opportunity_closed()");
    expect(code).toContain("public.travel_file_is_active(tf.status)");
    expect(code).not.toContain("tf.status <> 'cancelled'");
  });

  it("caminho legado preservado: venda 'legacy_close' e idempotência por oportunidade", () => {
    expect(sql).toContain("'legacy_close'");
    expect(sql).toContain("'opportunity:' || NEW.id::text");
    expect(sql).toContain("NOT EXISTS (SELECT 1 FROM public.sales WHERE opportunity_id = NEW.id)");
    expect(sql).toContain("agency_has_entitlement(NEW.user_id, 'unified_workflow_v2')");
  });

  it("não reescreve migrations anteriores", () => {
    expect(sql).not.toContain("confirm_travel_file_sale");
    expect(sql).not.toContain("auto_create_operation_on_close");
  });
});
