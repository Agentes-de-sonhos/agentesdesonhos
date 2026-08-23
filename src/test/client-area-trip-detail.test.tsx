import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { AgencyDomainInfo } from "@/lib/agencyDomains";
import type { ClientAreaTripDetailData, ClientAreaTripService } from "@/lib/clientAreaTripDetail";
import {
  buildTimeline,
  detailLabel,
  detailValue,
  serviceDetailRows,
  servicePeriodLabel,
  serviceStatusLabel,
  serviceTitle,
  serviceTypeLabel,
  servicesWithoutDate,
  sortServices,
  timelineDayLabel,
} from "@/lib/clientAreaTripDetail";
import { ClientAreaTripDetail } from "@/components/whitelabel/clientarea/ClientAreaTripDetail";

const info = {
  agency_id: "ag-1",
  slug: "paraiso",
  agency_name: "Paraíso Viagens",
  primary_color: "#0a58ca",
  phone: "11999998888",
} as unknown as AgencyDomainInfo;

const service = (over: Partial<ClientAreaTripService> = {}): ClientAreaTripService => ({
  id: over.id ?? "s1",
  service_type: "hotel",
  name: "Hotel Alvalade",
  destination: "Lisboa",
  start_date: "2026-05-09",
  end_date: "2026-05-12",
  confirmed: true,
  details: null,
  ...over,
});

const trip = (over: Partial<ClientAreaTripDetailData> = {}): ClientAreaTripDetailData => ({
  id: "t1",
  title: "Lisboa",
  destination: "Lisboa",
  start_date: "2026-05-09",
  end_date: "2026-05-12",
  stage: "em_viagem",
  stage_label: null,
  travelers_count: 2,
  services_count: 1,
  cover_url: null,
  ...over,
});

describe("clientAreaTripDetail — rótulos e valores", () => {
  it("traduz tipos de serviço e cai em 'Outro serviço' para desconhecidos", () => {
    expect(serviceTypeLabel("flight")).toBe("Passagem aérea");
    expect(serviceTypeLabel("mistério")).toBe("Outro serviço");
    expect(serviceTypeLabel(null)).toBe("Outro serviço");
  });

  it("usa o tipo como título quando o serviço não tem nome", () => {
    expect(serviceTitle(service({ name: "   " }))).toBe("Hospedagem");
    expect(serviceTitle(service({ name: "Hotel Alvalade" }))).toBe("Hotel Alvalade");
  });

  it("status só reflete confirmação, nunca pagamento", () => {
    expect(serviceStatusLabel(service({ confirmed: true }))).toBe("Confirmado");
    expect(serviceStatusLabel(service({ confirmed: false }))).toBe("Em processamento");
  });

  it("formata datas ISO, booleanos e descarta vazios", () => {
    expect(detailValue("2026-05-09")).toBe("09/05/2026");
    expect(detailValue(true)).toBe("Sim");
    expect(detailValue("  ")).toBeNull();
    expect(detailValue(null)).toBeNull();
    expect(detailValue({ a: 1 })).toBeNull();
  });

  it("humaniza chaves desconhecidas", () => {
    expect(detailLabel("room_type")).toBe("Tipo de apartamento");
    expect(detailLabel("codigo_externo")).toBe("Codigo externo");
  });

  it("monta linhas apenas com valores simples e preenchidos", () => {
    const rows = serviceDetailRows(
      service({
        details: { room_type: "Duplo", meal_plan: "", nights: 3, extra: { x: 1 } as never },
      }),
    );
    expect(rows.map((r) => r.label)).toEqual(["Noites", "Tipo de apartamento"]);
    expect(rows.find((r) => r.key === "nights")?.value).toBe("3");
  });

  it("período do serviço colapsa datas iguais", () => {
    expect(servicePeriodLabel(service())).toBe("09/05/2026 — 12/05/2026");
    expect(servicePeriodLabel(service({ end_date: "2026-05-09" }))).toBe("09/05/2026");
    expect(servicePeriodLabel(service({ start_date: null, end_date: null }))).toBeNull();
  });
});

describe("clientAreaTripDetail — ordenação e programação", () => {
  it("ordena por data e joga serviços sem data para o fim", () => {
    const list = [
      service({ id: "sem", start_date: null, end_date: null, name: "Seguro" }),
      service({ id: "depois", start_date: "2026-05-11" }),
      service({ id: "antes", start_date: "2026-05-09" }),
    ];
    expect(sortServices(list).map((s) => s.id)).toEqual(["antes", "depois", "sem"]);
    expect(servicesWithoutDate(list).map((s) => s.id)).toEqual(["sem"]);
  });

  it("agrupa a programação por dia em ordem cronológica", () => {
    const timeline = buildTimeline([
      service({ id: "b", start_date: "2026-05-11", name: "Passeio" }),
      service({ id: "a", start_date: "2026-05-09" }),
      service({ id: "a2", start_date: "2026-05-09", name: "Transfer" }),
      service({ id: "nada", start_date: null, end_date: null }),
    ]);
    expect(timeline.map((d) => d.date)).toEqual(["2026-05-09", "2026-05-11"]);
    expect(timeline[0].services).toHaveLength(2);
  });

  it("rotula o dia em português, sem deslocar o fuso", () => {
    expect(timelineDayLabel("2026-05-09")).toBe("sábado, 9 de maio de 2026");
  });
});

describe("ClientAreaTripDetail — UI somente leitura", () => {
  it("mostra visão geral e navega entre as seções", async () => {
    render(
      <ClientAreaTripDetail
        info={info}
        status="ready"
        trip={trip({
          services: [service({ details: { room_type: "Duplo" } })],
          travelers: [{ id: "v1", name: "Ana Souza", is_responsible: true }],
        })}
        onBack={() => {}}
      />,
    );

    expect(screen.getByRole("heading", { level: 1, name: "Lisboa" })).toBeInTheDocument();
    expect(screen.getByText("1 serviço")).toBeInTheDocument();
    expect(screen.getByText("1 viajante")).toBeInTheDocument();

    await userEvent.click(screen.getByRole("tab", { name: "Serviços" }));
    expect(screen.getByText("Hotel Alvalade")).toBeInTheDocument();
    expect(screen.getByText("Duplo")).toBeInTheDocument();

    await userEvent.click(screen.getByRole("tab", { name: "Programação" }));
    expect(screen.getByText(/9 de maio de 2026/)).toBeInTheDocument();

    await userEvent.click(screen.getByRole("tab", { name: "Viajantes" }));
    expect(screen.getByText("Ana Souza")).toBeInTheDocument();
    expect(screen.getByText("Responsável pela viagem")).toBeInTheDocument();
  });

  it("mostra estados vazios honestos quando ainda não há dados", async () => {
    render(
      <ClientAreaTripDetail info={info} status="ready" trip={trip({ services: [], travelers: [] })} onBack={() => {}} />,
    );
    await userEvent.click(screen.getByRole("tab", { name: "Serviços" }));
    expect(screen.getByText(/serviços desta viagem ainda estão sendo preparados/i)).toBeInTheDocument();
    await userEvent.click(screen.getByRole("tab", { name: "Viajantes" }));
    expect(screen.getByText(/viajantes desta viagem ainda não foram cadastrados/i)).toBeInTheDocument();
  });

  it("permite voltar para a lista", async () => {
    const onBack = vi.fn();
    render(<ClientAreaTripDetail info={info} status="ready" trip={trip()} onBack={onBack} />);
    await userEvent.click(screen.getByRole("button", { name: /voltar para minhas viagens/i }));
    expect(onBack).toHaveBeenCalled();
  });
});
