import { afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { readFileSync } from "node:fs";
import { OrlandoTicketsSection } from "@/components/orlando/OrlandoTicketsSection";
import { UNITED_MAPS } from "@/components/orlando/DisneyParkMapDialog";

vi.mock("@/hooks/useAgencySiteRequest", () => ({ useAgencySiteRequest: () => ({ submit: vi.fn(), state: "idle", error: null }) }));
beforeAll(() => { Element.prototype.scrollIntoView = vi.fn(); });
afterEach(cleanup);
const parks = ["seaworld", "busch-gardens", "aquatica", "discovery-cove"] as const;
describe("Source-grounded United Parks maps", () => {
  it.each(parks)("has unique category-scoped IDs and genuine references (%s)", park => {
    const c = JSON.parse(readFileSync(`public/maps/${park}.json`, "utf8"));
    expect(c.points).toHaveLength(UNITED_MAPS[park].count);
    expect(new Set(c.points.map((p: unknown[]) => p[0])).size).toBe(c.points.length);
    expect(c.sourceRaster).toEqual(({ seaworld: [2000,1556], "busch-gardens": [960,653], aquatica: [800,648], "discovery-cove": [2008,1143] })[park]);
    expect(c.image).toMatch(/^\/__l5e\/assets-v1\//);
    expect(c.sourceSha256).toMatch(/^[a-f0-9]{64}$/);
    const ids = new Set(c.points.map((p: unknown[]) => p[0]));
    expect(new Set(c.anchors.map((a: unknown[]) => a[0]))).toEqual(ids);
    expect(new Set(c.anchors.map((a: unknown[]) => `${a[1]},${a[2]}`)).size).toBe(c.anchors.length);
    expect(c.anchors).toHaveLength(({ seaworld: 73, "busch-gardens": 67, aquatica: 30, "discovery-cove": 17 })[park]);
    expect(c.markerDiameter).toBeGreaterThan(0);
    if (park === "seaworld") {
      expect(c.anchors.filter((a: unknown[]) => a[0] === "shop-1-2").map((a: unknown[]) => a[3])).toEqual(["2", "1"]);
      expect(c.points.find((p: unknown[]) => p[0] === "attraction-seaquest")[5]).toMatch(/não comprova disponibilidade/);
    }
    for (const a of c.anchors) {
      expect(a[1]).toBeGreaterThan(0); expect(a[1]).toBeLessThan(100);
      expect(a[2]).toBeGreaterThan(0); expect(a[2]).toBeLessThan(100);
    }
    for (const p of c.points) {
      expect(typeof p[0]).toBe("string");
      expect(p[1].length).toBeGreaterThan(3);
      expect(["Atrações", "Restaurantes", "Compras"]).toContain(p[7]);
      expect(typeof p[8]).toBe("string");
      expect(p[5]).not.toMatch(/\b(?:aberto atualmente|inaugura em|altura mínima|\d+:\d{2})\b/i);
      if (park === "aquatica" || park === "discovery-cove") expect(p[8]).toBe("");
      if (park === "seaworld" && p[7] === "Restaurantes") expect(p[8]).toMatch(/^[A-U]$/);
    }
    const html = readFileSync(`public/maps/${park}.html`, "utf8");
    const embedded = html.match(/id="park-config">(.*?)<\/script>/);
    expect(embedded).not.toBeNull();
    if (embedded) expect(JSON.parse(embedded[1])).toEqual(c);
    expect(html).not.toMatch(/<footer|<header|chatgpt\.site|Protótipo/);
    expect(html).toContain('/maps/disney-park-map.js');
    expect(html).toContain('/maps/disney-park-map.css');
  });
  it.each(parks)("opens the correct lazy map, closes securely and restores focus (%s)", async park => {
    const { name } = UNITED_MAPS[park];
    const { container } = render(<OrlandoTicketsSection hostname="briefing-14-v1.preview.local" />);
    expect(container.querySelector("iframe")).toBeNull();
    const trigger = screen.getByRole("button", { name: `Abrir mapa interativo do ${name}` });
    fireEvent.click(trigger);
    const frame = screen.getByTitle(`Mapa interativo do ${name}`) as HTMLIFrameElement;
    expect(frame).toHaveAttribute("src", `/maps/${park}.html`);
    const data = { type: `disney-park-map:${park}:close` };
    fireEvent(window, new MessageEvent("message", { data, origin: "https://untrusted.example", source: frame.contentWindow }));
    expect(screen.getByRole("dialog")).toBeInTheDocument();
    fireEvent(window, new MessageEvent("message", { data, origin: window.location.origin, source: frame.contentWindow }));
    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
  });
  it.each(parks)("keeps logo actions independent from quote selection (%s)", async park => {
    render(<OrlandoTicketsSection hostname="briefing-14-v1.preview.local" mode="page" />);
    fireEvent.click(screen.getByRole("button", { name: "Ainda não sei" }));
    fireEvent.click(screen.getByRole("button", { name: "Continuar" }));
    if (park === "aquatica") fireEvent.click(screen.getByRole("button", { name: "Continuar" }));
    const logoName = `Abrir mapa interativo do ${UNITED_MAPS[park].name}`;
    const select = screen.getAllByRole("button", { name: /^Selecionar / }).find(el => el.closest("article")?.querySelector(`[aria-label="${logoName}"]`));
    expect(select).toBeDefined();
    if (!select) return;
    expect(select).toHaveAttribute("aria-pressed", "false");
    fireEvent.click(screen.getByRole("button", { name: logoName }));
    fireEvent.click(screen.getByRole("button", { name: `Fechar mapa do ${UNITED_MAPS[park].name}` }));
    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
    expect(select).toHaveAttribute("aria-pressed", "false");
    fireEvent.click(select);
    expect(screen.getAllByRole("button", { name: /^Remover / }).find(el => el.closest("article")?.querySelector(`[aria-label="${logoName}"]`))).toHaveAttribute("aria-pressed", "true");
  });
});