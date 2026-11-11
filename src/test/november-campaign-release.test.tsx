import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";

const capture = vi.hoisted(() => ({ offers: [] as unknown[], request: vi.fn() }));
vi.mock("react-helmet-async", () => ({ Helmet: () => null }));
vi.mock("@/hooks/useAgencyFavicon", () => ({ useAgencyFavicon: () => undefined }));
vi.mock("@/pages/whitelabel/AgencyOffersPage", () => ({ usePublicOffers: () => ({ data: capture.offers }) }));
vi.mock("@/components/whitelabel/AgencySiteLayout", () => ({ AgencySiteLayout: ({ children }: { children: React.ReactNode }) => children }));
vi.mock("@/components/whitelabel/AgencyRequestCenter", () => ({ AgencyRequestCenter: (props: unknown) => { capture.request(props); return null; } }));
vi.mock("@/components/campaign/OpportunityRadar", () => ({ OpportunityRadar: () => null }));
vi.mock("@/components/campaign/FeaturedOffers", () => ({ FeaturedOffers: ({ offers }: { offers: Array<{ id: string }> }) => <output data-testid="offer-ids">{JSON.stringify(offers.map(o => o.id))}</output> }));

import { MemoryRouter } from "react-router-dom";
import NovemberCampaignPreview, { NovemberNavigationBoundary } from "@/pages/whitelabel/NovemberCampaignPreview";

describe("functional Mundo November campaign", () => {
  beforeEach(() => {
    window.history.replaceState({}, "", "/oportunidades-novembro?__agency_host=omundoemcores.com.br");
    capture.offers = [];
    capture.request.mockClear();
  });
  it("never substitutes fictional offers when the agency has no published November offers", () => {
    render(<NovemberCampaignPreview />);
    expect(JSON.parse(screen.getByTestId("offer-ids").textContent ?? "null")).toEqual([]);
  });
  it("shows only offers assigned to the November channel", () => {
    capture.offers = [
      { slug: "novembro-real", title: "Orlando", image_only: true, channels: ["novembro"] },
      { slug: "outra-pagina", title: "Paris", image_only: true, channels: ["home"] },
    ];
    render(<NovemberCampaignPreview />);
    expect(JSON.parse(screen.getByTestId("offer-ids").textContent ?? "null")).toEqual(["novembro-real"]);
  });
  it("opens the shared real request flow for the owning agency", () => {
    render(<NovemberCampaignPreview />);
    fireEvent.click(screen.getByRole("button", { name: "Solicitar atendimento" }));
    expect(capture.request).toHaveBeenCalledWith(expect.objectContaining({ hostname: "omundoemcores.com.br", initialService: "pacotes" }));
  });
});

describe("isolated campaign navigation", () => {
  it.each(["/", "/ofertas", "/resorts-brasil"])("reloads the app when leaving for %s", (pathname) => {
    const original = window.location;
    const replace = vi.fn();
    Object.defineProperty(window, "location", { configurable: true, value: { ...original, replace } });
    try {
      render(<MemoryRouter initialEntries={[pathname]}><NovemberNavigationBoundary /></MemoryRouter>);
      expect(replace).toHaveBeenCalledWith(window.location.href);
    } finally {
      Object.defineProperty(window, "location", { configurable: true, value: original });
    }
  });
  it("does not reload for campaign filters or its anchors", () => {
    const original = window.location;
    const replace = vi.fn();
    Object.defineProperty(window, "location", { configurable: true, value: { ...original, replace } });
    try {
      render(<MemoryRouter initialEntries={["/oportunidades-novembro/?__agency_host=omundoemcores.com.br#ofertas"]}><NovemberNavigationBoundary /></MemoryRouter>);
      expect(replace).not.toHaveBeenCalled();
    } finally {
      Object.defineProperty(window, "location", { configurable: true, value: original });
    }
  });
});
