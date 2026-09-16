import { describe, it, expect } from "vitest";
import { readFileSync } from "fs";
import { resolve } from "path";
import { MemoryRouter, Routes, Route, Navigate, useLocation } from "react-router-dom";
import { render, screen } from "@testing-library/react";

const read = (p: string) => readFileSync(resolve(process.cwd(), p), "utf8");

const app = read("src/App.tsx");

describe("rota legada /crm desativada com segurança", () => {
  it("App.tsx redireciona /crm para /gestao-clientes/funil com replace", () => {
    expect(app).toContain('<Route path="/crm" element={<Navigate to="/gestao-clientes/funil" replace />} />');
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
      return <span data-testid="loc">{loc.pathname}</span>;
    };
    render(
      <MemoryRouter initialEntries={["/crm"]} initialIndex={0}>
        <Routes>
          <Route path="/crm" element={<Navigate to="/gestao-clientes/funil" replace />} />
          <Route path="/gestao-clientes/funil" element={<Seen />} />
        </Routes>
      </MemoryRouter>
    );
    expect(screen.getByTestId("loc").textContent).toBe("/gestao-clientes/funil");
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
          <Route path="/crm" element={<Navigate to="/gestao-clientes/funil" replace />} />
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
