/**
 * Regressão: navegação SPA para /sitelab-base/gestao* deve cair na rota-ponte
 * (antes dos catch-alls), que força carregamento real — nunca "Link inválido".
 */
import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const app = readFileSync(resolve(process.cwd(), "src/App.tsx"), "utf8");

describe("SiteLab gestão — rota-ponte", () => {
  it("declara a ponte para /sitelab-base/gestao e /sitelab-base/gestao/*", () => {
    expect(app).toContain('<Route path="/sitelab-base/gestao/*" element={<SiteLabAdminReload />} />');
    expect(app).toContain('<Route path="/sitelab-base/gestao" element={<SiteLabAdminReload />} />');
  });

  it("a ponte vem antes do catch-all /:agencySlug/:accessCode", () => {
    const bridge = app.indexOf('path="/sitelab-base/gestao/*"');
    const catchAll = app.indexOf('path="/:agencySlug/:accessCode"');
    expect(bridge).toBeGreaterThan(-1);
    expect(catchAll).toBeGreaterThan(bridge);
  });

  it("a ponte faz carregamento real com replace (sem nova entrada no histórico)", () => {
    expect(app).toMatch(
      /function SiteLabAdminReload\(\)\s*\{\s*useEffect\(\(\) => \{\s*window\.location\.replace\(window\.location\.href\);/,
    );
  });

  it("sem loop: a entrada do topo intercepta a URL real antes do router", () => {
    const top = app.indexOf("isSiteLabAdminPath(window.location.pathname)");
    const bridge = app.indexOf('path="/sitelab-base/gestao/*"');
    expect(top).toBeGreaterThan(-1);
    expect(bridge).toBeGreaterThan(top);
  });
});
