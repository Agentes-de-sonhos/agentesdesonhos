import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { PublicFlightCard } from "@/components/wallet/PublicFlightCard";
import type { TripService } from "@/types/trip";
vi.mock("@/hooks/useSecureDocument", () => ({ useSecureDocument: () => ({ open: false, loading: false, downloading: false, error: null, doc: null, openDocument: vi.fn(), download: vi.fn(), close: vi.fn() }) }));
vi.mock("@/components/trip/FlightStatusBadge", () => ({ FlightStatusBadge: () => null }));
vi.mock("@/components/quote/ServiceImageCarousel", () => ({ ServiceImageCarousel: () => null }));
const mk = (arrival_date?: string) => ({ id: "f", service_type: "flight", image_urls: [], attachments: [], service_data: { segments: [{ origin_airport: "BOG", destination_airport: "CTG", flight_date: "2026-11-23", arrival_date, departure_time: "22:55", arrival_time: "00:25", flight_number: "AV-9758", airline: "Avianca", segment_type: "ida" }] } }) as unknown as TripService;
const access = { mode: "public" as const, shareToken: "t", slug: "s", password: "p" };
describe("data de chegada na passagem pública", () => {
  it("mostra a chegada quando é outro dia", () => {
    render(<PublicFlightCard service={mk("2026-11-24")} access={access} />);
    expect(screen.getByTestId("flight-next-day-header")).toHaveTextContent("Chegada · 24/11/2026");
  });
  it("não mostra chegada no mesmo dia", () => {
    render(<PublicFlightCard service={mk("2026-11-23")} access={access} />);
    expect(screen.queryByTestId("flight-next-day-header")).toBeNull();
  });
});
