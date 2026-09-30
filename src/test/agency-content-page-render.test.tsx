import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { HelmetProvider } from "react-helmet-async";
import AgencyContentPage from "@/pages/whitelabel/AgencyContentPage";
import { resolveContentPage } from "@/lib/agencySiteContentPages";

function renderPath(path: string) {
  const page = resolveContentPage("100limites.tur.br", path);
  if (!page) throw new Error(`página não declarada: ${path}`);
  return render(
    <HelmetProvider>
      <MemoryRouter initialEntries={[path]}>
        <AgencyContentPage page={page} />
      </MemoryRouter>
    </HelmetProvider>,
  );
}

describe("renderização das páginas institucionais", () => {
  it("passeios em Portugal lista os roteiros do portfólio", () => {
    renderPath("/passeios/portugal");
    expect(screen.getByRole("heading", { level: 1 }).textContent).toContain("Portugal");
    expect(screen.getByText(/Porto e Vale do Douro/)).toBeTruthy();
    expect(screen.getByText(/Fátima e rota religiosa/)).toBeTruthy();
    expect(screen.getByText(/Aldeias históricas/)).toBeTruthy();
  });

  it("frota mostra veículos, transfers e a chamada final", () => {
    renderPath("/frota");
    expect(screen.getByText(/Minivan executiva/)).toBeTruthy();
    expect(screen.getByText(/Recepção no desembarque com placa nominal\./)).toBeTruthy();
    const cta = screen.getByRole("link", { name: /Solicitar transfer/ });
    expect(cta.getAttribute("href")).toContain("#solicitacoes");
  });

  it("páginas de Europa e pet friendly renderizam seus blocos", () => {
    renderPath("/europa");
    expect(screen.getByText(/O que o acompanhamento resolve/)).toBeTruthy();
    renderPath("/pet-friendly");
    expect(screen.getByText(/Como cuidamos do trajeto/)).toBeTruthy();
  });
});
