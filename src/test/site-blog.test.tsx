import { describe, expect, it } from "vitest";
import { render } from "@testing-library/react";
import { BlogContentRenderer } from "@/components/blog/BlogContentRenderer";
import { parseYouTubeId, safeHref, slugify, suggestExcerpt, zonedWallTimeToUtc, isValidSlug } from "@/lib/blog/blogUtils";
import { withBlogLink } from "@/components/whitelabel/AgencySiteLayout";

describe("blog utils", () => {
  it("gera slug estável e válido", () => {
    expect(slugify("Férias em Orlando: guia 2026!")).toBe("ferias-em-orlando-guia-2026");
    expect(isValidSlug("a--b")).toBe(false);
  });
  it("valida URLs do YouTube", () => {
    expect(parseYouTubeId("https://www.youtube.com/watch?v=dQw4w9WgXcQ")).toBe("dQw4w9WgXcQ");
    expect(parseYouTubeId("https://youtu.be/dQw4w9WgXcQ?t=3")).toBe("dQw4w9WgXcQ");
    expect(parseYouTubeId("https://evil.com/watch?v=dQw4w9WgXcQ")).toBeNull();
    expect(parseYouTubeId("javascript:alert(1)")).toBeNull();
  });
  it("bloqueia links perigosos", () => {
    expect(safeHref("javascript:alert(1)")).toBeNull();
    expect(safeHref("https://ok.com")).toBe("https://ok.com/");
  });
  it("converte horário de São Paulo para UTC", () => {
    expect(zonedWallTimeToUtc("2026-10-10", "09:00", "America/Sao_Paulo").toISOString()).toBe("2026-10-10T12:00:00.000Z");
    expect(zonedWallTimeToUtc("2026-10-10", "09:00", "Europe/Lisbon").toISOString()).toBe("2026-10-10T08:00:00.000Z");
  });
  it("sugere resumo a partir do texto", () => {
    const doc = { type: "doc", content: [{ type: "paragraph", content: [{ type: "text", text: "palavra ".repeat(60) }] }] };
    expect(suggestExcerpt(doc).length).toBeLessThanOrEqual(161);
  });
  it("só adiciona Blog ao menu quando há conteúdo publicado", () => {
    const nav = [{ label: "Início", to: "/" }, { label: "Área do Cliente", to: "/area-do-cliente" }];
    expect(withBlogLink(nav, false)).toEqual(nav);
    expect(withBlogLink(nav, true).map((n) => n.to)).toEqual(["/", "/blog", "/area-do-cliente"]);
  });
});

describe("renderizador seguro", () => {
  it("ignora nós desconhecidos e links javascript", () => {
    const { container } = render(
      <BlogContentRenderer
        doc={{
          type: "doc",
          content: [
            { type: "html", attrs: { html: "<script>alert(1)</script>" } },
            { type: "paragraph", content: [{ type: "text", text: "x", marks: [{ type: "link", attrs: { href: "javascript:alert(1)" } }] }] },
            { type: "blogYoutube", attrs: { videoId: "dQw4w9WgXcQ" } },
          ],
        }}
      />,
    );
    expect(container.querySelector("script")).toBeNull();
    expect(container.querySelector("a")).toBeNull();
    expect(container.querySelector("iframe")?.getAttribute("src")).toContain("youtube-nocookie.com/embed/dQw4w9WgXcQ");
  });
});
