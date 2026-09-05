import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import OrcamentoPublico from "@/pages/OrcamentoPublico";

const { mockUsePublicQuote } = vi.hoisted(() => ({
  mockUsePublicQuote: vi.fn(),
}));

vi.mock("@/hooks/useQuotes", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/hooks/useQuotes")>();
  return { ...actual, usePublicQuote: () => mockUsePublicQuote() };
});

vi.mock("@/components/shared/ResolvedServiceImage", () => ({
  useResolvedServiceImage: () => ({ src: null, onError: vi.fn() }),
}));

function Wrapper({ children }: { children: React.ReactNode }) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return (
    <MemoryRouter>
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    </MemoryRouter>
  );
}

const baseQuote = {
  id: "quote-hooks-1",
  user_id: "user-1",
  client_name: "Cliente Teste",
  adults_count: 2,
  children_count: 0,
  destination: "Roma",
  start_date: "2026-10-01",
  end_date: "2026-10-10",
  total_amount: 5000,
  status: "published",
  share_token: "TOKEN",
  show_detailed_prices: true,
  payment_terms: null,
  valid_until: null,
  validity_disclaimer: "",
  created_at: "2026-01-01T00:00:00Z",
  updated_at: "2026-01-01T00:00:00Z",
  services: [],
} as any;

describe("OrcamentoPublico ordem de hooks", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(supabase as any, "rpc").mockResolvedValue({ data: [], error: null });
  });

  it("não viola a ordem de hooks na transição de loading para orçamento carregado", async () => {
    mockUsePublicQuote.mockReturnValue({
      quote: null,
      agentProfile: null,
      isLoading: true,
    });

    const { rerender } = render(
      <OrcamentoPublico tokenOverride="TOKEN" />,
      { wrapper: Wrapper }
    );

    // Simula a resolução do orçamento: o componente passa de loader para conteúdo.
    mockUsePublicQuote.mockReturnValue({
      quote: baseQuote,
      agentProfile: null,
      isLoading: false,
    });

    rerender(<OrcamentoPublico tokenOverride="TOKEN" />);

    await waitFor(() => {
      expect(screen.getByText("Proposta de Viagem")).toBeInTheDocument();
    });
  });
});
