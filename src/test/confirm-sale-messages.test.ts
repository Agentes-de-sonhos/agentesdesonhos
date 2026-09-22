import { describe, it, expect } from "vitest";
import {
  CONFIRM_SALE_FALLBACK_MESSAGE,
  extractWorkflowCode,
  humanizeWorkflowError,
  resolveActiveTravelFiles,
} from "@/lib/confirmSaleMessages";

describe("mensagens da confirmação de venda", () => {
  it("nunca mostra códigos internos ao usuário", () => {
    const raws = [
      'USE_CONFIRM_SALE: Esta oportunidade tem um processo de reserva. Confirme a venda pela Central de Reservas, no botão "Confirmar venda e iniciar operação".',
      new Error("SERVICES_PENDING: 2 serviços pendentes"),
      { message: "WORKFLOW_LINK_CONFLICT" },
      { message: "MULTIPLE_ACTIVE_TRAVEL_FILES: 2" },
      { message: "LEGACY_AMBIGUOUS_LINK" },
      { message: "STALE_FILE" },
      { message: "NOT_AUTHORIZED" },
      { message: "FILE_NOT_READY" },
      { message: "UNKNOWN_INTERNAL_CODE" },
    ];
    for (const raw of raws) {
      const text = humanizeWorkflowError(raw);
      expect(text.length).toBeGreaterThan(10);
      expect(text).not.toMatch(/[A-Z]{3,}_[A-Z]{3,}/);
    }
  });

  it("explica em linguagem humana o caso do ciclo impossível", () => {
    expect(humanizeWorkflowError("USE_CONFIRM_SALE: qualquer coisa")).toContain(
      "Confirmar venda e iniciar operação",
    );
  });

  it("mantém mensagens já humanas e limpa prefixos técnicos", () => {
    expect(humanizeWorkflowError("Informe o motivo do cancelamento.")).toBe(
      "Informe o motivo do cancelamento.",
    );
    expect(humanizeWorkflowError("ALGUM_CODIGO: Falta o fornecedor do voo.")).toBe(
      "Falta o fornecedor do voo.",
    );
  });

  it("cai na mensagem genérica quando não há texto útil", () => {
    expect(humanizeWorkflowError(null)).toBe(CONFIRM_SALE_FALLBACK_MESSAGE);
    expect(humanizeWorkflowError("   ")).toBe(CONFIRM_SALE_FALLBACK_MESSAGE);
  });

  it("guarda o código apenas para telemetria", () => {
    expect(extractWorkflowCode({ message: "USE_CONFIRM_SALE: x" })).toBe("USE_CONFIRM_SALE");
    expect(extractWorkflowCode("falha de rede")).toBeNull();
  });

  it("resolve qual processo ativo responde pela oportunidade", () => {
    expect(resolveActiveTravelFiles([])).toEqual({ kind: "none", fileId: null });
    expect(resolveActiveTravelFiles(null)).toEqual({ kind: "none", fileId: null });
    expect(resolveActiveTravelFiles([{ id: "f1" }])).toEqual({ kind: "single", fileId: "f1" });
    expect(resolveActiveTravelFiles([{ id: "f1" }, { id: "f2" }])).toEqual({
      kind: "multiple",
      fileId: "f1",
    });
  });
});
