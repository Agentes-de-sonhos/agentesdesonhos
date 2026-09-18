import type { ReactNode } from "react";
import { Copy, Eye, Pencil, Trash2 } from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

/**
 * Ações padronizadas de cada linha de projeto (orçamento, carteira digital e
 * roteiro), sempre nesta ordem: visualizar versão pública, editar, duplicar e
 * excluir. Componente compartilhado — vale para a plataforma principal,
 * SiteLab Base e white-labels.
 */

export const PUBLIC_VIEW_ENABLED_LABEL = "Visualizar versão publicada";
export const PUBLIC_VIEW_DISABLED_LABEL = "Publique para visualizar";

function ActionButton({
  label,
  onClick,
  children,
  destructive,
  disabled,
}: {
  label: string;
  onClick?: () => void;
  children: ReactNode;
  destructive?: boolean;
  disabled?: boolean;
}) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <button
          type="button"
          onClick={disabled ? undefined : onClick}
          disabled={disabled}
          aria-label={label}
          aria-disabled={disabled ? true : undefined}
          className={cn(
            "inline-flex h-8 w-8 items-center justify-center rounded-md bg-transparent text-muted-foreground/80 transition-colors",
            disabled
              ? "cursor-not-allowed opacity-40"
              : "hover:bg-muted/70 hover:text-foreground focus-visible:bg-muted focus-visible:text-foreground",
            !disabled && destructive && "hover:bg-rose-50 hover:text-rose-600",
          )}
        >
          {children}
        </button>
      </TooltipTrigger>
      <TooltipContent>{label}</TooltipContent>
    </Tooltip>
  );
}

interface ProjectRowActionsProps {
  /** URL pública válida, ou `null` quando o projeto não está publicado. */
  publicUrl: string | null;
  onEdit: () => void;
  onDuplicate: () => void;
  onDelete: () => void;
}

export function ProjectRowActions({
  publicUrl,
  onEdit,
  onDuplicate,
  onDelete,
}: ProjectRowActionsProps) {
  const canView = !!publicUrl;
  return (
    <>
      <ActionButton
        label={canView ? PUBLIC_VIEW_ENABLED_LABEL : PUBLIC_VIEW_DISABLED_LABEL}
        disabled={!canView}
        onClick={() => {
          if (publicUrl) window.open(publicUrl, "_blank", "noopener,noreferrer");
        }}
      >
        <Eye className="h-4 w-4" />
      </ActionButton>
      <ActionButton label="Editar" onClick={onEdit}>
        <Pencil className="h-4 w-4" />
      </ActionButton>
      <ActionButton label="Duplicar" onClick={onDuplicate}>
        <Copy className="h-4 w-4" />
      </ActionButton>
      <ActionButton label="Excluir" destructive onClick={onDelete}>
        <Trash2 className="h-4 w-4" />
      </ActionButton>
    </>
  );
}
