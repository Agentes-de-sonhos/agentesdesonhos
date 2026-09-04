import { describe, it, expect } from "vitest";
import { readFileSync } from "fs";
import { resolve } from "path";

const read = (p: string) => readFileSync(resolve(process.cwd(), p), "utf8");

const page = read("src/pages/GestaoClientes.tsx");
const kanban = read("src/components/crm/KanbanBoard.tsx");
const operations = read("src/components/crm/operations/OperationsModule.tsx");
const clients = read("src/components/crm/ClientsModule.tsx");

describe("Toolbar compartilhada do CRM (Gestão de Clientes)", () => {
  it("mantém a ordem Oportunidades | Operações | Clientes antes do slot de ações", () => {
    const funil = page.indexOf('value="funil"');
    const ops = page.indexOf('value="operacoes"');
    const cli = page.indexOf('value="clientes"');
    const slot = page.lastIndexOf("setToolbarEl");
    expect(funil).toBeGreaterThan(-1);
    expect(funil).toBeLessThan(ops);
    expect(ops).toBeLessThan(cli);
    expect(cli).toBeLessThan(slot);
  });

  it("posiciona Visão Geral e Meta de Vendas à direita, após o slot", () => {
    const slot = page.lastIndexOf("setToolbarEl");
    expect(page.lastIndexOf('value="dashboard"')).toBeGreaterThan(slot);
    expect(page.lastIndexOf('value="metas"')).toBeGreaterThan(slot);
    expect(page).toContain('className="ml-auto inline-flex');
  });

  it("permite quebra em linhas no mobile, sem scroll horizontal no cabeçalho", () => {
    expect(page).toContain("flex flex-wrap items-center gap-2");
    expect(page).not.toContain("overflow-x-auto px-1 md:mx-0 scrollbar-thin");
  });

  it.each([
    ["oportunidades", kanban],
    ["operações", operations],
    ["clientes", clients],
  ])("aba %s usa o slot compartilhado com busca compacta, + Nova e Maximizar", (_label, source) => {
    expect(source).toContain("KanbanToolbarSlot");
    expect(source).toContain('placeholder="Buscar"');
    expect(source).toContain("Nova");
    expect(source).toContain("Maximizar");
  });

  it("remove o filtro 'Todos os...' da toolbar do CRM", () => {
    expect(kanban).not.toContain("Todos os clientes");
    expect(kanban).not.toContain("Filtrar cliente");
    expect(clients).not.toContain("Todos os status");
    expect(clients).not.toContain('placeholder="Filtrar status"');
  });
});
