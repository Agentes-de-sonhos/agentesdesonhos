import { describe, it, expect } from "vitest";
import { MUNDO_SEO_PAGES, mundoSeoPage } from "@/lib/mundoSeo";
import { shouldNoindexAgencyPath } from "@/lib/agencySlugRouting";
import { withAgencyContext } from "@/lib/agencyContextLink";

describe("Mundo SEO tenant and private-page boundaries", () => {
  it("makes the home and four public pages indexable on both real domains", () => {
    for (const host of ["omundoemcores.com.br", "www.omundoemcores.com.br"]) {
      for (const path of Object.keys(MUNDO_SEO_PAGES)) {
        expect(shouldNoindexAgencyPath(host, path)).toBe(false);
        expect(mundoSeoPage(host, path)?.canonical).toBe(`https://www.omundoemcores.com.br${path}`);
      }
    }
  });
  it("does not open private or client-shared routes, or other tenants", () => {
    for (const path of ["/gestao", "/preview", "/area-do-cliente", "/orcamento/secret", "/carteira/secret", "/disney/hoteis/test"])
      expect(shouldNoindexAgencyPath("omundoemcores.com.br", path)).toBe(true);
    expect(mundoSeoPage("destinoscomaju.com.br", "/disney")).toBeNull();
    expect(shouldNoindexAgencyPath("destinoscomaju.com.br", "/disney")).toBe(true);
    expect(mundoSeoPage("evil-omundoemcores.com.br", "/")).toBeNull();
  });
  it("keeps the November campaign URL and its attribution parameters", () => {
    const path = "/oportunidades-novembro?utm_source=whatsapp&utm_campaign=novembro";
    expect(withAgencyContext(path, "omundoemcores.com.br", "")).toBe(path);
    expect(mundoSeoPage("omundoemcores.com.br", "/oportunidades-novembro/")?.canonical).toBe("https://www.omundoemcores.com.br/oportunidades-novembro");
  });
});

import { render, waitFor, cleanup } from "@testing-library/react";
import { afterEach } from "vitest";
import { MemoryRouter } from "react-router-dom";
import { HelmetProvider } from "react-helmet-async";
import { MundoSEO } from "@/components/seo/MundoSEO";
afterEach(cleanup);
it("emits the agency canonical and keeps technical previews out of search", async () => {
  render(<HelmetProvider><MemoryRouter initialEntries={["/disney?utm_source=whatsapp"]}><MundoSEO hostname="omundoemcores.com.br" /></MemoryRouter></HelmetProvider>);
  await waitFor(() => expect(document.title).toContain("Disney: parques, ingressos e hotéis | O Mundo em Cores"));
  expect(document.querySelector('link[rel="canonical"]')?.getAttribute("href")).toBe("https://www.omundoemcores.com.br/disney");
  expect(document.querySelector('meta[name="robots"]')?.getAttribute("content")).toBe("noindex, nofollow");
  expect(document.querySelector('meta[property="og:site_name"]')?.getAttribute("content")).toBe("O Mundo em Cores");
});
