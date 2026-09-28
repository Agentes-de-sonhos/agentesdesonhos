import { describe, expect, it, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter, Route, Routes, useLocation } from "react-router-dom";
import { AgencyAdminNavProvider } from "@/lib/agencyAdminNav";
import { NewSiteRequestAlert } from "@/components/leads/NewSiteRequestAlert";

const ROW = {
  id: "req-1",
  lead_name: "Cliente Teste",
  service_label: "Aéreo",
  destination: "Orlando (MCO)",
  hostname: "www.destinoscomaju.com.br",
  opportunity_id: "opp-42",
  created_at: new Date().toISOString(),
};

let handler: ((payload: { new: Record<string, unknown> }) => void) | null = null;

vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    channel: () => {
      const ch = {
        on: (_e: string, _f: unknown, cb: (p: { new: Record<string, unknown> }) => void) => {
          handler = cb;
          return ch;
        },
        subscribe: () => ch,
      };
      return ch;
    },
    removeChannel: () => {},
  },
}));

vi.mock("@/hooks/useAuth", () => ({
  useAuth: () => ({ user: { id: "11111111-1111-1111-1111-111111111111" } }),
}));

vi.mock("@/hooks/useUserRole", () => ({
  useUserRole: () => ({ isAdmin: true, loading: false }),
}));

function Probe() {
  const { pathname, search } = useLocation();
  return <div data-testid="rota">{`${pathname}${search}`}</div>;
}

function setup(children: React.ReactNode) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={qc}>
      <MemoryRouter initialEntries={["/gestao"]}>
        <AgencyAdminNavProvider>
          {children}
          <Routes>
            <Route path="*" element={<Probe />} />
          </Routes>
        </AgencyAdminNavProvider>
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

describe("aviso de solicitação dentro do painel white label", () => {
  beforeEach(() => {
    handler = null;
    HTMLMediaElement.prototype.play = vi.fn().mockResolvedValue(undefined);
    HTMLMediaElement.prototype.pause = vi.fn();
  });

  it("mostra o aviso e abre a oportunidade no funil do painel", async () => {
    setup(<NewSiteRequestAlert />);
    await waitFor(() => expect(handler).toBeTruthy());
    handler!({ new: ROW });

    expect(await screen.findByText("Nova solicitação recebida pelo site")).toBeInTheDocument();
    expect(screen.getByText("Cliente Teste", { exact: false })).toBeInTheDocument();
    expect(screen.getByText("Orlando (MCO)")).toBeInTheDocument();
    expect(screen.getByText("www.destinoscomaju.com.br")).toBeInTheDocument();

    await userEvent.click(screen.getByTestId("site-request-open"));
    await waitFor(() =>
      expect(screen.getByTestId("rota").textContent).toBe("/gestao/crm/funil?opportunity=opp-42"),
    );
  });

  it("não duplica o aviso quando montado em mais de uma aba", async () => {
    setup(
      <>
        <NewSiteRequestAlert />
        <NewSiteRequestAlert />
      </>,
    );
    await waitFor(() => expect(handler).toBeTruthy());
    handler!({ new: ROW });

    expect(await screen.findAllByText("Nova solicitação recebida pelo site")).toHaveLength(1);
  });
});
