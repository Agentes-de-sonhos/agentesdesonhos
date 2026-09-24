import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { renderHook } from "@testing-library/react";
import { useAgencyFavicon } from "@/hooks/useAgencyFavicon";

const ORIGINAL_HREFS = ["/favicon.ico", "/favicon-32x32.png", "/favicon-16x16.png"];

function setupHeadLinks() {
  document.head.innerHTML = "";
  return ORIGINAL_HREFS.map((href) => {
    const link = document.createElement("link");
    link.rel = "icon";
    link.setAttribute("href", href);
    document.head.appendChild(link);
    return link;
  });
}

function headHrefs() {
  return Array.from(document.head.querySelectorAll<HTMLLinkElement>('link[rel="icon"]')).map(
    (l) => l.getAttribute("href"),
  );
}

describe("useAgencyFavicon", () => {
  beforeEach(() => {
    setupHeadLinks();
  });

  afterEach(() => {
    document.head.innerHTML = "";
  });

  it("aponta todos os ícones para o logotipo da agência enquanto montado", () => {
    renderHook(() => useAgencyFavicon("https://cdn.exemplo.com/logo-essyatur.png"));
    expect(headHrefs()).toEqual([
      "https://cdn.exemplo.com/logo-essyatur.png",
      "https://cdn.exemplo.com/logo-essyatur.png",
      "https://cdn.exemplo.com/logo-essyatur.png",
    ]);
  });

  it("restaura os ícones originais ao desmontar", () => {
    const { unmount } = renderHook(() => useAgencyFavicon("https://cdn.exemplo.com/logo.png"));
    unmount();
    expect(headHrefs()).toEqual(ORIGINAL_HREFS);
  });

  it("não altera nada quando não há logotipo", () => {
    const { unmount } = renderHook(() => useAgencyFavicon(null));
    expect(headHrefs()).toEqual(ORIGINAL_HREFS);
    unmount();
    expect(headHrefs()).toEqual(ORIGINAL_HREFS);
  });

  it("atualiza o favicon quando o logotipo muda", () => {
    const { rerender, unmount } = renderHook(
      ({ url }: { url: string | null }) => useAgencyFavicon(url),
      { initialProps: { url: "https://cdn.exemplo.com/a.png" as string | null } },
    );
    expect(headHrefs()[0]).toBe("https://cdn.exemplo.com/a.png");
    rerender({ url: "https://cdn.exemplo.com/b.png" });
    expect(headHrefs()[0]).toBe("https://cdn.exemplo.com/b.png");
    unmount();
    expect(headHrefs()).toEqual(ORIGINAL_HREFS);
  });
});
