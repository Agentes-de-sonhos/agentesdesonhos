import { render, screen } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { afterEach, describe, expect, it, vi } from "vitest";
import { resolveAdsPreviewFixture } from "@/lib/adsBriefingPreview";
import { BARDELLI_IMM_PREVIEW_JOB_ID } from "@/lib/bardelliImmPreview";
import { resolveSiteProfile } from "@/lib/agencySiteProfile";

vi.mock("@/pages/NotFound", () => ({ default: () => <p>Página não encontrada</p> }));
vi.mock("@/components/seo/SEO", () => ({ SEO: () => null }));
const original = window.location;
afterEach(() => Object.defineProperty(window, "location", { value: original, writable: true }));
async function renderAt(hostname: string) {
  Object.defineProperty(window, "location", { value: { ...original, hostname }, writable: true });
  const { default: Preview } = await import("@/pages/adsPreview/AdsBriefingPreview");
  return render(
    <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
      <MemoryRouter initialEntries={[`/ads-briefing-preview/${BARDELLI_IMM_PREVIEW_JOB_ID}`]}>
        <Routes><Route path="/ads-briefing-preview/:jobId/*" element={<Preview />} /></Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  );
}
describe("Bardelli IMM review preview", () => {
  it("only exposes matched agency content in the separate testing fixture", () => {
    const fixture = resolveAdsPreviewFixture(BARDELLI_IMM_PREVIEW_JOB_ID)!;
    expect(fixture.realAgency).toBe(true);
    expect(fixture.strictBackendBlock).toBe(true);
    expect(fixture.info).toMatchObject({ agency_slug: "", public_slug: null, phone: null });
    expect(fixture.profile.sections?.offers).toEqual({ enabled: false });
    expect(fixture.profile.destinations).toHaveLength(5);
    expect(JSON.stringify(fixture)).not.toMatch(/Ivete|Mundo em Cores|Leste Europeu Premium|Rua Cabiúna/i);
    expect(resolveSiteProfile("bardelliviagens.com.br").key).toBe("bardelliMundoOfficial");
  });
  it("renders the briefing-derived page from the actual preview entry point", async () => {
    await renderAt("localhost");
    expect(await screen.findByRole("heading", { name: "Viajar junto. Planejar do seu jeito." }, { timeout: 15000 })).toBeInTheDocument();
    expect(await screen.findByRole("heading", { name: "Cinco ideias para a próxima viagem" })).toBeInTheDocument();
    for (const id of ["destinos", "ingressos-orlando", "resorts", "autoridade", "sobre", "faq"]) {
      expect(document.getElementById(id), id).not.toBeNull();
    }
    expect(document.querySelector('meta[name="robots"]')).toHaveAttribute("content", "noindex,nofollow");
    expect(screen.queryByText(/Leste Europeu Premium|Ivete|Rua Cabiúna/)).toBeNull();
  });
  it("cannot render the fixture on the official hostname", async () => {
    await renderAt("bardelliviagens.com.br");
    expect(await screen.findByText("Página não encontrada")).toBeInTheDocument();
  });
});
