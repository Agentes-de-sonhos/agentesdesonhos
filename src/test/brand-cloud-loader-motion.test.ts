import { describe, expect, it } from "vitest";
import { readFileSync } from "fs";
import { resolve } from "path";

const css = readFileSync(
  resolve(process.cwd(), "src/components/shared/BrandCloudLoader.module.css"),
  "utf-8",
);

describe("BrandCloudLoader — movimento reduzido", () => {
  it("desativa a animação e mantém o contorno visível", () => {
    expect(css).toContain("@media (prefers-reduced-motion: reduce)");
    expect(css).toMatch(/\.trace\s*\{[^}]*stroke-dasharray:\s*none;[^}]*animation:\s*none;/s);
  });

  it("anima o desenho do traço sem transformar ou girar a nuvem", () => {
    expect(css).toContain("stroke-dashoffset");
    expect(css).toContain("animation: brand-cloud-trace");
    expect(css).not.toContain("transform:");
    expect(css).not.toContain("rotate(");
  });
});