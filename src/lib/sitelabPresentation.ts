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
import { DEFAULT_SECTIONS, type AgencySectionKey } from "@/lib/agencySiteConfig";

export interface SiteLabIdentity {
  name?: string;
  logoUrl?: string;
  primary?: string;
  secondary?: string;
  tertiary?: string;
}

export interface SiteLabPresentation {
  /** false = seção oculta na demonstração; ausente = padrão do laboratório. */
  sections: Partial<Record<AgencySectionKey, boolean>>;
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

const SECTION_KEYS = new Set<string>(DEFAULT_SECTIONS.map((s) => s.key));

function cleanString(v: unknown, max: number): string | undefined {
  return typeof v === "string" && v.trim() ? v.trim().slice(0, max) : undefined;
}

/** Normaliza qualquer valor lido do storage (tolerante a lixo/versões antigas). */
export function sanitizePresentation(raw: unknown): SiteLabPresentation {
  const r = (raw && typeof raw === "object" ? raw : {}) as Record<string, unknown>;
  const sections: SiteLabPresentation["sections"] = {};
  const s = (r.sections && typeof r.sections === "object" ? r.sections : {}) as Record<string, unknown>;
  for (const [k, v] of Object.entries(s)) {
    if (SECTION_KEYS.has(k) && typeof v === "boolean") sections[k as AgencySectionKey] = v;
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
