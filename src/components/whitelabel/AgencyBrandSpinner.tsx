/**
 * Indicador de carregamento com a marca do tenant.
 *
 * Regra de isolamento: apenas hostnames com símbolo oficial cadastrado abaixo
 * recebem a arte animada. Qualquer outro domínio mantém o spinner padrão, sem
 * qualquer efeito colateral entre tenants.
 */
import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import { normalizeBrandHost } from "@/lib/agencySiteBrand";
import destinosComAJuSymbol from "@/assets/whitelabel/simbolo-destinos-com-a-ju.png.asset.json";
import mundoEmCoresLogo from "@/assets/ads-preview/mundo-em-cores-briefing-14-logo.png.asset.json";
import curtiLogo from "@/assets/ads-preview/briefing-20-v1-logo.png.asset.json";
import { isAgencyPublicToolPath } from "@/lib/agencyPublicToolRoutes";
import paraisoLogo from "@/assets/whitelabel/logo-paraiso-viagens.png.asset.json";
import essyaLogo from "@/assets/whitelabel/logo-essya-tur.png.asset.json";
import pristurLogo from "@/assets/whitelabel/logo-pristur.png.asset.json";
import bagagemLogo from "@/assets/ads-preview/briefing-19-v1-logo.png.asset.json";
import immLogo from "@/assets/whitelabel/logo-imm-viagens.png.asset.json";

const KARIBU_PREVIEW_HOST = "briefing-21-v1.preview.local";
const KARIBU_HOSTS = new Set(["kaributurismo.com.br", "www.kaributurismo.com.br", KARIBU_PREVIEW_HOST]);
const KARIBU_MARK = "/karibu-logo.png";
const KARIBU_PREVIEW_PATH = "/ads-briefing-preview/briefing-21-v1";

const BAGAGEM_HOSTS = new Set(["bagagemnamao.com.br", "www.bagagemnamao.com.br"]);
const IMM_HOSTS = ["immturismo.com.br", "www.immturismo.com.br"];

/** Logotipo oficial cadastrado pela 100 Limites (pin com globo e avião). */
const CEM_LIMITES_MARK =
  "https://mlwwpckahhfsixplxwif.supabase.co/storage/v1/object/public/avatars/9433421c-2252-4030-acab-135c03ab009e/1776696708130.png";

/** Logo oficial da Arena (já com fundo preto). */
const ARENA_MARK = "/arena-travel-group/logo.jpeg";
const ARENA_HOSTS = new Set(["arenatravelgroup.com.br", "www.arenatravelgroup.com.br"]);

const SPINNER_MARK_BY_HOSTNAME: Record<string, string> = {
  "briefing-22-v1.preview.local": pristurLogo.url,
  "pristur.com.br": pristurLogo.url,
  "www.pristur.com.br": pristurLogo.url,
  "destinoscomaju.com.br": destinosComAJuSymbol.url,
  "www.destinoscomaju.com.br": destinosComAJuSymbol.url,
  "100limites.tur.br": CEM_LIMITES_MARK,
  "www.100limites.tur.br": CEM_LIMITES_MARK,
  "paraisoviagens.com": paraisoLogo.url,
  "www.paraisoviagens.com": paraisoLogo.url,
  "omundoemcores.com.br": mundoEmCoresLogo.url,
  "www.omundoemcores.com.br": mundoEmCoresLogo.url,
  "briefing-14-v1.preview.local": mundoEmCoresLogo.url,
  "curtiviagens.com.br": curtiLogo.url,
  "www.curtiviagens.com.br": curtiLogo.url,
  "briefing-20-v1.preview.local": curtiLogo.url,
  "essyatur.com.br": essyaLogo.url,
  "www.essyatur.com.br": essyaLogo.url,
  "essya-curti-v1.preview.local": essyaLogo.url,
  "arenatravelgroup.com.br": ARENA_MARK,
  "www.arenatravelgroup.com.br": ARENA_MARK,
  ...Object.fromEntries([...KARIBU_HOSTS].map((h) => [h, KARIBU_MARK])),
  ...Object.fromEntries([...BAGAGEM_HOSTS].map((h) => [h, bagagemLogo.url])),
  ...Object.fromEntries(IMM_HOSTS.map((h) => [h, immLogo.url])),
};

/** Logo só na home e nos links públicos (carteira/orçamento/roteiro); demais páginas carregam sem animação. */
const HOME_AND_PUBLIC_ONLY = new Set([
  "curtiviagens.com.br", "www.curtiviagens.com.br", "briefing-20-v1.preview.local",
  "essyatur.com.br", "www.essyatur.com.br", "essya-curti-v1.preview.local",
  ...ARENA_HOSTS,
  "pristur.com.br", "www.pristur.com.br",
  ...IMM_HOSTS,
]);

/** Logotipos horizontais com "respiração" suave (igual aos links públicos), sem giro. */
const BREATHE_HOSTNAMES = new Set([
  "briefing-22-v1.preview.local",
  "paraisoviagens.com", "www.paraisoviagens.com",
  "omundoemcores.com.br", "www.omundoemcores.com.br", "briefing-14-v1.preview.local",
  ...HOME_AND_PUBLIC_ONLY,
  ...KARIBU_HOSTS,
  ...BAGAGEM_HOSTS,
]);

