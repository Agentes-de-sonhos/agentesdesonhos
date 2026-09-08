import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { PublicContentLocaleCard } from "@/components/profile/PublicContentLocaleCard";

vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    auth: { getUser: vi.fn(async () => ({ data: { user: { id: "u1" } } })) },
    from: vi.fn(() => ({ update: () => ({ eq: async () => ({ error: null }) }) })),
  },
}));

vi.mock("@/hooks/use-toast", () => ({ useToast: () => ({ toast: vi.fn() }) }));

describe("configuração de idioma dos materiais do cliente", () => {
  it("mostra título, apoio e o idioma salvo, em português (área interna)", () => {
    render(<PublicContentLocaleCard initialLocale="it-IT" />);

    expect(screen.getByText("Idioma dos materiais do cliente")).toBeTruthy();
    expect(
      screen.getByText(
        "Define o idioma dos links públicos e documentos enviados aos seus clientes.. A área interna da plataforma continuará em português."
      )
    ).toBeTruthy();
    expect(screen.getByText("Italiano")).toBeTruthy();
    expect(screen.getByText("Salvar idioma")).toBeTruthy();
  });

  it("agência sem configuração aparece como Português (Brasil)", () => {
    render(<PublicContentLocaleCard initialLocale={null} />);
    expect(screen.getByText("Português (Brasil)")).toBeTruthy();
  });
});
