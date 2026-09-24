import { describe, it, expect, vi, beforeEach } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { render, screen, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { isGoogleReviewsEnabled, mapGooglePlaceReviews } from "@/lib/agencyGoogleReviews";
import { AgencyGoogleReviewsSection } from "@/components/whitelabel/AgencyGoogleReviewsSection";

const invoke = vi.fn();
vi.mock("@/integrations/supabase/client", () => ({
  supabase: { functions: { invoke: (...a: unknown[]) => invoke(...a) } },
}));

const renderSection = (hostname = "www.destinoscomaju.com.br") =>
  render(
    <QueryClientProvider client={new QueryClient()}>
      <AgencyGoogleReviewsSection hostname={hostname} container="" />
    </QueryClientProvider>,
  );

const review = (i: number, extra: Record<string, unknown> = {}) => ({
  authorAttribution: { displayName: `Autor ${i}`, uri: `https://www.google.com/maps/contrib/${i}`, photoUri: null },
  rating: 5,
  text: `texto ${i}`,
  relativePublishTimeDescription: "um mês atrás",
  publishTime: `2026-0${(i % 9) + 1}-01T00:00:00Z`,
  googleMapsUri: `https://www.google.com/maps/reviews/data=${i}`,
  ...extra,
});

beforeEach(() => invoke.mockReset());

describe("servidor google-place-reviews", () => {
  const src = readFileSync(resolve(__dirname, "../../supabase/functions/google-place-reviews/index.ts"), "utf8");
  it("nunca cacheia conteúdo do Google", () => {
    expect(src).toContain('"Cache-Control": "no-store"');
    expect(src).not.toMatch(/max-age/);
  });
  it("usa Places API New com field mask restrito e chave no header", () => {
    expect(src).toContain("https://places.googleapis.com/v1/places/");
    expect(src).toContain('"X-Goog-Api-Key": KEY');
    expect(src).toContain("id,displayName,rating,userRatingCount,googleMapsUri,reviews,attributions");
    expect(src).not.toContain("maps/api/place/details");
  });
});

describe("allowlist de avaliações do Google", () => {
  it("ativa só os hosts da Destinos com a Ju", () => {
    expect(isGoogleReviewsEnabled("destinoscomaju.com.br")).toBe(true);
    expect(isGoogleReviewsEnabled("www.destinoscomaju.com.br")).toBe(true);
    expect(isGoogleReviewsEnabled("100limites.tur.br")).toBe(false);
    expect(isGoogleReviewsEnabled("paraisoviagens.com")).toBe(false);
  });
});

describe("mapeamento do payload (Places New)", () => {
  it("limita a 5, preserva ordem, mapeia authorAttribution e googleMapsUri", () => {
    const reviews = Array.from({ length: 7 }, (_, i) => review(i));
    reviews[1] = { rating: 4, text: { text: "objeto" } } as never;
    const m = mapGooglePlaceReviews({
      enabled: true, displayName: "X", rating: 4.9, userRatingCount: 73,
      googleMapsUri: "https://maps.google.com/?cid=1",
      attributions: [{ provider: "Fonte", providerUri: "https://fonte.example" }],
      reviews,
    })!;
    expect(m.reviews).toHaveLength(5);
    expect(m.reviews[0]).toMatchObject({
      authorName: "Autor 0", authorUrl: "https://www.google.com/maps/contrib/0",
      googleMapsUri: "https://www.google.com/maps/reviews/data=0", relativeTime: "um mês atrás",
    });
    expect(m.reviews[1]).toMatchObject({ authorName: "Usuário do Google", text: "objeto", googleMapsUri: null, photoUrl: null });
    expect(m.total).toBe(73);
    expect(m.url).toBe("https://maps.google.com/?cid=1");
    expect(m.attributions).toEqual([{ provider: "Fonte", providerUri: "https://fonte.example" }]);
    expect(mapGooglePlaceReviews({ enabled: false })).toBeNull();
  });
});

describe("seção de avaliações", () => {
  it("exibe atribuição Google Maps, aviso de relevância e link individual quando existe", async () => {
    invoke.mockResolvedValue({
      data: {
        enabled: true, displayName: "Destinos com a Ju", rating: 5, userRatingCount: 73,
        googleMapsUri: "https://maps.google.com/?cid=9",
        reviews: [review(1), review(2, { googleMapsUri: undefined, authorAttribution: { displayName: "Maria Silva" }, text: undefined })],
      },
      error: null,
    });
    renderSection();
    await waitFor(() => expect(screen.getByText("Maria Silva")).toBeInTheDocument());
    const attr = screen.getByTestId("google-maps-attribution");
    expect(attr.textContent?.trim()).toBe("Google Maps");
    expect(attr).toHaveAttribute("translate", "no");
    expect(screen.getByText("Avaliações exibidas na ordem de relevância definida pelo Google Maps.")).toBeInTheDocument();
    const individual = screen.getAllByRole("link", { name: /Ver avaliação no Google Maps/ });
    expect(individual).toHaveLength(1);
    expect(individual[0]).toHaveAttribute("href", "https://www.google.com/maps/reviews/data=1");
    expect(screen.getByText("MS")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /Ver todas as avaliações no Google/ })).toHaveAttribute("href", "https://maps.google.com/?cid=9");
  });

  it("erro é discreto e mantém link para o Google", async () => {
    invoke.mockResolvedValue({ data: null, error: new Error("x") });
    renderSection();
    await waitFor(() => expect(screen.getByText(/indisponíveis no momento/)).toBeInTheDocument());
    const link = screen.getByRole("link", { name: /Ver todas as avaliações no Google/ });
    expect(link.getAttribute("href")).toContain("query_place_id=ChIJhTnCndr3zpQRyRaMIZaR7Kw");
  });
});
