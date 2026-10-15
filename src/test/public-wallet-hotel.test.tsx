import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, cleanup, waitFor } from "@testing-library/react";
import { PublicHotelCard, hotelDate, hotelNights } from "@/components/wallet/PublicHotelCard";
import type { TripService } from "@/types/trip";

const openDocument = vi.fn(), download = vi.fn(async () => {});
vi.mock("@/hooks/useSecureDocument", () => ({ useSecureDocument: () => ({ open: false, loading: false, downloading: false, error: null, doc: null, openDocument, download, close: vi.fn() }) }));
vi.mock("@/components/quote/ServiceImageCarousel", () => ({ ServiceImageCarousel: (props: any) => <div data-testid="gallery" data-panoramic={props.panoramic}>{props.viewPhotosLabel}</div> }));
vi.mock("@/components/shared/PlaceMapCard", () => ({ PlaceMapCard: () => <div data-testid="map" /> }));
const service = { id: "hotel-test", service_type: "hotel", image_urls: ["https://example.test/photo.jpg"], attachments: [{ url: "owner/voucher.pdf", name: "Reserva.pdf" }, { url: "owner/image.jpg", name: "Imagem.jpg" }], service_data: { hotel_name: "Hotel de teste", reservation_status: "emitida", reservation_code: "RES-TEST", locator_code: "LOC-TEST", check_in: "2026-10-23", check_out: "2026-10-25", checkin_time: "15:00", guest_count: "2", room_type: "suite", meal_plan: "somente_hospedagem", city: "Cidade cadastrada", address: "Endereço cadastrado", hotel_phone: "+55 (11) 99999-9999", hotel_website: "https://example.test", notes: "Observação livre completa", agency_notes: "Observação livre completa", cancellation_policy: "Política cadastrada", special_requests: "Pedido cadastrado" } } as unknown as TripService;
const access = { mode: "public" as const, slug: "test", shareToken: "test-token", password: "test-password" };
beforeEach(() => { cleanup(); vi.clearAllMocks(); });
describe("Hospedagem pública", () => {
  it("usa datas locais válidas e somente noites calculáveis", () => {
    expect(hotelNights("2026-10-23", "2026-10-25")).toBe(2);
    expect(hotelNights("2026-10-25", "2026-10-23")).toBeNull();
    expect(hotelNights("2026-10-23", undefined)).toBeNull();
    expect(hotelDate("2026-02-31")).toBeNull();
    expect(hotelDate("2026-10-23")?.getDate()).toBe(23);
  });
  it("renderiza status à direita, galeria e acomodação sem inferir inclusão", () => {
    render(<PublicHotelCard service={service} access={access} />);
    expect(screen.getByText("Hotel de teste").parentElement).toContainElement(screen.getByText("Emitido"));
    expect(screen.getByTestId("gallery")).toHaveAttribute("data-panoramic", "true");
    expect(screen.getByText("2 noites")).toBeVisible();
    expect(screen.getByText("15:00")).toBeVisible();
    expect(screen.getByText("Somente Hospedagem")).toBeVisible();
    expect(screen.queryByText("Café da manhã incluído")).not.toBeInTheDocument();
  });
  it("copia reserva e localizador separadamente", async () => {
    const writeText = vi.fn(async () => {});
    Object.defineProperty(navigator, "clipboard", { configurable: true, value: { writeText } });
    render(<PublicHotelCard service={service} access={access} />);
    fireEvent.click(screen.getByRole("button", { name: "Copiar Número da reserva" }));
    await waitFor(() => expect(writeText).toHaveBeenCalledWith("RES-TEST"));
    fireEvent.click(screen.getByRole("button", { name: "Copiar Localizador" }));
    await waitFor(() => expect(writeText).toHaveBeenCalledWith("LOC-TEST"));
  });
  it("preserva texto livre e políticas no accordion, sem duplicações exatas", () => {
    render(<PublicHotelCard service={service} access={access} />);
    const button = screen.getByRole("button", { name: "Informações da reserva" });
    expect(button).toHaveAttribute("aria-expanded", "false");
    fireEvent.click(button);
    expect(screen.getAllByText("Observação livre completa")).toHaveLength(1);
    expect(screen.getByText("Política cadastrada")).toBeVisible();
    expect(screen.getByText("Pedido cadastrado")).toBeVisible();
  });
  it("mantém contatos condicionais e fontes seguras de todos os anexos", () => {
    render(<PublicHotelCard service={service} access={access} />);
    expect(screen.getByRole("link", { name: "Ligar para o hotel" })).toHaveAttribute("href", "tel:+5511999999999");
    expect(screen.getByRole("link", { name: "Como chegar" }).getAttribute("href")).toContain("maps/dir");
    fireEvent.click(screen.getByRole("button", { name: "Abrir arquivo Reserva.pdf" }));
    expect(openDocument).toHaveBeenCalledWith({ filePath: "owner/voucher.pdf", fileName: "Reserva.pdf", ...access });
    fireEvent.click(screen.getByRole("button", { name: "Baixar arquivo Imagem.jpg" }));
    expect(download).toHaveBeenCalledWith(expect.objectContaining({ filePath: "owner/image.jpg" }));
  });
  it("não cria blocos, status, refeições, datas, fotos ou documentos ausentes", () => {
    render(<PublicHotelCard service={{ ...service, image_urls: [], attachments: [], service_data: {} } as TripService} access={access} />);
    expect(screen.getByTestId("public-hotel-card")).toBeEmptyDOMElement();
  });
  it("traduz rótulos sem alterar conteúdo livre", () => {
    render(<PublicHotelCard service={service} access={access} locale="it-IT" />);
    expect(screen.getByText("Il tuo alloggio")).toBeVisible();
    expect(screen.getByText("2 notti")).toBeVisible();
    expect(screen.getByText("Hotel de teste")).toBeVisible();
  });
});