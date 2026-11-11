import { LegacyCrmRedirect } from "@/components/routing/LegacyCrmRedirect";
import { describe, it, expect } from "vitest";
import { readFileSync } from "fs";
import { resolve } from "path";
import { MemoryRouter, Routes, Route, useLocation, useNavigate } from "react-router-dom";
import { render, screen, fireEvent } from "@testing-library/react";

const read = (p: string) => readFileSync(resolve(process.cwd(), p), "utf8");

const app = read("src/App.tsx");

describe("rota legada /crm desativada com segurança", () => {
  it("App.tsx redireciona /crm para /gestao-clientes/funil com replace", () => {
    expect(app).toContain('<Route path="/crm" element={<LegacyCrmRedirect />} />');
  });

  it("não importa nem renderiza mais a página antiga", () => {
    expect(app).not.toContain('import("./pages/CRM")');
    expect(app).not.toContain("element={<CRM />}");
  });

  it("mantém a tela atual de Gestão de Clientes nas rotas novas", () => {
    expect(app).toContain('path="/gestao-clientes/funil" element={<GestaoClientes />}');
  });

  it("a página antiga e componentes compartilhados continuam existindo no disco", () => {
    expect(read("src/pages/CRM.tsx")).toContain("KanbanBoard");
    expect(read("src/components/crm/ClientsManager.tsx")).toContain("export function ClientsManager");
  });

  it("redireciona de /crm para o funil sem exibir a página antiga e sem entrada extra no histórico", () => {
    const Seen = () => {
      const loc = useLocation();
      const navigate = useNavigate();
      return <><span data-testid="loc">{loc.pathname + loc.search + loc.hash}</span><button onClick={() => navigate(-1)}>Voltar</button></>;
    };
    render(
      <MemoryRouter initialEntries={["/origem", "/crm?opportunity=opp-42#details"]} initialIndex={1}>
        <Routes>
          <Route path="/origem" element={<span>Origem</span>} />
          <Route path="/crm" element={<LegacyCrmRedirect />} />
          <Route path="/gestao-clientes/funil" element={<Seen />} />
        </Routes>
      </MemoryRouter>
    );
    expect(screen.getByTestId("loc").textContent).toBe("/gestao-clientes/funil?opportunity=opp-42#details");
    fireEvent.click(screen.getByText("Voltar"));
    expect(screen.getByText("Origem")).toBeInTheDocument();
  });

  it("redirecionamento com replace não cria loop nem passo extra no histórico", () => {
    const seen: string[] = [];
    const Tracker = () => {
      const loc = useLocation();
      seen.push(loc.pathname);
      return null;
    };
    render(
      <MemoryRouter initialEntries={["/crm"]} initialIndex={0}>
        <Tracker />
        <Routes>
          <Route path="/crm" element={<LegacyCrmRedirect />} />
          <Route path="/gestao-clientes/funil" element={<span>funil</span>} />
        </Routes>
      </MemoryRouter>
    );
    // /crm aparece uma única vez (a entrada inicial) e é substituída de imediato
    // pelo destino: sem renderização estável da página antiga e sem loop.
    expect(seen[0]).toBe("/crm");
    expect(seen.filter((p) => p === "/crm")).toHaveLength(1);
    expect(seen[seen.length - 1]).toBe("/gestao-clientes/funil");
  });
});
