/**
 * Regressão: /sitelab-base/gestao/login renderiza o formulário SEM router
 * aninhado (o SiteLab vive dentro do router principal do App). Nos domínios
 * próprios das agências o login preserva o seu BrowserRouter próprio.
 */
import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const area = readFileSync(
  resolve(process.cwd(), "src/components/whitelabel/admin/AgencyAdminArea.tsx"),
  "utf8",
);
const login = readFileSync(
  resolve(process.cwd(), "src/pages/whitelabel/admin/AgencyAdminLogin.tsx"),
  "utf8",
);

describe("login da gestão — contexto SiteLab vs domínio próprio", () => {
  it("SiteLab (router externo) renderiza o login sem BrowserRouter aninhado", () => {
    expect(area).toContain("if (hasOuterRouter) {");
    expect(area).toMatch(
      /if \(hasOuterRouter\) \{\s*return <AgencyAdminLogin hostname=\{hostname\} basePath=\{mount\.base\} \/>;\s*\}/,
    );
    const entry = readFileSync(
      resolve(process.cwd(), "src/pages/sitelab/SiteLabAdminEntry.tsx"),
      "utf8",
    );
    expect(entry).toContain("hasOuterRouter");
  });

  it("sem router externo o login mantém o seu BrowserRouter, com o prefixo do tenant", () => {
    expect(area).toMatch(
      /<BrowserRouter basename=\{mount\.base \|\| undefined\}>\s*<AgencyAdminLogin hostname=\{hostname\} basePath=\{mount\.base\} \/>\s*<\/BrowserRouter>/,
    );
  });

  it("o login não usa hooks de router (seguro fora de BrowserRouter)", () => {
    expect(login).not.toMatch(/useNavigate|useLocation|useParams|<Link[\s>]/);
    // A navegação pós-login é real (mesmo domínio), sem depender de router.
    expect(login).toContain("window.location.replace");
  });

  it("o prefixo /sitelab-base continua preservado via agencyAdminMount", () => {
    expect(area).toContain("agencyAdminMount(basePath)");
    expect(area).toContain("mount.toInternal(real)");
  });
});
