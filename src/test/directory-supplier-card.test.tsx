import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { readFileSync } from "node:fs";
import { DirectorySupplierCard } from "@/components/mapa-turismo/DirectorySupplierCard";
import { normalizeSpecialtyTags } from "@/lib/directorySpecialties";
import { getDirectoryCategoryTheme, DIRECTORY_CATEGORY_THEMES } from "@/lib/directoryCategoryTheme";

function renderCard(props: Partial<React.ComponentProps<typeof DirectorySupplierCard>> = {}) {
  const onOpen = props.onOpen ?? vi.fn();
  const onLike = props.onLike ?? vi.fn();
  const utils = render(
    <DirectorySupplierCard
      name="Fornecedor Teste"
      category="Operadoras de turismo"
      likeCount={3}
      liked={false}
      {...props}
      onOpen={onOpen}
      onLike={onLike}
    />,
  );
  return { ...utils, onOpen, onLike };
}

describe("normalizeSpecialtyTags", () => {
  it("separa entradas legadas por vírgula, ponto e vírgula e bullet", () => {
    expect(normalizeSpecialtyTags("Europa, Ásia; Cruzeiros • Lua de mel")).toEqual([
      "Europa", "Ásia", "Cruzeiros", "Lua de mel",
    ]);
  });
  it("deduplica valores idênticos normalizados mantendo a ordem", () => {
    expect(normalizeSpecialtyTags(["Europa", "europa ", { name: "Ásia" }, "EUROPA"])).toEqual(["Europa", "Ásia"]);
  });
  it("ignora vazios e nulos", () => {
    expect(normalizeSpecialtyTags([null, "", { name: null }, "  ,  ; "])).toEqual([]);
    expect(normalizeSpecialtyTags(undefined)).toEqual([]);
  });
});

describe("getDirectoryCategoryTheme", () => {
  it("mapeia as cores obrigatórias por categoria", () => {
    expect(getDirectoryCategoryTheme("Operadoras de turismo").chip).toContain("blue");
    expect(getDirectoryCategoryTheme("Consolidadoras").chip).toContain("violet");
    expect(getDirectoryCategoryTheme("Companhias aéreas").chip).toContain("sky");
    expect(getDirectoryCategoryTheme("Hospedagem").chip).toContain("amber");
    expect(getDirectoryCategoryTheme("Locadoras de veículos").chip).toContain("emerald");
    expect(getDirectoryCategoryTheme("Cruzeiros").chip).toContain("cyan");
    expect(getDirectoryCategoryTheme("Seguros viagem").chip).toContain("rose");
    expect(getDirectoryCategoryTheme("Parques e atrações").chip).toContain("pink");
    expect(getDirectoryCategoryTheme("Receptivos").chip).toContain("orange");
    expect(getDirectoryCategoryTheme("Guias").chip).toContain("teal");
  });
  it("cobre as dez categorias do escopo", () => {
    expect(DIRECTORY_CATEGORY_THEMES).toHaveLength(10);
  });
  it("usa ícone Ship em Cruzeiros e Hotel em Hospedagem", () => {
    expect(getDirectoryCategoryTheme("Cruzeiros").Icon.displayName ?? "").toMatch(/Ship/i);
    expect(getDirectoryCategoryTheme("Hospedagem").Icon.displayName ?? "").toMatch(/Hotel/i);
  });
});

