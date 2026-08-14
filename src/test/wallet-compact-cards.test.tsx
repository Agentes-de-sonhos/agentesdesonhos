import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import {
  formatFriendlyDate,
  formatFriendlyDateRange,
  formatFriendlyTime,
} from "@/lib/friendlyDateRange";
import {
  CATEGORY_CONFIG,
  countServiceFiles,
  formatFilesCountLabel,
  hasAdditionalDetails,
} from "@/components/wallet/category/categoryPresentation";
import { collectServiceDocuments } from "@/lib/serviceDocuments";
import { CategoryServiceView } from "@/components/wallet/category/CategoryServiceView";
import type { TripService, TripServiceType } from "@/types/trip";

vi.mock("@/components/shared/ResolvedServiceImage", () => ({
  ResolvedServiceThumb: () => null,
}));

function svc(type: TripServiceType, data: any, extra: Partial<TripService> = {}): TripService {
  return {
    id: extra.id || `${type}-1`,
    trip_id: "t1",
    service_type: type,
    service_data: data,
    ...extra,
  } as unknown as TripService;
}

const fields = (type: TripServiceType, data: any) =>
  CATEGORY_CONFIG[type].getCompactFields(svc(type, data));

// ─────────────────────────────────────────────────────────────
describe("formatFriendlyDateRange", () => {
  it("uma data", () => {
    expect(formatFriendlyDate("2026-08-17")).toBe("17 de agosto de 2026");
    expect(formatFriendlyDateRange("2026-08-17")).toBe("17 de agosto de 2026");
  });
  it("mesma data nos dois campos", () => {
    expect(formatFriendlyDateRange("2026-08-17", "2026-08-17")).toBe("17 de agosto de 2026");
  });
  it("mesmo mês e ano", () => {
    expect(formatFriendlyDateRange("2026-08-17", "2026-08-22")).toBe("17 a 22 de agosto de 2026");
  });
  it("meses diferentes no mesmo ano", () => {
    expect(formatFriendlyDateRange("2026-08-28", "2026-09-03")).toBe(
      "28 de agosto a 3 de setembro de 2026",
    );
  });
  it("anos diferentes sem ambiguidade", () => {
    expect(formatFriendlyDateRange("2026-12-28", "2027-01-03")).toBe(
      "28 de dezembro de 2026 a 3 de janeiro de 2027",
    );
  });
  it("inválida/ausente => null", () => {
    expect(formatFriendlyDateRange("", "")).toBeNull();
    expect(formatFriendlyDateRange(null, undefined)).toBeNull();
    expect(formatFriendlyDate("banana")).toBeNull();
  });
  it("datas impossíveis são rejeitadas (sem normalização silenciosa)", () => {
    expect(formatFriendlyDate("2026-13-40")).toBeNull();
    expect(formatFriendlyDateRange("2026-13-40")).toBeNull();
    expect(formatFriendlyDate("2026-00-10")).toBeNull();
    expect(formatFriendlyDate("2026-08-00")).toBeNull();
    expect(formatFriendlyDate("2026-08-32")).toBeNull();
    expect(formatFriendlyDate("2026-02-31")).toBeNull();
    expect(formatFriendlyDate("2026-02-29")).toBeNull();
    expect(formatFriendlyDate("31/02/2026")).toBeNull();
    expect(formatFriendlyDate("2026-8-1")).toBeNull();
    expect(formatFriendlyDate("20260801")).toBeNull();
  });
  it("ano bissexto e timestamp ISO continuam válidos", () => {
    expect(formatFriendlyDate("2028-02-29")).toBe("29 de fevereiro de 2028");
    expect(formatFriendlyDate("2026-08-17T14:30:00Z")).toBe("17 de agosto de 2026");
    expect(formatFriendlyDate("17/08/2026")).toBe("17 de agosto de 2026");
  });
  it("não desloca timezone (YYYY-MM-DD local)", () => {
    expect(formatFriendlyDate("2026-07-01")).toBe("1 de julho de 2026");
  });
  it("horários", () => {
    expect(formatFriendlyTime("08:30:00")).toBe("08:30");
    expect(formatFriendlyTime("")).toBeNull();
    expect(formatFriendlyTime("99:99")).toBeNull();
  });
  it("nunca usa hífen cru entre datas", () => {
    expect(formatFriendlyDateRange("2026-08-17", "2026-08-22")).not.toContain(" - ");
  });
});

