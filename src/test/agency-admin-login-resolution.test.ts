import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import {
  hostCandidates,
  loginCandidates,
  originAllowed,
  pickAgencyMember,
  resolveAgencyFromDomains,
  type DomainRow,
  type MemberRow,
} from "../../supabase/functions/agency-admin-resolve-login/resolve";

const AG_100 = "9433421c-2252-4030-acab-135c03ab009e";
const AG_OTHER = "11111111-2222-3333-4444-555555555555";

const domains: DomainRow[] = [
  { user_id: AG_100, hostname: "100limites.tur.br", is_active: true, admin_portal_enabled: true },
  { user_id: AG_100, hostname: "www.100limites.tur.br", is_active: true, admin_portal_enabled: true },
  { user_id: AG_OTHER, hostname: "outra.tur.br", is_active: true, admin_portal_enabled: false },
];

const members: MemberRow[] = [
  {
    agency_id: AG_100,
    login_normalized: "teste@teste.com.br",
    status: "active",
    synthetic_email: "tst-100@team.agentesdesonhos.local",
  },
  {
    agency_id: AG_OTHER,
    login_normalized: "teste@teste.com.br",
    status: "active",
    synthetic_email: "tst-outra@team.agentesdesonhos.local",
  },
  {
    agency_id: AG_100,
    login_normalized: "inativo@teste.com.br",
    status: "blocked",
    synthetic_email: "inat@team.agentesdesonhos.local",
  },
];

describe("resolução da agência pelo hostname", () => {
  it("aceita domínio principal e com www", () => {
    expect(resolveAgencyFromDomains(domains, "100limites.tur.br")).toBe(AG_100);
    expect(resolveAgencyFromDomains(domains, "www.100limites.tur.br")).toBe(AG_100);
    expect(hostCandidates("www.100limites.tur.br")).toContain("100limites.tur.br");
  });

  it("recusa domínio sem painel habilitado e domínio inativo", () => {
    expect(resolveAgencyFromDomains(domains, "outra.tur.br")).toBeNull();
    const inactive = domains.map((d) => ({ ...d, is_active: false }));
    expect(resolveAgencyFromDomains(inactive, "100limites.tur.br")).toBeNull();
  });

  it("recusa hostname desconhecido ou vazio", () => {
    expect(resolveAgencyFromDomains(domains, "desconhecido.com.br")).toBeNull();
    expect(resolveAgencyFromDomains(domains, "")).toBeNull();
  });
});

describe("colaborador resolvido somente dentro da agência do domínio", () => {
  it("mesmo login em duas agências resolve pelo domínio acessado", () => {
    expect(pickAgencyMember(members, AG_100, "teste@teste.com.br")?.synthetic_email).toBe(
      "tst-100@team.agentesdesonhos.local",
    );
    expect(pickAgencyMember(members, AG_OTHER, "teste@teste.com.br")?.synthetic_email).toBe(
      "tst-outra@team.agentesdesonhos.local",
    );
  });

  it("login inexistente, colaborador inativo e colaborador de outra agência não resolvem", () => {
    expect(pickAgencyMember(members, AG_100, "nao-existe@teste.com.br")).toBeNull();
    expect(pickAgencyMember(members, AG_100, "inativo@teste.com.br")).toBeNull();
    const onlyOther = members.filter((m) => m.agency_id === AG_OTHER);
    expect(pickAgencyMember(onlyOther, AG_100, "teste@teste.com.br")).toBeNull();
  });

  it("conta master (sem cadastro de equipe) não resolve — segue login normal", () => {
    expect(pickAgencyMember(members, AG_100, "master@100limites.tur.br")).toBeNull();
  });

  it("tolera as variações históricas do domínio da plataforma no login", () => {
    expect(loginCandidates("x@agentedesonhos.com.br")).toContain("x@agentesdesonhos.com.br");
  });
});

describe("Origin da requisição", () => {
  const ref = (origin: string | null) => ({ origin, referer: null });

  it("aceita o próprio domínio, com e sem www", () => {
    expect(originAllowed(ref("https://100limites.tur.br"), "100limites.tur.br")).toBe(true);
    expect(originAllowed(ref("https://www.100limites.tur.br"), "100limites.tur.br")).toBe(true);
  });

  it("aceita preview/localhost e recusa domínio cruzado ou ausente", () => {
    expect(originAllowed(ref("https://x.lovable.app"), "100limites.tur.br")).toBe(true);
    expect(originAllowed(ref("http://localhost:8080"), "100limites.tur.br")).toBe(true);
    expect(originAllowed(ref("https://outra.tur.br"), "100limites.tur.br")).toBe(false);
    expect(originAllowed(ref(null), "100limites.tur.br")).toBe(false);
  });
});

describe("ausência de exposição e de enumeração", () => {
  const fn = readFileSync(
    "supabase/functions/agency-admin-resolve-login/index.ts",
    "utf8",
  );
  const page = readFileSync("src/pages/whitelabel/admin/AgencyAdminLogin.tsx", "utf8");
  const helper = readFileSync("src/lib/agencyAdminLogin.ts", "utf8");

  it("a Edge Function nunca aceita agency_id do navegador", () => {
    expect(fn).not.toMatch(/req\.json\(\)[\s\S]{0,120}agency_id/);
    expect(fn).toContain("resolveAgencyFromDomains");
  });

  it("respostas negativas são sempre genéricas (email: null)", () => {
    expect(fn.match(/email: null/g)?.length ?? 0).toBeGreaterThanOrEqual(5);
    expect(fn).not.toMatch(/status:\s*40[13]/);
  });

  it("o identificador técnico não é exibido, logado nem guardado", () => {
    expect(page).not.toContain("team.agentesdesonhos.local");
    expect(page).not.toMatch(/console\.(log|error|warn)/);
    expect(helper).not.toMatch(/console\.(log|error|warn)/);
    expect(helper).not.toMatch(/localStorage|sessionStorage|searchParams/);
  });

  it("a página usa a resolução por hostname e mantém mensagem única", () => {
    expect(page).toContain("resolveAgencyAdminLogin(hostname");
    expect(page).toContain("Não foi possível entrar. Verifique seu e-mail e senha");
    expect(page.match(/setError\(GENERIC_ERROR\)/g)?.length ?? 0).toBeGreaterThanOrEqual(3);
  });

  it("recuperação de senha de colaborador informa a verdade (sem envio de e-mail)", () => {
    expect(page).toContain("resolved.team");
    expect(page).toContain("definida pelo administrador da sua agência");
    // o reset por e-mail continua existindo apenas para conta master
    expect(page).toContain("resetPasswordForEmail");
  });

  it("o login tradicional da plataforma continua usando team-resolve-login", () => {
    const auth = readFileSync("src/pages/Auth.tsx", "utf8");
    expect(auth).toContain("team-resolve-login");
  });
});
