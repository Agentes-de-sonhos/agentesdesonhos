import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, within } from "@testing-library/react";
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
  client.setQueryData(["circuit-fx", "EUR", "BRL"], { rate: 6.3196, date: "2026-11-27" });
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
    expect([...page.querySelectorAll(".circuit-timeline-prefix")].map(el => el.textContent)).toEqual(Array(12).fill("Dia"));
    expect([...page.querySelectorAll(".circuit-timeline-number")].map(el => el.textContent)).toEqual(Array.from({ length: 12 }, (_, i) => String(i + 1)));
    expect(page.querySelectorAll(".circuit-calendar-month")).toHaveLength(7);
    expect(screen.getByRole("button", { name: "Solicitar orçamento: 1 de Abril 2027" })).toHaveClass("circuit-calendar-day");
    expect(screen.getByRole("button", { name: "Ampliar mapa do roteiro" })).toBeVisible();
  });

  it("usa as capas responsivas da Costa Amalfitana somente na página da Curti", () => {
    renderCircuit();
    const hero = screen.getByRole("img", { name: /Costa Amalfitana/ });
    expect(hero).toHaveAttribute("src", "/roteiros/curti/curti-italia-em-trem-capa.webp");
    expect(hero).toHaveAttribute("width", "1920");
    expect(hero).toHaveAttribute("height", "905");
    const mobile = hero.closest("picture")?.querySelector("source");
    expect(mobile).toHaveAttribute("media", "(max-width: 639px)");
    expect(mobile).toHaveAttribute("srcset", "/roteiros/curti/curti-italia-em-trem-capa-mobile.webp");
    expect(screen.queryByText(/não integra este roteiro/i)).toBeNull();
  });

  it("mostra dez parcelas de referência calculadas sobre o câmbio do dia", () => {
    renderCircuit();
    const price = within(screen.getByText("A partir de").closest("aside")!);
    expect(price.getByText("10x de")).toBeVisible();
    expect(price.getByText(/R\$\s*3\.246,77/)).toBeVisible();
    expect(price.getByText(/Total em reais: R\$\s*32\.467,66/)).toBeVisible();
    expect(price.getByText("Cotação de 27/11/2026")).toBeVisible();
    expect(price.getByRole("button", { name: "Solicitar orçamento", exact: true })).toHaveClass("circuit-price-quote");
  });

  it("não aplica as cores da Curti à IMM", () => {
    const { container } = renderCircuit(LESTE_EUROPEU_PREMIUM_2027, "immturismo.com.br");
    expect(container.querySelector(".circuit-curti-italia-trem")).toBeNull();
  });
});
