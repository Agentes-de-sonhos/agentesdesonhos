/**
 * Painel Administrativo White Label (/gestao) — lógica compartilhada.
 *
 * A agência é SEMPRE identificada pelo hostname (resolvido no servidor via
 * RPCs SECURITY DEFINER). Nunca confiar em agency_id vindo do navegador,
 * parâmetros de URL ou localStorage.
 */
import { useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { normalizeHostname, type AgencyDomainInfo } from "@/lib/agencyDomains";

export const AGENCY_ADMIN_HOME = "/gestao";
export const AGENCY_ADMIN_LOGIN = "/gestao/login";

/** Origem da plataforma usada apenas no fluxo de recuperação de senha. */
export const PLATFORM_APP_ORIGIN = "https://app.agentesdesonhos.com.br";

export interface AgencyAdminPortalInfo extends AgencyDomainInfo {
  admin_portal_enabled: boolean;
}

/** Branding + flag do painel para o hostname (somente domínios ativos). */
export async function fetchAgencyAdminPortal(
  hostname: string,
): Promise<AgencyAdminPortalInfo | null> {
  const host = normalizeHostname(hostname);
  if (!host) return null;
  const { data, error } = await supabase.rpc("get_agency_admin_portal" as any, {
    p_hostname: host,
  });
  if (error) throw error;
  const info = (data as AgencyAdminPortalInfo | null) ?? null;
  if (!info || !info.user_id) return null;
  return info;
}

/**
 * Verificação server-side: o usuário autenticado pertence à agência dona
 * deste domínio (master ou colaborador vinculado) e o painel está habilitado?
 */
export async function checkAgencyAdminAccess(hostname: string): Promise<boolean> {
  const host = normalizeHostname(hostname);
  if (!host) return false;
  const { data, error } = await supabase.rpc("agency_admin_access_check" as any, {
    p_hostname: host,
  });
  if (error) return false;
  return Boolean((data as { allowed?: boolean } | null)?.allowed);
}

/**
 * Rotas internas reutilizadas pelo shell white label. As páginas existentes
 * navegam entre si usando estes caminhos absolutos da plataforma; no domínio
 * da agência eles continuam no MESMO host e passam pelo mesmo guard do painel.
 */
const ADMIN_ALIAS_PREFIXES = [
  "/dashboard",
  "/meus-projetos",
  "/agenda",
  "/gestao-clientes",
  "/financeiro",
  "/perfil",
  "/minha-conta",
  "/suporte",
  "/ferramentas-ia/gerar-orcamento",
  "/ferramentas-ia/trip-wallet",
  "/ferramentas-ia/criar-roteiro",
  "/ferramentas-ia/modelos-roteiros",
];

/** True quando o pathname pertence à experiência administrativa white label. */
export function isAgencyAdminPath(pathname: string): boolean {
  const path = (pathname || "/").replace(/\/+$/, "") || "/";
  if (path === AGENCY_ADMIN_HOME || path.startsWith(AGENCY_ADMIN_HOME + "/")) return true;
  return ADMIN_ALIAS_PREFIXES.some((p) => path === p || path.startsWith(p + "/"));
}

// ─────────────────────────────────────────────────────────────
// Cor da marca com contraste garantido
// ─────────────────────────────────────────────────────────────

type RGB = [number, number, number];

function parseHex(hex: string | null | undefined): RGB | null {
  if (!hex) return null;
  const raw = hex.trim().replace(/^#/, "");
  const full =
    raw.length === 3
      ? raw
          .split("")
          .map((c) => c + c)
          .join("")
      : raw;
  if (!/^[0-9a-fA-F]{6}$/.test(full)) return null;
  return [
    parseInt(full.slice(0, 2), 16),
    parseInt(full.slice(2, 4), 16),
    parseInt(full.slice(4, 6), 16),
  ];
}

function toHex([r, g, b]: RGB): string {
  const c = (v: number) => Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, "0");
  return `#${c(r)}${c(g)}${c(b)}`;
}

function luminance([r, g, b]: RGB): number {
  const f = (v: number) => {
    const c = v / 255;
    return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
  };
  return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b);
}

export interface BrandAccent {
  /** Cor da marca ajustada para contraste sobre fundo claro. */
  accent: string;
  /** Cor de texto legível sobre `accent`. */
  onAccent: string;
  /** `accent` com alfa ~8% para fundos de estado ativo. */
  tint: string;
}

/**
 * Resolve a cor de destaque do painel. Cores muito claras são escurecidas
 * gradualmente; o texto sobre a cor alterna entre claro/escuro conforme a
 * luminância — o painel permanece legível para qualquer marca cadastrada.
 */
export function brandAccent(primary: string | null | undefined): BrandAccent {
  let rgb = parseHex(primary) ?? parseHex("#334155");
  if (!rgb) rgb = [51, 65, 85];
  let guard = 0;
  while (luminance(rgb) > 0.6 && guard < 6) {
    rgb = [rgb[0] * 0.82, rgb[1] * 0.82, rgb[2] * 0.82];
    guard += 1;
  }
  const accent = toHex(rgb);
  const onAccent = luminance(rgb) > 0.42 ? "#1e293b" : "#ffffff";
  return { accent, onAccent, tint: `${accent}14` };
}

// ─────────────────────────────────────────────────────────────
// <head> do painel: título, robots e favicon da agência
// ─────────────────────────────────────────────────────────────

/**
 * Define título “<Agência> | Gestão”, marca a área como noindex e troca o
 * favicon pelo logotipo da agência enquanto o painel estiver montado.
 * Tudo é restaurado ao desmontar. Não usa o componente SEO da plataforma
 * para evitar o sufixo com a marca Agente de Sonhos.
 */
export function useAgencyAdminHead(title: string, logoUrl?: string | null): void {
  useEffect(() => {
    const prevTitle = document.title;
    document.title = title;

    let robots = document.querySelector('meta[name="robots"]') as HTMLMetaElement | null;
    const createdRobots = !robots;
    const prevRobots = robots?.content ?? null;
    if (!robots) {
      robots = document.createElement("meta");
      robots.name = "robots";
      document.head.appendChild(robots);
    }
    robots.content = "noindex, nofollow";

    const favicon = document.querySelector('link[rel="icon"]') as HTMLLinkElement | null;
    const prevIcon = favicon?.href ?? null;
    if (logoUrl && favicon) favicon.href = logoUrl;

    return () => {
      document.title = prevTitle;
      if (robots) {
        if (createdRobots) robots.remove();
        else if (prevRobots !== null) robots.content = prevRobots;
      }
      if (logoUrl && favicon && prevIcon) favicon.href = prevIcon;
    };
  }, [title, logoUrl]);
}
