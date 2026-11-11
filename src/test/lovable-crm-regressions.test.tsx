import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, fireEvent, cleanup, waitFor } from "@testing-library/react";
import { MemoryRouter, Routes, Route, useLocation } from "react-router-dom";
import { readFileSync } from "node:fs";
import { AgencyAdminNavProvider } from "@/lib/agencyAdminNav";
import { WorkspaceProvider, useWorkspace } from "@/workspace/WorkspaceProvider";
import { WorkspaceSiteRequestAlert } from "@/components/leads/NewSiteRequestAlert";
import { LegacyCrmRedirect } from "@/components/routing/LegacyCrmRedirect";

const alertState = vi.hoisted(() => ({ current: { id: "req", opportunity_id: "opp", lead_name: "Ana", created_at: "2026-01-01T12:00:00Z" }, pending: 0, dismiss: vi.fn() }));
vi.mock("@/hooks/useAgencySiteRequestAlerts", () => ({ useAgencySiteRequestAlerts: () => alertState, opportunityDeepLink: (id: string) => `/crm?opportunity=${id}` }));
function WorkspaceProbe() {
  const ws = useWorkspace()!;
  return <><span data-testid="active-path">{ws.tabs.find(t => t.id === ws.activeId)?.path}</span><button onClick={() => ws.openTab("/gestao/agenda", "Agenda")}>Outra aba</button><button onClick={() => ws.closeTab(ws.activeId!)}>Fechar aba</button></>;
}
afterEach(cleanup);
describe("Lovable CRM regressions", () => {
  it("keeps alerts outside tab routers and activates a request after closing a tab", () => {
    HTMLMediaElement.prototype.play = vi.fn().mockResolvedValue(undefined);
    render(<AgencyAdminNavProvider><WorkspaceProvider initialPath="/gestao/financeiro" initialTitle="Financeiro" homePath="/gestao"><WorkspaceProbe/><WorkspaceSiteRequestAlert/></WorkspaceProvider></AgencyAdminNavProvider>);
    fireEvent.click(screen.getByText("Outra aba"));
    fireEvent.click(screen.getByText("Fechar aba"));
    fireEvent.click(screen.getByTestId("site-request-open"));
    expect(screen.getByTestId("active-path")).toHaveTextContent("/gestao/crm/funil?opportunity=opp");
    const source = readFileSync("src/components/whitelabel/admin/AgencyAdminArea.tsx", "utf8");
    expect(source.match(/<WorkspaceSiteRequestAlert/g)).toHaveLength(1);
    expect(source).not.toContain("<NewSiteRequestAlert");
  });
  it("preserves opportunity and hash in legacy links", async () => {
    function Probe() { const loc = useLocation(); return <span data-testid="destination">{loc.pathname + loc.search + loc.hash}</span>; }
    render(<MemoryRouter initialEntries={["/crm?opportunity=opp-42#details"]}><Routes><Route path="/crm" element={<LegacyCrmRedirect/>}/><Route path="/gestao-clientes/funil" element={<Probe/>}/></Routes></MemoryRouter>);
    await waitFor(() => expect(screen.getByTestId("destination")).toHaveTextContent("/gestao-clientes/funil?opportunity=opp-42#details"));
    const page = readFileSync("src/pages/GestaoClientes.tsx", "utf8");
    expect(page).toContain("<KanbanMaximizeProvider>");
    expect(page).toContain("<KanbanMaximizeSurface");
  });
  it("retains dashboard/goals routes and a fresh undo callback", () => {
    const routes = readFileSync("src/components/whitelabel/admin/AgencyAdminArea.tsx", "utf8");
    expect(routes).toContain('["crm/dashboard", GestaoClientes]');
    expect(routes).toContain('["crm/metas", GestaoClientes]');
    const board = readFileSync("src/components/crm/KanbanBoard.tsx", "utf8");
    expect(board).toContain('latestPerformMove.current = performMove');
    expect(board).toContain('latestPerformMove.current(opp.id, back');
    expect(board).toContain('if (!moved) return;');
  });
});
