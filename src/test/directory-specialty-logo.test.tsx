import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { readFileSync } from "node:fs";
import { SpecialtyChip, SpecialtyList } from "@/components/mapa-turismo/SpecialtyChip";
import { SupplierLogoFrame } from "@/components/mapa-turismo/SupplierLogoFrame";
import { OperatorHero } from "@/components/operator/OperatorHero";
import { DirectorySupplierCard } from "@/components/mapa-turismo/DirectorySupplierCard";
import {
  SPECIALTY_CHIP_COLORS, getSpecialtyChipClass, chipRowsMaxHeight,
  CARD_CHIP_HEIGHT_PX, CARD_CHIP_GAP_PX,
} from "@/lib/directorySpecialtyPalette";
import { DIRECTORY_CATEGORY_THEMES, getDirectoryCategoryTheme } from "@/lib/directoryCategoryTheme";

const SPECIALTIES = "Europa, Ásia, Cruzeiros, Lua de mel, Disney, Caribe, África";

describe("paleta compartilhada de especialidades", () => {
  it("expõe a paleta multicolorida do perfil (sem segunda paleta)", () => {
    expect(SPECIALTY_CHIP_COLORS).toHaveLength(6);
    const joined = SPECIALTY_CHIP_COLORS.join(" ");
    ["sky", "amber", "emerald", "violet", "rose", "cyan"].forEach((c) => expect(joined).toContain(c));
  });

  it("atribui cor determinística pelo índice normalizado", () => {
    expect(getSpecialtyChipClass(0)).toBe(SPECIALTY_CHIP_COLORS[0]);
    expect(getSpecialtyChipClass(6)).toBe(SPECIALTY_CHIP_COLORS[0]);
    expect(getSpecialtyChipClass(7)).toBe(getSpecialtyChipClass(1));
    expect(getSpecialtyChipClass(-1)).toBe(SPECIALTY_CHIP_COLORS[5]);
  });

  it("mesma especialidade recebe a mesma cor no card e no perfil", () => {
    const card = render(<SpecialtyList specialties={SPECIALTIES} variant="card" maxLines={3} />);
    const cardClasses = Array.from(card.container.querySelectorAll("[data-specialty]")).map(
      (el) => ({ tag: el.getAttribute("data-specialty"), color: SPECIALTY_CHIP_COLORS.find((c) => el.className.includes(c.split(" ")[0])) }),
    );
    card.unmount();

    const profile = render(<SpecialtyList specialties={SPECIALTIES} variant="profile" />);
    const profileClasses = Array.from(profile.container.querySelectorAll("[data-specialty]")).map(
      (el) => ({ tag: el.getAttribute("data-specialty"), color: SPECIALTY_CHIP_COLORS.find((c) => el.className.includes(c.split(" ")[0])) }),
    );

    expect(cardClasses).toEqual(profileClasses);
    expect(cardClasses.every((c) => !!c.color)).toBe(true);
  });

  it("chip mantém texto em uma linha e altura uniforme no card", () => {
    render(<SpecialtyChip label="Lua de mel" index={2} variant="card" />);
    const chip = screen.getByTestId("specialty-chip");
    expect(chip.className).toContain("whitespace-nowrap");
    expect(chip.style.height).toBe(`${CARD_CHIP_HEIGHT_PX}px`);
  });
});

describe("limite de 3 linhas visuais nos cards", () => {
  it("calcula max-height a partir da altura real do chip + gaps", () => {
    expect(chipRowsMaxHeight(3)).toBe(`${3 * CARD_CHIP_HEIGHT_PX + 2 * CARD_CHIP_GAP_PX}px`);
  });

  it("card recorta linhas inteiras sem scrollbar e sem quantidade fixa", () => {
    render(<SpecialtyList specialties={SPECIALTIES} variant="card" maxLines={3} />);
    const list = screen.getByTestId("specialty-list");
    expect(list.style.maxHeight).toBe(chipRowsMaxHeight(3));
    expect(list.className).toContain("overflow-hidden");
    expect(list.className).not.toContain("overflow-auto");
    expect(list.className).toContain("flex-wrap");
    expect(list.className).toContain("gap-1.5");
    // todas as especialidades renderizadas — o corte é apenas visual
    expect(list.querySelectorAll("[data-specialty]")).toHaveLength(7);
  });

  it("não cria espaço branco artificial quando há poucas especialidades", () => {
    render(<SpecialtyList specialties="Europa" variant="card" maxLines={3} />);
    expect(screen.getByTestId("specialty-list").style.minHeight).toBe("");
  });

  it("perfil não limita linhas nem oculta overflow", () => {
    render(<SpecialtyList specialties={SPECIALTIES} variant="profile" />);
    const list = screen.getByTestId("specialty-list");
    expect(list.style.maxHeight).toBe("");
    expect(list.className).not.toContain("overflow-hidden");
    expect(list.className).toContain("gap-2");
    expect(list.querySelectorAll("[data-specialty]")).toHaveLength(7);
  });

  it("card do diretório aplica o limite de 3 linhas", () => {
    render(
      <DirectorySupplierCard
        name="Consolidadora Teste" category="Consolidadoras" specialties={SPECIALTIES}
        likeCount={0} liked={false} onLike={() => {}} onOpen={() => {}}
      />,
    );
    expect(screen.getByTestId("specialty-list").getAttribute("data-max-lines")).toBe("3");
  });
});

