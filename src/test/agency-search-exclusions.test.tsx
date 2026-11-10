// @vitest-environment-options {"url":"https://www.omundoemcores.com.br/"}
import { afterEach, describe, expect, it } from "vitest";
import { cleanup, render, waitFor } from "@testing-library/react";
import { HelmetProvider } from "react-helmet-async";
import { MemoryRouter } from "react-router-dom";
import { SEO } from "@/components/seo/SEO";
import { isAgencySearchExcluded } from "@/lib/agencySearchExclusions";
import { shouldNoindexAgencyPath } from "@/lib/agencySlugRouting";

const paths = [
  "/resorts-brasil/sofitel-jequitimar-guaruja",
  "/politicasdeprivacidade",
  "/termosdeuso",
  "/resorts-brasil/cyan-resort",
  "/resorts-brasil/blue-tree-thermas-de-lins-resort",
];
afterEach(cleanup);
describe("explicit Mundo search exclusions", () => {
  it.each(paths)("excludes %s on both host aliases, including query/trailing slash", path => {
    for (const host of ["omundoemcores.com.br", "www.omundoemcores.com.br"]) {
      expect(isAgencySearchExcluded(host, path)).toBe(true);
      expect(isAgencySearchExcluded(host, `${path}/?utm_source=google`)).toBe(true);
      expect(shouldNoindexAgencyPath(host, path)).toBe(true);
    }
  });
  it("keeps the five priority pages indexable and does not broaden tenant exclusions", () => {
    for (const path of ["/", "/disney", "/universal", "/resorts-brasil", "/oportunidades-novembro"]) {
      expect(isAgencySearchExcluded("www.omundoemcores.com.br", path)).toBe(false);
      expect(shouldNoindexAgencyPath("www.omundoemcores.com.br", path)).toBe(false);
    }
    for (const host of ["destinoscomaju.com.br", "agentesdesonhos.com.br", "omundoemcores.com.br.evil.test"]) {
      for (const path of paths) expect(isAgencySearchExcluded(host, path)).toBe(false);
      expect(shouldNoindexAgencyPath(host, "/termosdeuso")).toBe(false);
    }
    expect(isAgencySearchExcluded("omundoemcores.com.br", "/resorts-brasil/outro-resort")).toBe(false);
  });
  it.each(paths)("page SEO cannot override the exclusion for %s", async path => {
    expect(window.location.hostname).toBe("www.omundoemcores.com.br");
    render(<HelmetProvider><MemoryRouter initialEntries={[path]}><SEO title="Test page" noindex={false} /></MemoryRouter></HelmetProvider>);
    await waitFor(() => expect(document.querySelector('meta[name="robots"]')?.getAttribute("content")).toBe("noindex, follow"));
  });
});
