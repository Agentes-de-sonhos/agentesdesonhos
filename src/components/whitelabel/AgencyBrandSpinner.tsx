/**
 * Indicador de carregamento com a marca do tenant.
 *
 * Regra de isolamento: apenas hostnames com símbolo oficial cadastrado abaixo
 * recebem a arte animada. Qualquer outro domínio mantém o spinner padrão, sem
 * qualquer efeito colateral entre tenants.
 */
import { Loader2 } from "lucide-react";
import { normalizeBrandHost } from "@/lib/agencySiteBrand";
import destinosComAJuSymbol from "@/assets/whitelabel/simbolo-destinos-com-a-ju.png.asset.json";
import mundoEmCoresLogo from "@/assets/ads-preview/mundo-em-cores-briefing-14-logo.png.asset.json";
import paraisoLogo from "@/assets/whitelabel/logo-paraiso-viagens.png.asset.json";

/** Logotipo oficial cadastrado pela 100 Limites (pin com globo e avião). */
const CEM_LIMITES_MARK =
  "https://mlwwpckahhfsixplxwif.supabase.co/storage/v1/object/public/avatars/9433421c-2252-4030-acab-135c03ab009e/1776696708130.png";

const SPINNER_MARK_BY_HOSTNAME: Record<string, string> = {
  "destinoscomaju.com.br": destinosComAJuSymbol.url,
  "www.destinoscomaju.com.br": destinosComAJuSymbol.url,
  "100limites.tur.br": CEM_LIMITES_MARK,
  "www.100limites.tur.br": CEM_LIMITES_MARK,
  "paraisoviagens.com": paraisoLogo.url,
  "www.paraisoviagens.com": paraisoLogo.url,
  "omundoemcores.com.br": mundoEmCoresLogo.url,
  "www.omundoemcores.com.br": mundoEmCoresLogo.url,
  "briefing-14-v1.preview.local": mundoEmCoresLogo.url,
};

/** Logotipos horizontais com "respiração" suave (igual aos links públicos), sem giro. */
const BREATHE_HOSTNAMES = new Set([
  "paraisoviagens.com", "www.paraisoviagens.com",
  "omundoemcores.com.br", "www.omundoemcores.com.br", "briefing-14-v1.preview.local",
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
