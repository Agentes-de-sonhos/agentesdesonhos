import type { ReactNode } from "react";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Seção expansível usada na Etapa 6 — Avançado das Configurações do Orçamento.
 * Puramente visual: abrir/fechar nunca altera nenhuma configuração e o conteúdo
 * permanece montado (estado dos campos e autosave preservados).
 */
export function AdvancedSettingsSection({
  icon,
  title,
  summary,
  badge,
  headerAction,
  open,
  onToggle,
  className,
  children,
}: {
  icon?: ReactNode;
  title: string;
  summary?: ReactNode;
  badge?: ReactNode;
  headerAction?: ReactNode;
  open: boolean;
  onToggle: () => void;
  className?: string;
  children: ReactNode;
}) {
  return (
    <section className={cn("rounded-xl border bg-card shadow-sm overflow-hidden", className)}>
      <div className="flex items-start gap-2 px-3 sm:px-4 py-3">
        <button
          type="button"
          onClick={onToggle}
          aria-expanded={open}
          className="flex min-w-0 flex-1 items-start gap-2.5 text-left"
        >
          {icon && <span className="mt-0.5 shrink-0">{icon}</span>}
          <span className="min-w-0 flex-1">
            <span className="flex flex-wrap items-center gap-2">
              <span className="text-sm font-semibold text-foreground">{title}</span>
              {badge}
            </span>
            {summary && (
              <span className="mt-0.5 block text-xs text-muted-foreground [overflow-wrap:anywhere]">
                {summary}
              </span>
            )}
          </span>
          <ChevronDown
            className={cn(
              "mt-0.5 h-4 w-4 shrink-0 text-muted-foreground transition-transform duration-200",
              open && "rotate-180",
            )}
          />
        </button>
        {headerAction && <div className="shrink-0 pt-0.5">{headerAction}</div>}
      </div>
      <div
        className={cn(
          "grid transition-all duration-200 ease-out",
          open ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0",
        )}
      >
        <div className="overflow-hidden" aria-hidden={!open}>
          <div className={cn("border-t px-3 sm:px-4 py-4", !open && "pointer-events-none")}>
            {children}
          </div>
        </div>
      </div>
    </section>
  );
}
