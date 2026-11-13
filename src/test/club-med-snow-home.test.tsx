import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { ClubMedSnowHomeSection } from "@/components/whitelabel/ClubMedSnowHomeSection";
import { ARENA_PREVIEW_PROFILE, MUNDO_EM_CORES_PREVIEW_PROFILE } from "@/lib/adsBriefingPreview";
vi.mock("@/lib/agencyContextLink", () => ({ agencySiteHref: (path: string) => path }));
afterEach(cleanup);

describe("chamada Club Med na home Arena", () => {
  it("mostra o vídeo diretamente, sem foto do Rafael", () => {
    const { container } = render(<ClubMedSnowHomeSection config={ARENA_PREVIEW_PROFILE.clubMedSnowHome!} container="max-w-6xl" agencyName="Arena Travel Group" />);
    expect(screen.getByTitle("Club Med — férias de esqui")).toHaveAttribute("src", expect.stringContaining("youtube-nocookie.com/embed/C-4BqbfgBe0"));
    expect(screen.queryByAltText(/Rafael Souza/)).not.toBeInTheDocument();
    expect(container.querySelector('img[src*="rafael"]')).toBeNull();
  });
  it("conecta os seis países e o catálogo, com opt-in exclusivo da Arena", () => {
    render(<ClubMedSnowHomeSection config={ARENA_PREVIEW_PROFILE.clubMedSnowHome!} container="max-w-6xl" agencyName="Arena Travel Group" />);
    expect(screen.getByRole("link", { name: "França" })).toHaveAttribute("href", "/club-med-neve?pais=franca");
    expect(screen.getByRole("link", { name: "Japão" })).toHaveAttribute("href", "/club-med-neve?pais=japao");
    expect(screen.getByRole("list", { name: "Países dos resorts Club Med na neve" }).children).toHaveLength(6);
    expect(screen.getByRole("link", { name: /Conheça os resorts/ })).toHaveAttribute("href", "/club-med-neve");
    expect(MUNDO_EM_CORES_PREVIEW_PROFILE.clubMedSnowHome).toBeUndefined();
  });
});
