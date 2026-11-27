import { HelmetProvider } from "react-helmet-async";
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, within } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter } from "react-router-dom";
import { AgencySiteLayout } from "@/components/whitelabel/AgencySiteLayout";
import { KARIBU_PREVIEW_INFO } from "@/lib/adsBriefingPreview";
import AgencySiteHome from "@/pages/whitelabel/AgencySiteHome";

vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    rpc: vi.fn(async () => ({ data: [], error: null })),
    auth: { getSession: vi.fn(async () => ({ data: { session: null } })) },
  },
}));
vi.mock("@/lib/resortCuration", async (original) => ({
  ...await original<typeof import("@/lib/resortCuration")>(),
  useAgencyResortCuration: () => ({ data: undefined }),
}));
vi.mock("@/hooks/useAgencySiteRequest", () => ({
  useAgencySiteRequest: () => ({ submit: vi.fn(), reset: vi.fn(), state: "idle" }),
}));
afterEach(cleanup);

function home(hostname: string, phone: string | null = null) {
  const info = { ...KARIBU_PREVIEW_INFO, hostname, phone, agency_name: "IM&M Viagens e Turismo" };
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <HelmetProvider><QueryClientProvider client={client}><MemoryRouter>
      <AgencySiteLayout info={info}><AgencySiteHome info={info} noindex /></AgencySiteLayout>
    </MemoryRouter></QueryClientProvider></HelmetProvider>,
  ).container;
}


describe("IMM social links", () => {
  it.each(["immturismo.com.br", "www.immturismo.com.br"])("shows matching social links immediately below Novidades on %s", (hostname) => {
    const root = home(hostname);
    const strip = root.querySelector('#novidades + section[aria-label="Acompanhe a IMM"]');
    expect(strip).not.toBeNull();
    const instagram = strip?.querySelector('a[aria-label="Instagram da agência"]');
    const facebook = strip?.querySelector('a[aria-label="Facebook da agência"]');
    expect(instagram).toHaveAttribute("href", "https://www.instagram.com/imm_turismo/");
    expect(facebook).toHaveAttribute("href", "https://www.facebook.com/immturismo/");
    for (const link of [instagram, facebook]) {
      expect(link).toHaveAttribute("target", "_blank");
      expect(link?.getAttribute("rel")).toContain("noopener");
    }
  });
  it("replaces the travel gallery with a single landscape portrait of Ivete", () => {
    const root = home("immturismo.com.br");
    const photo = root.querySelector("#sobre img");
    expect(root.querySelectorAll("#sobre img")).toHaveLength(1);
    expect(photo).toHaveAttribute("src", "/imm/ivete-budapeste.webp");
    expect(photo).toHaveAttribute("width", "1200");
    expect(photo).toHaveAttribute("height", "900");
  });
  it("places the compact contact field after the last FAQ and uses that site's number", () => {
    const root = home("immturismo.com.br", "(11) 99876-5432");
    const faq = root.querySelector<HTMLElement>("#faq")!;
    const contact = within(faq).getByRole("region", { name: "Ainda tem alguma dúvida?" });
    const last = faq.querySelectorAll('[data-state="closed"][data-orientation="vertical"]');
    expect(last[last.length - 1].compareDocumentPosition(contact) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(within(faq).queryByText("Falar no WhatsApp")).toBeNull();
    const field = within(contact).getByRole("textbox", { name: "Sua dúvida" });
    expect(field).toHaveAttribute("rows", "1");
    fireEvent.change(field, { target: { value: "Gostaria de saber mais." } });
    const button = within(contact).getByRole("link", { name: "Enviar pelo WhatsApp" });
    expect(button.getAttribute("href")).toBe("https://wa.me/5511998765432?text=Gostaria%20de%20saber%20mais.");
  });
  it.each(["omundoemcores.com.br", "paraisoviagens.com", "kaributurismo.com.br"])("does not add IMM accounts to %s", (hostname) => {
    const root = home(hostname);
    expect(root.querySelector('[aria-label="Acompanhe a IMM"]')).toBeNull();
    expect(root.querySelector('a[href*="instagram.com/imm_turismo"]')).toBeNull();
    expect(root.querySelector('a[href*="facebook.com/immturismo"]')).toBeNull();
  });
});
