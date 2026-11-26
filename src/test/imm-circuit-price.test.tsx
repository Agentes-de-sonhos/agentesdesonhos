import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter } from "react-router-dom";
import { HelmetProvider } from "react-helmet-async";
import { render, screen, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { CircuitTourView } from "@/pages/whitelabel/CircuitTourPage";
import { LESTE_EUROPEU_PREMIUM_2027 as circuit } from "@/lib/circuits/lesteEuropeuPremium2027";
import { KARIBU_PREVIEW_INFO } from "@/lib/adsBriefingPreview";

vi.mock("@/components/whitelabel/CircuitQuoteDialog", () => ({ CircuitQuoteDialog: () => null }));
vi.mock("@/components/whitelabel/CircuitRouteMap", () => ({ CircuitRouteMap: () => null }));

function renderCircuit(withQuote = true) {
  const info = { ...KARIBU_PREVIEW_INFO, hostname: "immturismo.com.br", agency_name:"IMM Viagens" };
  const client = new QueryClient({ defaultOptions: { queries: { retry: false, staleTime: Infinity, enabled: false } } });
  if (withQuote) client.setQueryData(["circuit-fx","EUR","BRL"],{rate:6.4438,date:"2026-11-26"});
  render(<HelmetProvider><QueryClientProvider client={client}><MemoryRouter><CircuitTourView info={info} circuit={circuit} /></MemoryRouter></QueryClientProvider></HelmetProvider>);
}

describe("IMM estimates and Brazilian departure legend", () => {
  it("shows installments, total, original euro value, rate date, and one individual supplement", () => {
    renderCircuit();
    const panel = screen.getByText("A partir de").closest("aside")!;
    expect(within(panel).getByText("10x de")).not.toBeNull();
    expect(panel.textContent).toMatch(/Total em reais: R\$\s*[\d.,]+/);
    expect(panel.textContent).toMatch(/Valor original: €\s*2\.590,00/);
    expect(panel.textContent).toContain("Cotação de 26/11/2026");
    expect((panel.textContent?.match(/Suplemento individual/g) ?? []).length).toBe(1);
    expect(panel.textContent?.toLowerCase()).not.toContain("quarto triplo");
    expect(panel.textContent).toContain("Conversão em reais é apenas referência");
  });
  it("does not show fabricated reais or installments if the reference rate is missing", () => {
    renderCircuit(false);
    const panel = screen.getByText("A partir de").closest("aside")!;
    expect(within(panel).queryByText("10x de")).toBeNull();
    expect(panel.textContent).toMatch(/€\s*2\.590,00/);
    expect(panel.textContent).not.toContain("Total em reais");
  });
  it("uses the same top-right flag in the legend and guide departure", () => {
    renderCircuit();
    const legend = screen.getByText("Datas destacadas").closest("p")!;
    const date = screen.getAllByRole("button", { name:/Solicitar orçamento:.*guia brasileiro/ })[0];
    for (const parent of [legend,date]) {
      const flag = parent.querySelector("span.absolute.-right-2.-top-2 svg");
      expect(flag?.getAttribute("viewBox")).toBe("0 0 20 14");
    }
  });
});
