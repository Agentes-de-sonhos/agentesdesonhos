import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { fireEvent, render, screen, within } from "@testing-library/react";
import { HelmetProvider } from "react-helmet-async";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it, vi } from "vitest";
import { CURTI_VIAGENS_PREVIEW_INFO } from "@/lib/adsBriefingPreview";
import { ITALIA_EM_TREM } from "@/lib/circuits/italiaEmTrem";
import { LESTE_EUROPEU_PREMIUM_2027 } from "@/lib/circuits/lesteEuropeuPremium2027";
import { CircuitTourView } from "@/pages/whitelabel/CircuitTourPage";

vi.mock("@/hooks/useAgencySiteRequest", () => {
  const request = { state: "idle", error: null, submit: vi.fn(), reset: vi.fn() };
  return { useAgencySiteRequest: () => request };
});

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
    expect(page.querySelectorAll(".circuit-note.circuit-inclusion")).toHaveLength(6);
    expect([...page.querySelectorAll(".circuit-timeline-prefix")].map(el => el.textContent)).toEqual(Array(12).fill("Dia"));
    expect([...page.querySelectorAll(".circuit-timeline-number")].map(el => el.textContent)).toEqual(Array.from({ length: 12 }, (_, i) => String(i + 1)));
    expect(page.querySelectorAll(".circuit-calendar-month")).toHaveLength(7);
    const monthGrids = [...page.querySelectorAll(".circuit-calendar-grid")];
    expect(monthGrids.map(grid => grid.querySelectorAll(".circuit-calendar-day").length)).toEqual([30, 31, 30, 31, 31, 30, 31]);
    expect(screen.getByRole("button", { name: "Solicitar orçamento: 1 de Abril 2027" })).toHaveClass("circuit-calendar-day");
    expect(screen.getByRole("button", { name: "Ampliar mapa do roteiro" })).toBeVisible();
  });

  it("mostra os sete meses e abre o orçamento da Curti com a data escolhida", () => {
    const { container } = renderCircuit();
    const months = [...container.querySelectorAll(".circuit-calendar-month")];
    expect(months.map(month => month.querySelector("p")?.textContent)).toEqual(["Abril 2027", "Maio 2027", "Junho 2027", "Julho 2027", "Agosto 2027", "Setembro 2027", "Outubro 2027"]);
    expect(screen.getByText("Curti Viagens.", { exact: true })).toHaveClass("whitespace-nowrap");
    fireEvent.click(screen.getByRole("button", { name: "Solicitar orçamento: 12 de Julho 2027" }));
    const dialog = screen.getByRole("dialog", { name: "Solicitar orçamento" });
    expect(dialog).toHaveClass("circuit-curti-quote");
    expect(within(dialog).getByText("Saída selecionada: 12 de Julho 2027")).toBeVisible();
    expect(within(dialog).getByRole("button", { name: "Solicitar orçamento" })).toHaveClass("circuit-quote-action");
  });

  it("mostra a xícara de café somente nos dias previstos no PDF, a partir do dia 2", () => {
    renderCircuit();
    const arrival = screen.getByRole("article", { name: "Dia 1" });
    expect(within(arrival).queryByText("Café da manhã")).toBeNull();
    for (let day = 2; day <= 12; day++) {
      const card = screen.getByRole("article", { name: `Dia ${day}` });
      const meal = within(card).getByText("Café da manhã");
      expect(meal).toHaveClass("circuit-timeline-meals");
      expect(meal.querySelector("svg")).toHaveClass("lucide-coffee");
    }
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

  it("mostra entrada de 30%, nove parcelas sobre o saldo e total por pessoa", () => {
    renderCircuit();
    const price = within(screen.getByText("A partir de").closest("aside")!);
    expect(price.getByText("9x de")).toBeVisible();
    expect(price.getByText(/R\$\s*2\.525,26/)).toBeVisible();
    expect(price.getByText(/entrada de R\$\s*9\.740,30 \(30%\)/)).toBeVisible();
    expect(price.getByText(/Total: R\$\s*32\.467,66 por pessoa em acomodação dupla/)).toBeVisible();
    expect(price.getByText("Câmbio 27/11/2026: € 1 = R$ 6,5724")).toBeVisible();
    expect(price.getByText(/Valor original: €\s*4\.940,00/)).toBeVisible();
    expect(price.getByText(/IOF não incluído.*Preço e disponibilidade sujeitos à confirmação na reserva/)).toBeVisible();
    expect(price.queryByText(/Cotação de|última parcela|individual a partir|confirmação da operadora no fechamento/i)).toBeNull();
    expect(price.getByRole("button", { name: "Solicitar orçamento", exact: true })).toHaveClass("circuit-price-quote");
  });

  it("não aplica as cores da Curti à IMM", () => {
    const { container } = renderCircuit(LESTE_EUROPEU_PREMIUM_2027, "immturismo.com.br");
    expect(container.querySelector(".circuit-curti-italia-trem")).toBeNull();
    expect(container.querySelector(".circuit-calendar-grid")).toBeNull();
    expect(container.querySelector(".circuit-note")).toBeNull();
  });
});
