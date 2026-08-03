import { useEffect, useState, type ReactNode } from "react";
import { cn } from "@/lib/utils";
import { getDirectoryCategoryTheme } from "@/lib/directoryCategoryTheme";

interface SupplierLogoFrameProps {
  name: string;
  logoUrl?: string | null;
  category?: string | null;
  /** Dimensões/raio do container (default: card). */
  className?: string;
  iconClassName?: string;
  /** Fallback customizado (ex.: iniciais no hero do perfil). */
  fallback?: ReactNode;
  testId?: string;
  fallbackTestId?: string;
}

/**
 * Moldura compartilhada do logotipo no Mapa do Turismo:
 * fundo BRANCO sólido em todas as categorias + apenas o contorno na cor temática.
 */
export function SupplierLogoFrame({
  name, logoUrl, category, className, iconClassName, fallback,
  testId = "supplier-logo-frame", fallbackTestId,
}: SupplierLogoFrameProps) {
  const theme = getDirectoryCategoryTheme(category);
  const [failed, setFailed] = useState(false);
  useEffect(() => { setFailed(false); }, [logoUrl]);

  const url = (logoUrl || "").trim();
  const showLogo = !!url && !failed;
  const Icon = theme.Icon;

  return (
    <div
      data-testid={testId}
      className={cn(
        "flex items-center justify-center overflow-hidden flex-shrink-0 h-14 w-14 rounded-xl border",
        "bg-white",
        theme.logoBorder,
        className,
      )}
    >
      {showLogo ? (
        <img
          src={url}
          alt={`Logotipo da ${name}`}
          loading="lazy"
          decoding="async"
          onError={() => setFailed(true)}
          className="h-full w-full object-contain p-1.5"
        />
      ) : fallback ? (
        fallback
      ) : (
        <Icon
          data-testid={fallbackTestId ?? "supplier-logo-frame-fallback"}
          aria-hidden="true"
          className={cn("h-7 w-7", theme.iconColor, iconClassName)}
        />
      )}
    </div>
  );
}