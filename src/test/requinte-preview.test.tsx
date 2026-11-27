import { HelmetProvider } from "react-helmet-async";
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter } from "react-router-dom";
import { AgencySiteLayout } from "@/components/whitelabel/AgencySiteLayout";
import AgencySiteHome from "@/pages/whitelabel/AgencySiteHome";
import { isCompletePresentationHost, resolveAdsPreviewFixture } from "@/lib/adsBriefingPreview";
import { resolveSiteProfile } from "@/lib/agencySiteProfile";
import { resolveSiteTheme } from "@/lib/agencySiteTheme";
import { REQUINTE_PREVIEW_INFO as info, REQUINTE_PREVIEW_PROFILE as profile } from "@/lib/requinteBriefingPreview";

vi.mock("@/integrations/supabase/client", () => ({
  supabase: { rpc: vi.fn(async () => ({ data: [], error: null })), auth: { getSession: vi.fn(async () => ({ data: { session: null } })) } },
}));
vi.mock("@/lib/resortCuration", async (original) => ({
  ...await original<typeof import("@/lib/resortCuration")>(), useAgencyResortCuration: () => ({ data: undefined }),
}));
afterEach(cleanup);

describe("Prévia Requinte Turismo", () => {
  it("isola o briefing, sem vincular domínio, identidade fiscal ou conta real", () => {
    const fixture = resolveAdsPreviewFixture("briefing-26-v1");
    expect(fixture?.strictBackendBlock).toBe(true);
    expect(fixture?.pages).toMatchObject({ orlandoTickets: true, visa: false, dmc: false, xcaret: null });
    expect(resolveSiteProfile(info.hostname)).toBe(profile);
    expect(resolveSiteProfile("requinteturismo.com.br")).not.toBe(profile);
    expect(isCompletePresentationHost("agentedesonhoproject.lovable.app")).toBe(false);
    expect(info).toMatchObject({ agency_slug: "", public_slug: null, logo_url: "/requinte-turismo/logo.png", phone: null, cnpj: null, is_primary: false });
    expect(profile).toMatchObject({ presentation: true, textualWordmark: false, alternateSurfaces: true });
    expect(profile.credentials).toBeUndefined();
    expect(profile.testimonials).toBeUndefined();
  });

  it("usa a paleta do briefing e vitrines próprias sem herdar outros clientes", () => {
    expect(resolveSiteTheme(info.hostname)).toBe("siteBaseEditorial");
    expect(info.primary_color).toBe("#164F76");
    expect(info.secondary_color).toBe("#39B7D4");
    expect(profile.hero?.map(h => h.image)).toEqual(["requinteSafari", "capitaisItalia", "orlandoMagicKingdom"]);
    expect(profile.destinations?.map(x => x.key)).toEqual(["africa-sul", "italia", "orlando", "esqui", "america-sul", "resorts"]);
    expect(profile.about?.ownerName).toBe("Fernanda Petratti");
    expect(profile.about?.badge?.value).toBe("Desde 1996");
    expect(JSON.stringify(profile)).not.toMatch(/Ivete|Xcaret|Mundo em Cores|Pristur/i);
  });

  it("renderiza a identidade, superfícies alternadas e o WhatsApp compacto ao fim do FAQ", () => {
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    const view = render(<HelmetProvider><QueryClientProvider client={client}><MemoryRouter>
      <AgencySiteLayout info={info} noWhatsapp><AgencySiteHome info={info} noindex /></AgencySiteLayout>
    </MemoryRouter></QueryClientProvider></HelmetProvider>);
    expect(screen.getByRole("heading", { name: "Da savana à Cidade do Cabo" })).toBeVisible();
    expect(view.container.querySelector("header img")).toHaveAttribute("src", "/requinte-turismo/logo.png");
    expect(view.container.querySelector(".wl-requinte #destinos")?.parentElement).toHaveClass("wl-alt-gradient");
    expect(view.container.querySelector(".wl-requinte #novidades")?.parentElement).not.toHaveClass("wl-alt-gradient");
    const faq = view.container.querySelector<HTMLElement>("#faq")!;
    const box = within(faq).getByRole("textbox", { name: "Sua dúvida" });
    const contact = within(faq).getByRole("region", { name: "Ainda tem alguma dúvida?" });
    expect(within(contact).getByText("Prévia: o envio fica desativado nesta versão.")).toBeVisible();
    expect(box).toHaveAttribute("rows", "1");
    fireEvent.change(box, { target: { value: "Olá, queria saber mais." } });
    expect(within(contact).getByRole("button", { name: "Enviar" })).toBeDisabled();
    expect(within(contact).queryByRole("link", { name: "Enviar" })).toBeNull();
    expect(within(faq).getByText("Há apoio depois que eu embarcar?").compareDocumentPosition(contact) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });
});
