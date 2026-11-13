import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor, fireEvent } from "@testing-library/react";
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
  id: "quote-anexos-1",
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

const anexo = {
  id: "doc-1",
  file_name: "voucher-hotel.pdf",
  file_path: "user-1/quote-anexos-1/voucher-hotel.pdf",
  file_type: "application/pdf",
  file_size: 2048,
};

describe("OrcamentoPublico anexos em caixa expansível", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUsePublicQuote.mockReturnValue({
      quote: baseQuote,
      agentProfile: null,
      isLoading: false,
    });
    vi.spyOn(supabase as any, "rpc").mockImplementation((fn: string) => {
      if (fn === "get_public_quote_documents_by_share_token") {
        return Promise.resolve({ data: [anexo], error: null });
      }
      return Promise.resolve({ data: [], error: null });
    });
  });

  it("abre recolhida e mostra os arquivos só depois do clique", async () => {
    render(<OrcamentoPublico tokenOverride="TOKEN" />, { wrapper: Wrapper });

    const toggle = await screen.findByRole("button", {
      name: /Documentos do seu orçamento/i,
    });

    // Recolhida por padrão: o arquivo não aparece ao abrir o orçamento.
    expect(toggle).toHaveAttribute("aria-expanded", "false");
    expect(screen.queryByText("voucher-hotel.pdf")).not.toBeInTheDocument();

    fireEvent.click(toggle);

    await waitFor(() => {
      expect(toggle).toHaveAttribute("aria-expanded", "true");
      expect(screen.getByText("voucher-hotel.pdf")).toBeInTheDocument();
    });

    // Recolhe novamente ao clicar de novo.
    fireEvent.click(toggle);
    await waitFor(() => {
      expect(toggle).toHaveAttribute("aria-expanded", "false");
      expect(screen.queryByText("voucher-hotel.pdf")).not.toBeInTheDocument();
    });
  });
});
