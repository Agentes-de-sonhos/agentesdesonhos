/**
 * SiteLab Base — configuração da APRESENTAÇÃO COMERCIAL (prospect).
 *
 * Exclusiva do laboratório: seleção das seções/temas da home e identidade
 * provisória (nome, logotipo, 3 cores) para demonstrar o template a um
 * prospect. Fica no navegador (localStorage, chave por slug do laboratório):
 * não grava em nenhuma tabela, não toca perfis reais nem `sitelab_templates`
 * (cuja escrita é restrita a administradores da plataforma).
 */
import { useEffect, useState } from "react";
import {
  DEFAULT_SECTIONS,
  resolveDmc,
  resolveSections,
  type AgencySectionKey,
  type AgencySectionOverride,
} from "@/lib/agencySiteConfig";
import { SITE_CATALOG } from "@/lib/agencySiteCatalog";
import { isGoogleReviewsEnabled } from "@/lib/agencyGoogleReviews";
import type { AgencySiteProfile } from "@/lib/agencySiteProfile";

/** Blocos de abertura que também podem ser ocultados na demonstração. */
export type SiteLabOpeningKey = "hero" | "requests";
export type SiteLabSectionKey = AgencySectionKey | SiteLabOpeningKey;

export interface SiteLabIdentity {
  name?: string;
  logoUrl?: string;
  primary?: string;
  secondary?: string;
  tertiary?: string;
}

export interface SiteLabPresentation {
  /** false = seção oculta na demonstração; ausente = padrão do laboratório. */
  sections: Partial<Record<SiteLabSectionKey, boolean>>;
  /** false = tema de módulo oculto; ausente = visível. */
  modules: Record<string, boolean>;
  identity: SiteLabIdentity;
}

export const EMPTY_PRESENTATION: SiteLabPresentation = { sections: {}, modules: {}, identity: {} };

const EVENT = "sitelab-presentation-change";
const HEX = /^#[0-9a-f]{6}$/i;
/** Limite do logotipo enviado como arquivo (data URL). */
export const SITELAB_LOGO_MAX_BYTES = 700 * 1024;

export function presentationStorageKey(slug: string): string {
  return `sitelab-presentation:${slug}`;
}

const SECTION_KEYS = new Set<string>([...DEFAULT_SECTIONS.map((s) => s.key), "hero", "requests"]);

function cleanString(v: unknown, max: number): string | undefined {
  return typeof v === "string" && v.trim() ? v.trim().slice(0, max) : undefined;
}

/** Normaliza qualquer valor lido do storage (tolerante a lixo/versões antigas). */
export function sanitizePresentation(raw: unknown): SiteLabPresentation {
  const r = (raw && typeof raw === "object" ? raw : {}) as Record<string, unknown>;
  const sections: SiteLabPresentation["sections"] = {};
  const s = (r.sections && typeof r.sections === "object" ? r.sections : {}) as Record<string, unknown>;
  for (const [k, v] of Object.entries(s)) {
    if (SECTION_KEYS.has(k) && typeof v === "boolean") sections[k as SiteLabSectionKey] = v;
  }
  const modules: Record<string, boolean> = {};
  const m = (r.modules && typeof r.modules === "object" ? r.modules : {}) as Record<string, unknown>;
  for (const [k, v] of Object.entries(m)) if (typeof v === "boolean") modules[k] = v;
  const i = (r.identity && typeof r.identity === "object" ? r.identity : {}) as Record<string, unknown>;
  const color = (v: unknown) => (typeof v === "string" && HEX.test(v.trim()) ? v.trim() : undefined);
  const logo = cleanString(i.logoUrl, SITELAB_LOGO_MAX_BYTES * 2);
  const identity: SiteLabIdentity = {
    name: cleanString(i.name, 80),
    logoUrl: logo && /^(https:\/\/|data:image\/)/.test(logo) ? logo : undefined,
    primary: color(i.primary),
    secondary: color(i.secondary),
    tertiary: color(i.tertiary),
  };
  return { sections, modules, identity };
}

export function loadPresentation(slug: string): SiteLabPresentation {
  try {
    const raw = localStorage.getItem(presentationStorageKey(slug));
    return raw ? sanitizePresentation(JSON.parse(raw)) : EMPTY_PRESENTATION;
  } catch {
    return EMPTY_PRESENTATION;
  }
}

export function savePresentation(slug: string, value: SiteLabPresentation): boolean {
  try {
    localStorage.setItem(presentationStorageKey(slug), JSON.stringify(sanitizePresentation(value)));
    window.dispatchEvent(new CustomEvent(EVENT, { detail: slug }));
    return true;
  } catch {
    return false;
  }
}

