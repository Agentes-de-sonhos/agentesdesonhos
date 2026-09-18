import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import "@testing-library/jest-dom";
import { readFileSync } from "fs";
import { resolve } from "path";
import { TooltipProvider } from "@/components/ui/tooltip";
import {
  ProjectRowActions,
  PUBLIC_VIEW_ENABLED_LABEL,
  PUBLIC_VIEW_DISABLED_LABEL,
} from "@/components/shared/ProjectRowActions";
import { buildProjectPublicUrl } from "@/lib/projectPublicUrl";
import {
  workspaceReducer,
  makeHomeTab,
  MAX_TABS,
  countContentTabs,
  type WorkspaceTab,
} from "@/workspace/WorkspaceProvider";

const page = readFileSync(resolve(process.cwd(), "src/pages/MeusProjetos.tsx"), "utf8");

afterEach(() => vi.restoreAllMocks());

// ------------------------------------------------------------------
// 1. Link público por tipo
// ------------------------------------------------------------------
describe("buildProjectPublicUrl — versão pública dos três tipos", () => {
  const base = { agencyName: "Casa Nova Tur", publicAccessCode: "ABC123" };

  it("orçamento publicado gera link no domínio oficial", () => {
    expect(buildProjectPublicUrl({ kind: "quote", status: "published", ...base })).toBe(
      "https://seuorcamento.tur.br/casa-nova-tur/ABC123",
    );
  });

  it("carteira ativa gera link no domínio oficial", () => {
    expect(buildProjectPublicUrl({ kind: "trip", status: "active", ...base })).toBe(
      "https://carteiradigital.tur.br/casa-nova-tur/ABC123",
    );
  });

  it("roteiro publicado ou aprovado gera link no domínio oficial", () => {
    expect(buildProjectPublicUrl({ kind: "itinerary", status: "published", ...base })).toBe(
      "https://seuroteiro.tur.br/casa-nova-tur/ABC123",
    );
    expect(buildProjectPublicUrl({ kind: "itinerary", status: "approved", ...base })).toBeTruthy();
  });

  it("rascunho não gera link em nenhum dos três tipos", () => {
    expect(buildProjectPublicUrl({ kind: "quote", status: "draft", ...base })).toBeNull();
    expect(buildProjectPublicUrl({ kind: "trip", status: "draft", ...base })).toBeNull();
    expect(buildProjectPublicUrl({ kind: "itinerary", status: "draft", ...base })).toBeNull();
  });

  it("sem código público ou sem identificação da agência não gera link", () => {
    expect(
      buildProjectPublicUrl({ kind: "quote", status: "published", agencyName: "X", publicAccessCode: null }),
    ).toBeNull();
    expect(
      buildProjectPublicUrl({ kind: "quote", status: "published", agencyName: null, publicAccessCode: "ABC" }),
    ).toBeNull();
  });

  it("colaborador com domínio personalizado da agência preserva o domínio próprio", () => {
    expect(
      buildProjectPublicUrl({
        kind: "quote",
        status: "published",
        publicAccessCode: "ABC123",
        agencyName: null,
        customDomain: "www.casanovatur.com.br",
      }),
    ).toBe("https://www.casanovatur.com.br/orcamento/ABC123");
    expect(
      buildProjectPublicUrl({
        kind: "itinerary",
        status: "published",
        publicAccessCode: "ABC123",
        agencyName: "Casa Nova Tur",
        customDomain: "www.casanovatur.com.br",
      }),
    ).toBe("https://www.casanovatur.com.br/roteiro/ABC123");
  });
});

// ------------------------------------------------------------------
// 2. Ações da linha
// ------------------------------------------------------------------
function renderActions(publicUrl: string | null) {
  const onEdit = vi.fn();
  const onDuplicate = vi.fn();
  const onDelete = vi.fn();
  render(
    <TooltipProvider>
      <ProjectRowActions
        publicUrl={publicUrl}
        onEdit={onEdit}
        onDuplicate={onDuplicate}
        onDelete={onDelete}
      />
    </TooltipProvider>,
  );
  return { onEdit, onDuplicate, onDelete };
}

