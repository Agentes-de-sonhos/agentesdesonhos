import { useEffect, useState, type ReactNode, type MouseEvent } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ChevronRight, ThumbsUp } from "lucide-react";
import { cn } from "@/lib/utils";
import { getDirectoryCategoryTheme } from "@/lib/directoryCategoryTheme";
import { normalizeSpecialtyTags, type SpecialtyInput } from "@/lib/directorySpecialties";

interface DirectorySupplierLogoProps {
  name: string;
  logoUrl?: string | null;
  category?: string | null;
  className?: string;
  iconClassName?: string;
}

/**
 * Container quadrado do logotipo com fallback para o ícone da categoria
 * (Ship em Cruzeiros, Hotel em Hospedagem, etc.).
 */
export function DirectorySupplierLogo({
  name, logoUrl, category, className, iconClassName,
}: DirectorySupplierLogoProps) {
  const theme = getDirectoryCategoryTheme(category);
  const [failed, setFailed] = useState(false);
  useEffect(() => { setFailed(false); }, [logoUrl]);

  const url = (logoUrl || "").trim();
  const showLogo = !!url && !failed;
  const Icon = theme.Icon;

  return (
    <div
      data-testid="directory-supplier-logo"
      className={cn(
        "flex items-center justify-center overflow-hidden flex-shrink-0 h-14 w-14 rounded-xl ring-1",
        theme.logoBg,
        theme.logoRing,
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
      ) : (
        <Icon
          data-testid="directory-supplier-logo-fallback"
          aria-hidden="true"
          className={cn("h-7 w-7", theme.iconColor, iconClassName)}
        />
      )}
    </div>
  );
}

export interface DirectorySupplierCardProps {
  name: string;
  /** Categoria canônica — define ícone de fallback e esquema de cor. */
  category?: string | null;
  logoUrl?: string | null;
  /** Tags informativas específicas da categoria (badges ao lado do nome). */
  tags?: ReactNode;
  /** Especialidades — TODAS são renderizadas, com quebra natural de linha. */
  specialties?: SpecialtyInput;
  /** Conteúdo adicional específico da categoria (regiões, perfis, etc.). */
  children?: ReactNode;
  likeCount: number;
  liked: boolean;
  onLike: (e: MouseEvent) => void;
  onOpen: () => void;
  moreLabel?: string;
  /** Destaque visual (ex.: luxo/expedição em Cruzeiros). */
  highlighted?: boolean;
  className?: string;
}

/**
 * Card compartilhado de fornecedor do Mapa do Turismo.
 * Padrão visual único (referência: Companhias Marítimas) com tema por categoria,
 * rodapé com curtidas à esquerda e "Ver mais" à direita.
 */
export function DirectorySupplierCard({
  name, category, logoUrl, tags, specialties, children,
  likeCount, liked, onLike, onOpen, moreLabel = "Ver mais", highlighted, className,
}: DirectorySupplierCardProps) {
  const theme = getDirectoryCategoryTheme(category);
  const specialtyTags = normalizeSpecialtyTags(specialties);

  return (
    <Card
      data-testid="directory-supplier-card"
      data-category={theme.category}
      className={cn(
        "group border-0 overflow-hidden transition-all duration-300 hover:-translate-y-1.5 cursor-pointer h-full flex flex-col min-h-[180px]",
        highlighted
          ? "bg-gradient-to-br from-amber-50/80 via-card to-card dark:from-amber-950/30 dark:via-card dark:to-card ring-1 ring-amber-200/60 dark:ring-amber-800/40 shadow-[0_4px_24px_-4px_rgba(217,169,78,0.15)] hover:shadow-[0_12px_32px_-8px_rgba(217,169,78,0.25)]"
          : "bg-card/90 backdrop-blur-sm ring-1 ring-border/40 shadow-card hover:shadow-card-hover",
        className,
      )}
      onClick={onOpen}
    >
      {highlighted && (
        <div className="h-1 w-full bg-gradient-to-r from-amber-400 via-yellow-300 to-amber-500" />
      )}

      <CardContent className="p-5 flex flex-col h-full">
        {/* Cabeçalho: logo quadrado + nome */}
        <div className="flex items-start gap-3.5">
          <DirectorySupplierLogo
            name={name}
            logoUrl={logoUrl}
            category={category}
            className={cn(
              "transition-transform duration-300 group-hover:scale-105",
              highlighted &&
                "bg-gradient-to-br from-amber-100 to-amber-50 dark:from-amber-900/60 dark:to-amber-950 ring-amber-200/50 dark:ring-amber-700/50",
            )}
            iconClassName={highlighted ? "text-amber-600 dark:text-amber-400" : undefined}
          />
          <div className="flex-1 min-w-0">
            <h3 className="font-bold text-foreground text-[15px] leading-tight break-words">{name}</h3>
            {tags && <div className="flex flex-wrap gap-1.5 mt-2">{tags}</div>}
          </div>
        </div>

        {children}

        {/* Especialidades — todas visíveis, sem limite nem "+N" */}
        {specialtyTags.length > 0 && (
          <div data-testid="directory-supplier-specialties" className="mt-3 flex flex-wrap gap-1.5">
            {specialtyTags.map((tag) => (
              <span
                key={tag}
                className={cn(
                  "inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-medium border break-words",
                  theme.chip,
                )}
              >
                {tag}
              </span>
            ))}
          </div>
        )}

        {/* Rodapé */}
        <div className="mt-auto pt-4">
          <div className="flex items-center justify-between gap-2 border-t border-border/40 pt-3">
            <button
              type="button"
              data-testid="directory-supplier-like"
              onClick={onLike}
              aria-pressed={liked}
              aria-label={liked ? "Remover curtida" : `Curtir ${name}`}
              className={cn(
                "flex items-center gap-1 text-xs transition-colors h-8 px-1",
                liked ? "text-primary font-medium" : "text-muted-foreground hover:text-primary",
              )}
            >
              <ThumbsUp className={cn("h-4 w-4", liked && "fill-primary")} aria-hidden="true" />
              {likeCount > 0 && <span>{likeCount}</span>}
            </button>
            <Button
              variant="ghost"
              size="sm"
              data-testid="directory-supplier-more"
              className={cn(
                "h-8 text-xs gap-1 font-medium",
                highlighted
                  ? "text-amber-700 hover:text-amber-800 hover:bg-amber-100/50 dark:text-amber-400 dark:hover:bg-amber-950/50"
                  : theme.moreColor,
              )}
              onClick={(e) => { e.stopPropagation(); onOpen(); }}
            >
              {moreLabel} <ChevronRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}