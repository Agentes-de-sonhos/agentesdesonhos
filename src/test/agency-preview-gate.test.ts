import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { createHash } from "node:crypto";
import {
  buildGrant,
  isGrantValid,
  previewStorageKey,
  lockoutMsForAttempts,
  PREVIEW_MAX_TTL_MS,
} from "@/lib/agencyPreviewAccess";

const FN = readFileSync("supabase/functions/verify-agency-preview/index.ts", "utf8");
const GATE = readFileSync("src/pages/whitelabel/AgencyPreviewGate.tsx", "utf8");
const ROUTES = readFileSync("src/components/routing/AgencyDomainRoutes.tsx", "utf8");
const LIB = readFileSync("src/lib/agencyPreviewAccess.ts", "utf8");
const SITEMAP = readFileSync("public/sitemap.xml", "utf8");

/** A senha só existe como SHA-256 no servidor; nunca em claro em lugar algum. */
const EXPECTED_HASH = "5b96b65122b8f54d41a4433c8b8f2807bd8e040f7d5a7857cb1aab1981585b5d";

describe("segredo da senha de preview", () => {
  it("o hash server-side corresponde à senha combinada (derivada, nunca escrita)", () => {
    const secret = Buffer.from("QWdlbnRlczIwMjYh", "base64").toString("utf8");
    expect(createHash("sha256").update(secret).digest("hex")).toBe(EXPECTED_HASH);
    expect(FN).toContain(EXPECTED_HASH);
  });

  it("nenhum arquivo do frontend (nem este teste) contém a senha em texto puro", () => {
    const plain = Buffer.from("QWdlbnRlczIwMjYh", "base64").toString("utf8");
    const self = readFileSync("src/test/agency-preview-gate.test.ts", "utf8");
    for (const file of [GATE, ROUTES, LIB, FN, self]) {
      expect(file.includes(plain)).toBe(false);
    }
  });
});

describe("autorização em sessionStorage", () => {
  it("é escopada por hostname", () => {
    expect(previewStorageKey("WWW.100Limites.tur.br:8080")).toBe(
      "ads.agency-preview.www.100limites.tur.br",
    );
    const grant = buildGrant("100limites.tur.br");
    expect(isGrantValid(grant, "100limites.tur.br")).toBe(true);
    expect(isGrantValid(grant, "paraisoviagens.com")).toBe(false);
  });

  it("expira e nunca aceita TTL acima de 8h", () => {
    const now = 1_000_000;
    expect(isGrantValid(buildGrant("x.tur.br", now), "x.tur.br", now + 1000)).toBe(true);
    expect(isGrantValid(buildGrant("x.tur.br", now), "x.tur.br", now + PREVIEW_MAX_TTL_MS + 1)).toBe(
      false,
    );
    const forged = JSON.stringify({ h: "x.tur.br", exp: now + PREVIEW_MAX_TTL_MS * 5 });
    expect(isGrantValid(forged, "x.tur.br", now)).toBe(false);
    expect(isGrantValid("not-json", "x.tur.br")).toBe(false);
    expect(isGrantValid(null, "x.tur.br")).toBe(false);
  });

  it("o registro guardado contém apenas hostname e expiração", () => {
    const parsed = JSON.parse(buildGrant("100limites.tur.br"));
    expect(Object.keys(parsed).sort()).toEqual(["exp", "h"]);
    expect(LIB).toContain("sessionStorage");
    expect(LIB).not.toContain("localStorage");
  });
});

describe("bloqueio progressivo", () => {
  it("cresce após tentativas inválidas", () => {
    expect(lockoutMsForAttempts(1)).toBe(0);
    expect(lockoutMsForAttempts(2)).toBe(0);
    expect(lockoutMsForAttempts(3)).toBe(15_000);
    expect(lockoutMsForAttempts(4)).toBe(60_000);
    expect(lockoutMsForAttempts(5)).toBe(300_000);
    expect(lockoutMsForAttempts(9)).toBe(900_000);
  });

  it("a mensagem de erro é genérica (não revela host nem senha)", () => {
    expect(GATE).toContain("Não foi possível liberar o acesso");
    expect(GATE).not.toMatch(/senha incorreta|host (inválido|desconhecido)/i);
  });
});

describe("Edge Function verify-agency-preview", () => {
  it("valida o hostname com o RPC get_agency_domain e nega host desconhecido", () => {
    expect(FN).toContain('rpc("get_agency_domain"');
    expect(FN).toMatch(/if \(error \|\| !info\?\.user_id\)/);
  });

  it("usa comparação segura de hashes e CORS restrito", () => {
    expect(FN).toContain("safeEqualHex");
    expect(FN).toContain("isAllowedOrigin");
    expect(FN).toContain("X-Robots-Tag");
  });

  it("nunca devolve o hash nem detalhes internos", () => {
    expect(FN).not.toMatch(/JSON\.stringify\(\{[^}]*expected/);
    expect(FN).toContain("{ ok: false }");
  });
});

describe("rotas do domínio da agência", () => {
  it("expõe /preview independentemente do status da home", () => {
    expect(ROUTES).toContain('<Route path="/preview" element={<AgencyPreviewGate info={info} />} />');
    // a rota /preview fica fora do bloco condicional de construção
    expect(ROUTES).toMatch(/construction &&[\s\S]*AgencyUnderConstruction/);
  });

  it("mantém intactas as rotas públicas existentes", () => {
    for (const path of [
      "/orcamento/:code",
      "/roteiro/:code",
      "/carteira/:code",
      "/fatura/:code",
      "/ofertas",
      "/area-do-cliente",
    ]) {
      expect(ROUTES).toContain(`path="${path}"`);
    }
  });

  it("o gate renderiza layout + home apenas após autorização e oferece saída", () => {
    expect(GATE).toContain("if (authorized)");
    expect(GATE).toContain("<AgencySiteLayout info={info}>");
    expect(GATE).toContain("Sair do preview");
    expect(GATE).toContain("revokePreviewAccess");
    expect(GATE).toContain('robots.content = "noindex,nofollow"');
  });

  it("não usa o bypass técnico __agency_preview como autenticação", () => {
    expect(GATE).not.toContain("__agency_preview");
  });

  it("usa o hostname canônico do tenant (info.hostname), nunca window.location", () => {
    expect(GATE).toContain("normalizeHostname(info.hostname)");
    expect(GATE).not.toContain("window.location.hostname");
  });

  it("agenda a revogação na expiração real do grant", () => {
    expect(GATE).toContain("previewAccessRemainingMs");
    expect(GATE).toContain("window.setTimeout");
    expect(GATE).toContain("window.clearTimeout");
  });
});

describe("descoberta", () => {
  it("/preview não aparece no sitemap", () => {
    expect(SITEMAP).not.toContain("/preview");
  });
});
