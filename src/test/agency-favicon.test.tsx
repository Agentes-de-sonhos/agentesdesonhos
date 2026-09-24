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
  return Array.from(document.head.querySelectorAll<HTMLLinkElement>('link[rel~="icon"]')).map(
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

  it("substitui os ícones concorrentes por um único favicon da agência", () => {
    renderHook(() => useAgencyFavicon("https://cdn.exemplo.com/logo-essyatur.png"));
    expect(headHrefs()).toEqual([
      "https://cdn.exemplo.com/logo-essyatur.png?favicon=agency-v2",
    ]);
    expect(document.querySelector("#agency-favicon")).not.toBeNull();
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
    expect(headHrefs()).toEqual(["https://cdn.exemplo.com/a.png?favicon=agency-v2"]);
    rerender({ url: "https://cdn.exemplo.com/b.png" });
    expect(headHrefs()).toEqual(["https://cdn.exemplo.com/b.png?favicon=agency-v2"]);
    unmount();
    expect(headHrefs()).toEqual(ORIGINAL_HREFS);
  });

  it("preserva parâmetros existentes ao criar uma URL nova para o cache", () => {
    renderHook(() => useAgencyFavicon("https://cdn.exemplo.com/logo.png?t=123"));
    expect(headHrefs()).toEqual([
      "https://cdn.exemplo.com/logo.png?t=123&favicon=agency-v2",
    ]);
  });
});
