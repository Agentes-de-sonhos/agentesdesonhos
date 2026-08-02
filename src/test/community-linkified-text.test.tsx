import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { readFileSync } from "fs";
import { LinkifiedText, normalizeUrl } from "@/components/community/LinkifiedText";

const read = (p: string) => readFileSync(p, "utf-8");

describe("LinkifiedText", () => {
  it("converte URL https em anchor com target e rel seguros", () => {
    render(<LinkifiedText text="Veja https://exemplo.com/promo agora" />);
    const a = screen.getByRole("link");
    expect(a).toHaveAttribute("href", "https://exemplo.com/promo");
    expect(a).toHaveAttribute("target", "_blank");
    expect(a.getAttribute("rel")).toBe("noopener noreferrer");
    expect(a).toHaveAttribute("aria-label", "Abrir link em nova aba");
  });

  it("converte URL http em anchor", () => {
    render(<LinkifiedText text="http://exemplo.com/x" />);
    expect(screen.getByRole("link")).toHaveAttribute("href", "http://exemplo.com/x");
  });

  it("prefixa https:// em URLs www.", () => {
    expect(normalizeUrl("www.exemplo.com/caminho")?.href).toBe("https://www.exemplo.com/caminho");
  });

  it("mantem pontuacao final fora do link", () => {
    expect(normalizeUrl("https://exemplo.com/a.")?.href).toBe("https://exemplo.com/a");
    expect(normalizeUrl("https://exemplo.com/a),")?.href).toBe("https://exemplo.com/a");
    expect(normalizeUrl("https://pt.wikipedia.org/wiki/A_(b)")?.href).toBe(
      "https://pt.wikipedia.org/wiki/A_(b)",
    );
  });

  it("nunca cria link para protocolos perigosos", () => {
    render(<LinkifiedText text="javascript:alert(1) data:text/html,x vbscript:x" />);
    expect(screen.queryByRole("link")).toBeNull();
  });

  it("preserva quebras de linha, texto comum e emojis", () => {
    const { container } = render(<LinkifiedText text={"linha1 🎉\nlinha2"} className="whitespace-pre-line" />);
    expect(container.textContent).toBe("linha1 🎉\nlinha2");
    expect(container.querySelector("p")?.className).toContain("whitespace-pre-line");
  });

  it("usa quebra de linha em URLs longas para evitar overflow", () => {
    render(<LinkifiedText text={`https://exemplo.com/${"a".repeat(300)}`} />);
    const cls = screen.getByRole("link").className;
    expect(cls).toContain("break-all");
    expect(cls).toContain("overflow-wrap:anywhere");
  });

  it("usa stopPropagation no clique do link", () => {
    expect(read("src/components/community/LinkifiedText.tsx")).toContain("e.stopPropagation()");
  });
});

describe("uso do componente compartilhado", () => {
  it("PostCard da Comunidade usa LinkifiedText em post e comentarios", () => {
    const src = read("src/components/community/PostCard.tsx");
    expect(src).toContain("LinkifiedText");
    expect(src).toContain("text={post.content}");
    expect(src).toContain("text={c.content}");
    expect(src).not.toContain(">{post.content}<");
  });

  it("feed do Dashboard usa LinkifiedText em post e comentarios", () => {
    const src = read("src/components/dashboard/CommunitySocialFeed.tsx");
    expect(src).toContain("LinkifiedText");
    expect(src).toContain("text={post.content}");
    expect(src).toContain("text={c.content}");
  });

  it("nao usa dangerouslySetInnerHTML nem migracao de dados", () => {
    expect(read("src/components/community/LinkifiedText.tsx")).not.toContain("dangerouslySetInnerHTML");
  });
});
