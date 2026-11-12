import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import ClubMedSnowCollectionPage from "@/pages/whitelabel/clubMedSnow/ClubMedSnowCollectionPage";
import type { AgencyDomainInfo } from "@/lib/agencyDomains";

vi.mock("@/hooks/useClubMedSnowPlaces", () => ({ useClubMedSnowPlaces: () => ({ data: { rating: 4.8, photos: [] } }) }));
vi.mock("@/lib/agencyContextLink", () => ({ agencySiteHref: (path: string) => path }));
afterEach(cleanup);
const info = { agency_name: "Arena Travel Group", hostname: "preview.local" } as AgencyDomainInfo;

describe("filtro de países do catálogo Club Med", () => {
  it("filtra, combina países, desmarca e restaura o catálogo inteiro", () => {
    render(<ClubMedSnowCollectionPage info={info} />);
    expect(screen.getByRole("button", { name: "França" })).toHaveAttribute("data-preview-local", "true");
    expect(screen.getByRole("button", { name: "Todos os países" })).toHaveAttribute("data-preview-local", "true");
    expect(screen.getByRole("heading", { name: "Itália" })).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "França" }));
    expect(screen.getByRole("heading", { name: "França" })).toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: "Itália" })).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "França" })).toHaveAttribute("aria-pressed", "true");
    fireEvent.click(screen.getByRole("button", { name: "Japão" }));
    expect(screen.getByRole("heading", { name: "Japão" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "França" })).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "França" }));
    expect(screen.queryByRole("heading", { name: "França" })).not.toBeInTheDocument();
    expect(screen.getByRole("status")).toHaveTextContent("4 opções de hospedagem em Japão");
    fireEvent.click(screen.getByRole("button", { name: "Todos os países" }));
    expect(screen.getByRole("status")).toHaveTextContent("23 opções de hospedagem em todos os países");
    expect(screen.getByRole("heading", { name: "Itália" })).toBeInTheDocument();
  });
  it("não exibe a nota Google nos cards mesmo quando disponível", () => {
    render(<ClubMedSnowCollectionPage info={info} />);
    expect(screen.queryByText(/Google 4[.,]8/)).not.toBeInTheDocument();
    expect(screen.getByRole("link", { name: /Club Med Pragelato Sestriere/ })).toHaveAttribute("href", "/club-med-neve/pragelato-sestriere");
  });
});
