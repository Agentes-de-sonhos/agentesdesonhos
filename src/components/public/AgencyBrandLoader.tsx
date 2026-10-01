import { useEffect, useRef, useState } from "react";
import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { readLoaderBrand, writeLoaderBrand } from "@/lib/publicLoaderBrandCache";

interface AgencyBrandLoaderProps {
  /** Logotipo da agência (quando já resolvido). */
  logoUrl?: string | null;
  /** Nome da agência — usado apenas como texto alternativo da imagem. */
  agencyName?: string | null;
  /** Chave do link (token/código) para lembrar o logotipo nos próximos acessos. */
  cacheKey?: string | null;
  className?: string;
}

/**
 * Tela de carregamento das páginas PÚBLICAS (orçamento, roteiro, carteira).
 * Logotipo da agência com "respiração" suave + halo, sempre centralizado na
 * tela. Sem logotipo conhecido — ou se a imagem falhar — usa o carregador discreto.
 */
export function AgencyBrandLoader({ logoUrl, agencyName, cacheKey, className }: AgencyBrandLoaderProps) {
  const cached = readLoaderBrand(cacheKey);
  const effectiveLogo = logoUrl || cached?.logoUrl || null;
  const effectiveName = agencyName || cached?.agencyName || null;
  const [failed, setFailed] = useState(false);
  const showLogo = Boolean(effectiveLogo) && !failed;

  useEffect(() => {
    if (logoUrl) writeLoaderBrand(cacheKey, logoUrl, agencyName);
  }, [cacheKey, logoUrl, agencyName]);

  useEffect(() => setFailed(false), [effectiveLogo]);

  return (
    <div
      className={cn(
        "fixed inset-0 z-50 flex flex-col items-center justify-center gap-6 bg-background",
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
            src={effectiveLogo as string}
            alt={effectiveName?.trim() || "Logotipo da agência"}
            onError={() => setFailed(true)}
            className="relative h-24 w-auto max-w-[260px] object-contain animate-brand-breathe motion-reduce:animate-none"
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

/**
 * Mantém o carregador visível por um instante após os dados chegarem quando há
 * logotipo, para que a animação da marca seja realmente vista.
 */
export function useBrandLoaderHold(isLoading: boolean, logoUrl?: string | null, holdMs = 1100) {
  const [holding, setHolding] = useState(false);
  const wasLoadingRef = useRef(isLoading);
  const logoRef = useRef(logoUrl);
  logoRef.current = logoUrl;

  // Depende só de isLoading: mudanças de logo/cores durante o "hold" não podem
  // cancelar o temporizador (isso travava a tela no logotipo).
  useEffect(() => {
    if (isLoading) {
      wasLoadingRef.current = true;
      return;
    }
    if (!wasLoadingRef.current) return;
    wasLoadingRef.current = false;
    if (!logoRef.current) return;
    setHolding(true);
    const t = window.setTimeout(() => setHolding(false), holdMs);
    return () => {
      window.clearTimeout(t);
      setHolding(false);
    };
  }, [isLoading]); // eslint-disable-line react-hooks/exhaustive-deps

  return isLoading || holding;
}

export default AgencyBrandLoader;
