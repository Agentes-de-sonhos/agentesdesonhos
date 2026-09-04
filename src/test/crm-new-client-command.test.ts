import { describe, it, expect } from "vitest";
import { readFileSync } from "fs";
import { resolve } from "path";

const read = (p: string) => readFileSync(resolve(process.cwd(), p), "utf-8");
const menu = read("src/lib/agencyAdminMenu.ts");
const clients = read("src/components/crm/ClientsModule.tsx");

describe("comando 'Cliente' do menu Criar novo", () => {
  it("usa /gestao/crm/clientes?new=1 com permissão clients.create", () => {
    expect(menu).toContain('"/gestao/crm/clientes?new=1"');
    expect(menu).not.toContain("clientes?novo=1");
    expect(menu).toContain('"clients.create"');
  });

  it("ClientsModule consome new=1 e remove o parâmetro com replace", () => {
    expect(clients).toContain('searchParams.get("new") === "1"');
    expect(clients).toContain('next.delete("new")');
    expect(clients).toContain("setSearchParams(next, { replace: true })");
    expect(clients).toContain("if (!canCreate) return;");
  });

  it("abre o perfil do cliente recém-criado sem criar outros registros", () => {
    expect(clients).toContain("openProfileAfterCreateRef");
    expect(clients).toContain("setSelectedClient(createdClient)");
    expect(clients).not.toContain("createOpportunity");
  });
});
