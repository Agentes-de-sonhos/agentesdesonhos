import { useEffect, useState } from "react";
import { Ship } from "lucide-react";
import { cn } from "@/lib/utils";

/** Retorna a URL de logo válida (perfil da companhia ou perfil comercial). */
export function resolveCruiseLogoUrl(
  company: { logo_url?: string | null; operator?: { logo_url?: string | null } | null },
): string | null {
  const candidates = [company?.logo_url, company?.operator?.logo_url];
  for (const c of candidates) {
    const url = (c || "").trim();
    if (url) return url;
  }
  return null;
}

interface CruiseCompanyLogoProps {
  nome: string;
  logoUrl: string | null;
  /** Estilo do container (mantém dimensões/realce de luxo do card). */
  className?: string;
  iconClassName?: string;
}

/**
 * Container quadrado com logotipo (object-contain) e fallback para o ícone Ship
 * quando não há logo cadastrado ou a imagem falha ao carregar.
 */
export function CruiseCompanyLogo({ nome, logoUrl, className, iconClassName }: CruiseCompanyLogoProps) {
  const [failed, setFailed] = useState(false);
  useEffect(() => { setFailed(false); }, [logoUrl]);

  const showLogo = !!logoUrl && !failed;

  return (
    <div
      data-testid="cruise-company-logo"
      className={cn("flex items-center justify-center overflow-hidden flex-shrink-0", className)}
    >
      {showLogo ? (
        <img
          src={logoUrl as string}
          alt={`Logotipo da ${nome}`}
          loading="lazy"
          decoding="async"
          onError={() => setFailed(true)}
          className="h-full w-full object-contain p-1.5"
        />
      ) : (
        <Ship data-testid="cruise-company-logo-fallback" aria-hidden="true" className={cn("h-7 w-7", iconClassName)} />
      )}
    </div>
  );
}