describe("ProjectRowActions — olho, lápis, duplicar, excluir", () => {
  it("mantém exatamente as quatro ações nesta ordem", () => {
    renderActions("https://seuorcamento.tur.br/a/b");
    const labels = Array.from(document.querySelectorAll("button")).map((b) =>
      b.getAttribute("aria-label"),
    );
    expect(labels).toEqual([PUBLIC_VIEW_ENABLED_LABEL, "Editar", "Duplicar", "Excluir"]);
  });

  it("publicado: olho abre a URL pública em nova aba do navegador com noopener", () => {
    const openSpy = vi.spyOn(window, "open").mockImplementation(() => null);
    renderActions("https://seuorcamento.tur.br/a/b");
    fireEvent.click(screen.getByLabelText(PUBLIC_VIEW_ENABLED_LABEL));
    expect(openSpy).toHaveBeenCalledWith(
      "https://seuorcamento.tur.br/a/b",
      "_blank",
      "noopener,noreferrer",
    );
  });

  it("sem link válido: olho esmaecido, desabilitado e sem clique", () => {
    const openSpy = vi.spyOn(window, "open").mockImplementation(() => null);
    renderActions(null);
    const eye = screen.getByLabelText(PUBLIC_VIEW_DISABLED_LABEL);
    expect(eye).toBeDisabled();
    expect(eye.className).toContain("opacity-40");
    fireEvent.click(eye);
    expect(openSpy).not.toHaveBeenCalled();
  });

  it("duplicar e excluir continuam acionando os fluxos atuais", () => {
    const { onDuplicate, onDelete, onEdit } = renderActions(null);
    fireEvent.click(screen.getByLabelText("Duplicar"));
    fireEvent.click(screen.getByLabelText("Excluir"));
    fireEvent.click(screen.getByLabelText("Editar"));
    expect(onDuplicate).toHaveBeenCalledTimes(1);
    expect(onDelete).toHaveBeenCalledTimes(1);
    expect(onEdit).toHaveBeenCalledTimes(1);
  });
});

// ------------------------------------------------------------------
// 3. Abas internas
// ------------------------------------------------------------------
describe("Edição em nova aba interna", () => {
  const homePath = "/dashboard";
  const initial = () => ({
    tabs: [makeHomeTab(homePath)],
    activeId: "tab_home",
    homePath,
  });
  const openProject = (state: any, path: string) =>
    workspaceReducer(state, { type: "OPEN_OR_ACTIVATE", path, title: path });

  it("dois projetos diferentes ficam abertos simultaneamente", () => {
    let s = openProject(initial(), "/ferramentas-ia/gerar-orcamento/id-1");
    s = openProject(s, "/ferramentas-ia/gerar-orcamento/id-2");
    expect(countContentTabs(s.tabs)).toBe(2);
    expect(s.activeId).toBe(s.tabs[2].id);
  });

  it("reabrir o mesmo projeto apenas foca a aba existente", () => {
    let s = openProject(initial(), "/ferramentas-ia/trip-wallet/id-1");
    const firstId = s.tabs[1].id;
    s = openProject(s, "/ferramentas-ia/criar-roteiro/id-9");
    s = openProject(s, "/ferramentas-ia/trip-wallet/id-1");
    expect(countContentTabs(s.tabs)).toBe(2);
    expect(s.activeId).toBe(firstId);
  });

  it("limite de 10 abas mantém o comportamento atual", () => {
    let s: any = initial();
    for (let i = 0; i < MAX_TABS + 3; i++) {
      s = openProject(s, `/ferramentas-ia/gerar-orcamento/id-${i}`);
    }
    expect(countContentTabs(s.tabs as WorkspaceTab[])).toBe(MAX_TABS);
  });
});

// ------------------------------------------------------------------
// 4. Listagem de Meus Projetos
// ------------------------------------------------------------------
describe("Meus Projetos — listagem padronizada", () => {
  it("nome do projeto e lápis executam a mesma ação de edição", () => {
    expect(page).toContain("onClick={() => handleEdit(item)}");
    expect(page).toContain("onTitleClick={() => handleEdit(item)}");
    expect(page).toContain("onEdit={() => handleEdit(item)}");
  });

  it("edição abre aba interna pelo gerenciador existente, sem nova aba do navegador", () => {
    expect(page).toContain("useOpenInternalWindow");
    expect(page).toContain("openInternalWindow(editPathFor(item)");
    expect(page).not.toContain("window.open(");
  });

  it("roteiros não exibem mais estrela, link e PDF na listagem", () => {
    expect(page).not.toContain('label="Salvar como modelo"');
    expect(page).not.toContain('label="Publicar / Link"');
    expect(page).not.toContain('label="Gerar PDF"');
  });

  it("as três abas usam o mesmo componente compartilhado de ações", () => {
    expect(page.match(/<ProjectRowActions/g)?.length).toBe(2);
    expect(page).toContain("buildProjectPublicUrl");
  });

  it("aba Modelos e funcionalidade de salvar modelo seguem existindo", () => {
    expect(page).toContain("SaveAsTemplateDialog");
    expect(page).toContain('value="modelos"');
  });
});
