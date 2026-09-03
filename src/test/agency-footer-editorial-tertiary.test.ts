import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const src = readFileSync("src/components/whitelabel/AgencySiteLayout.tsx", "utf8");

function branch(start: string, end: string): string {
  const a = src.indexOf(start);
  expect(a).toBeGreaterThan(-1);
  const b = src.indexOf(end, a);
  expect(b).toBeGreaterThan(a);
  return src.slice(a, b);
}

describe("rodapé editorial compartilhado", () => {
  const editorial = branch('<footer id="rodape" className="bg-[var(--brand-tertiary', "if (editorial)".length ? "\n  return (" : "");

  it("usa a terciária dinâmica da agência, e não fundo escuro fixo", () => {
    expect(editorial).toContain("bg-[var(--brand-tertiary,hsl(var(--wl-sand)))]");
    expect(editorial).not.toContain('className="bg-[hsl(var(--wl-ink))] text-white"');
    expect(editorial).not.toContain("text-white/75");
    expect(editorial).not.toContain("border-white/12");
    // Nenhuma cor da paleta fixada no JSX.
    expect(editorial.toLowerCase()).not.toContain("#f3eff7");
  });

  it("textos, links e copyright usam wl-ink com opacidades", () => {
    expect(editorial).toContain("text-[hsl(var(--wl-ink)_/_0.8)]");
    expect(editorial).toContain("text-[hsl(var(--wl-ink)_/_0.65)]");
    expect(editorial).toContain("hover:text-[hsl(var(--wl-ink))]");
    expect(editorial).toContain("focus-visible:outline-[hsl(var(--wl-ink))]");
    expect(editorial).toContain("border-[var(--brand-border,hsl(var(--wl-ink)_/_0.12))]");
  });

  it("preserva o logo e o badge branco", () => {
    expect(editorial).toContain('className="inline-flex rounded-lg bg-white p-3');
  });

  it("mantém o branch luxury intacto", () => {
    expect(src).toContain('<footer id="rodape" className="wl-luxury-footer">');
    expect(src).toContain("wl-footer-copyright");
    expect(src).toContain("wl-footer-divider border-t");
  });
});
