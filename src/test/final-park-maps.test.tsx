import { afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { readFileSync } from "node:fs";
import { OrlandoTicketsSection } from "@/components/orlando/OrlandoTicketsSection";
import { FINAL_PARK_MAPS, DISNEY_MAPS, UNITED_MAPS, UNIVERSAL_MAPS } from "@/components/orlando/DisneyParkMapDialog";
vi.mock("@/hooks/useAgencySiteRequest", () => ({ useAgencySiteRequest: () => ({ submit: vi.fn(), state: "idle", error: null }) }));
beforeAll(() => { Element.prototype.scrollIntoView = vi.fn(); });
afterEach(cleanup);
const parks = ["legoland-florida", "kennedy-space-center", "icon-park"] as const;
type Point = [string,string,string,number,number,string,string,string,string];
type Anchor = [string,number,number,string,number?];
const load = (park: string) => JSON.parse(readFileSync(`public/maps/${park}.json`, "utf8"));
describe("Complete final group of source-grounded maps", () => {
  it.each(parks)("has complete category-scoped entries, anchors and source pixels (%s)", park => {
    const c = load(park); const points: Point[] = c.points; const anchors: Anchor[] = c.anchors;
    expect(points).toHaveLength(FINAL_PARK_MAPS[park].count);
    expect(new Set(points.map(p => p[0])).size).toBe(points.length);
    expect(new Set(anchors.map(a => a[0]))).toEqual(new Set(points.map(p => p[0])));
    expect(new Set(anchors.map(a => `${a[1]},${a[2]}`)).size).toBe(anchors.length);
    const totals = { "legoland-florida": [58,21,8,90,5130,7290], "kennedy-space-center": [20,9,4,33,4800,2698], "icon-park": [15,20,3,38,1512,1460] }[park];
    expect(["Atrações","Restaurantes","Compras"].map(cat => points.filter(p => p[7] === cat).length)).toEqual(totals.slice(0,3));
    expect(anchors.length).toBe(totals[3]); expect([c.width,c.height]).toEqual(totals.slice(4));
    expect(c.image).toMatch(/^\/__l5e\/assets-v1\//); expect(c.sourceSha256).toMatch(/^[a-f0-9]{64}$/);
    for (const a of anchors) { expect(a[1]).toBeGreaterThan(0); expect(a[1]).toBeLessThan(100); expect(a[2]).toBeGreaterThan(0); expect(a[2]).toBeLessThan(100); }
    for (const p of points) { expect(p[1].length).toBeGreaterThan(3); expect(p[5]).not.toMatch(/aberto atualmente|now open|coming soon|\d+:\d{2}/i); }
    const html = readFileSync(`public/maps/${park}.html`, "utf8"); const embedded = html.match(/id="park-config">(.*?)<\/script>/);
    expect(embedded).not.toBeNull(); if (embedded) expect(JSON.parse(embedded[1])).toEqual(c);
    expect(html).not.toMatch(/<header|<footer|chatgpt\.site|Protótipo/); expect(html).toContain("/maps/disney-park-map.js");
  });
  it("preserves LEGOLAND classification, water dining H/I/J, hotel groups and repeated C", () => {
    const c = load("legoland-florida"); const points: Point[] = c.points;
    for (const ref of ["3","4","W1","W2","W4","W9"]) expect(points.some(p => p[8] === ref)).toBe(false);
    for (const ref of ["5","7","13","34","37","43","52","W3"]) expect(points.find(p => p[8] === ref)?.[7]).toBe("Compras");
    for (const ref of ["H","I","J"]) expect(points.find(p => p[8] === ref)?.[7]).toBe("Restaurantes");
    expect(c.anchors.filter((a: Anchor) => a[0] === "restaurant-C")).toHaveLength(4);
    expect(points.find(p => p[8] === "42")?.[5]).toContain("Zane");
    expect(points.find(p => p[8] === "61")?.[1]).toContain("Masters of Flight");
    expect(points.find(p => p[8] === "62")?.[1]).toBe("Battle of Bricksburg");
    expect(points.filter(p => p[0].includes("hotel")).every(p => p[8] === "" && p[7] === "Restaurantes")).toBe(true);
  });
  it("keeps Kennedy complete and bus-tour points at their native inset centers", () => {
    const c = load("kennedy-space-center"); const points: Point[] = c.points;
    expect(points.map(p => p[8])).toEqual(Array.from({length:33},(_,i)=>String(i+1)));
    for (const ref of ["19","20","29","32","33"]) { const a = c.anchors.find((a: Anchor) => a[3] === ref); expect(a?.[2]).toBeGreaterThan(60); expect(a?.[4]).toBe(31); }
    for (const ref of ["6","8"]) expect(points.find(p => p[8] === ref)?.[5]).toContain("reserva antecipada");
    expect(points.find(p => p[8] === "11")?.[5]).toContain("reserva");
    for (const a of c.anchors) { const original = c.sourceAnchors.find((s: {ref:string}) => s.ref === a[3]); expect(a[1]).toBeCloseTo(original.centerPx[0]/48,8); expect(a[2]).toBeCloseTo(original.centerPx[1]/26.98,8); }
  });
  it("keeps ICON source limitations and mixed music venues without overlap", () => {
    const points: Point[] = load("icon-park").points;
    for (const ref of ["8","13","35"]) expect(points.some(p => p[8] === ref)).toBe(false);
    for (const ref of ["11","28","34"]) { expect(points.filter(p => p[8] === ref)).toHaveLength(1); expect(points.find(p => p[8] === ref)?.[2]).toContain("música"); }
    expect(points.find(p => p[8] === "36")?.[1]).toBe("Playground Pearl Express");
    expect(points.find(p => p[8] === "38")?.[1]).toBe("Bungee Pearl Express");
    expect(points.filter(p => p[8] === "")).toHaveLength(3);
  });
  it.each(parks)("opens its own lazy popup securely without selecting a quote (%s)", async park => {
    const {name} = FINAL_PARK_MAPS[park]; const {container} = render(<OrlandoTicketsSection hostname="briefing-14-v1.preview.local" />);
    expect(container.querySelector("iframe")).toBeNull(); const logo = screen.getByRole("button", {name:`Abrir mapa interativo do ${name}`}); fireEvent.click(logo);
    const frame = screen.getByTitle(`Mapa interativo do ${name}`) as HTMLIFrameElement;
    expect(frame).toHaveAttribute("src",`/maps/${park}.html`);
    const data = {type:`disney-park-map:${park}:close`};
    fireEvent(window,new MessageEvent("message",{data,origin:"https://untrusted.example",source:frame.contentWindow})); expect(screen.getByRole("dialog")).toBeInTheDocument();
    fireEvent(window,new MessageEvent("message",{data,origin:window.location.origin,source:frame.contentWindow}));
    await waitFor(()=>expect(screen.queryByRole("dialog")).toBeNull());
  });
  it("exposes seventeen separate map logos", () => {
    render(<OrlandoTicketsSection hostname="briefing-14-v1.preview.local" />);
    for (const {name} of Object.values({...DISNEY_MAPS,...UNITED_MAPS,...UNIVERSAL_MAPS,...FINAL_PARK_MAPS})) expect(screen.getByRole("button",{name:`Abrir mapa interativo do ${name}`})).toBeInTheDocument();
  });
});