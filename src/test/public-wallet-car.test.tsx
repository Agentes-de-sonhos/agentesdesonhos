import { describe, expect, it, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { PublicCarRentalCard, carTransmissionLabel } from "@/components/wallet/PublicCarRentalCard";

const svc = (data: any) => ({ id: "c1", service_type: "car_rental", service_data: data, attachments: [] }) as any;
const renderCard = (data: any) => render(<QueryClientProvider client={new QueryClient()}><PublicCarRentalCard service={svc(data)} access={{ mode: "public" }} /></QueryClientProvider>);

describe("locação pública", () => {
  it("rótulo de transmissão seguro", () => {
    expect(carTransmissionLabel("automatico")).toBe("Automático");
    expect(carTransmissionLabel("manual", "it-IT")).toBe("Manuale");
    expect(carTransmissionLabel('t("x")+')).toBeNull();
    expect(carTransmissionLabel(undefined)).toBeNull();
  });

  it("mostra dados reais, status à direita, dias e sem inventar franquia", () => {
    renderCard({ car_model: "Onix", rental_company: "Movida", reservation_status: "confirmada", transmission: "automatico", passenger_capacity: "5", pickup_date: "2026-10-21", dropoff_date: "2026-10-29", pickup_time: "16:45", reservation_code: "ABC1", drivers: [{ name: "Ana" }] });
    expect(screen.getByText("Onix ou similar")).toBeInTheDocument();
    expect(screen.getByText("Confirmada")).toBeInTheDocument();
    expect(screen.getByText("8 dias")).toBeInTheDocument();
    expect(screen.getByText("5 passageiros")).toBeInTheDocument();
    expect(screen.getByText("16:45")).toBeInTheDocument();
    expect(screen.queryByText(/Sem franquia/)).toBeNull();
    expect(screen.queryByText("Condutor principal")).toBeNull();
    expect(document.body.textContent).not.toContain('t("');
  });

  it("copia a reserva e accordion começa fechado preservando texto", async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.assign(navigator, { clipboard: { writeText } });
    renderCard({ reservation_code: "R99", pickup_instructions: "Balcão no térreo", notes: "Nota livre" });
    fireEvent.click(screen.getByLabelText("Copiar número da reserva"));
    expect(writeText).toHaveBeenCalledWith("R99");
    expect(screen.queryByText("Nota livre")).toBeNull();
    fireEvent.click(screen.getByText("Orientações para retirada"));
    expect(screen.getByText("Nota livre")).toBeInTheDocument();
    expect(screen.getByText("Balcão no térreo")).toBeInTheDocument();
  });
});
