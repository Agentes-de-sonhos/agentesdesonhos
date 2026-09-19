import { describe, it, expect } from "vitest";
import { readFileSync } from "fs";

const src = readFileSync("src/components/layout/AppSidebar.tsx", "utf8");

describe("AppSidebar — estado recolhido é visualmente neutro", () => {
  it("não usa tooltip/popover nos itens de navegação recolhidos", () => {
    expect(src).not.toMatch(/<TooltipTrigger/);
    expect(src).not.toMatch(/<TooltipContent/);
    expect(src).not.toMatch(/<Popover[ >]/);
    expect(src).not.toMatch(/PopoverTrigger|PopoverContent/);
  });

  it("classes de hover são aplicadas apenas quando expandido", () => {
    // itens simples: ramo collapsed sem hover:
    expect(src).toMatch(/collapsed\s*\n?\s*\?\s*cn\("text-sidebar-foreground", isLocked && "opacity-60"\)/);
    // seção recolhida: botão neutro, sem hoverColor
    expect(src).toContain('collapsed ? cn("text-sidebar-foreground", locked && "opacity-60")');
  });

  it("expansão é disparada no container e clique recolhido apenas expande", () => {
    expect(src).toMatch(/onMouseEnter=\{handleSidebarMouseEnter\}/);
    expect(src).toMatch(/const expandNow = useCallback/);
    expect(src).toMatch(/if \(collapsed\) \{\s*event\.preventDefault\(\);\s*expandNow\(\);/);
  });

  it("mantém nome acessível nos ícones recolhidos", () => {
    expect(src).toMatch(/aria-label=\{collapsed \? item\.title : undefined\}/);
    expect(src).toContain("AppSidebarAccount");
  });

  it("preserva cores temáticas e submenus no estado expandido", () => {
    expect(src).toContain("bg-sidebar-accent");
    expect(src).toMatch(/open && !collapsed/);
  });
});