// ─────────────────────────────────────────────────────────────
describe("hotel — card recolhido", () => {
  const data = {
    hotel_name: "Hilton Cabana Miami Beach Resort",
    check_in: "2026-08-17",
    check_out: "2026-08-22",
    city: "Miami Beach",
    state: "Flórida",
    country: "Estados Unidos",
    room_type: "deluxe",
    guests: [{ name: "A" }, { name: "B" }],
  };
  it("título + período + cidade/estado", () => {
    const f = fields("hotel", data);
    expect(f.title).toBe("Hilton Cabana Miami Beach Resort");
    expect(f.details).toEqual(["17 a 22 de agosto de 2026", "Miami Beach, Flórida"]);
  });
  it("não mostra categoria do quarto nem hóspedes", () => {
    const blob = JSON.stringify(fields("hotel", data)).toLowerCase();
    expect(blob).not.toContain("deluxe");
    expect(blob).not.toContain("standard");
    expect(blob).not.toContain("hóspede");
  });
  it("sem estado mostra apenas a cidade; sem cidade omite a linha", () => {
    expect(fields("hotel", { ...data, state: "" }).details[1]).toBe("Miami Beach");
    const noCity = fields("hotel", { hotel_name: "X", city: "", country: "Brasil" });
    expect(noCity.details).toEqual([]);
  });
});

describe("linhas essenciais por tipo", () => {
  it("flight: rota, período e horários", () => {
    const f = fields("flight", {
      origin_city: "São Paulo",
      destination_city: "Miami",
      segments: [
        { flight_date: "2026-08-17", departure_time: "22:10", arrival_time: "05:40" },
        { flight_date: "2026-08-22", departure_time: "10:00", arrival_time: "19:25" },
      ],
      main_airline: "LATAM",
      flight_status: "emitido",
    });
    expect(f.title).toBe("São Paulo → Miami");
    expect(f.details[0]).toBe("17 a 22 de agosto de 2026");
    expect(f.details[1]).toBe("Partida 22:10 · Chegada 19:25");
    expect(f.details).toHaveLength(3);
    expect(f.details[2]).toBe("LATAM");
  });
  it("flight legado usa departure_date/return_date", () => {
    const f = fields("flight", {
      origin_city: "Recife",
      destination_city: "Lisboa",
      departure_date: "2026-08-28",
      return_date: "2026-09-03",
    });
    expect(f.details[0]).toBe("28 de agosto a 3 de setembro de 2026");
  });
  it("car_rental: empresa/modelo, período e retirada → devolução", () => {
    const f = fields("car_rental", {
      rental_company: "Alamo",
      car_model: "Jeep Compass",
      pickup_date: "2026-08-17",
      dropoff_date: "2026-08-22",
      pickup_city: "Miami",
      dropoff_city: "Orlando",
      pickup_time: "10:00",
      dropoff_time: "16:30",
    });
    expect(f.title).toBe("Alamo · Jeep Compass");
    expect(f.details[0]).toBe("17 a 22 de agosto de 2026");
    expect(f.details[1]).toBe("Miami · 10:00 → Orlando · 16:30");
  });
  it("car_rental com mesma cidade não repete o local", () => {
    const f = fields("car_rental", {
      rental_company: "Localiza",
      pickup_city: "Salvador",
      dropoff_city: "Salvador",
      pickup_date: "2026-08-17",
      dropoff_date: "2026-08-19",
      pickup_time: "09:00",
      dropoff_time: "18:00",
    });
    expect(f.details[1]).toBe("Salvador · 09:00 → 18:00");
  });
  it("transfer: trajeto, data + horário e cidade só se agregar", () => {
    const f = fields("transfer", {
      origin_location: "Aeroporto MIA",
      destination_location: "Hilton Cabana",
      date: "2026-08-17",
      time: "14:45",
      city: "Miami",
      transfer_status: "confirmado",
    });
    expect(f.title).toBe("Aeroporto MIA → Hilton Cabana");
    expect(f.details).toEqual(["17 de agosto de 2026 · 14:45", "Miami"]);
    const same = fields("transfer", {
      origin_location: "Miami",
      destination_location: "Miami Beach",
      date: "2026-08-17",
      city: "Miami",
    });
    expect(same.details).toEqual(["17 de agosto de 2026"]);
  });
  it("attraction: data + horário e local, sem attraction_type como linha", () => {
    const f = fields("attraction", {
      name: "Magic Kingdom",
      attraction_type: "parque",
      date: "2026-08-19",
      entry_time: "09:00",
      city: "Orlando",
      state: "Flórida",
      venue_name: "Walt Disney World",
      status: "confirmado",
    });
    expect(f.title).toBe("Magic Kingdom");
    expect(f.details).toEqual([
      "19 de agosto de 2026 · 09:00",
      "Orlando, Flórida · Walt Disney World",
    ]);
    expect(JSON.stringify(f)).not.toContain("Parque");
  });
  it("insurance: plano/provedor, período e destino coberto", () => {
    const f = fields("insurance", {
      plan_name: "Premium 60",
      provider: "Assist Card",
      start_date: "2026-08-17",
      end_date: "2026-08-22",
      destination_covered: "Estados Unidos",
      coverage_type: "internacional",
      status: "ativo",
    });
    expect(f.title).toBe("Premium 60 · Assist Card");
    expect(f.details).toEqual(["17 a 22 de agosto de 2026", "Estados Unidos"]);
    expect(JSON.stringify(f)).not.toContain("Cobertura internacional");
  });
  it("cruise: navio, período e rota, sem cabin_type", () => {
    const f = fields("cruise", {
      ship_name: "MSC Seaside",
      cruise_company: "MSC",
      start_date: "2026-08-17",
      end_date: "2026-08-24",
      route: "Caribe Ocidental",
      cabin_type: "Balcony Deluxe",
      checkin_status: "pendente",
    });
    expect(f.title).toBe("MSC Seaside · MSC");
    expect(f.details).toEqual(["17 a 24 de agosto de 2026", "Caribe Ocidental"]);
    expect(JSON.stringify(f)).not.toContain("Balcony");
  });
  it("cruise sem route usa portos", () => {
    const f = fields("cruise", {
      ship_name: "Costa Diadema",
      start_date: "2026-08-17",
      end_date: "2026-08-24",
      embarkation_port: "Santos",
      disembarkation_port: "Buenos Aires",
    });
    expect(f.details[1]).toBe("Santos → Buenos Aires");
  });
  it("train: rota, data, horários", () => {
    const f = fields("train", {
      origin_city: "Paris",
      destination_city: "Amsterdã",
      travel_date: "2026-09-03",
      departure_time: "08:25",
      arrival_time: "11:47",
      origin_station: "Gare du Nord",
      destination_station: "Centraal",
    });
    expect(f.title).toBe("Paris → Amsterdã");
    expect(f.details).toEqual([
      "3 de setembro de 2026",
      "08:25 → 11:47",
      "Gare du Nord → Centraal",
    ]);
  });
  it("other: nome, data/hora e local", () => {
    const f = fields("other", {
      service_name: "Jantar no Ristorante",
      other_service_type: "restaurante",
      date: "2026-08-18",
      time: "20:00",
      city: "Miami",
      country: "Estados Unidos",
      status: "confirmado",
    });
    expect(f.title).toBe("Jantar no Ristorante");
    expect(f.details).toEqual(["18 de agosto de 2026 · 20:00", "Miami, Estados Unidos"]);
    expect(JSON.stringify(f)).not.toContain("Restaurante");
  });
  it("other sem cidade usa location_name", () => {
    const f = fields("other", { service_name: "Concierge", location_name: "Lobby do hotel" });
    expect(f.details).toEqual(["Lobby do hotel"]);
  });
});

