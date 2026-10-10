import { afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { readFileSync } from "node:fs";
import { OrlandoTicketsSection } from "@/components/orlando/OrlandoTicketsSection";
import { DISNEY_MAPS } from "@/components/orlando/DisneyParkMapDialog";

vi.mock("@/hooks/useAgencySiteRequest", () => ({ useAgencySiteRequest: () => ({ submit: vi.fn(), state: "idle", error: null }) }));
beforeAll(() => { Element.prototype.scrollIntoView = vi.fn(); });
afterEach(cleanup);
const parks = ["epcot", "animal-kingdom", "hollywood-studios"] as const;
describe("Complete PDF-sourced Disney maps", () => {
  it.each(parks)("has every unique numbered point and native image provenance (%s)", (park) => {
    const config = JSON.parse(readFileSync(`public/maps/${park}.json`, "utf8"));
    expect(config.points).toHaveLength(DISNEY_MAPS[park].count);
    expect(config.points.map((p: unknown[]) => p[0])).toEqual(Array.from({ length: config.points.length }, (_, i) => i + 1));
    expect(config.height).toBe(2700);
    expect(config.width).toBe(park === "animal-kingdom" ? 2520 : 2325);
    expect(config.sourceRaster).toEqual([5925, 2700]);
    expect(config.colorProfile).toContain("sRGB");
    expect(config.image).toMatch(/^\/__l5e\/assets-v1\//);
    for (const p of config.points) {
      expect(p[1].length).toBeGreaterThan(3);
      expect(p[3]).toBeGreaterThan(0); expect(p[3]).toBeLessThan(100);
      expect(p[4]).toBeGreaterThan(0); expect(p[4]).toBeLessThan(100);
      expect(["Atrações", "Restaurantes", "Compras"]).toContain(p[7]);
      expect(p[5].length).toBeGreaterThan(10);
    }
    const expected = park === "epcot" ? [24,51,13] : park === "animal-kingdom" ? [19,29,8] : [21,26,18];
    expect(["Atrações", "Restaurantes", "Compras"].map(cat => config.points.filter((p: unknown[]) => p[7] === cat).length)).toEqual(expected);
    expect(config.points[park === "animal-kingdom" ? 3 : 0][7]).toBe("Atrações");
    const html = readFileSync(`public/maps/${park}.html`, "utf8");
    expect(html).not.toContain("<footer"); expect(html).not.toContain("<header"); expect(html).not.toContain("chatgpt.site");
  });
  it("shares the final natural-height frame, immediate wheel and native proportional markers", () => {
    const css = readFileSync("public/maps/disney-park-map.css", "utf8");
    const js = readFileSync("public/maps/disney-park-map.js", "utf8");
    expect(css).toContain("grid-template-columns:minmax(0,1fr) 340px");
    expect(css).toContain("height:auto;max-height:none;overflow:visible");
    expect(css).toContain("border-radius:18px;clip-path:inset(0 round 18px)");
    expect(css).toContain(".panel h2{font-family:Arial,sans-serif}");
    expect(js).toContain("e.preventDefault();zoom("); expect(js).toContain("{passive:false}");
    expect(js).toContain("getBoundingClientRect().width/config.width");
    expect(js).toContain("const RATIO=config.width/config.height");
    expect(js).toContain("scale=Math.max(1,Math.min(5,v))");
  });
  it.each(parks)("opens only its own lazy popup and closes securely (%s)", async park => {
    const { name } = DISNEY_MAPS[park];
    const { container } = render(<OrlandoTicketsSection hostname="briefing-14-v1.preview.local" />);
    expect(container.querySelector("iframe")).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: `Abrir mapa interativo do ${name}` }));
    const frame = screen.getByTitle(`Mapa interativo do ${name}`) as HTMLIFrameElement;
    expect(frame).toHaveAttribute("src", `/maps/${park}.html`);
    const data = { type: `disney-park-map:${park}:close` };
    fireEvent(window, new MessageEvent("message", { data, origin: "https://untrusted.example", source: frame.contentWindow }));
    expect(screen.getByRole("dialog")).toBeInTheDocument();
    fireEvent(window, new MessageEvent("message", { data, origin: window.location.origin, source: frame.contentWindow }));
    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
  });
  it.each(parks)("keeps quote selection independent from the logo popup (%s)", async park => {
    render(<OrlandoTicketsSection hostname="briefing-14-v1.preview.local" mode="page" />);
    fireEvent.click(screen.getByRole("button", { name: "Ainda não sei" }));
    fireEvent.click(screen.getByRole("button", { name: "Continuar" }));
    const select = screen.getAllByRole("button", { name: /^Selecionar / }).find(el => el.closest("article")?.querySelector(`[aria-label="Abrir mapa interativo do ${DISNEY_MAPS[park].name}"]`));
    expect(select).toBeDefined();
    if (!select) return;
    expect(select).toHaveAttribute("aria-pressed", "false");
    fireEvent.click(screen.getByRole("button", { name: `Abrir mapa interativo do ${DISNEY_MAPS[park].name}` }));
    fireEvent.click(screen.getByRole("button", { name: `Fechar mapa do ${DISNEY_MAPS[park].name}` }));
    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
    expect(select).toHaveAttribute("aria-pressed", "false");
    fireEvent.click(select);
    expect(select).toHaveAttribute("aria-pressed", "true");
  });
});