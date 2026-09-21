import { describe, it, expect } from "vitest";
import { readFileSync } from "fs";
import { resolve } from "path";

const read = (p: string) => readFileSync(resolve(process.cwd(), p), "utf8");

const clients = read("src/components/crm/ClientsModule.tsx");
const kanban = read("src/components/crm/KanbanBoard.tsx");
const operations = read("src/components/crm/operations/OperationsModule.tsx");
const operationCard = read("src/components/crm/operations/OperationCard.tsx");
const opportunityCard = read("src/components/crm/OpportunityCard.tsx");
const scrollArea = read("src/components/crm/kanban/KanbanScrollArea.tsx");
const moveToStageMenu = read("src/components/crm/kanban/MoveToStageMenu.tsx");
const dropdownMenu = read("src/components/ui/dropdown-menu.tsx");
const importContacts = read("src/components/crm/ImportContactsDialog.tsx");
const createOperation = read("src/components/crm/operations/CreateOperationDialog.tsx");

describe("CRM mobile UX — alvos de toque e rolagem por etapa", () => {
  it.each([
    ["clientes", clients],
    ["oportunidades", kanban],
    ["operações", operations],
  ])("busca da aba %s ocupa a largura no mobile e mantém densidade no desktop", (_l, source) => {
    expect(source).toContain('className="relative w-full min-w-[150px] shrink-0 sm:w-[150px] lg:w-[190px]"');
    expect(source).toContain("h-10 pl-8 text-sm md:h-8 md:text-xs");
  });

  it.each([
    ["clientes", clients],
    ["oportunidades", kanban],
    ["operações", operations],
  ])("ações da toolbar de %s têm alvo mínimo no mobile", (_l, source) => {
    expect(source).toContain("min-h-11");
    expect(source).toContain("md:min-h-0");
  });

  it("quadros usam snap horizontal só no mobile", () => {
    expect(scrollArea).toContain("snap-x snap-mandatory md:snap-none");
    expect(kanban).toContain("snap-center md:snap-align-none");
    expect(operations).toContain("snap-center md:snap-align-none");
  });

  it("quadros permitem gestos naturais nos dois eixos sem listeners de toque", () => {
    expect(scrollArea).toContain("touch-pan-x touch-pan-y");
    expect(scrollArea).not.toContain("onTouchMove");
    expect(scrollArea).not.toContain("onPointerMove");
  });

  it("submenu Mover usa portal, colisão de viewport e rolagem vertical por toque", () => {
    expect(dropdownMenu).toMatch(/DropdownMenuSubContent[\s\S]*ScopedDropdownPortal/);
    expect(moveToStageMenu).toContain("collisionPadding={12}");
    expect(moveToStageMenu).toContain("avoidCollisions");
    expect(moveToStageMenu).toContain("100dvh");
    expect(moveToStageMenu).toContain("overflow-y-auto overscroll-contain touch-pan-y");
    expect(moveToStageMenu).toContain("max-md:!fixed max-md:!inset-x-3");
  });

  it("menus dos cartões têm 44px no mobile", () => {
    expect(operationCard).toContain("h-11 w-11 shrink-0 text-muted-foreground");
    expect(operationCard).toContain("md:h-6 md:w-6");
    expect(opportunityCard).toContain("h-11 w-11 flex-shrink-0 md:h-7 md:w-7");
    expect(opportunityCard).toContain('aria-label="Ações da oportunidade"');
  });

  it("ações da lista de clientes têm 44px no mobile e foco visível", () => {
    expect(clients).toContain("inline-flex h-11 w-11 md:h-8 md:w-8");
    expect(clients).toContain("focus-visible:ring-2 focus-visible:ring-ring");
  });

  it("estado vazio de operações orienta o arraste sem criar ação nova", () => {
    expect(operations).toContain("Nenhuma operação nesta etapa");
    expect(operations).toContain("Arraste um cartão até aqui para movê-lo.");
  });

  it("anotações usam singular e plural corretos", () => {
    expect(opportunityCard).toContain('notesCount === 1 ? "1 anotação"');
    expect(opportunityCard).not.toContain("anotação(ões)");
  });

  it.each([
    ["clientes", clients],
    ["oportunidades", kanban],
    ["importar contatos", importContacts],
    ["nova operação", createOperation],
  ])("modais de %s são tela cheia no mobile com descrição acessível", (_l, source) => {
    expect(source).toContain("h-[100dvh] max-h-[100dvh] w-screen max-w-none");
    expect(source).toContain("env(safe-area-inset-bottom)");
    expect(source).toContain("<DialogDescription>");
  });
});
