import { cn } from "@/lib/utils";
import { normalizeSpecialtyTags, type SpecialtyInput } from "@/lib/directorySpecialties";
import {
  getSpecialtyChipClass,
  chipRowsMaxHeight,
  CARD_CHIP_HEIGHT_PX,
} from "@/lib/directorySpecialtyPalette";

export type SpecialtyChipVariant = "card" | "profile";

interface SpecialtyChipProps {
  label: string;
  /** Índice na lista normalizada — define a cor de forma determinística. */
  index: number;
  variant?: SpecialtyChipVariant;
  className?: string;
}

/** Chip de especialidade compartilhado entre cards e perfis comerciais. */
export function SpecialtyChip({ label, index, variant = "card", className }: SpecialtyChipProps) {
  const isCard = variant === "card";
  return (
    <span
      data-testid="specialty-chip"
      data-specialty={label}
      className={cn(
        "inline-flex items-center border font-medium whitespace-nowrap",
        isCard
          ? "px-2 rounded-md text-[11px] leading-none"
          : "px-3 py-1 rounded-full text-xs transition-all duration-200 hover:scale-105 cursor-default",
        getSpecialtyChipClass(index),
        className,
      )}
      style={isCard ? { height: `${CARD_CHIP_HEIGHT_PX}px` } : undefined}
    >
      {label}
    </span>
  );
}

interface SpecialtyListProps {
  specialties: SpecialtyInput;
  variant?: SpecialtyChipVariant;
  /** Limite de linhas visuais (apenas cards). Sem valor = todas as linhas. */
  maxLines?: number;
  className?: string;
}

/**
 * Lista de especialidades com quebra natural (flex-wrap), aproveitando o máximo
 * por linha. Em cards, `maxLines` recorta apenas linhas inteiras excedentes.
 */
export function SpecialtyList({ specialties, variant = "card", maxLines, className }: SpecialtyListProps) {
  const tags = normalizeSpecialtyTags(specialties);
  if (tags.length === 0) return null;

  const isCard = variant === "card";
  const clamp = isCard && !!maxLines && maxLines > 0;

  return (
    <div
      data-testid="specialty-list"
      data-max-lines={clamp ? maxLines : undefined}
      className={cn("flex flex-wrap content-start", isCard ? "gap-1.5" : "gap-2", clamp && "overflow-hidden", className)}
      style={clamp ? { maxHeight: chipRowsMaxHeight(maxLines!) } : undefined}
    >
      {tags.map((tag, i) => (
        <SpecialtyChip key={tag} label={tag} index={i} variant={variant} />
      ))}
    </div>
  );
}