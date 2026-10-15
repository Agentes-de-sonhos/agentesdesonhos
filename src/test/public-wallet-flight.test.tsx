import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, cleanup, waitFor } from "@testing-library/react";
import { PublicFlightCard } from "@/components/wallet/PublicFlightCard";
import { publicFlightRoute, publicFlightSegments } from "@/lib/publicWalletFlight";
import type { TripService } from "@/types/trip";

const openDocument = vi.fn();
const download = vi.fn(async () => {});
vi.mock("@/hooks/useSecureDocument", () => ({ useSecureDocument: () => ({ open: false, loading: false, downloading: false, error: null, doc: null, openDocument, download, close: vi.fn() }) }));
vi.mock("@/components/trip/FlightStatusBadge", () => ({ FlightStatusBadge: () => null }));
vi.mock("@/components/quote/ServiceImageCarousel", () => ({ ServiceImageCarousel: () => null }));

const service = {
  id: "flight-test", service_type: "flight", image_urls: [], attachments: [{ url: "owner/flight.pdf", name: "Passagem.pdf" }, { url: "owner/photo.jpg", name: "Foto.jpg" }],
  service_data: {
    origin_city: "São Paulo", destination_city: "São Paulo", trip_type: "ida_volta", locator_code: "ABC123", flight_status: "emitido",
    segments: [
      { origin_airport: "GRU", origin_city: "São Paulo", destination_airport: "MVD", destination_city: "Montevidéu", flight_date: "2026-10-21", departure_time: "13:15", arrival_time: "16:00", flight_number: "763", airline: "LATAM", segment_type: "ida", terminal: "3", gate: "42" },
      { origin_airport: "MVD", origin_city: "Montevidéu", destination_airport: "GRU", destination_city: "São Paulo", flight_date: "2026-10-29", segment_type: "volta" },
    ],
    passengers: [{ name: "Passageiro Teste", seat: "12A (GRU→MVD), 14B (MVD→GRU)", document: "957123", notes: "Fidelidade: cadastrada", passenger_type: "adulto" }],
    boarding_terminal: "Terminal cadastrado", immigration_rules: "Regra cadastrada", baggage_notes: "Regra individual cadastrada", checkin_notes: "Check-in cadastrado",
  },
} as unknown as TripService;
const access = { mode: "public" as const, shareToken: "test-token", slug: "test-trip", password: "test-password" };
beforeEach(() => { cleanup(); vi.clearAllMocks(); });

