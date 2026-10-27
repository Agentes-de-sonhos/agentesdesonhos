import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";

const src = readFileSync("src/pages/OrcamentoPublico.tsx", "utf8");

function sliceBetween(start: string, end: string): string {
  const from = src.indexOf(start);
  const to = src.indexOf(end, from);
  expect(from).toBeGreaterThanOrEqual(0);
  expect(to).toBeGreaterThan(from);
  return src.slice(from, to);
}

describe("fundo branco do ícone do título de cada serviço e de 'Sua jornada'", () => {
  it("pastilha do ícone no título de cada serviço tem fundo branco, sem cor da agência", () => {
    const style = sliceBetween("const SERVICE_ICON_STYLE", "\n};");
    expect(style).toMatch(/background:\s*"#ffffff"/);
    expect(style).not.toMatch(/var\(--brand-tertiary\)/);
  });

  it("pastilhas da seção 'Sua jornada' têm fundo branco e texto legível", () => {
    const journey = sliceBetween('aria-label="Etapas da sua jornada"', "{n.icon}");
    expect(journey).toMatch(/background:\s*"#ffffff"/);
    expect(journey).toMatch(/color:\s*"hsl\(var\(--foreground\)\)"/);
    expect(journey).not.toMatch(/var\(--brand-tertiary\)/);
  });
});
