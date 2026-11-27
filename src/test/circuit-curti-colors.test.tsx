import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen } from "@testing-library/react";
import { HelmetProvider } from "react-helmet-async";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it, vi } from "vitest";
import { CURTI_VIAGENS_PREVIEW_INFO } from "@/lib/adsBriefingPreview";
import { ITALIA_EM_TREM } from "@/lib/circuits/italiaEmTrem";
import { LESTE_EUROPEU_PREMIUM_2027 } from "@/lib/circuits/lesteEuropeuPremium2027";
import { CircuitTourView } from "@/pages/whitelabel/CircuitTourPage";

vi.mock("@/components/whitelabel/CircuitQuoteDialog", () => ({ CircuitQuoteDialog: () => null }));

function renderCircuit(circuit = ITALIA_EM_TREM, hostname = "curtiviagens.com.br") {
  const client = new QueryClient();
  client.setQueryData(["circuit-fx", "EUR", "BRL"], { rate: 6.4, date: "2026-11-27" });
  return render(<HelmetProvider><QueryClientProvider client={client}><MemoryRouter>
    <CircuitTourView circuit={circuit} info={{ ...CURTI_VIAGENS_PREVIEW_INFO, hostname }} />
  </MemoryRouter></QueryClientProvider></HelmetProvider>);
}

describe("Identidade visual de Itália em Trem", () => {
  it("aplica a identidade aos chapéus, serviços, destaques, doze dias e calendário", () => {
    const { container } = renderCircuit();
    const page = container.querySelector(".circuit-curti-italia-trem")!;
    expect(page.querySelectorAll(".circuit-eyebrow")).toHaveLength(8);
    expect(page.querySelectorAll(".circuit-inclusion-icon svg")).toHaveLength(7);
    expect(page.querySelectorAll(".circuit-highlight svg")).toHaveLength(6);
    expect([...page.querySelectorAll(".circuit-timeline-number")].map(el => el.textContent)).toEqual(Array.from({ length: 12 }, (_, i) => String(i + 1)));
    expect(page.querySelectorAll(".circuit-calendar-month")).toHaveLength(7);
    expect(screen.getByRole("button", { name: "Solicitar orçamento: 1 de Abril 2027" })).toHaveClass("circuit-calendar-day");
    expect(screen.getByRole("button", { name: "Ampliar mapa do roteiro" })).toBeVisible();
  });

  it("não aplica as cores da Curti à IMM", () => {
    const { container } = renderCircuit(LESTE_EUROPEU_PREMIUM_2027, "immturismo.com.br");
    expect(container.querySelector(".circuit-curti-italia-trem")).toBeNull();
  });
});
