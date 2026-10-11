import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { HelmetProvider } from "react-helmet-async";
import { MemoryRouter } from "react-router-dom";

vi.mock("@/hooks/useUsVisaPublicInfo", () => ({
  useUsVisaPublicInfo: () => ({
    isLoading: false,
    data: {
      key: "b1_b2_brazil", mrv_fee_usd: 185, additional_fees: null,
      interview_wait_times: { Brasilia: { months: 1, qualifier: "approximately", display_pt: "1 mês" } },
      fees_source_url: null, wait_times_source_url: null, fees_source_updated_at: null,
      wait_times_source_updated_at: "2026-09-17", checked_at: "2026-10-08T18:09:40Z", updated_at: null,
    },
  }),
}));

import UsVisaLandingPage from "@/pages/whitelabel/UsVisaLandingPage";

describe("landing visto americano 100 Limites", () => {
  it("mostra dados da base, indisponível sem dado e CTA do WhatsApp da agência", () => {
    render(<MemoryRouter><HelmetProvider><UsVisaLandingPage info={{ hostname: "100limites.tur.br", phone: "(11) 98888-7777" } as any} /></HelmetProvider></MemoryRouter>);
    expect(screen.getByRole("heading", { level: 1 }).textContent).toBe("Visto americano com orientação em cada etapa");
    expect(screen.getByText("US$ 185")).toBeTruthy();
    expect(screen.getByText("1 mês")).toBeTruthy();
    expect(screen.getAllByText("Indisponível").length).toBe(4);
    expect(screen.getByText(/17\/09\/2026/)).toBeTruthy();
    const ctas = screen.getAllByRole("link", { name: /Falar com a Amanda/ });
    expect(ctas).toHaveLength(1);
    expect(ctas[0].getAttribute("href")).toContain("wa.me/5511988887777");
    expect(document.body.textContent).not.toMatch(/Sem Limites/);
  });
  it("abre o pop-up de proposta pelo botão amarelo do topo e pelo do card de assessoria", async () => {
    render(<MemoryRouter><HelmetProvider><UsVisaLandingPage info={{ hostname: "100limites.tur.br", phone: "(11) 98888-7777" } as any} /></HelmetProvider></MemoryRouter>);
    const hero = screen.getByRole("button", { name: "Solicitar uma proposta" });
    const card = screen.getByRole("button", { name: "Consulte a proposta" });
    expect(hero.className).toContain("wl-visa-proposal");
    expect(card.className).toContain("wl-visa-proposal");
    hero.click();
    expect(await screen.findByText(/Conte rapidamente quem viaja/)).toBeTruthy();
    expect(screen.getByLabelText("Consulado de preferência")).toBeTruthy();
    expect(screen.getByLabelText("Nome completo *")).toBeTruthy();
  });
  it("não mostra CTA quando a agência não tem WhatsApp", () => {
    render(<MemoryRouter><HelmetProvider><UsVisaLandingPage info={{ hostname: "100limites.tur.br", phone: null } as any} /></HelmetProvider></MemoryRouter>);
    expect(screen.queryByRole("link", { name: /Falar com a Amanda/ })).toBeNull();
  });
});
