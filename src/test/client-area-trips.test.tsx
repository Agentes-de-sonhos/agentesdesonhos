import { describe, expect, it, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import {
  type ClientAreaTrip,
  DATE_TBD,
  TRIPS_EMPTY,
  classifyTrip,
  defaultTripGroup,
  groupTrips,
  highlightTrip,
  isCancelledStage,
  tripIdFromPath,
  tripPathFor,
  tripPeriodLabel,
  tripServicesLabel,
  tripStatusLabel,
  tripTitle,
  tripTravelersLabel,
  visibleTripGroups,
} from "@/lib/clientAreaTrips";
import {
  ClientAreaTripDetail,
  ClientAreaTripsView,
} from "@/components/whitelabel/clientarea/ClientAreaTripsView";
import { clientAreaAuthBody } from "@/lib/clientAreaAccess";

const NOW = new Date(2026, 4, 10); // 10 mai 2026, meio-dia local

function trip(over: Partial<ClientAreaTrip> = {}): ClientAreaTrip {
  return {
    id: over.id ?? "11111111-1111-4111-8111-111111111111",
    title: "Viagem Lisboa",
    destination: "Lisboa",
    start_date: null,
    end_date: null,
    stage: null,
    stage_label: null,
    travelers_count: 2,
    services_count: 3,
    cover_url: null,
    ...over,
  };
}

const info = {
  agency_id: "agency-1",
  slug: "paraiso",
  hostname: "paraiso.tur.br",
  name: "Paraíso Viagens",
  primary_color: "#0F62FE",
} as any;

describe("classificação de viagens", () => {
  it("marca em andamento quando hoje está dentro do período", () => {
    expect(classifyTrip(trip({ start_date: "2026-05-08", end_date: "2026-05-15" }), NOW))
      .toBe("andamento");
  });

  it("marca próximas quando começa no futuro", () => {
    expect(classifyTrip(trip({ start_date: "2026-06-01", end_date: "2026-06-10" }), NOW))
      .toBe("proximas");
  });

  it("marca anteriores quando o período já terminou", () => {
    expect(classifyTrip(trip({ start_date: "2026-01-02", end_date: "2026-01-09" }), NOW))
      .toBe("anteriores");
  });

  it("respeita o estágio operacional acima das datas", () => {
    expect(classifyTrip(trip({ start_date: "2026-06-01", stage: "em_viagem" }), NOW))
      .toBe("andamento");
    expect(classifyTrip(trip({ start_date: "2026-06-01", stage: "finalizado" }), NOW))
      .toBe("anteriores");
  });

  it("classifica viagem sem datas como próxima, nunca como cancelada", () => {
    expect(classifyTrip(trip(), NOW)).toBe("proximas");
  });

  it("só cancela com marcação explícita", () => {
    expect(isCancelledStage(null, null)).toBe(false);
    expect(isCancelledStage("cancelado", null)).toBe(true);
    expect(isCancelledStage(null, "Cancelada pelo cliente")).toBe(true);
    expect(classifyTrip(trip({ start_date: "2026-06-01", stage: "cancelado" }), NOW))
      .toBe("canceladas");
  });
});

describe("ordenação, agrupamento e destaque", () => {
  const list = [
    trip({ id: "a", start_date: "2026-08-01", end_date: "2026-08-10" }),
    trip({ id: "b", start_date: "2026-06-01", end_date: "2026-06-05" }),
    trip({ id: "c", start_date: "2026-01-01", end_date: "2026-01-05" }),
    trip({ id: "d", start_date: "2026-03-01", end_date: "2026-03-05" }),
    trip({ id: "e", start_date: "2026-05-09", end_date: "2026-05-12" }),
    trip({ id: "f", stage: "cancelado", start_date: "2026-07-01" }),
    trip({ id: "g", start_date: null }),
  ];
  const grouped = groupTrips(list, NOW);

  it("ordena próximas da mais próxima para a mais distante e joga sem-data ao fim", () => {
    expect(grouped.proximas.map((t) => t.id)).toEqual(["b", "a", "g"]);
  });

  it("ordena anteriores das mais recentes para as mais antigas", () => {
    expect(grouped.anteriores.map((t) => t.id)).toEqual(["d", "c"]);
  });

  it("isola canceladas em seu próprio grupo", () => {
    expect(grouped.canceladas.map((t) => t.id)).toEqual(["f"]);
  });

  it("destaca a viagem em andamento na página inicial", () => {
    expect(highlightTrip(grouped)?.id).toBe("e");
  });

  it("destaca a próxima quando não há viagem em andamento", () => {
    const only = groupTrips([list[0], list[1]], NOW);
    expect(highlightTrip(only)?.id).toBe("b");
    expect(highlightTrip(groupTrips([], NOW))).toBeNull();
  });

  it("abre na aba mais relevante e esconde canceladas quando vazias", () => {
    expect(defaultTripGroup(grouped)).toBe("andamento");
    expect(visibleTripGroups(groupTrips([list[2]], NOW))).not.toContain("canceladas");
    expect(visibleTripGroups(grouped)).toContain("canceladas");
  });
});

describe("formatação segura", () => {
  it("informa data a confirmar sem inventar período", () => {
    expect(tripPeriodLabel(trip())).toBe(DATE_TBD);
    expect(tripPeriodLabel(trip({ start_date: "2026-05-09", end_date: "2026-05-12" })))
      .toBe("09 mai 2026 — 12 mai 2026");
    expect(tripPeriodLabel(trip({ start_date: "2026-05-09", end_date: "2026-05-09" })))
      .toBe("09 mai 2026");
  });

  it("omite contagens não confiáveis", () => {
    expect(tripServicesLabel(trip({ services_count: 0 }))).toBeNull();
    expect(tripServicesLabel(trip({ services_count: 1 }))).toBe("1 serviço");
    expect(tripTravelersLabel(trip({ travelers_count: null }))).toBeNull();
    expect(tripTravelersLabel(trip({ travelers_count: 4 }))).toBe("4 viajantes");
  });

  it("usa o nome do estágio da agência quando existir", () => {
    expect(tripStatusLabel(trip({ stage: "em_viagem" }))).toBe("Em viagem");
    expect(tripStatusLabel(trip({ stage: "custom", stage_label: "Aguardando emissão" })))
      .toBe("Aguardando emissão");
    expect(tripTitle(trip({ title: null, destination: null }))).toBe("Sua viagem");
  });

  it("faz ida e volta entre id e rota de detalhe", () => {
    expect(tripPathFor("abc")).toBe("/area-do-cliente/viagens/abc");
    expect(tripIdFromPath("/area-do-cliente/viagens/abc?x=1")).toBe("abc");
    expect(tripIdFromPath("/area-do-cliente")).toBeNull();
  });
});

describe("isolamento: nada de identificadores vindos do navegador", () => {
  it("o corpo enviado ao servidor carrega apenas hostname, token e id da viagem", () => {
    const body = clientAreaAuthBody("trip", "Paraiso.TUR.br", { token: "t".repeat(40), trip_id: "x" });
    expect(Object.keys(body).sort()).toEqual(["action", "hostname", "token", "trip_id"]);
    expect(body.hostname).toBe("paraiso.tur.br");
    expect(body).not.toHaveProperty("agency_id");
    expect(body).not.toHaveProperty("client_id");
  });
});

describe("estados da lista", () => {
  const empty = groupTrips([], NOW);
  beforeEach(() => vi.restoreAllMocks());

  it("mostra estado vazio acolhedor", () => {
    render(
      <ClientAreaTripsView info={info} status="ready" grouped={empty} onRetry={() => {}} onOpenTrip={() => {}} />,
    );
    expect(screen.getByText(TRIPS_EMPTY)).toBeInTheDocument();
    expect(screen.queryByRole("tablist")).not.toBeInTheDocument();
  });

  it("permite tentar novamente em caso de erro", async () => {
    const onRetry = vi.fn();
    render(
      <ClientAreaTripsView info={info} status="error" grouped={empty} onRetry={onRetry} onOpenTrip={() => {}} />,
    );
    await userEvent.click(screen.getByRole("button", { name: /tentar novamente/i }));
    expect(onRetry).toHaveBeenCalledTimes(1);
  });

  it("lista viagens por aba e abre o detalhe", async () => {
    const grouped = groupTrips(
      [
        trip({ id: "atual", title: "Lisboa", start_date: "2026-05-09", end_date: "2026-05-12" }),
        trip({ id: "antiga", title: "Buenos Aires", start_date: "2026-01-01", end_date: "2026-01-05" }),
      ],
      NOW,
    );
    const onOpenTrip = vi.fn();
    render(
      <ClientAreaTripsView info={info} status="ready" grouped={grouped} onRetry={() => {}} onOpenTrip={onOpenTrip} />,
    );
    expect(screen.getByText("Lisboa")).toBeInTheDocument();
    expect(screen.queryByText("Buenos Aires")).not.toBeInTheDocument();

    await userEvent.click(screen.getByRole("tab", { name: /anteriores/i }));
    expect(screen.getByText("Buenos Aires")).toBeInTheDocument();

    await userEvent.click(screen.getByRole("button", { name: /ver viagem buenos aires/i }));
    expect(onOpenTrip).toHaveBeenCalledWith("antiga");
  });
});

describe("detalhe da viagem", () => {
  it("responde de forma genérica quando a viagem não pertence ao cliente", () => {
    render(<ClientAreaTripDetail info={info} status="notfound" trip={null} onBack={() => {}} />);
    expect(screen.getByText("Viagem não encontrada.")).toBeInTheDocument();
  });

  it("exibe identificação, período e status", () => {
    render(
      <ClientAreaTripDetail
        info={info}
        status="ready"
        trip={trip({ title: "Lisboa", start_date: "2026-05-09", end_date: "2026-05-12", stage: "em_viagem" })}
        onBack={() => {}}
      />,
    );
    expect(screen.getByRole("heading", { level: 1, name: "Lisboa" })).toBeInTheDocument();
    expect(screen.getByText("09 mai 2026 — 12 mai 2026")).toBeInTheDocument();
    expect(screen.getAllByText("Em viagem").length).toBeGreaterThan(0);
  });
});
