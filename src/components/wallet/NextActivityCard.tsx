import { useEffect, useMemo, useState } from "react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { MapPin, Sunrise, Sun, Moon, Sparkles, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type Period = "morning" | "afternoon" | "evening";

interface ItineraryActivityLike {
  id?: string;
  day_date: string;
  period: Period | string;
  order_index?: number;
  title?: string;
  description?: string | null;
  location?: string | null;
}

const PERIOD_HOUR: Record<Period, number> = {
  morning: 9,
  afternoon: 14,
  evening: 19,
};

const PERIOD_LABEL: Record<Period, string> = {
  morning: "Manhã",
  afternoon: "Tarde",
  evening: "Noite",
};

const PERIOD_ICON: Record<Period, any> = {
  morning: Sunrise,
  afternoon: Sun,
  evening: Moon,
};

function parseDayDate(dateStr: string): Date | null {
  const m = (dateStr || "").match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (!m) return null;
  return new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
}

function activityWhen(a: ItineraryActivityLike): { d: Date; period: Period } | null {
  const base = parseDayDate(a.day_date);
  if (!base) return null;
  const p = (["morning", "afternoon", "evening"].includes(String(a.period))
    ? a.period
    : "morning") as Period;
  const d = new Date(base.getFullYear(), base.getMonth(), base.getDate(), PERIOD_HOUR[p], 0, 0, 0);
  return { d, period: p };
}

export function NextActivityCard({
  activities,
  onOpenItinerary,
}: {
  activities: ItineraryActivityLike[];
  onOpenItinerary: (dayDate?: string) => void;
}) {
  const [now, setNow] = useState<Date>(() => new Date());

  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 60_000);
    return () => clearInterval(t);
  }, []);

  const next = useMemo(() => {
    const PERIOD_PRI: Record<Period, number> = { morning: 0, afternoon: 1, evening: 2 };
    const enriched = activities
      .map((a) => {
        const w = activityWhen(a);
        return w ? { a, when: w.d, period: w.period } : null;
      })
      .filter((x): x is { a: ItineraryActivityLike; when: Date; period: Period } => !!x)
      .filter((x) => {
        const end = new Date(
          x.when.getFullYear(), x.when.getMonth(), x.when.getDate(), 23, 59, 59
        );
        return end.getTime() >= now.getTime();
      });
    enriched.sort((a, b) => {
      const da = a.when.getTime() - b.when.getTime();
      if (da !== 0) return da;
      const dp = PERIOD_PRI[a.period] - PERIOD_PRI[b.period];
      if (dp !== 0) return dp;
      return (a.a.order_index ?? 0) - (b.a.order_index ?? 0);
    });
    return enriched[0] ?? null;
  }, [activities, now]);

  return (
    <section
      aria-label="Próxima atividade do roteiro"
      className="rounded-2xl border bg-card shadow-sm overflow-hidden"
      style={{ borderColor: "hsl(var(--wallet-brand) / 0.18)" }}
    >
      <div
        className="px-4 py-3 flex items-center gap-2 border-b"
        style={{ borderColor: "hsl(var(--wallet-brand) / 0.12)" }}
      >
        <div
          className="flex h-7 w-7 items-center justify-center rounded-lg"
          style={{ background: "hsl(var(--wallet-brand-soft))" }}
        >
          <Sparkles className="h-4 w-4" style={{ color: "hsl(var(--wallet-brand))" }} />
        </div>
        <h3 className="text-[13px] font-semibold uppercase tracking-wider text-foreground/70">
          Próxima atividade do roteiro
        </h3>
      </div>

      {!next ? (
        <div className="px-4 py-6 text-center">
          <p className="text-sm text-muted-foreground">
            Nenhuma atividade futura no seu roteiro.
          </p>
          <p className="text-[12px] text-muted-foreground/80 mt-1">
            Quando houver uma próxima atividade programada, ela aparecerá aqui.
          </p>
        </div>
      ) : (() => {
        const Icon = PERIOD_ICON[next.period];
        const dateLabel = format(next.when, "EEE, dd 'de' MMM", { locale: ptBR });
        const periodLabel = PERIOD_LABEL[next.period];
        return (
          <div className="p-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-start gap-3 min-w-0">
              <div
                className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl"
                style={{ background: "hsl(var(--wallet-brand-soft))" }}
              >
                <Icon className="h-6 w-6" style={{ color: "hsl(var(--wallet-brand))" }} />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <span
                    className="text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full"
                    style={{
                      background: "hsl(var(--wallet-brand-soft))",
                      color: "hsl(var(--wallet-brand))",
                    }}
                  >
                    {periodLabel}
                  </span>
                  <span className="text-[11px] font-medium text-foreground/70 capitalize">
                    {dateLabel}
                  </span>
                </div>
                <p className="mt-1 font-semibold text-sm text-foreground leading-snug break-words">
                  {next.a.title || "Atividade do roteiro"}
                </p>
                {next.a.location && (
                  <p className="text-[12px] text-muted-foreground leading-snug break-words inline-flex items-start gap-1">
                    <MapPin className="h-3 w-3 mt-0.5 shrink-0" />
                    <span>{next.a.location}</span>
                  </p>
                )}
                {next.a.description && (
                  <p className="text-[12px] text-foreground/70 mt-1 leading-snug line-clamp-2">
                    {next.a.description}
                  </p>
                )}
              </div>
            </div>

            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={() => onOpenItinerary(next.a.day_date)}
              className={cn(
                "shrink-0 self-stretch sm:self-auto border-[hsl(var(--wallet-brand)/0.3)]",
                "hover:bg-[hsl(var(--wallet-brand-soft))] hover:text-[hsl(var(--wallet-brand))]"
              )}
            >
              Ver no roteiro
              <ChevronRight className="h-4 w-4 ml-1" />
            </Button>
          </div>
        );
      })()}
    </section>
  );
}

export default NextActivityCard;