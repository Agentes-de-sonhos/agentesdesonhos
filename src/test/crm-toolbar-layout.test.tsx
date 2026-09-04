import { describe, it, expect } from "vitest";
import { readFileSync } from "fs";
import { resolve } from "path";

const read = (p: string) => readFileSync(resolve(process.cwd(), p), "utf8");

const page = read("src/pages/GestaoClientes.tsx");
const kanban = read("src/components/crm/KanbanBoard.tsx");
const operations = read("src/components/crm/operations/OperationsModule.tsx");
const clients = read("src/components/crm/ClientsModule.tsx");

describe("Toolbar compartilhada do CRM (Gestão de Clientes)", () => {
  it("linha superior traz apenas o PageHeader e as abas ficam abaixo", () => {
    const header = page.indexOf("<PageHeader");
    const mainTabs = page.indexOf('value="clientes"');
    expect(header).toBeGreaterThan(-1);
    expect(header).toBeLessThan(mainTabs);
    expect(page).not.toContain('data-testid="crm-secondary-nav"');
    expect(page).toContain("flex flex-wrap items-start justify-between gap-3");
  });

  it("abas principais na ordem Clientes | Oportunidades | Operações | Visão Geral", () => {
    const cli = page.indexOf('value="clientes"');
    const funil = page.indexOf('value="funil"');
    const ops = page.indexOf('value="operacoes"');
    const dash = page.indexOf('value="dashboard"');
    const slot = page.lastIndexOf("setToolbarEl");
    expect(cli).toBeLessThan(funil);
    expect(funil).toBeLessThan(ops);
    expect(ops).toBeLessThan(dash);
    expect(dash).toBeLessThan(slot);
  });

  it("exibe o título único 'Gestão de Relacionamento com Clientes' nas três abas", () => {
    expect(page).toContain('title="Gestão de Relacionamento com Clientes"');
    expect(page).not.toContain('title="CRM"');
    expect(page).not.toContain("titleAfter");
    expect(page).not.toContain('title="Gestão de Clientes"');
    expect(page).not.toContain("Gerencie clientes, oportunidades e metas de vendas");
  });

  it("mantém o subtítulo exato compartilhado em todas as abas", () => {
    expect(page).toContain(
      "Centralize clientes, oportunidades, operações e metas de vendas em um só lugar."
    );
  });

  it("slot de ações ocupa o espaço disponível para empurrar Importar à direita", () => {
    expect(page).toContain("flex min-w-0 flex-1 flex-wrap items-center gap-1.5");
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

  it("Importar aparece só na aba Clientes, dentro do slot e depois de Maximizar", () => {
    const slotStart = clients.indexOf("<KanbanToolbarSlot>");
    const slotEnd = clients.indexOf("</KanbanToolbarSlot>");
    const slotContent = clients.slice(slotStart, slotEnd);
    const maximizar = slotContent.indexOf("Maximizar");
    const importar = slotContent.indexOf("Importar");
    expect(maximizar).toBeGreaterThan(-1);
    expect(importar).toBeGreaterThan(maximizar);
    expect(slotContent).toContain("ml-auto");
    expect(kanban).not.toContain("Importar");
    expect(operations).not.toContain("Importar");
  });

  it("remove a posição antiga 'Importar Contatos' sem duplicar botão e preserva o modal", () => {
    expect(clients).not.toContain("Importar Contatos");
    expect(clients.match(/setIsImportOpen\(true\)/g)?.length).toBe(1);
    expect(clients).toContain("ImportContactsDialog");
  });

  it("remove o filtro 'Todos os...' da toolbar do CRM", () => {
    expect(kanban).not.toContain("Todos os clientes");
    expect(kanban).not.toContain("Filtrar cliente");
    expect(clients).not.toContain("Todos os status");
    expect(clients).not.toContain('placeholder="Filtrar status"');
  });
});