/** Hostname contextual: override de prévia (`?__agency_host=`) → host real. */
function resolveContextHostname(explicit?: string | null): string {
  if (explicit) return normalizeBrandHost(explicit);
  if (typeof window === "undefined") return "";
  const override = new URLSearchParams(window.location.search).get("__agency_host");
  return normalizeBrandHost(override || window.location.hostname);
}

export function resolveAgencySpinnerMark(hostname?: string | null): string | null {
  return SPINNER_MARK_BY_HOSTNAME[resolveContextHostname(hostname)] ?? null;
}

/** Arena: carregamento só na home, com fundo preto; demais páginas sem nenhuma espera. */
export function agencyLoaderBackdropClass(hostname?: string | null): string {
  return ARENA_HOSTS.has(resolveContextHostname(hostname)) ? "bg-[hsl(0_0%_0%)]" : "bg-[hsl(0_0%_100%)]";
}

export function isAgencyLoaderSuppressed(hostname?: string | null): boolean {
  if (typeof window === "undefined") return false;
  const host = resolveContextHostname(hostname);
  if (!KARIBU_HOSTS.has(host) && !BAGAGEM_HOSTS.has(host) && !ARENA_HOSTS.has(host) && !IMM_HOSTS.includes(host)) return false;
  const path = window.location.pathname.replace(/\/+$/, "") || "/";
  if (host === KARIBU_PREVIEW_HOST && path === KARIBU_PREVIEW_PATH) return false;
  return path !== "/";
}

export function isPasswordGateLoaderSuppressed(hostname: string): boolean {
  const host = resolveContextHostname(hostname);
  return (KARIBU_HOSTS.has(host) || BAGAGEM_HOSTS.has(host)) && isAgencyLoaderSuppressed(hostname);
}

export function isBagagemStartupPath(hostname: string, pathname: string): boolean {
  return BAGAGEM_HOSTS.has(normalizeBrandHost(hostname)) && (pathname === "/" || pathname === "");
}

/** Rendered by the domain gate, not remounted by the route or password checks. */
export function BagagemStartupOverlay({ hostname }: { hostname: string }) {
  return (
    <div data-bagagem-startup className="fixed inset-0 z-[110] flex items-center justify-center bg-white" style={{ backgroundColor: "#fff" }}>
      <AgencyBrandSpinner hostname={hostname} size="lg" />
    </div>
  );
}

/** Short entry treatment on the Karibu homepage even when the route is cached. */
export function KaribuHomeIntro({ hostname }: { hostname: string }) {
  const [done, setDone] = useState(false);
  useEffect(() => {
    const timer = window.setTimeout(() => setDone(true), 1250);
    return () => window.clearTimeout(timer);
  }, []);

  if (done || !KARIBU_HOSTS.has(resolveContextHostname(hostname)) || isAgencyLoaderSuppressed(hostname)) return null;
  return (
    <div data-karibu-home-intro className="pointer-events-none fixed inset-0 z-[110] flex items-center justify-center bg-white motion-reduce:hidden" aria-hidden="true">
      <AgencyBrandSpinner hostname={hostname} size="lg" />
    </div>
  );
}

export interface AgencyBrandSpinnerProps {
  /** Hostname explícito; quando ausente, é lido do contexto do navegador. */
  hostname?: string | null;
  /** Tamanho da arte animada. */
  size?: "sm" | "md" | "lg";
  /** Classe aplicada ao spinner padrão quando o tenant não tem símbolo. */
  fallbackClassName?: string;
}

const MARK_SIZE: Record<NonNullable<AgencyBrandSpinnerProps["size"]>, string> = {
  sm: "h-8 w-8",
  md: "h-14 w-14",
  lg: "h-20 w-20",
};

export function AgencyBrandSpinner({
  hostname,
  size = "md",
  fallbackClassName = "h-8 w-8 animate-spin text-primary",
}: AgencyBrandSpinnerProps) {
  const ctxHost = resolveContextHostname(hostname);
  if (HOME_AND_PUBLIC_ONLY.has(ctxHost) && typeof window !== "undefined") {
    const path = window.location.pathname.replace(/\/+$/, "") || "/";
    if (path !== "/" && !isAgencyPublicToolPath(path)) return <span aria-busy="true" />;
  }
  if (isAgencyLoaderSuppressed(hostname)) return null;
  const mark = resolveAgencySpinnerMark(hostname);
  if (!mark) return <Loader2 className={fallbackClassName} aria-hidden="true" />;

  if (BREATHE_HOSTNAMES.has(resolveContextHostname(hostname))) {
    return (
      <span className="relative inline-flex items-center justify-center" role="status" aria-label="Carregando">
        <span aria-hidden className="absolute h-24 w-24 rounded-full bg-primary/20 blur-3xl animate-brand-halo motion-reduce:animate-none" />
        <img src={mark} alt="" aria-hidden="true" className={`relative ${MARK_SIZE[size]} w-auto max-w-[220px] object-contain animate-brand-breathe motion-reduce:animate-none`} />
      </span>
    );
  }

  return (
    <span className="wl-brand-spinner" role="status" aria-label="Carregando">
      <img
        src={mark}
        alt=""
        aria-hidden="true"
        className={`${MARK_SIZE[size]} wl-brand-spinner-mark object-contain`}
      />
    </span>
  );
}