describe("Passagens públicas — apresentação e dados reais", () => {
  it("evita origem→origem na volta e preserva todos os trechos", () => {
    render(<PublicFlightCard service={service} access={access} />);
    expect(screen.getByRole("heading", { name: "São Paulo ⇄ Montevidéu" })).toBeInTheDocument();
    expect(screen.getByRole("region", { name: "Voo 1" })).toHaveTextContent("13:15");
    expect(screen.getByRole("region", { name: "Voo 2" })).toHaveTextContent("29/10/2026");
    expect(screen.getByText("Emitido")).toBeInTheDocument();
    expect(screen.queryByText(/Duração/)).not.toBeInTheDocument();
  });
  it("copia exatamente o localizador e mostra feedback acessível", async () => {
    const writeText = vi.fn(async () => {});
    Object.defineProperty(navigator, "clipboard", { configurable: true, value: { writeText } });
    render(<PublicFlightCard service={service} access={access} />);
    fireEvent.click(screen.getByRole("button", { name: "Copiar localizador" }));
    await waitFor(() => expect(writeText).toHaveBeenCalledWith("ABC123"));
    expect(screen.getByRole("status")).toHaveTextContent("Localizador copiado");
  });
  it("mantém selo junto ao título e trajeto flexível preenchido em ida e volta", () => {
    render(<PublicFlightCard service={service} access={access} />);
    const title = screen.getByRole("heading", { name: "São Paulo ⇄ Montevidéu" });
    expect(title).toHaveClass("min-w-0", "flex-1");
    expect(title.parentElement).toContainElement(screen.getByText("Emitido"));
    expect(screen.getByText("Emitido")).toHaveClass("shrink-0");
    const tracks = screen.getAllByTestId("flight-route-track");
    expect(tracks).toHaveLength(2);
    for (const track of tracks) {
      expect(track).toHaveClass("w-full", "min-w-0");
      expect(track.parentElement).toHaveClass("grid-cols-[auto_minmax(0,1fr)_auto]");
      expect(track.querySelector("svg")).toHaveClass("fill-current", "text-primary");
      expect(track.querySelectorAll(".rounded-full")).toHaveLength(2);
      expect(track.querySelectorAll(".border-dashed")).toHaveLength(2);
    }
  });
  it("orientações começam fechadas, incluindo campos isolados", () => {
    render(<PublicFlightCard service={service} access={access} />);
    const trigger = screen.getByRole("button", { name: "Orientações de embarque" });
    expect(trigger).toHaveAttribute("aria-expanded", "false");
    expect(screen.queryByText("Regra cadastrada")).not.toBeInTheDocument();
    fireEvent.click(trigger);
    expect(screen.getByText("Terminal cadastrado")).toBeVisible();
    expect(screen.getByText("Regra cadastrada")).toBeVisible();
  });
  it("mantém bilhete, assentos por trecho, notas e bagagens sem inventar franquia", () => {
    render(<PublicFlightCard service={service} access={access} />);
    expect(screen.getByText(/12A \(GRU→MVD\), 14B/)).toBeInTheDocument();
    expect(screen.getByText(/Nº do bilhete: 957123/)).toBeInTheDocument();
    expect(screen.getAllByText("não informado")).toHaveLength(2);
    expect(screen.getByText("Regra individual cadastrada")).toBeInTheDocument();
    expect(screen.getByText("Check-in cadastrado")).toBeInTheDocument();
  });
  it("PDF e demais anexos usam a mesma fonte segura com credenciais de acesso", () => {
    render(<PublicFlightCard service={service} access={access} />);
    expect(screen.getByText("Abrir passagem em PDF")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Abrir arquivo Passagem.pdf" }));
    expect(openDocument).toHaveBeenCalledWith({ filePath: "owner/flight.pdf", fileName: "Passagem.pdf", ...access });
    fireEvent.click(screen.getByRole("button", { name: "Baixar arquivo Passagem.pdf" }));
    expect(download).toHaveBeenCalledWith(expect.objectContaining({ filePath: "owner/flight.pdf" }));
    fireEvent.click(screen.getByRole("button", { name: "Abrir arquivo Foto.jpg" }));
    expect(openDocument).toHaveBeenLastCalledWith(expect.objectContaining({ filePath: "owner/photo.jpg" }));
  });
  it("traduz a apresentação sem traduzir conteúdo do agente", () => {
    render(<PublicFlightCard service={service} access={access} locale="it-IT" />);
    expect(screen.getByRole("button", { name: "Copia codice di prenotazione" })).toBeInTheDocument();
    expect(screen.getByText("Apri biglietto in PDF")).toBeInTheDocument();
    expect(screen.getByText("Passageiro Teste")).toBeInTheDocument();
  });
  it("campos ausentes não inventam emissão, passageiros ou arquivos", () => {
    render(<PublicFlightCard service={{ ...service, attachments: [], service_data: {} } as TripService} access={access} />);
    expect(screen.queryByText("Emitido")).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /Copiar/ })).not.toBeInTheDocument();
    expect(screen.queryByText("Documentos da viagem")).not.toBeInTheDocument();
  });
  it("suporta ida única legada sem criar uma volta", () => {
    const data = { origin_city: "Origem", destination_city: "Destino", departure_date: "2026-10-21", return_date: "2026-10-21", trip_type: "ida" as const };
    expect(publicFlightSegments(data)).toHaveLength(1);
    expect(publicFlightRoute(data).roundTrip).toBe(false);
  });
  it("preserva conexões e usa destino do último trecho de ida", () => {
    const data = { trip_type: "ida_volta" as const, segments: [
      { origin_airport: "AAA", origin_city: "Origem", destination_airport: "BBB", destination_city: "Conexão", segment_type: "ida" },
      { origin_airport: "BBB", destination_airport: "CCC", destination_city: "Destino", segment_type: "conexao" },
      { origin_airport: "CCC", destination_airport: "AAA", destination_city: "Origem", segment_type: "volta" },
    ] } as Parameters<typeof publicFlightRoute>[0];
    expect(publicFlightRoute(data).destination).toBe("Destino");
    expect(publicFlightSegments(data)).toHaveLength(3);
  });
});