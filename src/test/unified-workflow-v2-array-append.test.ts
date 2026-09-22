import { describe, expect, it } from "vitest";
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";

/**
 * Guardas da migration 0022: a função confirm_travel_file_sale falhava com
 * SQLSTATE 22P02 ("malformed array literal") porque concatenava literais
 * escalares em arrays text[] (_created, _reused, _warnings). A 0022 reescreve
 * essas atribuições com array_append preservando o resto do corpo.
 *
 * Teste estrutural (leitura de SQL). A execução real das 19 atribuições da
 * função aplicada foi verificada diretamente no banco, em bloco anônimo, sem
 * gravar dados.
 */
const dir = join(process.cwd(), "drizzle/migrations");
const files = readdirSync(dir).filter((f) => f.endsWith(".sql"));
const migration = files.find((f) => f.startsWith("0022_"));

describe("Migration 0022 — array_append em confirm_travel_file_sale", () => {
  it("a migration 0022 existe e não reescreve as migrations anteriores", () => {
    expect(migration).toBeTruthy();
    expect(files.filter((f) => f.startsWith("0013_") || f.startsWith("0021_")).length).toBe(2);
  });

  const sql = () => readFileSync(join(dir, migration as string), "utf-8");

  it("substitui as concatenações escalares por array_append nas três listas", () => {
    const s = sql();
    expect(s).toContain("array_append(_\\1, \\3)");
    expect(s).toMatch(/_\(created\|reused\|warnings\) := _\(created\|reused\|warnings\)/);
    expect(s).toContain("array_append(_warnings, \\1)");
  });

  it("preserva a função aplicada: parte de pg_get_functiondef e da assinatura exata", () => {
    const s = sql();
    expect(s).toContain("pg_get_functiondef");
    expect(s).toContain(
      "p_file_id uuid, p_idempotency_key text, p_acceptance jsonb, p_expected_updated_at timestamp with time zone",
    );
    expect(s).toContain("EXECUTE _new");
    // Não recria corpo, portanto não há risco de perder locks/idempotência.
    expect(s).not.toContain("CREATE OR REPLACE FUNCTION public.confirm_travel_file_sale");
  });

  it("falha explicitamente se sobrar qualquer concatenação escalar", () => {
    const s = sql();
    expect(s).toContain("ainda restam concatenações escalares");
    expect(s).toContain("nenhuma concatenação escalar encontrada");
  });

  it("cobre os cinco marcadores relatados no erro real", () => {
    const legacy = readFileSync(join(dir, "0020_unified_workflow_v2_active_file_definition.sql"), "utf-8");
    for (const marker of ["operation", "operation_service", "sale", "sale_product_package", "sale_product"]) {
      expect(legacy).toContain(`|| '${marker}'`);
    }
    // O padrão corrigido é genérico: casa qualquer literal dessas três listas.
    expect(sql()).toContain("(''[^'']*'')");
  });
});