describe("DirectorySupplierCard", () => {
  it("mostra o nome do fornecedor", () => {
    renderCard();
    expect(screen.getByText("Fornecedor Teste")).toBeTruthy();
  });

  it("exibe logotipo com alt adequado e lazy loading", () => {
    renderCard({ logoUrl: "https://x/logo.png" });
    const img = screen.getByAltText("Logotipo da Fornecedor Teste") as HTMLImageElement;
    expect(img.getAttribute("loading")).toBe("lazy");
    expect(img.className).toContain("object-contain");
  });

  it("usa o ícone da categoria como fallback quando não há logo ou a imagem falha", () => {
    const { rerender } = renderCard();
    expect(screen.getByTestId("directory-supplier-logo-fallback")).toBeTruthy();

    rerender(
      <DirectorySupplierCard
        name="Fornecedor Teste" category="Cruzeiros" logoUrl="https://x/broken.png"
        likeCount={0} liked={false} onLike={vi.fn()} onOpen={vi.fn()}
      />,
    );
    fireEvent.error(screen.getByAltText("Logotipo da Fornecedor Teste"));
    expect(screen.getByTestId("directory-supplier-logo-fallback")).toBeTruthy();
  });

  it("renderiza TODAS as especialidades sem +N, limitando apenas a altura a 3 linhas visuais", () => {
    const specialties = Array.from({ length: 14 }, (_, i) => `Especialidade ${i + 1}`);
    renderCard({ specialties });
    const list = screen.getByTestId("specialty-list");
    expect(list.querySelectorAll("[data-specialty]")).toHaveLength(14);
    expect(list.className).toContain("flex-wrap");
    expect(list.className).not.toContain("line-clamp");
    expect(list.getAttribute("data-max-lines")).toBe("3");
    specialties.forEach((s) => expect(screen.getByText(s)).toBeTruthy());
    expect(screen.queryByText(/^\+\d+$/)).toBeNull();
  });

  it("nunca mostra tag Perfil completo/Completo", () => {
    renderCard({ specialties: ["Europa"] });
    expect(screen.queryByText(/perfil completo/i)).toBeNull();
    expect(screen.queryByText(/^completo$/i)).toBeNull();
  });

  it("posiciona curtidas à esquerda e Ver mais à direita no rodapé", () => {
    renderCard();
    const like = screen.getByTestId("directory-supplier-like");
    const more = screen.getByTestId("directory-supplier-more");
    const footer = like.parentElement!;
    expect(footer).toBe(more.parentElement);
    expect(footer.className).toContain("border-t");
    expect(Array.from(footer.children).indexOf(like)).toBe(0);
    expect(Array.from(footer.children).indexOf(more)).toBe(footer.children.length - 1);
    expect(more.textContent).toContain("Ver mais");
  });

  it("aplica a cor da categoria no Ver mais e no container do logo", () => {
    renderCard({ category: "Hospedagem" });
    expect(screen.getByTestId("directory-supplier-more").className).toContain("amber");
    expect(screen.getByTestId("directory-supplier-logo").className).toContain("amber");
  });

  it("não corta conteúdo com altura fixa", () => {
    renderCard();
    const card = screen.getByTestId("directory-supplier-card");
    expect(card.className).toContain("min-h-");
    expect(card.className).not.toMatch(/(^|\s)h-\[/);
    expect(card.className).not.toContain("line-clamp");
  });

  it("clique no joinha não abre o perfil", () => {
    const { onOpen, onLike } = renderCard();
    fireEvent.click(screen.getByTestId("directory-supplier-like"));
    expect(onLike).toHaveBeenCalledTimes(1);
    expect(onOpen).not.toHaveBeenCalled();
  });

  it("clique em Ver mais abre o perfil correto", () => {
    const { onOpen } = renderCard();
    fireEvent.click(screen.getByTestId("directory-supplier-more"));
    expect(onOpen).toHaveBeenCalledTimes(1);
  });
});

describe("auditoria: listagens do Mapa do Turismo usam o card compartilhado", () => {
  const pages = ["src/pages/MapaTurismo.tsx", "src/pages/CruisesPage.tsx"];

  it("todas as páginas de listagem importam DirectorySupplierCard", () => {
    for (const page of pages) {
      const src = readFileSync(page, "utf8");
      expect(src).toContain("DirectorySupplierCard");
    }
  });

  it("nenhuma listagem exibe Perfil completo nem ordena por perfil completo", () => {
    for (const page of pages) {
      const src = readFileSync(page, "utf8");
      expect(src).not.toContain("Perfil completo");
      expect(src).not.toMatch(/a\._hasProfile/);
    }
  });

  it("nenhuma listagem limita especialidades com slice/+N", () => {
    for (const page of pages) {
      const src = readFileSync(page, "utf8");
      expect(src).not.toMatch(/specialties\.slice/);
      expect(src).not.toMatch(/regioes\.slice/);
    }
  });
});