export function resetPresentation(slug: string): void {
  try {
    localStorage.removeItem(presentationStorageKey(slug));
  } catch {
    /* storage indisponível */
  }
  window.dispatchEvent(new CustomEvent(EVENT, { detail: slug }));
}

/** Leitura reativa (mesma aba e outras abas). */
export function useSiteLabPresentation(slug: string): SiteLabPresentation {
  const [value, setValue] = useState(() => loadPresentation(slug));
  useEffect(() => {
    const refresh = () => setValue(loadPresentation(slug));
    const onStorage = (e: StorageEvent) => {
      if (e.key === presentationStorageKey(slug)) refresh();
    };
    window.addEventListener(EVENT, refresh);
    window.addEventListener("storage", onStorage);
    return () => {
      window.removeEventListener(EVENT, refresh);
      window.removeEventListener("storage", onStorage);
    };
  }, [slug]);
  return value;
}

/* ------------------------ disponibilidade e menu ------------------------ */

/**
 * Motivo pelo qual uma seção NÃO renderiza no laboratório (mesmas condições
 * de `AgencySiteHome.renderSection`), ou null quando renderiza de verdade.
 */
export function sitelabUnavailableReason(
  key: AgencySectionKey,
  profile: AgencySiteProfile,
  hostname: string,
): string | null {
  switch (key) {
    case "dmc":
      return resolveDmc(hostname) ?? profile.dmc ? null : "Sem conteúdo B2B/DMC no laboratório.";
    case "signature":
      return profile.signature ? null : "Sem texto de assinatura no laboratório.";
    case "authority":
      return profile.authority ? null : "Sem conteúdo de autoridade no laboratório; a seção não aparece.";
    case "credentials":
      return profile.credentials ? null : "Sem credenciais no laboratório.";
    case "avaliacoes":
      return isGoogleReviewsEnabled(hostname)
        ? null
        : "Depende da integração com o Google, inexistente no laboratório; a seção não aparece.";
    case "offers":
      return profile.demo ? null : "Só aparece com vitrine de ofertas publicada.";
    default:
      return null;
  }
}

/** Seções que realmente aparecem na home do laboratório com a seleção atual. */
export function sitelabEffectiveSections(
  profile: AgencySiteProfile,
  hostname: string,
  presentation: SiteLabPresentation,
): Set<SiteLabSectionKey> {
  const overrides: Partial<Record<AgencySectionKey, AgencySectionOverride>> = { ...(profile.sections ?? {}) };
  for (const [k, on] of Object.entries(presentation.sections)) {
    if (k === "hero" || k === "requests") continue;
    const cur = overrides[k as AgencySectionKey];
    overrides[k as AgencySectionKey] = typeof cur === "object" ? { ...cur, enabled: on } : { enabled: on };
  }
  const out = new Set<SiteLabSectionKey>();
  for (const s of resolveSections(overrides)) {
    if (!sitelabUnavailableReason(s.key, profile, hostname)) out.add(s.key);
  }
  if (presentation.sections.hero !== false) out.add("hero");
  if (presentation.sections.requests !== false) out.add("requests");
  return out;
}

/** Âncora/rota de menu → seção que ela exige. */
const ANCHOR_SECTION: Record<string, SiteLabSectionKey> = {
  ...Object.fromEntries(
    SITE_CATALOG.filter((e) => e.anchor.startsWith("#")).map((e) => [e.anchor.slice(1), e.key as SiteLabSectionKey]),
  ),
  topo: "hero",
  cotacao: "requests",
  solicitacoes: "requests",
  resorts: "resorts",
  "ingressos-orlando": "orlando",
  "experiencia-xcaret": "signature",
};

/** Seção exigida por um link de menu (null = link não depende de seção). */
export function navTargetSection(to: string): SiteLabSectionKey | null {
  if (to === "/ofertas") return "offers";
  const hash = to.split("#")[1];
  if (!hash) return null;
  return ANCHOR_SECTION[hash] ?? null;
}

interface NavItem {
  label: string;
  to: string;
  children?: { label: string; to: string }[];
}

/** Remove do menu os links para seções que não estão na página. */
export function filterNavForSections<T extends NavItem>(items: T[], visible: Set<SiteLabSectionKey>): T[] {
  const ok = (to: string) => {
    const key = navTargetSection(to);
    return !key || visible.has(key);
  };
  const out: T[] = [];
  for (const item of items) {
    const children = item.children?.filter((c) => ok(c.to));
    if (item.children?.length) {
      if (children && children.length) {
        out.push({ ...item, children, to: ok(item.to) ? item.to : children[0].to });
      }
      continue;
    }
    if (ok(item.to)) out.push(item);
  }
  return out;
}
