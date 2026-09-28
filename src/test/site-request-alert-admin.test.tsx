import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

/** Captura as inscrições feitas no Realtime para conferir o escopo por papel. */
const subscriptions: Array<Record<string, unknown>> = [];
let handler: ((payload: { new: Record<string, unknown> }) => void) | null = null;
let role: "admin" | "agente" = "agente";

vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    channel: () => {
      const ch = {
        on: (_event: string, config: Record<string, unknown>, cb: typeof handler) => {
          subscriptions.push(config);
          handler = cb;
          return ch;
        },
        subscribe: () => ch,
      };
      return ch;
    },
    removeChannel: () => {},
    from: () => ({ select: () => ({ eq: async () => ({ data: [{ role }], error: null }) }) }),
  },
}));

vi.mock("@/hooks/useAuth", () => ({
  useAuth: () => ({ user: { id: "11111111-1111-4111-8111-111111111111" } }),
}));

import { NewSiteRequestAlert } from "@/components/leads/NewSiteRequestAlert";

function renderAlert() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={qc}>
      <MemoryRouter>
        <NewSiteRequestAlert />
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

beforeEach(() => {
  subscriptions.length = 0;
  handler = null;
});

describe("aviso na tela das solicitações do site", () => {
  it("agente comum só escuta as solicitações do próprio site", async () => {
    role = "agente";
    renderAlert();
    await waitFor(() => expect(subscriptions.length).toBe(1));
    expect(subscriptions[0].filter).toBe("agency_user_id=eq.11111111-1111-4111-8111-111111111111");
  });

  it("administrador escuta todas as agências e vê o site de origem", async () => {
    role = "admin";
    renderAlert();
    await waitFor(() => expect(subscriptions.length).toBe(1));
    expect(subscriptions[0].filter).toBeUndefined();

    handler?.({
      new: {
        id: "22222222-2222-4222-8222-222222222222",
        lead_name: "Teste WhatsApp",
        service_label: "Aéreo",
        destination: "Orlando (MCO)",
        hostname: "destinoscomaju.com.br",
        opportunity_id: "33333333-3333-4333-8333-333333333333",
        created_at: "2026-09-28T14:27:52Z",
      },
    });

    expect(await screen.findByText("Nova solicitação recebida pelo site")).toBeInTheDocument();
    expect(await screen.findByText("destinoscomaju.com.br")).toBeInTheDocument();
    expect(screen.getByText("Aéreo")).toBeInTheDocument();
    expect(screen.getByTestId("site-request-open")).toBeInTheDocument();
  });
});