describe("moldura do logotipo", () => {
  it("usa fundo branco e apenas contorno temático em todas as categorias", () => {
    for (const theme of DIRECTORY_CATEGORY_THEMES) {
      const { unmount } = render(<SupplierLogoFrame name="X" logoUrl="https://x/l.png" category={theme.category} />);
      const frame = screen.getByTestId("supplier-logo-frame");
      expect(frame.className).toContain("bg-white");
      expect(frame.className).toContain(theme.logoBorder.split(" ")[0]);
      expect(frame.className).not.toContain("bg-gradient");
      unmount();
    }
  });

  it("fallback sem logo mantém moldura branca e ícone da categoria", () => {
    render(<SupplierLogoFrame name="Sem Logo" category="Receptivos" />);
    const frame = screen.getByTestId("supplier-logo-frame");
    expect(frame.className).toContain("bg-white");
    const icon = screen.getByTestId("supplier-logo-frame-fallback");
    expect(icon.getAttribute("class")).toContain(getDirectoryCategoryTheme("Receptivos").iconColor.split(" ")[0]);
  });

  it("card do diretório usa a moldura compartilhada", () => {
    render(
      <DirectorySupplierCard
        name="Operadora" category="Operadoras de turismo" logoUrl="https://x/o.png"
        likeCount={0} liked={false} onLike={() => {}} onOpen={() => {}}
      />,
    );
    const frame = screen.getByTestId("directory-supplier-logo");
    expect(frame.className).toContain("bg-white");
    expect(frame.className).toContain("border-blue-200");
    expect((screen.getByAltText("Logotipo da Operadora") as HTMLImageElement).className).toContain("object-contain");
  });

  it("hero do perfil aplica a mesma regra, apenas maior", () => {
    render(<OperatorHero name="Consolidadora" category="Consolidadoras" logoUrl="https://x/c.png" hideRating />);
    const frame = screen.getByTestId("operator-hero-logo");
    expect(frame.className).toContain("bg-white");
    expect(frame.className).toContain("border-violet-200");
    expect(frame.className).toContain("h-20 w-20");
    expect(frame.className).not.toContain("bg-gradient");
  });

  it("hero sem logo mostra inicial na cor da categoria", () => {
    render(<OperatorHero name="Zeta Turismo" category="Cruzeiros" hideRating />);
    expect(screen.getByTestId("operator-hero-logo-fallback").textContent).toBe("Z");
  });
});

describe("consistência entre componentes do diretório", () => {
  it("perfil comercial (OperatorSidebar) consome a lista compartilhada", () => {
    const src = readFileSync("src/components/operator/OperatorSidebar.tsx", "utf8");
    expect(src).toContain("SpecialtyList");
    expect(src).not.toContain("chipColors");
  });

  it("componente de cruzeiros usa moldura branca com contorno temático", () => {
    const src = readFileSync("src/components/mapa-turismo/CruiseCompanyLogo.tsx", "utf8");
    expect(src).toContain("bg-white");
    expect(src).toContain("border-cyan-200");
  });

  it("perfil de cruzeiros usa o tema Cruzeiros na moldura", () => {
    const src = readFileSync("src/pages/CruiseDetailPage.tsx", "utf8");
    expect(src).toContain('themeCategory="Cruzeiros"');
  });

  it("todas as categorias seguem tendo tema definido", () => {
    expect(DIRECTORY_CATEGORY_THEMES).toHaveLength(10);
    DIRECTORY_CATEGORY_THEMES.forEach((t) => expect(t.logoBorder).toMatch(/^border-/));
  });
});