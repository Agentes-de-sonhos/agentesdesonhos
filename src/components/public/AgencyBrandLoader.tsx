import { useState } from "react";
import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface AgencyBrandLoaderProps {
  /** Logotipo da agência (quando já resolvido). Sem logo, cai no carregador discreto. */
  logoUrl?: string | null;
  /** Nome da agência — usado apenas como texto alternativo da imagem. */
  agencyName?: string | null;
  className?: string;
}

/**
 * Tela de carregamento das páginas PÚBLICAS de orçamento.
 *
 * Exibe o logotipo da agência com "respiração" suave (zoom discreto + halo na
 * cor da marca) em vez do círculo girando genérico. Sem logotipo cadastrado —
 * ou se a imagem falhar — mantém o carregador atual, sem quebrar o layout.
 */
export function AgencyBrandLoader({ logoUrl, agencyName, className }: AgencyBrandLoaderProps) {
  const [failed, setFailed] = useState(false);
  const showLogo = Boolean(logoUrl) && !failed;

  return (
    <div
      className={cn(
        "min-h-screen flex flex-col items-center justify-center gap-6 bg-background",
        className,
      )}
      role="status"
      aria-live="polite"
      aria-busy="true"
    >
      {showLogo ? (
        <div className="relative flex items-center justify-center">
          <span
            aria-hidden
            className="absolute h-32 w-32 rounded-full bg-primary/20 blur-3xl animate-brand-halo motion-reduce:animate-none"
          />
          <img
            src={logoUrl as string}
            alt={agencyName?.trim() || "Logotipo da agência"}
            onError={() => setFailed(true)}
            className="relative h-24 w-auto min-w-[160px] max-w-[260px] object-contain animate-brand-breathe motion-reduce:animate-none"
          />
        </div>
      ) : (
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      )}

      <div className="relative h-[3px] w-14 overflow-hidden rounded-full bg-primary/15">
        <span
          aria-hidden
          className="absolute inset-y-0 w-1/2 rounded-full bg-primary/70 animate-brand-sheen motion-reduce:animate-none"
        />
      </div>
      <span className="sr-only">Carregando…</span>
    </div>
  );
}

export default AgencyBrandLoader;
