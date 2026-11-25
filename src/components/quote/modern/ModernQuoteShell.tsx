import type { ReactNode } from "react";
import { Calendar, Users, Moon, MessageCircle, CheckCircle2, Clock } from "lucide-react";
import type { ModernSidebarModel } from "@/lib/quoteModernPreview";

interface SidebarProps {
  model: ModernSidebarModel;
  fmt: (v: number) => string;
  dates: string;
  nights: number;
  travelersLabel: string;
  included: string[];
  validUntil: string | null;
  whatsappUrl: string | null;
  agentName: string | null;
}

export function ModernQuoteSidebar(p: SidebarProps) {
  const { model, fmt } = p;
  return (
    <div className="rounded-3xl border border-border/50 bg-card p-6 shadow-[0_20px_60px_-24px_hsl(var(--foreground)/0.25)] space-y-5">
      {model.kind !== "summary" && model.headline ? (
        <div className="space-y-1">
          <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">Investimento</p>
          {model.headline.installments ? (
            <>
              {model.headline.entry ? (
                <p className="text-sm text-muted-foreground">Entrada de <span className="font-semibold text-foreground">{fmt(model.headline.entry)}</span> +</p>
              ) : null}
              <p className="text-3xl font-bold tracking-tight text-primary tabular-nums">
                {model.headline.installments}x <span className="text-xl">de</span> {fmt(model.headline.value)}
              </p>
            </>
          ) : (
            <p className="text-3xl font-bold tracking-tight text-primary tabular-nums">{fmt(model.headline.value)}</p>
          )}
          {model.note && <p className="text-xs text-muted-foreground pt-1">{model.note}</p>}
        </div>
      ) : (
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">Resumo da viagem</p>
        </div>
      )}

      {model.kind === "price" && model.headline?.installments && model.cashTotal ? (
        <div className="rounded-2xl bg-muted/50 p-3">
          <p className="text-[11px] text-muted-foreground">Total da viagem</p>
          <p className="text-base font-semibold tabular-nums">{fmt(model.cashTotal)}</p>
        </div>
      ) : null}

      {model.kind !== "summary" && model.perPerson ? (
        <div className="flex items-center justify-between border-t border-border/50 pt-3 text-sm">
          <span className="text-muted-foreground">Por pessoa</span>
          <span className="font-semibold tabular-nums">{fmt(model.perPerson)}</span>
        </div>
      ) : null}

      <ul className="space-y-2 text-sm">
        <li className="flex items-center gap-2"><Calendar className="h-4 w-4 text-primary" />{p.dates}</li>
        {p.nights > 0 && <li className="flex items-center gap-2"><Moon className="h-4 w-4 text-primary" />{p.nights} {p.nights === 1 ? "noite" : "noites"}</li>}
        <li className="flex items-center gap-2"><Users className="h-4 w-4 text-primary" />{p.travelersLabel}</li>
      </ul>

      {p.included.length > 0 && (
        <ul className="space-y-1.5 border-t border-border/50 pt-3 text-sm">
          {p.included.map((i) => (
            <li key={i} className="flex items-start gap-2"><CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-primary" />{i}</li>
          ))}
        </ul>
      )}

      {p.validUntil && (
        <p className="flex items-center gap-1.5 text-xs text-muted-foreground"><Clock className="h-3.5 w-3.5" />Válido até {p.validUntil}</p>
      )}

      {p.whatsappUrl && (
        <a href={p.whatsappUrl} target="_blank" rel="noopener noreferrer"
          className="flex w-full items-center justify-center gap-2 rounded-full bg-primary px-4 py-3 text-sm font-semibold text-primary-foreground transition-opacity hover:opacity-90">
          <MessageCircle className="h-4 w-4" />
          {p.agentName ? `Falar com ${p.agentName.split(" ")[0]}` : "Tirar dúvidas"}
        </a>
      )}
    </div>
  );
}

/** Barra fixa no rodapé do celular (somente no novo visual). */
export function ModernQuoteMobileBar({ model, fmt, whatsappUrl }: { model: ModernSidebarModel; fmt: (v: number) => string; whatsappUrl: string | null }) {
  const h = model.kind !== "summary" ? model.headline : null;
  return (
    <div className="fixed inset-x-0 bottom-0 z-40 border-t border-border/50 bg-card/95 backdrop-blur-md px-4 py-3 lg:hidden">
      <div className="mx-auto flex max-w-xl items-center justify-between gap-3">
        <div className="min-w-0">
          {h ? (
            <>
              <p className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground">Investimento</p>
              <p className="truncate text-lg font-bold text-primary tabular-nums">
                {h.installments ? `${h.installments}x de ${fmt(h.value)}` : fmt(h.value)}
              </p>
            </>
          ) : (
            <p className="text-sm font-medium">Ficou com alguma dúvida?</p>
          )}
        </div>
        {whatsappUrl && (
          <a href={whatsappUrl} target="_blank" rel="noopener noreferrer"
            className="shrink-0 rounded-full bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground">
            Falar agora
          </a>
        )}
      </div>
    </div>
  );
}

/**
 * Com o novo visual desligado, renderiza exatamente o <main> original.
 * Ligado, coloca o conteúdo em duas colunas com o card de investimento fixo.
 */
export function ModernQuoteShell({ enabled, className, sidebar, children }: { enabled: boolean; className: string; sidebar?: ReactNode | null; children: ReactNode }) {
  if (!enabled) return <main className={className}>{children}</main>;
  // Mantém a coluna original centralizada; o resumo fica fora dela, à direita.
  // Com sidebar nulo, o card de resumo fica oculto (ainda podemos trazê-lo de volta).
  if (!sidebar) return <main className={className} data-modern-quote>{children}</main>;
  return (
    <div className="relative">
      <main className={`${className} pb-28 lg:pb-12`}>{children}</main>
      <aside className="hidden min-[1480px]:block absolute top-4 bottom-0 w-[260px] z-10" style={{ left: "calc(50% + 28rem + 1.25rem)" }}>
        <div className="sticky top-20">{sidebar}</div>
      </aside>
    </div>
  );
}
