import { describe, it, expect } from "vitest";
import {
  describeFileEvent,
  fileAgeInDays,
  fileStatusStep,
  isFileOverdue,
  isFinalFileStatus,
  nextFileStatus,
  summarizeReservas,
  summarizeServiceFinancials,
  suggestFileStatusFromServices,
} from "@/lib/travelFileWorkflow";
import type { TravelFileListItem, TravelFileService } from "@/types/travelFile";

const service = (over: Partial<TravelFileService>): TravelFileService =>
  ({
    id: "s1",
    file_id: "f1",
    service_type: "hotel",
    product_name: "Hotel Beira Mar",
    supplier_name: null,
    city: null,
    destination: null,
    country: null,
    start_date: null,
    end_date: null,
    quantity: 1,
    passengers_count: 2,
    currency: "BRL",
    requested_amount: 1000,
    reconfirmed_amount: null,
    sold_amount: null,
    cost_amount: null,
    commission_amount: null,
    responsible_team_member_id: null,
    is_required: false,
    status: "requested",
    snapshot: {},
    created_at: "2026-08-01T12:00:00Z",
    ...over,
  }) as TravelFileService;

const listItem = (over: Partial<TravelFileListItem>): TravelFileListItem =>
  ({
    id: "f1",
    file_number: 1,
    file_number_display: "0000001",
    status: "request_received",
    currency: "BRL",
    requested_amount: 1000,
    reconfirmed_amount: null,
    final_sale_amount: null,
    unread: false,
    revision: 1,
    passengers_count: 2,
    opened_at: "2026-08-01T12:00:00Z",
    ...over,
  }) as TravelFileListItem;

describe("fluxo de etapas do file", () => {
  it("avança na régua oficial e para na conclusão", () => {
    expect(nextFileStatus("request_received")).toBe("awaiting_reconfirmation");
    expect(nextFileStatus("sale_confirmed")).toBe("in_operation");
    expect(nextFileStatus("trip_completed")).toBeNull();
    expect(nextFileStatus("cancelled")).toBeNull();
  });

  it("identifica etapas finais e posição na régua", () => {
    expect(isFinalFileStatus("cancelled")).toBe(true);
    expect(isFinalFileStatus("awaiting_client")).toBe(false);
    expect(fileStatusStep("request_received")).toBe(1);
    expect(fileStatusStep("trip_completed")).toBe(7);
    expect(fileStatusStep("cancelled")).toBe(0);
  });
});

describe("sugestão de etapa pelos serviços", () => {
  it("sugere venda confirmada quando tudo está reservado ou emitido", () => {
    expect(
      suggestFileStatusFromServices([{ status: "booked" }, { status: "issued" }] as any),
    ).toBe("sale_confirmed");
  });
  it("sugere aguardando cliente quando há valor alterado", () => {
    expect(
      suggestFileStatusFromServices([{ status: "available" }, { status: "amount_changed" }] as any),
    ).toBe("awaiting_client");
  });
  it("sugere parcialmente disponível quando há indisponível e disponível", () => {
    expect(
      suggestFileStatusFromServices([{ status: "available" }, { status: "unavailable" }] as any),
    ).toBe("partially_available");
  });
  it("sugere cancelada quando todos os serviços foram cancelados", () => {
    expect(suggestFileStatusFromServices([{ status: "cancelled" }] as any)).toBe("cancelled");
  });
  it("não sugere nada sem serviços", () => {
    expect(suggestFileStatusFromServices([])).toBeNull();
  });
});

describe("consolidação financeira", () => {
  it("usa o solicitado quando não há reconfirmação e ignora cancelados", () => {
    const totals = summarizeServiceFinancials([
      service({ id: "a", requested_amount: 1000 }),
      service({ id: "b", requested_amount: 500, reconfirmed_amount: 600, cost_amount: 400, commission_amount: 60 }),
      service({ id: "c", requested_amount: 900, status: "cancelled" }),
    ]);
    expect(totals.requested).toBe(1500);
    expect(totals.reconfirmed).toBe(1600);
    expect(totals.sold).toBe(1600);
    expect(totals.cost).toBe(400);
    expect(totals.commission).toBe(60);
    expect(totals.margin).toBe(1200);
    expect(totals.variation).toBe(100);
  });

  it("prioriza o valor vendido quando informado", () => {
    const totals = summarizeServiceFinancials([
      service({ requested_amount: 1000, reconfirmed_amount: 1100, sold_amount: 1050 }),
    ]);
    expect(totals.sold).toBe(1050);
  });
});

describe("indicadores da Central de Reservas", () => {
  it("agrupa por etapa e soma valores corretos", () => {
    const files = [
      listItem({ id: "a", unread: true }),
      listItem({ id: "b", status: "awaiting_reconfirmation" }),
      listItem({ id: "c", status: "partially_available" }),
      listItem({ id: "d", status: "sale_confirmed", final_sale_amount: 2000 }),
      listItem({ id: "e", status: "cancelled", requested_amount: 5000 }),
    ];
    const k = summarizeReservas(files);
    expect(k.total).toBe(5);
    expect(k.unread).toBe(1);
    expect(k.newRequests).toBe(1);
    expect(k.awaitingReconfirmation).toBe(2);
    expect(k.confirmed).toBe(1);
    expect(k.cancelled).toBe(1);
    expect(k.requestedAmount).toBe(4000);
    expect(k.confirmedAmount).toBe(2000);
  });
});

describe("alerta de tratamento", () => {
  const now = new Date("2026-08-05T12:00:00Z");
  it("conta a idade em dias completos", () => {
    expect(fileAgeInDays({ opened_at: "2026-08-01T12:00:00Z" } as any, now)).toBe(4);
  });
  it("destaca solicitações paradas e ignora processos finalizados", () => {
    expect(isFileOverdue({ opened_at: "2026-08-01T12:00:00Z", status: "request_received" } as any, now)).toBe(true);
    expect(isFileOverdue({ opened_at: "2026-08-05T09:00:00Z", status: "request_received" } as any, now)).toBe(false);
    expect(isFileOverdue({ opened_at: "2026-08-01T12:00:00Z", status: "trip_completed" } as any, now)).toBe(false);
    expect(isFileOverdue({ opened_at: "2026-08-01T12:00:00Z", status: "sale_confirmed" } as any, now)).toBe(false);
  });
});

describe("histórico em linguagem de negócio", () => {
  it("descreve mudança de etapa com os rótulos oficiais", () => {
    const text = describeFileEvent({
      event_type: "file_status_changed",
      payload: { from: "request_received", to: "sale_confirmed" },
    });
    expect(text).toContain("Solicitação recebida");
    expect(text).toContain("Venda confirmada");
  });
  it("resolve o nome do responsável", () => {
    const text = describeFileEvent(
      { event_type: "file_responsible_changed", payload: { to: "m1" } },
      { m1: "Ana Souza" },
    );
    expect(text).toContain("Ana Souza");
  });
  it("descreve mudanças de serviço sem texto técnico", () => {
    const text = describeFileEvent({
      event_type: "service_status_changed",
      payload: { service_name: "Hotel Beira Mar", from: "requested", to: "booked" },
    });
    expect(text).toContain("Hotel Beira Mar");
    expect(text).toContain("Reservado");
  });
});
