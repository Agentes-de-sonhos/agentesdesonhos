import { describe, it, expect } from "vitest";
import {
  bookingProcessLabel,
  countUnreadFiles,
  fileNumberLabel,
  filterTravelFiles,
  formatFileNumber,
  parseQuoteDeleteError,
  RESERVAS_FILTERS,
} from "@/lib/travelFiles";
import type { TravelFileListItem } from "@/types/travelFile";

const file = (over: Partial<TravelFileListItem>): TravelFileListItem =>
  ({
    id: "f1",
    file_number: 1,
    file_number_display: "0000001",
    status: "request_received",
    clientName: "Maria Silva",
    primary_destination: "Orlando",
    destinations: ["Orlando"],
    serviceNames: ["Hotel Beira Mar"],
    servicesCount: 1,
    unread: false,
    revision: 1,
    start_date: "2026-09-10",
    end_date: "2026-09-20",
    responsible_team_member_id: null,
    protocol_snapshot: "PR-20260818-3215BB8C",
    ...over,
  }) as TravelFileListItem;

describe("formatFileNumber", () => {
  it("gera sempre sete dígitos", () => {
    expect(formatFileNumber(1)).toBe("0000001");
    expect(formatFileNumber("42")).toBe("0000042");
    expect(formatFileNumber("0000123")).toBe("0000123");
  });
  it("retorna vazio sem número", () => {
    expect(formatFileNumber(null)).toBe("");
    expect(formatFileNumber("abc")).toBe("");
  });
  it("rótulos usam a terminologia oficial", () => {
    expect(fileNumberLabel(7)).toBe("File nº 0000007");
    expect(bookingProcessLabel(7)).toBe("Processo de reserva nº 0000007");
    expect(fileNumberLabel(null)).toBe("");
  });
});

describe("filterTravelFiles", () => {
  const files = [
    file({ id: "a", file_number: 1, file_number_display: "0000001" }),
    file({
      id: "b",
      file_number: 12,
      file_number_display: "0000012",
      status: "sale_confirmed",
      clientName: "João Pereira",
      primary_destination: "Buenos Aires",
      unread: true,
    }),
    file({ id: "c", file_number: 13, file_number_display: "0000013", status: "cancelled" }),
  ];

  it("filtra por status agrupado", () => {
    expect(filterTravelFiles(files, { filter: "new" }).map((f) => f.id)).toEqual(["a"]);
    expect(filterTravelFiles(files, { filter: "confirmed" }).map((f) => f.id)).toEqual(["b"]);
    expect(filterTravelFiles(files, { filter: "cancelled" }).map((f) => f.id)).toEqual(["c"]);
    expect(filterTravelFiles(files, { filter: "all" })).toHaveLength(3);
  });

  it("busca por número com ou sem zeros à esquerda", () => {
    expect(filterTravelFiles(files, { search: "12" }).map((f) => f.id)).toEqual(["b"]);
    expect(filterTravelFiles(files, { search: "0000013" }).map((f) => f.id)).toEqual(["c"]);
  });

  it("busca por cliente, destino e status ignorando acentos", () => {
    expect(filterTravelFiles(files, { search: "joao" }).map((f) => f.id)).toEqual(["b"]);
    expect(filterTravelFiles(files, { search: "BUENOS" }).map((f) => f.id)).toEqual(["b"]);
    expect(filterTravelFiles(files, { search: "cancelada" }).map((f) => f.id)).toEqual(["c"]);
  });

  it("filtra por período considerando sobreposição", () => {
    expect(filterTravelFiles(files, { from: "2026-09-15" })).toHaveLength(3);
    expect(filterTravelFiles(files, { to: "2026-08-01" })).toHaveLength(0);
  });

  it("conta não lidos", () => {
    expect(countUnreadFiles(files)).toBe(1);
  });

  it("todos os filtros declarados são utilizáveis", () => {
    for (const f of RESERVAS_FILTERS) {
      expect(() => filterTravelFiles(files, { filter: f.id })).not.toThrow();
    }
  });
});

describe("parseQuoteDeleteError", () => {
  it("traduz o bloqueio em mensagem de negócio com o número do file", () => {
    const msg = parseQuoteDeleteError('error: QUOTE_HAS_BOOKING_FILE:0000002');
    expect(msg).toContain("File nº 0000002");
    expect(msg).not.toContain("QUOTE_HAS_BOOKING_FILE");
  });
  it("mantém null para erros comuns", () => {
    expect(parseQuoteDeleteError("permission denied")).toBeNull();
    expect(parseQuoteDeleteError(null)).toBeNull();
  });
});
