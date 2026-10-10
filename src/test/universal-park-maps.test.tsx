import { afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { readFileSync } from "node:fs";
import { OrlandoTicketsSection } from "@/components/orlando/OrlandoTicketsSection";
import { UNIVERSAL_MAPS, isParkMapId } from "@/components/orlando/DisneyParkMapDialog";

vi.mock("@/hooks/useAgencySiteRequest", () => ({ useAgencySiteRequest: () => ({ submit: vi.fn(), state: "idle", error: null }) }));
beforeAll(() => { Element.prototype.scrollIntoView = vi.fn(); });
afterEach(cleanup);
const parks = ["universal-studios", "islands-of-adventure", "epic-universe", "volcano-bay"] as const;
const counts = { "universal-studios": [41,26,67], "islands-of-adventure": [29,22,51], "epic-universe": [23,28,52], "volcano-bay": [20,7,28] };
type Point = [string,string,string,number,number,string,string,string,string];
type Anchor = [string,number,number,string];
describe("Complete source-grounded Universal maps", () => {
  it.each(parks)("includes every source reference and original circle center (%s)", park => {
    const c = JSON.parse(readFileSync(`public/maps/${park}.json`, "utf8"));
    const points: Point[] = c.points;
    const anchors: Anchor[] = c.anchors;
    const [attractions, restaurants, nAnchors] = counts[park];
    expect(points).toHaveLength(UNIVERSAL_MAPS[park].count);
    expect(new Set(points.map(p => p[0])).size).toBe(points.length);
    expect(points.filter(p => p[7] === "Atrações").map(p => p[8])).toEqual(Array.from({ length: attractions }, (_, i) => String(i + 1)));
    expect(points.filter(p => p[7] === "Restaurantes").map(p => p[8])).toEqual(Array.from({ length: restaurants }, (_, i) => i < 26 ? String.fromCharCode(65+i) : i === 26 ? "AA" : "BB"));
    expect(points.filter(p => p[7] === "Compras")).toHaveLength(0);
    expect(anchors).toHaveLength(nAnchors);
    expect(new Set(anchors.map(a => a[0]))).toEqual(new Set(points.map(p => p[0])));
    expect(new Set(anchors.map(a => `${a[1]},${a[2]}`)).size).toBe(anchors.length);
    expect([c.width,c.height]).toEqual([3475,3240]);
    expect(c.renderDpi).toBe(360);
    expect(c.cropPt).toEqual([27,27,722,675]);
    expect(c.colorProfile).toContain("sRGB");
    expect(c.image).toMatch(/^\/__l5e\/assets-v1\//);
    expect(c.sourceSha256).toMatch(/^[a-f0-9]{64}$/);
    for (const a of anchors) {
      expect(a[1]).toBeGreaterThan(0); expect(a[1]).toBeLessThan(100);
      expect(a[2]).toBeGreaterThan(0); expect(a[2]).toBeLessThan(100);
      const original = c.sourceAnchors.find((s: { ref: string; x: number; y: number }) => s.ref === a[3] && s.x === a[1] && s.y === a[2]);
      expect(original).toBeDefined();
      expect(a[1]).toBeCloseTo((original.centerPt[0]-27)/695*100, 8);
      expect(a[2]).toBeCloseTo((original.centerPt[1]-27)/648*100, 8);
    }
    for (const p of points) {
      expect(p[1].length).toBeGreaterThan(3);
      expect(p[5]).not.toMatch(/aberto atualmente|inaugura em|\d+:\d{2}/i);
      expect(p[8]).not.toContain("$");
    }
    const html = readFileSync(`public/maps/${park}.html`, "utf8");
    const embedded = html.match(/id="park-config">(.*?)<\/script>/);
    expect(embedded).not.toBeNull();
    if (embedded) expect(JSON.parse(embedded[1])).toEqual(c);
    expect(html).not.toMatch(/<header|<footer|chatgpt\.site|Protótipo/);
    expect(html).toContain("Compras (0)");
    expect(html).toContain("/maps/disney-park-map.js");
  });
  it("preserves genuine repeated anchors, paired slides and source warnings", () => {
    const epic = JSON.parse(readFileSync("public/maps/epic-universe.json", "utf8"));
    const volcano = JSON.parse(readFileSync("public/maps/volcano-bay.json", "utf8"));
    expect(epic.anchors.filter((a: Anchor) => a[0] === "restaurant-N")).toHaveLength(2);
    expect(volcano.anchors.filter((a: Anchor) => a[0] === "attraction-15")).toHaveLength(2);
    const pair = volcano.anchors.filter((a: Anchor) => ["attraction-16","attraction-17"].includes(a[0]));
    expect(pair).toHaveLength(2); expect(pair[0][2]).not.toBe(pair[1][2]);
    for (const [park,id] of [["universal-studios","attraction-12"],["islands-of-adventure","attraction-22"]]) {
      const c = JSON.parse(readFileSync(`public/maps/${park}.json`, "utf8"));
      expect(c.points.find((p: Point) => p[0] === id)[5]).toContain("Park-to-Park");
    }
    expect(epic.points.find((p: Point) => p[0] === "attraction-4")[5]).toContain("102 cm");
    expect(volcano.points.find((p: Point) => p[0] === "attraction-10")[5]).toContain("136 kg para uma pessoa ou 204 kg para duas pessoas");
  });
  it.each(parks)("lazy opens its own logo popup without changing quote selection (%s)", async park => {
    const { name } = UNIVERSAL_MAPS[park];
    const { container } = render(<OrlandoTicketsSection hostname="briefing-14-v1.preview.local" mode="page" />);
    expect(container.querySelector("iframe")).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: "Ainda não sei" }));
    fireEvent.click(screen.getByRole("button", { name: "Continuar" }));
    if (park === "volcano-bay") fireEvent.click(screen.getByRole("button", { name: "Continuar" }));
    const logo = screen.getByRole("button", { name: `Abrir mapa interativo do ${name}` });
    const selection = screen.getAllByRole("button", { name: /^Selecionar / }).find(el => el.closest("article")?.contains(logo));
    expect(selection).toBeDefined();
    if (!selection) return;
    fireEvent.click(logo);
    const frame = screen.getByTitle(`Mapa interativo do ${name}`) as HTMLIFrameElement;
    expect(frame).toHaveAttribute("src", `/maps/${park}.html`);
    fireEvent(window, new MessageEvent("message", { data: { type: `disney-park-map:${park}:close` }, origin: "https://untrusted.example", source: frame.contentWindow }));
    expect(screen.getByRole("dialog")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: `Fechar mapa do ${name}` }));
    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
    expect(selection).toHaveAttribute("aria-pressed", "false");
    fireEvent.click(selection);
    expect(screen.getAllByRole("button", { name: /^Remover / }).find(el => el.closest("article")?.querySelector(`[aria-label="Abrir mapa interativo do ${name}"]`))).toHaveAttribute("aria-pressed", "true");
  });
  it("does not enable future groups", () => {
    for (const id of ["legoland","ksc","icon-park"]) expect(isParkMapId(id)).toBe(false);
  });
});