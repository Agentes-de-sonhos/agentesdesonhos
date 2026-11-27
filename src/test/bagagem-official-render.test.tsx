import { HelmetProvider } from "react-helmet-async";
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter } from "react-router-dom";
import { BAGAGEM_NA_MAO_PREVIEW_INFO } from "@/lib/adsBriefingPreview";
import { AgencySiteLayout } from "@/components/whitelabel/AgencySiteLayout";
import AgencySiteHome from "@/pages/whitelabel/AgencySiteHome";

const { reset } = vi.hoisted(() => ({ reset: vi.fn() }));
vi.mock("@/integrations/supabase/client", () => ({
  supabase: { rpc: vi.fn(async () => ({ data: [], error: null })), auth: { getSession: vi.fn(async () => ({ data: { session: null } })) } },
}));
vi.mock("@/lib/resortCuration", async (original) => ({ ...await original<typeof import("@/lib/resortCuration")>(), useAgencyResortCuration: () => ({ data: undefined }) }));
vi.mock("@/hooks/useAgencySiteRequest", () => ({ useAgencySiteRequest: () => ({ submit: vi.fn(), reset, state: "idle" }) }));
afterEach(cleanup);

describe("home oficial da Bagagem na Mão", () => {
  it("renderiza as três imagens/cópias, links internos e captação sem convite exposto", () => {
    const info = { ...BAGAGEM_NA_MAO_PREVIEW_INFO, hostname: "bagagemnamao.com.br" };
    const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    const { container } = render(<HelmetProvider><QueryClientProvider client={qc}><MemoryRouter><AgencySiteLayout info={info}><AgencySiteHome info={info} noindex /></AgencySiteLayout></MemoryRouter></QueryClientProvider></HelmetProvider>);
    expect(screen.getByRole("heading", { name: "Sua família não viaja em modo padrão" })).toBeInTheDocument();
    const controls = within(container.querySelector<HTMLElement>('[data-hero-nav-placement="bottom-right"]')!);
    fireEvent.click(controls.getByRole("button", { name: "Próximo destaque" }));
    expect(screen.getByRole("heading", { name: "Mais tempo nos parques. Menos correria entre eles." })).toBeInTheDocument();
    fireEvent.click(controls.getByRole("button", { name: "Próximo destaque" }));
    expect(screen.getByRole("heading", { name: "Dos parques ao navio, sem apertar o roteiro" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "O que você deseja planejar?" })).toBeInTheDocument();
    expect(within(container.querySelector<HTMLElement>("#cotacao")!).getByRole("button", { name: "Solicitar", exact: true })).toBeInTheDocument();
    expect(container.querySelector("#campanhas")).toBeNull();
    expect(container.querySelector('#ingressos-orlando a[href="/universal"]')).not.toBeNull();
    expect(container.querySelector('[data-destination="canada"] img')).toHaveAttribute("src", "/bagagem-na-mao/canada-lago-moraine.webp");
    expect(container.querySelector('[data-destination="resorts-all-inclusive"]')).toHaveAttribute("href", "/resorts-brasil/iberostar-bahia");
    expect(container.querySelectorAll('[data-testid="cruise-season-companies"] img')).toHaveLength(5);
    expect(container.querySelectorAll(".wl-step-num")).toHaveLength(4);
    const footer = within(container.querySelector<HTMLElement>("#rodape")!);
    expect(footer.getByRole("link", { name: "Falar por WhatsApp" })).toHaveAttribute("href", "https://wa.me/5521988559515");
    expect(footer.queryByText(/98855-9515/)).toBeNull();
    expect(footer.getByText(/Rua Conde de Bonfim, 211/)).toBeInTheDocument();
    const social = screen.getByRole("region", { name: "Siga-nos nas redes" });
    expect(within(social).getByRole("link", { name: "Instagram da agência" })).toHaveAttribute("href", "https://www.instagram.com/bagagemnamaoviagens/");
    expect(container.querySelector('a[href*="chat.whatsapp.com"]')).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: "Solicitar acesso ao grupo" }));
    expect(screen.getByRole("dialog", { name: "Grupo de oportunidades da Bagagem na Mão" })).toBeInTheDocument();
    expect(document.querySelector('a[href*="chat.whatsapp.com"]')).toBeNull();
  });
});