describe("campos vazios não geram linhas vazias", () => {
  const types: TripServiceType[] = [
    "flight", "hotel", "car_rental", "transfer", "attraction",
    "insurance", "cruise", "train", "other",
  ];
  it("nenhum tipo produz detail vazio com service_data vazio", () => {
    for (const t of types) {
      const f = fields(t, {});
      expect(f.title.length).toBeGreaterThan(0);
      expect(f.details).toEqual([]);
    }
  });
  it("ignora strings em branco", () => {
    const f = fields("hotel", { hotel_name: "X", check_in: "   ", city: "  " });
    expect(f.details).toEqual([]);
  });
  it("no máximo 3 linhas essenciais", () => {
    for (const t of types) {
      const f = fields(t, {
        origin_city: "A", destination_city: "B", travel_date: "2026-08-17",
        departure_time: "08:00", arrival_time: "10:00", origin_station: "S1",
        destination_station: "S2", check_in: "2026-08-17", check_out: "2026-08-20",
        city: "C", state: "D", segments: [{ flight_date: "2026-08-17", departure_time: "01:00", arrival_time: "05:00" }],
        main_airline: "AA", start_date: "2026-08-17", end_date: "2026-08-20",
        route: "R", venue_name: "V", date: "2026-08-17", time: "10:00",
      });
      expect(f.details.length).toBeLessThanOrEqual(3);
    }
  });
});

