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

const SPINNER_MARK_BY_HOSTNAME: Record<string, string> = {
  "destinoscomaju.com.br": destinosComAJuSymbol.url,
  "www.destinoscomaju.com.br": destinosComAJuSymbol.url,
};

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
