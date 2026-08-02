import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Calendar, Clock, ChevronLeft, ChevronRight, Loader2 } from "lucide-react";
import { useAgenda } from "@/hooks/useAgenda";
import { SectionCtaLink } from "@/components/dashboard/SectionCtaLink";
import { useAdaptivePageSize } from "@/hooks/useAdaptivePageSize";
import { useIsDesktop } from "@/hooks/useIsDesktop";
import { format, differenceInCalendarDays } from "date-fns";
import { ptBR } from "date-fns/locale";
import { cn } from "@/lib/utils";

/** Approximate rendered height of one compact agenda row (row + gap). */
const ROW_HEIGHT = 56;
/** Fixed page size on desktop: always up to 5 appointments per page. */
const DESKTOP_PAGE_SIZE = 5;

export function UpcomingAgendaEventsCard() {
  const navigate = useNavigate();
  const { getUpcomingEvents, getFollowupEvents, isLoading } = useAgenda();
  const [page, setPage] = useState(0);
  const isDesktop = useIsDesktop();
  // Desktop is deterministic (always 5) — no ResizeObserver needed there.
  const { ref: listRef, pageSize: adaptivePageSize } = useAdaptivePageSize<HTMLDivElement>({
    rowHeight: ROW_HEIGHT,
    min: 2,
    max: 5,
    fallback: 3,
    enabled: !isDesktop,
  });
  const pageSize = isDesktop ? DESKTOP_PAGE_SIZE : adaptivePageSize;

  // Use local date components to avoid UTC shift
  const now = new Date();
  const todayLocal = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const todayStr = format(todayLocal, "yyyy-MM-dd");

  // All upcoming events (any type) from today onwards.
  // - Non-followup events respect the Agenda hidden-type filter (via getUpcomingEvents).
  // - Follow-ups are always included (independent of Agenda hidden filter) per Dashboard spec.
  const allUpcoming = useMemo(() => {
    const baseEvents = getUpcomingEvents(500).filter(
      (event) => event.event_type !== "followup"
    );
    const followupEvents = getFollowupEvents().filter(
      (event) => event.event_date >= todayStr
    );
    const seen = new Set<string>();
    return [...baseEvents, ...followupEvents]
      .filter((e) => {
        if (seen.has(e.id)) return false;
        seen.add(e.id);
        return true;
      })
      .sort((a, b) => {
        const dateCmp = a.event_date.localeCompare(b.event_date);
        if (dateCmp !== 0) return dateCmp;
        return (a.event_time || "").localeCompare(b.event_time || "");
      });
  }, [getUpcomingEvents, getFollowupEvents, todayStr]);

  const total = allUpcoming.length;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const safePage = Math.max(0, Math.min(page, totalPages - 1));
  const startIdx = safePage * pageSize;
  const pageEvents = allUpcoming.slice(startIdx, startIdx + pageSize);

  // Normalize the current page whenever the adaptive page size changes so the
  // visible page is never empty after a resize.
  useEffect(() => {
    setPage((prev) => Math.max(0, Math.min(prev, totalPages - 1)));
  }, [totalPages]);

  if (isLoading) {
    return (
      <Card className="border-0 shadow-card h-full">
        <CardContent className="flex items-center justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-0 shadow-card h-full flex flex-col min-h-0 overflow-hidden">
      <CardHeader className="pb-2 shrink-0">
        <div className="flex items-start justify-between gap-3">
          <div className="w-fit">
            <h2 className="font-display text-base sm:text-lg font-semibold text-foreground flex items-center gap-2">
              <Calendar className="h-5 w-5 text-[hsl(var(--section-events))]" />
              Minha Agenda
            </h2>
            <div className="mt-2 h-1 w-full rounded-full bg-[hsl(var(--section-events))]" />
          </div>
          <SectionCtaLink
            to="/agenda"
            label="Ver toda a agenda"
            shortLabel="Ver tudo"
            tabTitle="Agenda"
            className="text-[hsl(var(--section-events))]"
          />
        </div>
      </CardHeader>
      <CardContent className="flex-1 min-h-0 flex flex-col overflow-hidden pb-3">
        {total === 0 ? (
          <div className="text-center py-6 text-muted-foreground">
            <Calendar className="h-8 w-8 mx-auto mb-2 opacity-50" />
            <p className="text-sm">Nenhum evento programado</p>
            <Button
              variant="outline"
              size="sm"
              className="mt-3"
              onClick={() => navigate("/agenda")}
            >
              Criar evento
            </Button>
          </div>
        ) : (
          <div className="flex-1 min-h-0 flex flex-col @container">
            <div ref={listRef} className="flex-1 min-h-0 overflow-hidden space-y-1.5">
            {pageEvents.map((event) => {
               // Parse date using local components to avoid UTC timezone shift
               const [y, m, d] = event.event_date.split('-').map(Number);
               const eventDate = new Date(y, m - 1, d);
               const daysUntil = differenceInCalendarDays(eventDate, todayLocal);
               
               let daysLabel = "";
               if (daysUntil === 0) daysLabel = "Hoje";
               else if (daysUntil === 1) daysLabel = "Amanhã";
               else if (daysUntil < 7) daysLabel = `Em ${daysUntil} dias`;
               else daysLabel = format(eventDate, "dd/MM");

              return (
                <div
                  key={event.id}
                  className="flex items-center gap-2 @[20rem]:gap-3 p-1.5 @[20rem]:p-2 rounded-lg hover:bg-[hsl(var(--section-events))]/10 transition-colors cursor-pointer overflow-hidden"
                  onClick={() => {
                    if (event.event_type === 'followup' && event.opportunity_id) {
                      navigate(`/gestao-clientes/funil?opportunity=${event.opportunity_id}`);
                    } else {
                      navigate("/agenda", { state: { openEventId: event.id } });
                    }
                  }}
                >
                  <div
                    className="w-1 h-9 rounded-full flex-shrink-0"
                    style={{ backgroundColor: event.color }}
                  />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate whitespace-nowrap" title={event.title}>
                      {event.title}
                    </p>
                    <p className="text-xs text-muted-foreground flex items-center gap-1 whitespace-nowrap truncate">
                      <Clock className="h-3 w-3 shrink-0" />
                      <span className="truncate">
                        {format(eventDate, "EEEE, d 'de' MMM", { locale: ptBR })}
                        {event.event_time && ` às ${event.event_time.slice(0, 5)}`}
                      </span>
                    </p>
                  </div>
                  <span
                    className={cn(
                      "text-xs font-medium px-2 py-0.5 rounded-full whitespace-nowrap",
                      daysUntil === 0 && "bg-primary/10 text-primary",
                      daysUntil === 1 && "bg-warning/10 text-warning",
                      daysUntil > 1 && "bg-muted text-muted-foreground"
                    )}
                  >
                    {daysLabel}
                  </span>
                </div>
              );
            })}
            </div>

            {/* Pagination footer — always a single compact line */}
            <div className="pt-1.5 border-t flex flex-row flex-nowrap items-center justify-between gap-2 shrink-0">
              <p className="text-xs text-muted-foreground whitespace-nowrap truncate">
                Mostrando <span className="font-medium text-foreground">{startIdx + 1}–{Math.min(startIdx + pageSize, total)}</span> de{" "}
                <span className="font-medium text-foreground">{total}</span> atividades
              </p>
              <div className="flex flex-nowrap items-center gap-1 shrink-0">
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8 px-2"
                  onClick={() => setPage((p) => Math.max(0, p - 1))}
                  disabled={safePage === 0}
                >
                  <ChevronLeft className="h-4 w-4" />
                  <span className="hidden sm:inline ml-1">Anterior</span>
                </Button>
                <span className="text-xs text-muted-foreground px-2 tabular-nums">
                  {safePage + 1} / {totalPages}
                </span>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8 px-2"
                  onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
                  disabled={safePage >= totalPages - 1}
                >
                  <span className="hidden sm:inline mr-1">Próximo</span>
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}