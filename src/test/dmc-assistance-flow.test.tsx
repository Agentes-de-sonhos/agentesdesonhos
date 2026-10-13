import { beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { HelmetProvider } from "react-helmet-async";
import DmcPortugalLandingPage, { DMC_SERVICES } from "@/pages/whitelabel/DmcPortugalLandingPage";
import { describeItem, dmcStorageKey, readAssistanceDraft } from "@/components/whitelabel/DmcRequestCart";
import type { AgencyDomainInfo } from "@/lib/agencyDomains";

const { submit } = vi.hoisted(() => ({ submit: vi.fn(async () => ({ success: true })) }));
vi.mock("@/hooks/useAgencySiteRequest", () => ({ useAgencySiteRequest: () => ({ state: "idle", error: null, submit, reset: vi.fn() }) }));
vi.mock("@/lib/bookingCartFly", () => ({ flyToCart: vi.fn() }));
const info: AgencyDomainInfo = {
  user_id: "9433421c-2252-4030-acab-135c03ab009e", hostname: "100limites.tur.br",
  agency_slug: "100-limites-viagens", agency_name: "100 Limites Viagens", owner_name: "Amanda Larini",
  is_primary: true, phone: "48996086615", logo_url: null, cover_image_url: null,
  primary_color: null, city: "Palhoça", state: "SC", bio: null, public_slug: "100-limites-viagens", cnpj: "21911559000143",
};
const renderPage = () => render(<HelmetProvider><MemoryRouter><DmcPortugalLandingPage info={info} /></MemoryRouter></HelmetProvider>);

describe("100 Limites — assistência em Portugal", () => {
  beforeEach(() => { cleanup(); localStorage.clear(); submit.mockClear(); });

  it("exibe os quatro serviços, sem frota ou produtos de transporte", () => {
    renderPage();
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent("Assistência e acompanhamento personalizado em Portugal");
    DMC_SERVICES.forEach(({ t, d }) => { expect(screen.getByText(t)).toBeInTheDocument(); expect(screen.getByText(d)).toBeInTheDocument(); });
    expect(document.getElementById("frota")).toBeNull();
    expect(screen.queryByText("Transfers privativos")).not.toBeInTheDocument();
    expect(screen.queryByText("City Tour com veículo executivo")).not.toBeInTheDocument();
    const links = screen.getAllByRole("link");
    links.filter((link) => link.getAttribute("href")?.startsWith("#")).forEach((link) => expect(document.querySelector(link.getAttribute("href") || "")).not.toBeNull());
    links.filter((link) => link.getAttribute("href")?.includes("wa.me")).forEach((link) => expect(decodeURIComponent(link.getAttribute("href") || "")).toContain("assistência"));
  });

  it("ignora rascunhos antigos e isola a agência sem apagá-los", () => {
    const old = JSON.stringify([{ kind: "veiculo", title: "Transfer", values: {} }]);
    localStorage.setItem("dmc-portugal-cart:v1", old);
    expect(readAssistanceDraft(info.hostname)).toEqual([]);
    expect(localStorage.getItem("dmc-portugal-cart:v1")).toBe(old);
    expect(dmcStorageKey(info.hostname)).toBe(dmcStorageKey("www.100limites.tur.br"));
    expect(dmcStorageKey(info.hostname)).not.toBe(dmcStorageKey("outra-agencia.com.br"));
    localStorage.setItem(dmcStorageKey(info.hostname), old);
    expect(readAssistanceDraft(info.hostname)).toEqual([]);
  });

  it("abre popup, adiciona, revisa e envia o novo conteúdo pelo fluxo existente", async () => {
    renderPage();
    fireEvent.click(screen.getAllByRole("button", { name: "Solicitar assistência personalizada", exact: true })[0]);
    expect(screen.queryByLabelText(/Traslado/)).not.toBeInTheDocument();
    fireEvent.change(screen.getByLabelText(/Data ou início/), { target: { value: "2026-11-20" } });
    fireEvent.change(screen.getByLabelText("Cidade ou locais de interesse"), { target: { value: "Lisboa e Sintra" } });
    fireEvent.click(screen.getByRole("button", { name: "Adicionar à solicitação" }));
    fireEvent.click(screen.getByRole("button", { name: "Minha solicitação: 1 item" }));
    expect(screen.getByText(/Locais de interesse: Lisboa e Sintra/)).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText("Nome completo *"), { target: { value: "Teste de assistência" } });
    fireEvent.change(screen.getByLabelText("E-mail"), { target: { value: "teste@example.com" } });
    fireEvent.click(screen.getByRole("checkbox"));
    fireEvent.click(screen.getByRole("button", { name: "Enviar solicitação (1 item)" }));
    await waitFor(() => expect(screen.getByText("Solicitação enviada!")).toBeInTheDocument());
    expect(submit).toHaveBeenCalledWith(expect.objectContaining({ service_key: "pacotes", service_label: "Assistência personalizada em Portugal", destination: "Portugal", consent: true }));
    const payload = submit.mock.calls[0]?.[0];
    expect(JSON.stringify(payload)).not.toMatch(/Traslado|Transfer|Veículo|Partida/);
    expect(decodeURIComponent(screen.getByRole("link", { name: "Continuar no WhatsApp" }).getAttribute("href") || "")).toContain("assistência personalizada em Portugal");
    expect(readAssistanceDraft(info.hostname)).toEqual([]);
  });

  it("limita resumos aos campos de assistência", () => {
    expect(describeItem({ id: "1", kind: "assistencia", title: "Concierge", values: { data: "2026-11-20", trajeto: "Transfer", local: "Lisboa" } })).toBe("Concierge — Início: 20/11/2026; Locais de interesse: Lisboa");
  });
});