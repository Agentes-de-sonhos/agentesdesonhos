import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import { AgencyQuickQuote } from "@/components/whitelabel/AgencyQuickQuote";
import { REQUEST_SERVICES } from "@/lib/agencySiteRequests";
import { INITIAL_GRID_TEMPLATES, initialGridClass } from "@/lib/agencyInitialGrid";

vi.mock("@/hooks/useAgencySiteRequest", () => ({
  useAgencySiteRequest: () => ({ state: "idle", error: null, submit: vi.fn(), reset: () => {} }),
}));

function mount(service: string) {
  return render(
    <AgencyQuickQuote
      hostname="100limites.tur.br"
      agencyName="100 Limites Viagens"
      service={service}
      onServiceChange={() => {}}
      open={false}
      onOpenChange={() => {}}
    />,
  );
}

afterEach(cleanup);

describe("CTA do formulário inicial white label", () => {
  for (const service of REQUEST_SERVICES) {
    it(`usa "Solicitar" em ${service.key}`, () => {
      mount(service.key);
      expect(screen.getByRole("button", { name: /^Solicitar$/i })).toBeTruthy();
      expect(screen.queryByRole("button", { name: /Solicitar cota/i })).toBeNull();
    });
  }
});

describe("textos auxiliares do formulário inicial", () => {
  it("não mostra as frases de intervalo em hospedagem, carro, transfer e seguro", () => {
    for (const key of ["hospedagem", "carro", "transfer", "seguro"]) {
      const view = mount(key);
      expect(view.container.textContent).not.toMatch(/no mesmo calend/i);
      cleanup();
    }
  });

  it("mantém a orientação de Quantidade de dias em ingressos", () => {
    mount("ingressos");
    expect(screen.getByText("Dias de utilização ou de visita.")).toBeTruthy();
  });
});

describe("grade determinística por serviço", () => {
  it("declara um template de colunas para os oito serviços", () => {
    for (const service of REQUEST_SERVICES) {
      expect(INITIAL_GRID_TEMPLATES[service.key]).toBeTruthy();
    }
  });

  it("aplica linha única no desktop e colunas compactas para numéricos", () => {
    for (const service of REQUEST_SERVICES) {
      const cls = initialGridClass(service.key);
      expect(cls).toContain("grid-cols-1");
      expect(cls).toContain("md:grid-cols-2");
      expect(cls).toContain("lg:grid-cols-[");
      // Colunas compactas de adultos/crianças (e dias/noites, quando existem).
      expect(cls).toContain("minmax(0,4.5rem)");
      // Nenhuma coluna sem minmax(0,...): evita overflow de inputs.
      const template = INITIAL_GRID_TEMPLATES[service.key];
      const cols = template.slice(template.indexOf("[") + 1, -1).split("_minmax");
      expect(cols.length).toBeGreaterThanOrEqual(5);
      expect(template).not.toMatch(/_(?!minmax)/);
    }
  });

  it("usa a mesma grade compartilhada para o serviço no card", () => {
    mount("aereo");
    const grid = document.querySelector('[data-testid="wl-initial-grid"]');
    expect(grid?.className).toContain(INITIAL_GRID_TEMPLATES.aereo);
  });
});
