import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { CalendarDays, ArrowRight, Plus, Loader2 } from "lucide-react";
import { useMyTradeEvents } from "@/hooks/useTradeEvents";
import { format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";

const statusStyle: Record<string, string> = {
  aprovado: "bg-emerald-100 text-emerald-700 border-emerald-200",
  pendente: "bg-amber-100 text-amber-700 border-amber-200",
  recusado: "bg-rose-100 text-rose-700 border-rose-200",
};

export function SupplierAgendaCard() {
  const navigate = useNavigate();
  const { data: events, isLoading } = useMyTradeEvents();
  const upcoming = (events || []).slice(0, 5);

  return (
    <Card className="border-0 shadow-card h-full">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <div className="w-fit">
            <h2 className="font-display text-base sm:text-lg font-semibold text-foreground flex items-center gap-2">
              <CalendarDays className="h-5 w-5 text-primary" />
              Agenda do Trade
            </h2>
            <div className="mt-2 h-1 w-full rounded-full bg-primary" />
          </div>
          <Button size="sm" variant="outline" onClick={() => navigate("/agenda-trade")} className="gap-1">
            <Plus className="h-3.5 w-3.5" /> Novo
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex justify-center py-6"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>
        ) : upcoming.length === 0 ? (
          <div className="text-center py-6 text-muted-foreground space-y-2">
            <CalendarDays className="h-8 w-8 mx-auto opacity-50" />
            <p className="text-sm">Você ainda não publicou nenhum evento.</p>
            <Button size="sm" variant="outline" onClick={() => navigate("/agenda-trade")}>
              Publicar evento
            </Button>
          </div>
        ) : (
          <div className="space-y-2">
            {upcoming.map((ev) => (
              <div
                key={ev.id}
                className="flex items-start gap-3 rounded-xl border border-border/60 px-3 py-2.5 hover:border-primary/40 transition-colors cursor-pointer"
                onClick={() => navigate("/agenda-trade")}
              >
                <div className="flex-shrink-0 w-12 text-center">
                  <p className="text-[10px] uppercase text-muted-foreground">
                    {format(parseISO(ev.start_at), "MMM", { locale: ptBR })}
                  </p>
                  <p className="text-lg font-bold text-foreground leading-tight">
                    {format(parseISO(ev.start_at), "dd")}
                  </p>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-foreground truncate">{ev.title}</p>
                  <p className="text-xs text-muted-foreground capitalize">{ev.event_type}</p>
                </div>
                <Badge variant="outline" className={statusStyle[ev.status] || ""}>
                  {ev.status}
                </Badge>
              </div>
            ))}
            <Button
              variant="ghost"
              size="sm"
              className="w-full justify-center gap-1"
              onClick={() => navigate("/agenda-trade")}
            >
              Ver todos <ArrowRight className="h-3.5 w-3.5" />
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}