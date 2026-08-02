import { describe, it, expect } from "vitest";
import { readFileSync } from "fs";
import { SIDEBAR_ROW_CLASS, SIDEBAR_ROW_GAP_CLASS, calculateAnchorScrollDelta } from "@/lib/sidebarAnchor";

const src = readFileSync("src/components/layout/AppSidebar.tsx", "utf8");

describe("calculateAnchorScrollDelta", () => {
  it("delta positivo quando o item desceu", () => {
    expect(calculateAnchorScrollDelta(100, 140)).toBe(40);
  });
  it("delta negativo quando o item subiu", () => {
    expect(calculateAnchorScrollDelta(140, 100)).toBe(-40);
  });
  it("zero quando estável ou variação sub-pixel", () => {
    expect(calculateAnchorScrollDelta(100, 100)).toBe(0);
    expect(calculateAnchorScrollDelta(100, 100.4)).toBe(0);
  });
  it("zero para valores inválidos", () => {
    expect(calculateAnchorScrollDelta(NaN, 10)).toBe(0);
    expect(calculateAnchorScrollDelta(10, Infinity)).toBe(0);
  });
});

describe("token de geometria compartilhado", () => {
  it("define altura mínima, padding zero e alinhamento central", () => {
    expect(SIDEBAR_ROW_CLASS).toContain("min-h-8");
    expect(SIDEBAR_ROW_CLASS).toContain("py-0");
    expect(SIDEBAR_ROW_CLASS).toContain("items-center");
    expect(SIDEBAR_ROW_GAP_CLASS).toBe("gap-0.5");
  });

  it("AppSidebar não usa paddings/gaps dependentes de collapsed", () => {
    expect(src).not.toMatch(/collapsed \? "py-/);
    expect(src).not.toMatch(/gap-\[2px\]/);
    expect(src).not.toMatch(/space-y-\[2px\]/);
  });

  it("todas as linhas principais usam o token compartilhado", () => {
    const uses = src.match(/SIDEBAR_ROW_CLASS/g) ?? [];
    expect(uses.length).toBeGreaterThanOrEqual(6);
  });

  it("apenas largura/cor animam (altura não anima)", () => {
    expect(src).not.toMatch(/rounded-xl px-3 text-sm font-medium transition-all/);
    expect(src).toMatch(/transition-\[width,background-color,color\]/);
  });
});

describe("ancoragem vertical na expansão", () => {
  it("captura a linha sob cursor/foco e reposiciona o scroll do container", () => {
    expect(src).toMatch(/data-sidebar-row=/);
    expect(src).toMatch(/onMouseOver=\{\(e\) => captureAnchor\(e\.target\)\}/);
    expect(src).toMatch(/onFocusCapture=\{\(e\) => captureAnchor\(e\.target\)\}/);
    expect(src).toMatch(/useLayoutEffect\(\(\) => \{[\s\S]*container\.scrollTop \+= delta/);
    expect(src).toMatch(/ref=\{scrollAreaRef\}/);
  });

  it("só captura âncora quando recolhido e não usa window.scroll", () => {
    expect(src).toMatch(/if \(!collapsed \|\| !\(target instanceof Element\)\) return;/);
    expect(src).not.toMatch(/window\.scroll/);
    expect(src).not.toMatch(/scrollIntoView\(\{ behavior: "smooth"/);
  });

  it("preserva seções/grupos abertos pelo usuário", () => {
    expect(src).toMatch(/setOpenSections/);
    expect(src).toMatch(/setOpenGroups/);
  });
});
