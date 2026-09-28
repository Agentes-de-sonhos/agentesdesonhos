import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

/** Inscrições feitas no Realtime, para conferir o escopo do colaborador. */
const subscriptions: Array<Record<string, unknown>> = [];

const AGENCY_ID = "44444444-4444-4444-8444-444444444444";
const MEMBER_ID = "55555555-5555-4555-8555-555555555555";

vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    channel: () => {
      const ch = {
        on: (_event: string, config: Record<string, unknown>) => {
          subscriptions.push(config);
          return ch;
        },
        subscribe: () => ch,
      };
      return ch;
    },
    removeChannel: () => {},
    from: () => ({ select: () => ({ eq: async () => ({ data: [{ role: "agente" }], error: null }) }) }),
  },
}));

vi.mock("@/hooks/useAuth", () => ({
  useAuth: () => ({ user: { id: MEMBER_ID } }),
}));

vi.mock("@/contexts/TeamSessionContext", () => ({
  useOptionalTeamSession: () => ({ agencyId: AGENCY_ID, loading: false }),
}));

import { NewSiteRequestAlert } from "@/components/leads/NewSiteRequestAlert";

beforeEach(() => {
  subscriptions.length = 0;
});

describe("aviso do site para colaborador da equipe", () => {
  it("escuta as solicitações da agência a que o colaborador pertence", async () => {
    const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    render(
      <QueryClientProvider client={qc}>
        <MemoryRouter>
          <NewSiteRequestAlert />
        </MemoryRouter>
      </QueryClientProvider>,
    );

    await waitFor(() => expect(subscriptions.length).toBe(1));
    expect(subscriptions[0].filter).toBe(`agency_user_id=eq.${AGENCY_ID}`);
  });
});
