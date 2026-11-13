import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { ClubMedSnowHomeSection } from "@/components/whitelabel/ClubMedSnowHomeSection";
import { ARENA_PREVIEW_PROFILE, MUNDO_EM_CORES_PREVIEW_PROFILE } from "@/lib/adsBriefingPreview";
vi.mock("@/lib/agencyContextLink", () => ({ agencySiteHref: (path: string) => path }));
afterEach(cleanup);

describe("chamada Club Med na home Arena", () => {
  it("preserva a foto até o clique, abre o vídeo oficial e permite voltar à foto", () => {
    const { container } = render(<ClubMedSnowHomeSection config={ARENA_PREVIEW_PROFILE.clubMedSnowHome!} container="max-w-6xl" agencyName="Arena Travel Group" />);
    expect(container.querySelector("iframe")).toBeNull();
    expect(screen.getByAltText(/Rafael Souza/)).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Assistir ao clipe Club Med na neve" }));
    expect(screen.getByTitle("Club Med — férias de esqui")).toHaveAttribute("src", expect.stringContaining("youtube-nocookie.com/embed/C-4BqbfgBe0"));
    fireEvent.click(screen.getByRole("button", { name: "Voltar à foto" }));
    expect(container.querySelector("iframe")).toBeNull();
  });
  it("conecta os seis países e o catálogo, com opt-in exclusivo da Arena", () => {
    render(<ClubMedSnowHomeSection config={ARENA_PREVIEW_PROFILE.clubMedSnowHome!} container="max-w-6xl" agencyName="Arena Travel Group" />);
    expect(screen.getByRole("link", { name: "França" })).toHaveAttribute("href", "/club-med-neve#franca");
    expect(screen.getByRole("link", { name: "Japão" })).toHaveAttribute("href", "/club-med-neve#japao");
    expect(screen.getByRole("list", { name: "Países dos resorts Club Med na neve" }).children).toHaveLength(6);
    expect(screen.getByRole("link", { name: /Conheça os resorts/ })).toHaveAttribute("href", "/club-med-neve");
    expect(MUNDO_EM_CORES_PREVIEW_PROFILE.clubMedSnowHome).toBeUndefined();
  });
});
