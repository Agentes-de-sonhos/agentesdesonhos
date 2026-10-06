/**
 * Apresentação comercial do SiteLab Base: persistência local, seleção de
 * seções/temas, identidade e isolamento (tenants reais não são afetados).
 */
import { beforeEach, describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { DEFAULT_SECTIONS } from "@/lib/agencySiteConfig";
import {
  loadPresentation,
  presentationStorageKey,
  resetPresentation,
  sanitizePresentation,
  savePresentation,
} from "@/lib/sitelabPresentation";

const read = (p: string) => readFileSync(resolve(process.cwd(), p), "utf8");
const home = read("src/pages/whitelabel/AgencySiteHome.tsx");
const root = read("src/pages/sitelab/SiteLabRoot.tsx");
const chrome = read("src/pages/sitelab/SiteLabChrome.tsx");
const entry = read("src/pages/sitelab/SiteLabAdminEntry.tsx");
const editor = read("src/pages/sitelab/SiteLabPresentationEditor.tsx");
const lib = read("src/lib/sitelabPresentation.ts");
const app = read("src/App.tsx");

describe("persistência da apresentação", () => {
  beforeEach(() => localStorage.clear());

  it("salva e recarrega (equivale a reload) seções, temas e identidade", () => {
    savePresentation("sitelab-base", {
      sections: { faq: false, orlando: true },
      modules: { cruzeiros: false },
      identity: { name: "Agência Prospect", primary: "#112233", logoUrl: "https://x.test/l.png" },
    });
    const v = loadPresentation("sitelab-base");
    expect(v.sections).toEqual({ faq: false, orlando: true });
    expect(v.modules).toEqual({ cruzeiros: false });
    expect(v.identity.name).toBe("Agência Prospect");
    expect(v.identity.primary).toBe("#112233");
    expect(localStorage.getItem(presentationStorageKey("sitelab-base"))).toBeTruthy();
  });

  it("descarta lixo: chaves desconhecidas, cores inválidas e logos não https/data", () => {
    const v = sanitizePresentation({
      sections: { faq: false, hacker: true },
      identity: { primary: "red", logoUrl: "javascript:alert(1)" },
    });
    expect(v.sections).toEqual({ faq: false });
    expect(v.identity.primary).toBeUndefined();
    expect(v.identity.logoUrl).toBeUndefined();
  });

  it("restaurar padrão limpa a chave", () => {
    savePresentation("sitelab-base", { sections: { faq: false }, modules: {}, identity: {} });
    resetPresentation("sitelab-base");
    expect(loadPresentation("sitelab-base").sections).toEqual({});
  });
});

describe("tela de gestão e aplicação na home", () => {
  it("o editor contempla todas as seções da home", () => {
    expect(editor).toContain("DEFAULT_SECTIONS.map");
    expect(DEFAULT_SECTIONS.length).toBeGreaterThan(10);
    expect(editor).toContain("sec-${r.key}");
  });

  it("a tela fica em /sitelab-base/gestao/apresentacao, coberta pela entrada e pela ponte", () => {
    expect(entry).toContain("`${SITELAB_BASE_PATH}/gestao/apresentacao`");
    expect(entry).toContain("<SiteLabPresentationEditor />");
    expect(app).toContain('<Route path="/sitelab-base/gestao/*" element={<SiteLabAdminReload />} />');
  });

  it("a home aplica a seleção apenas no perfil demo e não mostra índice/etiquetas", () => {
    expect(home).toContain("if (profile.demo && labPresentation?.sections)");
    expect(home).toContain("const pick = profile.demo ? labPresentation?.modules : undefined;");
    expect(home).not.toContain("<SiteLabCatalogMap");
    expect(home).not.toContain("<SiteLabSectionTag");
    expect(root).toContain("labPresentation={{ sections: presentation.sections, modules: presentation.modules }}");
  });

  it("identidade do prospect entra no modelo do laboratório", () => {
    expect(chrome).toContain("useSiteLabPresentation(SITELAB_BASE.slug)");
    expect(chrome).toContain("name: identity.name ?? base.name");
  });

  it("isolamento: nada grava no backend", () => {
    for (const src of [lib, editor]) {
      expect(src).not.toMatch(/supabase|\.rpc\(|\.from\(/);
    }
  });
});