// ─────────────────────────────────────────────────────────────
describe("anexos — fonte única e texto correto", () => {
  const dupService = svc("hotel", { hotel_name: "Hilton", check_in: "2026-08-17", check_out: "2026-08-22" }, {
    voucher_url: "https://x.supabase.co/storage/v1/object/sign/vouchers/u1/voucher.pdf?token=abc",
    voucher_name: "Voucher.pdf",
    attachments: [{ url: "https://x.supabase.co/storage/v1/object/public/vouchers/u1/voucher.pdf", name: "Voucher.pdf" }],
  } as any);

  it("mesma URL com assinaturas diferentes => 1 documento", () => {
    expect(collectServiceDocuments(dupService)).toHaveLength(1);
    expect(countServiceFiles(dupService)).toBe(1);
    expect(formatFilesCountLabel(countServiceFiles(dupService))).toBe("1 arquivo");
  });

  it("caminho relativo com prefixo do bucket == URL assinada absoluta => 1 arquivo", () => {
    const mixed = svc("hotel", { hotel_name: "Hilton" }, {
      voucher_url: "vouchers/u1/voucher.pdf",
      attachments: [
        {
          url: "https://x.supabase.co/storage/v1/object/sign/vouchers/u1/voucher.pdf?token=abc",
          name: "Voucher.pdf",
        },
      ],
    } as any);
    expect(collectServiceDocuments(mixed)).toHaveLength(1);
    expect(formatFilesCountLabel(countServiceFiles(mixed))).toBe("1 arquivo");
  });

  it("dois caminhos distintos => 2 arquivos", () => {
    const two = svc("hotel", { hotel_name: "Hilton" }, {
      voucher_url: "vouchers/u1/voucher.pdf",
      attachments: [{ url: "vouchers/u1/passagens.pdf", name: "Passagens" }],
    } as any);
    expect(countServiceFiles(two)).toBe(2);
    expect(formatFilesCountLabel(countServiceFiles(two))).toBe("2 arquivos");
  });

  it("zero => contador oculto", () => {
    expect(formatFilesCountLabel(0)).toBeNull();
    expect(countServiceFiles(svc("hotel", { hotel_name: "H" }))).toBe(0);
  });

  it("contador compacto usa a mesma quantidade de collectServiceDocuments", () => {
    render(
      <CategoryServiceView
        type="hotel"
        services={[dupService, svc("hotel", { hotel_name: "Outro" }, { id: "hotel-2" })]}
        renderFullCard={(s) => <div data-testid={`full-${s.id}`}>expandido</div>}
      />,
    );
    expect(screen.getByText("1 arquivo")).toBeInTheDocument();
    expect(screen.queryByText("2 arquivos")).not.toBeInTheDocument();
    expect(collectServiceDocuments(dupService)).toHaveLength(1);
  });

  it("clique no contador expande e mantém a âncora dos documentos", () => {
    render(
      <CategoryServiceView
        type="hotel"
        services={[dupService, svc("hotel", { hotel_name: "Outro" }, { id: "hotel-2" })]}
        renderFullCard={(s) => <div data-testid={`full-${s.id}`}>expandido</div>}
      />,
    );
    expect(screen.queryByTestId("full-hotel-1")).not.toBeInTheDocument();
    fireEvent.click(screen.getByLabelText(/possui 1 arquivo/i));
    expect(screen.getByTestId("full-hotel-1")).toBeInTheDocument();
  });

  it("aria-label usa arquivo/arquivos, não documento", () => {
    render(
      <CategoryServiceView
        type="hotel"
        services={[dupService, svc("hotel", { hotel_name: "Outro" }, { id: "hotel-2" })]}
        renderFullCard={() => <div />}
      />,
    );
    const pill = screen.getByLabelText(/possui 1 arquivo/i);
    expect(pill.getAttribute("aria-label")).not.toContain("documento");
  });

  it("hasAdditionalDetails considera arquivos e os novos campos compactos", () => {
    expect(hasAdditionalDetails(dupService)).toBe(true);
    const onlyCompact = svc("hotel", { hotel_name: "Hilton", check_in: "2026-08-17", check_out: "2026-08-22" });
    expect(hasAdditionalDetails(onlyCompact)).toBe(false);
    const withExtra = svc("hotel", { hotel_name: "Hilton", reservation_code: "ABC123" });
    expect(hasAdditionalDetails(withExtra)).toBe(true);
  });
});

describe("card recolhido — layout e conteúdo", () => {
  it("renderiza título, período e local sem truncar", () => {
    const services = [1, 2].map((i) =>
      svc("hotel", {
        hotel_name: `Hotel ${i}`,
        check_in: "2026-08-17",
        check_out: "2026-08-22",
        city: "Miami Beach",
        state: "Flórida",
        room_type: "standard",
      }, { id: `hotel-${i}` }),
    );
    const { container } = render(
      <CategoryServiceView type="hotel" services={services} renderFullCard={() => <div />} />,
    );
    expect(screen.getAllByText("17 a 22 de agosto de 2026")).toHaveLength(2);
    expect(screen.getAllByText("Miami Beach, Flórida")).toHaveLength(2);
    expect(screen.queryByText(/Standard/i)).not.toBeInTheDocument();
    expect(container.querySelectorAll("p.truncate")).toHaveLength(0);
  });
});
