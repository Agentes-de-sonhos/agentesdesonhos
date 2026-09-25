import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { Hero, Specialist, Closing } from "@/pages/whitelabel/XcaretLandingPage";
import { XCARET_IMAGES, XCARET_MEDIA_SLOTS } from "@/components/landing/xcaret/content";

class IO { observe() {} unobserve() {} disconnect() {} takeRecords() { return []; } }
class RO { observe() {} unobserve() {} disconnect() {} }
(globalThis as any).IntersectionObserver ??= IO;
(globalThis as any).ResizeObserver ??= RO;
window.matchMedia ??= ((q: string) => ({ matches: false, media: q, addListener() {}, removeListener() {}, addEventListener() {}, removeEventListener() {}, onchange: null, dispatchEvent: () => false })) as any;

const img = (n: string) => ({ src: `/fixture/${n}.webp`, alt: `fixture ${n}`, source: "fixture" });
const full = { portraitJuliana: img("portrait"), trainingPhoto: img("training"), expertBadge: img("badge"), julianaAtDestination: img("destino") };

describe("landing Xcaret renderizada", () => {
  it("hero com um único H1, 6 indicadores e texto fixo", () => {
    const { container } = render(<Hero />);
    expect(container.querySelectorAll("h1")).toHaveLength(1);
    expect(screen.getAllByRole("button", { name: /^Ir para/ })).toHaveLength(6);
    expect(screen.getByRole("button", { name: "Ir para Xcaret" }).getAttribute("aria-current")).toBe("true");
    expect(container.querySelectorAll('a[href^="https://wa.me/5511957414840"]').length).toBeGreaterThan(0);
  });

  it("slots null omitem imagens sem espaço vazio", () => {
    const { container } = render(<><Specialist /><Closing /></>);
    expect(Object.values(XCARET_MEDIA_SLOTS).every((s) => s === null)).toBe(true);
    expect(container.querySelectorAll("img")).toHaveLength(0);
    expect(screen.queryByTestId("specialist-media")).toBeNull();
  });

  it("slots preenchidos renderizam retrato, treinamento, selo e foto no destino", () => {
    render(<><Hero slots={full} /><Specialist slots={full} /><Closing slots={full} /></>);
    for (const k of ["portrait", "training", "destino"]) expect(screen.getByAltText(`fixture ${k}`)).toBeTruthy();
    expect(screen.getAllByAltText("fixture badge")).toHaveLength(3);
  });

  it("imagens corrigidas apontam para os assets e fontes oficiais corretas", () => {
    expect(XCARET_IMAGES.xcaret.src).not.toBe(XCARET_IMAGES.xelHa.src);
    expect(XCARET_IMAGES.undergroundRiver.src).not.toBe(XCARET_IMAGES.xelHa.src);
    expect(XCARET_IMAGES.mexicoShow.src).not.toBe(XCARET_IMAGES.xoximilco.src);
    expect(XCARET_IMAGES.chichen.src).not.toBe(XCARET_IMAGES.xplor.src);
    expect(new Set([XCARET_IMAGES.xenotes.src, XCARET_IMAGES.casaPlaya.src, XCARET_IMAGES.xcaret.src]).size).toBe(3);
    expect(XCARET_IMAGES.casaPlaya.source).toContain("blog.xcaret.com/es/la-casa-de-la-playa");
  });
});
