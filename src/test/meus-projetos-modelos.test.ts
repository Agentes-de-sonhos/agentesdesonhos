import { describe, expect, it } from "vitest";
import { readFileSync } from "fs";
import { resolve } from "path";

const read = (p: string) => readFileSync(resolve(process.cwd(), p), "utf8");

const page = read("src/pages/MeusProjetos.tsx");
const blocoNotas = read("src/pages/BlocoNotas.tsx");
const notesGrid = read("src/components/notes/NotesGrid.tsx");

describe("Meus Projetos — navegação principal", () => {
  it("mantém a ordem Orçamentos | Carteiras | Roteiros | Modelos", () => {
    const order = ["orcamentos", "carteiras", "roteiros", "modelos"].map((v) =>
      page.indexOf(`<TabsTrigger\n                    value="${v}"`) >= 0
        ? page.indexOf(`value="${v}"`)
        : page.indexOf(`value="${v}"`)
    );
    expect(order.every((i) => i > 0)).toBe(true);
    expect([...order]).toEqual([...order].sort((a, b) => a - b));
  });

  it("posiciona a navegação antes da linha de busca/filtros", () => {
    expect(page.indexOf("</TabsList>")).toBeLessThan(
      page.indexOf("Buscar por nome, cliente ou destino")
    );
  });

  it("não mantém uma segunda barra de abas de projetos (Bloco de Notas removido do topo)", () => {
    expect(page).not.toContain('value="bloco-notas"');
    expect(page.match(/<TabsList/g)?.length).toBe(2); // principal + subabas de Modelos
    expect(page).toContain("{isProjectTab && (");
  });

  it("aceita links antigos ?tab=bloco-notas abrindo Textos Prontos", () => {
    expect(page).toContain('activeTab === "bloco-notas"');
    expect(page).toContain('tabs.push("bloco-notas")');
  });
});

describe("Meus Projetos — visualização Modelos", () => {
  it("exibe título e subtítulo definidos", () => {
    expect(page).toContain(">Modelos</h2>");
    expect(page).toContain(
      "Organize e reutilize roteiros e textos para criar seus projetos com mais agilidade."
    );
  });

  it("contém somente Roteiros e Textos Prontos", () => {
    const start = page.indexOf('<TabsContent value="modelos"');
    const end = page.indexOf('<TabsContent value="reservas"');
    const block = page.slice(start, end > start ? end : undefined);
    expect(block).toMatch(/value="roteiros"[\s\S]*Roteiros/);
    expect(block).toContain("Textos Prontos");
    expect(block).not.toContain("Orçamentos");
    expect(block).not.toContain("Carteiras");
  });

  it("reutiliza os modelos de roteiro e o bloco de notas existentes", () => {
    expect(page).toContain("<TemplatesGrid />");
    expect(page).toContain('<BlocoNotasContent variant="texts" />');
  });
});

describe("Textos Prontos — reuso de notes", () => {
  it("reutiliza o mesmo hook/tabela sem migração ou duplicação", () => {
    expect(blocoNotas).toContain('useNotes');
    expect(blocoNotas).toContain("BlocoNotasInner variant={variant}");
    expect(notesGrid).toContain("NOTES_COPY");
  });

  it("troca apenas rótulos visíveis no contexto de textos", () => {
    expect(notesGrid).toContain('create: "Novo texto"');
    expect(blocoNotas).toContain('isTexts ? "Excluir texto" : "Excluir nota"');
    expect(notesGrid).toContain('create: "Nova Nota"');
  });
});
