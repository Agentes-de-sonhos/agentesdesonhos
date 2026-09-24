import { describe, it, expect, vi, beforeEach } from "vitest";
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

beforeEach(() => invoke.mockReset());

describe("allowlist de avaliações do Google", () => {
  it("ativa só os hosts da Destinos com a Ju", () => {
    expect(isGoogleReviewsEnabled("destinoscomaju.com.br")).toBe(true);
    expect(isGoogleReviewsEnabled("www.destinoscomaju.com.br")).toBe(true);
    expect(isGoogleReviewsEnabled("100limites.tur.br")).toBe(false);
    expect(isGoogleReviewsEnabled("paraisoviagens.com")).toBe(false);
  });
});

describe("mapeamento do payload", () => {
  it("limita a 5, preserva ordem e aplica fallbacks", () => {
    const reviews = Array.from({ length: 7 }, (_, i) => ({ author_name: `A${i}`, rating: 5, text: `t${i}` }));
    reviews[1] = { author_name: "", rating: 4 } as never;
    const m = mapGooglePlaceReviews({ enabled: true, name: "X", rating: 4.9, user_ratings_total: 73, url: "https://maps.google.com/?cid=1", reviews })!;
    expect(m.reviews).toHaveLength(5);
    expect(m.reviews[0].authorName).toBe("A0");
    expect(m.reviews[1]).toMatchObject({ authorName: "Usuário do Google", text: null, photoUrl: null, authorUrl: null });
    expect(m.total).toBe(73);
    expect(mapGooglePlaceReviews({ enabled: false })).toBeNull();
  });
});

describe("seção de avaliações", () => {
  it("renderiza card sem foto e sem comentário, com link do Google", async () => {
    invoke.mockResolvedValue({
      data: { enabled: true, name: "Destinos com a Ju", rating: 5, user_ratings_total: 73, url: "https://maps.google.com/?cid=9", reviews: [{ author_name: "Maria Silva", rating: 5 }] },
      error: null,
    });
    renderSection();
    await waitFor(() => expect(screen.getByText("Maria Silva")).toBeInTheDocument());
    expect(screen.getByText("MS")).toBeInTheDocument();
    expect(screen.getAllByLabelText("5 de 5 estrelas").length).toBeGreaterThan(0);
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
