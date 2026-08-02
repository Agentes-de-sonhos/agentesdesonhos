import { describe, it, expect } from "vitest";
import { readFileSync } from "fs";

const src = readFileSync("src/components/layout/AppSidebar.tsx", "utf8");

describe("AppSidebar — estado recolhido é visualmente neutro", () => {
  it("não usa Tooltip/Popover de item algum (sem portais/flicker)", () => {
    expect(src).not.toMatch(/<TooltipTrigger/);
    expect(src).not.toMatch(/<TooltipContent/);
    expect(src).not.toMatch(/<Popover[ >]/);
    expect(src).not.toMatch(/PopoverTrigger|PopoverContent/);
  });

  it("classes de hover são aplicadas apenas quando expandido", () => {
    // itens simples: ramo collapsed sem hover:
    expect(src).toMatch(/collapsed\s*\n?\s*\?\s*cn\("text-sidebar-foreground", isLocked && "opacity-60"\)/);
    // seção recolhida: botão neutro, sem hoverColor
    const collapsedSection = src.slice(src.indexOf("if (collapsed) {\n      return (\n        <nav key={section.title}"));
    const sectionBlock = collapsedSection.slice(0, collapsedSection.indexOf("</nav>"));
    expect(sectionBlock).not.toMatch(/hover:/);
    expect(sectionBlock).not.toMatch(/group-hover/);
    expect(sectionBlock).toMatch(/aria-label=\{section\.title\}/);
  });

  it("expansão é disparada no container e clique recolhido apenas expande", () => {
    expect(src).toMatch(/onMouseEnter=\{handleSidebarMouseEnter\}/);
    expect(src).toMatch(/const expandNow = useCallback/);
    expect(src).toMatch(/if \(collapsed\) \{\s*\n\s*e\.preventDefault\(\);\s*\n\s*expandNow\(\);/);
  });

  it("mantém nome acessível nos ícones recolhidos", () => {
    expect(src).toMatch(/aria-label=\{collapsed \? item\.title : undefined\}/);
    expect(src).toMatch(/aria-label="Suporte"/);
  });

  it("preserva cores temáticas e submenus no estado expandido", () => {
    expect(src).toMatch(/sectionStyle\.hoverColor/);
    expect(src).toMatch(/section\.headerHoverBg/);
    expect(src).toMatch(/isOpen && !collapsed/);
  });
});
