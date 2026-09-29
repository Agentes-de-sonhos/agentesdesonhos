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
const full = { portraitJuliana: img("portrait"), trainingPhoto: img("training"), julianaExtra: img("extra"), expertBadge: img("badge"), julianaAtDestination: img("destino") };

describe("landing Xcaret renderizada", () => {
  it("hero com um único H1 e 6 indicadores", () => {
    const { container } = render(<Hero />);
    expect(container.querySelectorAll("h1")).toHaveLength(1);
    expect(screen.getAllByRole("button", { name: /^Ir para/ })).toHaveLength(6);
    expect(screen.getByRole("button", { name: "Ir para Xcaret" }).getAttribute("aria-current")).toBe("true");
  });

  it("slots null omitem imagens sem espaço vazio", () => {
    const empty = { portraitJuliana: null, trainingPhoto: null, julianaExtra: null, expertBadge: null, julianaAtDestination: null };
    const { container } = render(<><Specialist slots={empty} /><Closing slots={empty} /></>);
    expect(container.querySelectorAll("img")).toHaveLength(0);
    expect(screen.queryByTestId("specialist-media")).toBeNull();
  });

  it("slots oficiais usam três fotos reais da Juliana e mantêm o selo Xperts", () => {
    expect(XCARET_MEDIA_SLOTS.portraitJuliana?.src).toContain("juliana-xcaret-selfie.webp");
    expect(XCARET_MEDIA_SLOTS.trainingPhoto?.src).toContain("juliana-xcaret-training.webp");
    expect(XCARET_MEDIA_SLOTS.julianaExtra?.src).toContain("juliana-xplor-buggy.webp");
    expect(XCARET_MEDIA_SLOTS.julianaAtDestination?.src).toContain("juliana-xcaret-hotel.webp");
    expect(XCARET_MEDIA_SLOTS.expertBadge?.src).toContain("xperts-xcaret-badge.webp");
  });

  it("atendimento pessoal mostra três fotos e nenhum botão de WhatsApp", () => {
    const { container } = render(<Specialist slots={full} />);
    for (const k of ["portrait", "training", "extra"]) expect(screen.getAllByAltText(`fixture ${k}`).length).toBeGreaterThan(0);
    expect(container.querySelectorAll('a[href^="https://wa.me/"]')).toHaveLength(0);
    expect(screen.queryByAltText("fixture badge")).toBeNull();
  });

  it("no mobile a seção começa pelo título, seguido da galeria e do texto", () => {
    const { container } = render(<Specialist slots={full} />);
    const mobile = container.querySelector(".lg\\:hidden") as HTMLElement;
    expect(mobile).toBeTruthy();
    const order = Array.from(mobile.querySelectorAll("h2, [data-testid='specialist-media'], p"));
    expect(order.findIndex((el) => el.tagName === "H2")).toBeLessThan(order.findIndex((el) => el.getAttribute("data-testid") === "specialist-media"));
    expect(mobile.querySelector("[aria-label='Próxima foto']")).toBeTruthy();
  });


  it("mostra o selo somente no canto superior do hero, não no fechamento", () => {
    const hero = render(<Hero slots={full} />);
    expect(hero.getByAltText("fixture badge")).toBeTruthy();
    hero.unmount();
    const closing = render(<Closing slots={full} />);
    expect(closing.queryByAltText("fixture badge")).toBeNull();
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
