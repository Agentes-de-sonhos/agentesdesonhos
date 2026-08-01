import { useId, useRef, useState } from "react";
import { ChevronDown } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

export interface AdvancedFilterGroup {
  /** Chave estável do grupo (ex.: "positioning"). */
  id: string;
  label: string;
  icon: LucideIcon;
  /** Quantidade de filtros selecionados; badge só aparece quando > 0. */
  activeCount: number;
  /** Conteúdo (chips existentes) do painel compartilhado. */
  content: React.ReactNode;
}

/**
 * Barra única de "Filtros avançados": acionadores em uma linha (tabs
 * expansíveis) + um painel compartilhado logo abaixo. Apenas um grupo pode
 * estar aberto; clicar no ativo recolhe. As seleções são controladas pelo
 * componente pai, portanto persistem ao abrir/fechar/trocar de grupo.
 */
export function AdvancedFilters({
  groups,
  label = "Filtros avançados",
}: {
  groups: AdvancedFilterGroup[];
  label?: string;
}) {
  const [activeGroup, setActiveGroup] = useState<string | null>(null);
  const baseId = useId();
  const tabRefs = useRef<Record<string, HTMLButtonElement | null>>({});

  if (groups.length === 0) return null;
  const active = groups.find((g) => g.id === activeGroup) || null;

  const focusOffset = (index: number, offset: number) => {
    const next = groups[(index + offset + groups.length) % groups.length];
    tabRefs.current[next.id]?.focus();
  };

  return (
    <section
      aria-label={label}
      className="rounded-2xl border border-border/70 bg-muted/30 overflow-hidden"
    >
      <div
        role="tablist"
        aria-label={label}
        className="flex items-stretch gap-1 overflow-x-auto p-1.5 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      >
        {groups.map((group, index) => {
          const Icon = group.icon;
          const isOpen = activeGroup === group.id;
          return (
            <button
              key={group.id}
              ref={(el) => { tabRefs.current[group.id] = el; }}
              type="button"
              role="tab"
              id={`${baseId}-tab-${group.id}`}
              aria-selected={isOpen}
              aria-controls={`${baseId}-panel`}
              onClick={() => setActiveGroup((prev) => (prev === group.id ? null : group.id))}
              onKeyDown={(e) => {
                if (e.key === "ArrowRight") { e.preventDefault(); focusOffset(index, 1); }
                if (e.key === "ArrowLeft") { e.preventDefault(); focusOffset(index, -1); }
              }}
              className={cn(
                "flex min-w-[9.5rem] flex-1 items-center justify-center gap-1.5 whitespace-nowrap rounded-xl px-3 py-2.5 text-xs font-medium transition-colors min-h-[44px]",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1",
                isOpen
                  ? "bg-background text-foreground shadow-sm ring-1 ring-border"
                  : "text-muted-foreground hover:bg-background/60 hover:text-foreground"
              )}
            >
              <Icon className="h-4 w-4 shrink-0" aria-hidden="true" />
              <span>{group.label}</span>
              {group.activeCount > 0 && (
                <span
                  data-testid={`advanced-filter-badge-${group.id}`}
                  className="rounded-full bg-primary/10 px-1.5 py-0.5 text-[10px] font-semibold text-primary"
                >
                  {group.activeCount}
                </span>
              )}
              <ChevronDown
                aria-hidden="true"
                className={cn("h-3.5 w-3.5 shrink-0 opacity-60 transition-transform", isOpen && "rotate-180")}
              />
            </button>
          );
        })}
      </div>

      <div
        id={`${baseId}-panel`}
        role="tabpanel"
        aria-labelledby={active ? `${baseId}-tab-${active.id}` : undefined}
        hidden={!active}
        className="animate-fade-in border-t border-border/70 bg-background/60 px-4 py-3"
      >
        <div className="flex flex-wrap gap-1.5">{active?.content}</div>
      </div>
    </section>
  );
}