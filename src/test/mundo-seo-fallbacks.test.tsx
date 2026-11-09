import { readFileSync } from "node:fs";
import { JSDOM } from "jsdom";
import { afterEach, describe, expect, it } from "vitest";
import { cleanup, fireEvent, render, waitFor } from "@testing-library/react";
import { Link, MemoryRouter } from "react-router-dom";
import { HelmetProvider } from "react-helmet-async";
import { MundoSEO } from "@/components/seo/MundoSEO";
import { MUNDO_SEO_PAGES } from "@/lib/mundoSeo";

const html = readFileSync("index.html", "utf8");
function parse(url: string) {
  // Execute the real bootstrap during parsing to reproduce Google's duplicate
  // title case. No external resources are loaded by this DOM fixture.
  return new JSDOM(html, { url, runScripts: "dangerously" });
}
const originalHead = document.head.innerHTML;
afterEach(() => { cleanup(); document.head.innerHTML = originalHead; });

describe("Mundo fallback head ownership", () => {
  it("has exactly one title after parsing on every pilot route", () => {
    for (const host of ["omundoemcores.com.br", "www.omundoemcores.com.br"]) {
      for (const path of Object.keys(MUNDO_SEO_PAGES)) {
        const dom = parse(`https://${host}${path}`);
        expect(dom.window.document.querySelectorAll("title")).toHaveLength(1);
        expect(dom.window.document.title).toBe("O Mundo em Cores");
        expect(dom.window.document.querySelector('meta[name="description"]')?.getAttribute("data-rh")).toBeNull();
        dom.window.close();
      }
    }
  });
  it("preserves neutral defaults and ownership on other tenants and private routes", () => {
    for (const url of ["https://destinoscomaju.com.br/", "https://omundoemcores.com.br/area-do-cliente", "https://carteiradigital.tur.br/token", "https://example.com/?__agency_host=omundoemcores.com.br"]) {
      const dom = parse(url);
      expect(dom.window.document.querySelector('meta[name="description"]')?.getAttribute("data-rh")).toBeNull();
      expect(dom.window.document.querySelector('meta[name="description"]')?.getAttribute("content")).toBe("Tudo que você precisa para sua viagem em um só lugar.");
      expect(dom.window.document.querySelectorAll("title")).toHaveLength(1);
      dom.window.close();
    }
  });
  it.each(Object.entries(MUNDO_SEO_PAGES))("replaces fallback tags with one agency set for %s", async (path, page) => {
    const dom = parse(`https://www.omundoemcores.com.br${path}`);
    document.head.innerHTML = "";
    // Transplant only inert head nodes; render the actual React SEO component.
    for (const node of dom.window.document.head.querySelectorAll("title, meta, link")) {
      document.head.appendChild(document.importNode(node, true));
    }
    dom.window.close();
    render(<HelmetProvider><MemoryRouter initialEntries={[path]}><MundoSEO hostname="omundoemcores.com.br" /></MemoryRouter></HelmetProvider>);
    await waitFor(() => expect(document.querySelector('meta[name="description"]')?.getAttribute("content")).toBe(page.description));
    expect(document.querySelectorAll("title")).toHaveLength(1);
    expect(document.title).toBe(page.title);
    for (const selector of ['meta[name="description"]', 'meta[property="og:title"]', 'meta[property="og:description"]', 'meta[name="twitter:description"]', 'link[rel="canonical"]']) {
      expect(document.querySelectorAll(selector)).toHaveLength(1);
    }
    expect(document.querySelector('link[rel="canonical"]')?.getAttribute("href")).toBe(`https://www.omundoemcores.com.br${path}`);
  });
});

it("adopts neutral tags when navigating into the SEO pilot and keeps one set on the next route", async () => {
  const dom = parse("https://www.omundoemcores.com.br/xcaret");
  document.head.innerHTML = "";
  for (const node of dom.window.document.head.querySelectorAll("title, meta, link")) {
    document.head.appendChild(document.importNode(node, true));
  }
  dom.window.close();
  const view = render(<HelmetProvider><MemoryRouter initialEntries={["/xcaret"]}>
    <MundoSEO hostname="omundoemcores.com.br" />
    <Link to="/">Home</Link><Link to="/universal">Universal</Link>
  </MemoryRouter></HelmetProvider>);
  fireEvent.click(view.getByRole("link", { name: "Home" }));
  await waitFor(() => expect(document.querySelector('meta[name="description"]')?.getAttribute("content")).toBe(MUNDO_SEO_PAGES["/"].description));
  fireEvent.click(view.getByRole("link", { name: "Universal" }));
  await waitFor(() => expect(document.title).toBe(MUNDO_SEO_PAGES["/universal"].title));
  expect(document.querySelectorAll("title")).toHaveLength(1);
  expect(document.querySelectorAll('meta[name="description"]')).toHaveLength(1);
  expect(document.querySelector('meta[name="description"]')?.getAttribute("content")).toBe(MUNDO_SEO_PAGES["/universal"].description);
});
