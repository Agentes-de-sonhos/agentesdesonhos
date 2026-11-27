import { cleanup, render, screen } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { afterEach, expect, it, vi } from "vitest";
import { AgencyGoogleReviewsSection } from "@/components/whitelabel/AgencyGoogleReviewsSection";
import { googleReviewsFallbackUrl, resolveGoogleReviewsConfig } from "@/lib/agencyGoogleReviews";
import { resolveSiteProfile } from "@/lib/agencySiteProfile";

afterEach(() => { cleanup(); vi.restoreAllMocks(); });

it.each(["innovati.tur.br", "www.innovati.tur.br"])("exibe avaliações no Google sem inventar nota nem avaliações em %s", (host) => {
  const profile = resolveSiteProfile(host);
  const config = resolveGoogleReviewsConfig(host);
  expect(profile.sections?.avaliacoes).toEqual({ enabled: true, order: 10 });
  expect(profile.nav?.find((item) => item.to === "/#sobre")?.children).toContainEqual({ label: "Avaliações no Google", to: "/#avaliacoes" });
  expect(config?.placeId).toBeUndefined();
  const spy = vi.spyOn(globalThis, "fetch");
  const client = new QueryClient();
  render(<QueryClientProvider client={client}><AgencyGoogleReviewsSection hostname={host} container="" copy={profile.copy?.avaliacoes} /></QueryClientProvider>);
  expect(screen.getByRole("heading", { name: "O que dizem os viajantes da Innovati" })).toBeInTheDocument();
  expect(screen.getByRole("link", { name: /Ver todas as avaliações no Google/ })).toHaveAttribute("href", "https://share.google/eoiBjNF25b4Q8ICGY");
  expect(screen.queryByTestId("google-rating-summary")).toBeNull();
  expect(screen.queryByLabelText("Carregando avaliações")).toBeNull();
  expect(spy).not.toHaveBeenCalled();
});

it("preserva o perfil separado da Curti e exclui domínios não cadastrados", () => {
  expect(googleReviewsFallbackUrl("www.curtiviagens.com.br")).toContain("query_place_id=ChIJ");
  expect(googleReviewsFallbackUrl("innovati.tur.br.example.com")).toBeNull();
  expect(googleReviewsFallbackUrl("briefing-24-v1.preview.local")).toBeNull();
});
