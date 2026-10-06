/**
 * Apresentação do SiteLab: disponibilidade real das seções, abertura/Central
 * ocultáveis, menu restrito às seções visíveis e isolamento dos clientes.
 */
import { beforeEach, describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { fireEvent, render, screen } from "@testing-library/react";
import { DEFAULT_SECTIONS, type AgencySectionKey } from "@/lib/agencySiteConfig";
import { resolveSiteProfile } from "@/lib/agencySiteProfile";
import { NAV_LINKS, siteNavLinks } from "@/components/whitelabel/AgencySiteLayout";
import { SITELAB_DEMO_HOSTNAME as HOST } from "@/lib/sitelabModels";
import {
  EMPTY_PRESENTATION,
  filterNavForSections,
  loadPresentation,
  navTargetSection,
  sitelabEffectiveSections,
  sitelabUnavailableReason,
} from "@/lib/sitelabPresentation";
import SiteLabPresentationEditor from "@/pages/sitelab/SiteLabPresentationEditor";

const lab = resolveSiteProfile(HOST);
const home = readFileSync(resolve(process.cwd(), "src/pages/whitelabel/AgencySiteHome.tsx"), "utf8");
const UNAVAILABLE: AgencySectionKey[] = ["authority", "avaliacoes"];

describe("disponibilidade real das seções no laboratório", () => {
  it("apenas Autoridade e Avaliações do Google ficam indisponíveis", () => {
    const off = DEFAULT_SECTIONS.map((s) => s.key).filter((k) => sitelabUnavailableReason(k, lab, HOST));
    expect(off.sort()).toEqual([...UNAVAILABLE].sort());
  });

  it("cada seção disponível pode ser ligada e desligada (todas as variantes)", () => {
    for (const s of DEFAULT_SECTIONS) {
      const on = sitelabEffectiveSections(lab, HOST, { ...EMPTY_PRESENTATION, sections: { [s.key]: true } });
      const off = sitelabEffectiveSections(lab, HOST, { ...EMPTY_PRESENTATION, sections: { [s.key]: false } });
      expect(off.has(s.key)).toBe(false);
      expect(on.has(s.key)).toBe(!UNAVAILABLE.includes(s.key));
    }
  });

  it("abertura e Central de Solicitações são ocultáveis, visíveis por padrão", () => {
    const def = sitelabEffectiveSections(lab, HOST, EMPTY_PRESENTATION);
    expect(def.has("hero") && def.has("requests")).toBe(true);
    const hidden = sitelabEffectiveSections(lab, HOST, {
      ...EMPTY_PRESENTATION,
      sections: { hero: false, requests: false },
    });
    expect(hidden.has("hero") || hidden.has("requests")).toBe(false);
    expect(home).toContain("{showHero && (");
    expect(home).toContain("<div hidden={!showRequests}>");
    expect(home).toContain("const labPick = profile.demo ? labPresentation?.sections : undefined;");
  });
});

describe("menu da demonstração", () => {
  it("todo link de seção do menu base aponta para uma seção conhecida", () => {
    for (const l of siteNavLinks(HOST)) {
      if (l.to === "/" || l.to === "/area-do-cliente") continue;
      expect(navTargetSection(l.to)).not.toBeNull();
    }
  });

  it("remove links das seções ocultas e mantém Início/Área do Cliente", () => {
    const visible = sitelabEffectiveSections(lab, HOST, {
      ...EMPTY_PRESENTATION,
      sections: { requests: false, modules: false, offers: false, about: false, concierge: false },
    });
    const nav = filterNavForSections(siteNavLinks(HOST), visible).map((l) => l.to);
    expect(nav).toEqual(["/", "/area-do-cliente"]);
  });

  it("com o padrão, o menu fica igual ao base", () => {
    const visible = sitelabEffectiveSections(lab, HOST, EMPTY_PRESENTATION);
    expect(filterNavForSections(siteNavLinks(HOST), visible)).toEqual(siteNavLinks(HOST));
  });

  it("submenus: filhos ocultos saem e o pai some sem filhos", () => {
    const items = [
      { label: "Esp", to: "/#assinatura", children: [{ label: "FAQ", to: "/#faq" }, { label: "Sobre", to: "/#sobre" }] },
    ];
    const v1 = new Set(["faq"] as const);
    expect(filterNavForSections(items, v1 as never)[0].children).toEqual([{ label: "FAQ", to: "/#faq" }]);
    expect(filterNavForSections(items, new Set())).toEqual([]);
  });
});

describe("isolamento dos clientes", () => {
  it("menus de tenants reais seguem inalterados (sem override)", () => {
    expect(siteNavLinks("outra-agencia.com.br")).toEqual(NAV_LINKS);
    expect(siteNavLinks("destinoscomaju.com.br")).toEqual(resolveSiteProfile("destinoscomaju.com.br").nav);
  });

  it("override de menu só é passado pelo SiteLab", () => {
    const root = readFileSync(resolve(process.cwd(), "src/pages/sitelab/SiteLabRoot.tsx"), "utf8");
    expect(root).toContain("navOverride={navOverride}");
    const { execSync } = require("node:child_process") as typeof import("node:child_process");
    const users = execSync("rg -l 'navOverride=' src --glob '!src/test/**'").toString().trim().split("\n").sort();
    expect(users).toEqual([
      "src/components/whitelabel/AgencySiteLayout.tsx",
      "src/pages/sitelab/SiteLabRoot.tsx",
    ]);
  });

  it("perfis reais não são demo (seleção nunca se aplica a eles)", () => {
    for (const h of ["destinoscomaju.com.br", "100limites.tur.br", "faeviagens.com.br", "paraisoviagens.com", "outra.com.br"]) {
      expect(resolveSiteProfile(h).demo).toBeFalsy();
    }
  });
});

describe("tela Apresentação", () => {
  beforeEach(() => localStorage.clear());

  it("indisponíveis ficam desligados e bloqueados; abertura/Central alternáveis e persistem", () => {
    render(<SiteLabPresentationEditor />);
    for (const k of UNAVAILABLE) {
      const sw = screen.getByTestId(`sec-${k}`);
      expect(sw.hasAttribute("disabled")).toBe(true);
      expect(sw.getAttribute("aria-checked")).toBe("false");
    }
    fireEvent.click(screen.getByTestId("sec-hero"));
    fireEvent.click(screen.getByTestId("sec-requests"));
    fireEvent.click(screen.getByRole("button", { name: "Salvar apresentação" }));
    const saved = loadPresentation("sitelab-base");
    expect(saved.sections.hero).toBe(false);
    expect(saved.sections.requests).toBe(false);
    expect(screen.getByTestId("sections-summary").textContent).toMatch(/de 17 blocos disponíveis/);
  });
});
