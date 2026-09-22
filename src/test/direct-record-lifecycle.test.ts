import { describe, it, expect, vi } from "vitest";
import { directRecordAfterUpdate, directRecordAfterDelete } from "@/lib/deepLinkRecords";

type Sale = { id: string; sale_date: string; sale_amount?: number };

/**
 * Testes COMPORTAMENTAIS do ciclo de vida da venda aberta por link direto:
 * falha de gravação/exclusão preserva o registro; sucesso de edição substitui
 * pelos dados retornados pelo servidor.
 */
describe("ciclo de vida do registro aberto por link direto", () => {
  const direct: Sale = { id: "s-9", sale_date: "2026-03-10", sale_amount: 100 };

  it("edição bem-sucedida mantém o registro com os dados retornados", () => {
    const out = directRecordAfterUpdate<Sale>(direct, "s-9", { sale_amount: 250, sale_date: "2026-03-12" });
    expect(out).toEqual({ id: "s-9", sale_date: "2026-03-12", sale_amount: 250 });
  });

  it("edição de outro registro não afeta a cópia direta", () => {
    expect(directRecordAfterUpdate<Sale>(direct, "outro", { sale_amount: 1 })).toBe(direct);
  });

  it("retorno vazio do servidor preserva o registro visível", () => {
    expect(directRecordAfterUpdate<Sale>(direct, "s-9", null)).toBe(direct);
  });

  it("exclusão bem-sucedida remove só o registro excluído", () => {
    expect(directRecordAfterDelete<Sale>(direct, "s-9")).toBeNull();
    expect(directRecordAfterDelete<Sale>(direct, "outro")).toBe(direct);
  });

  it("gravação que falha nunca chega a trocar o registro visível", async () => {
    let visible: Sale | null = direct;
    const updateSale = vi.fn(async () => { throw new Error("falhou"); });
    const submit = async () => {
      const updated = await updateSale();
      visible = directRecordAfterUpdate<Sale>(visible, "s-9", updated as any);
    };
    await expect(submit()).rejects.toThrow("falhou");
    expect(visible).toBe(direct);
  });

  it("exclusão que falha mantém o registro visível", async () => {
    let visible: Sale | null = direct;
    const deleteSale = vi.fn(async () => { throw new Error("falhou"); });
    const remove = async () => {
      await deleteSale();
      visible = directRecordAfterDelete<Sale>(visible, "s-9");
    };
    await expect(remove()).rejects.toThrow("falhou");
    expect(visible).toBe(direct);
  });
});
