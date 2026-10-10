import { afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { readFileSync } from "node:fs";
import { OrlandoTicketsSection } from "@/components/orlando/OrlandoTicketsSection";

vi.mock("@/hooks/useAgencySiteRequest", () => ({
  useAgencySiteRequest: () => ({ submit: vi.fn(), state: "idle", error: null }),
}));
beforeAll(() => { Element.prototype.scrollIntoView = vi.fn(); });
afterEach(cleanup);

describe("Magic Kingdom approved map", () => {
  it("preserves all 84 approved points and original image dimensions", () => {
    const html = readFileSync("public/maps/magic-kingdom.html", "utf8");
    const points = JSON.parse(html.match(/const data=(\[.*\]);/)?.[1] ?? "[]");
    expect(points).toHaveLength(84);
    expect(points.map((p: number[]) => p[0])).toEqual(Array.from({ length: 84 }, (_, i) => i + 2));
    expect(html).toContain('width="2755" height="2700"');
    expect(html).toContain('src="/__l5e/assets-v1/');
    expect(html).not.toContain("chatgpt.site");
    expect(html).toContain("location.origin");
  });

  it.each(["www.destinoscomaju.com.br", "www.100limites.tur.br", "briefing-14-v1.preview.local"])("lazy mounts and closes without touching quote selection (%s)", async (hostname) => {
    const { container } = render(<OrlandoTicketsSection hostname={hostname} />);
    expect(container.querySelector("iframe")).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: "Abrir mapa interativo do Magic Kingdom" }));
    expect(screen.getByRole("dialog", { name: "Mapa interativo do Magic Kingdom" })).toBeInTheDocument();
    expect(screen.getByTitle("Mapa interativo do Magic Kingdom — junho de 2026")).toHaveAttribute("src", "/maps/magic-kingdom.html");
    fireEvent.click(screen.getByRole("button", { name: "Fechar mapa do Magic Kingdom" }));
    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
  });

  it("only accepts close messages from the same-origin map frame", async () => {
    render(<OrlandoTicketsSection hostname="briefing-14-v1.preview.local" />);
    fireEvent.click(screen.getByRole("button", { name: "Abrir mapa interativo do Magic Kingdom" }));
    const iframe = screen.getByTitle("Mapa interativo do Magic Kingdom — junho de 2026") as HTMLIFrameElement;
    const data = { type: "magic-kingdom-map:close" };
    fireEvent(window, new MessageEvent("message", { data, origin: "https://untrusted.example", source: iframe.contentWindow }));
    expect(screen.getByRole("dialog")).toBeInTheDocument();
    fireEvent(window, new MessageEvent("message", { data, origin: window.location.origin, source: window }));
    expect(screen.getByRole("dialog")).toBeInTheDocument();
    fireEvent(window, new MessageEvent("message", { data, origin: window.location.origin, source: iframe.contentWindow }));
    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
  });

  it("logo opens map and separate selection button retains the wizard", () => {
    render(<OrlandoTicketsSection hostname="www.100limites.tur.br" mode="page" />);
    fireEvent.click(screen.getByRole("button", { name: "Ainda não sei" }));
    fireEvent.click(screen.getByRole("button", { name: "Continuar" }));
    const select = screen.getByRole("button", { name: "Selecionar Magic Kingdom" });
    expect(select).toHaveAttribute("aria-pressed", "false");
    fireEvent.click(screen.getByRole("button", { name: "Abrir mapa interativo do Magic Kingdom" }));
    fireEvent.click(screen.getByRole("button", { name: "Fechar mapa do Magic Kingdom" }));
    expect(select).toHaveAttribute("aria-pressed", "false");
    fireEvent.click(select);
    expect(screen.getByRole("button", { name: "Remover Magic Kingdom" })).toHaveAttribute("aria-pressed", "true");
  });
});