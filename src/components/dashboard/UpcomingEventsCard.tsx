import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Calendar, MapPin, Video, ArrowRight, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

const eventTypeLabels: Record<string, string> = {
  treinamento: "Treinamento",
  feira: "Feira",
  webinar: "Webinar",
  workshop: "Workshop",
  outro: "Outro",
};

const eventTypeColors: Record<string, string> = {
  treinamento: "bg-primary/10 text-primary",
  feira: "bg-accent/10 text-accent-foreground",
  webinar: "bg-secondary text-secondary-foreground",
  workshop: "bg-muted text-muted-foreground",
  outro: "bg-muted text-muted-foreground",
};

export function UpcomingEventsCard() {
  const navigate = useNavigate();

  const { data: events, isLoading } = useQuery({
    queryKey: ["upcoming-events"],
    queryFn: async () => {
      const now = new Date().toISOString();
      const { data, error } = await supabase
        .from("events")
        .select("*")
        .eq("is_active", true)
        .gte("start_datetime", now)
        .order("start_datetime", { ascending: true })
        .limit(5);
      if (error) throw error;
      return data;
    },
  });

  if (isLoading) {
    return (
      <Card className="border-0 shadow-md">
        <CardContent className="flex items-center justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-0 shadow-md">
      <CardContent className="pt-6">
        <div className="flex justify-end mb-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate("/agenda")}
            className="text-[hsl(var(--section-events))] hover:text-[hsl(var(--section-events))]/80 -mt-2"
          >
            Ver agenda completa
            <ArrowRight className="h-4 w-4 ml-1" />
          </Button>
        </div>
        {events && events.length > 0 ? (
          <div className="space-y-3">
            {events.map((event) => (
              <div
                key={event.id}
                className="flex items-start gap-3 p-3 rounded-lg bg-muted/50 hover:bg-muted transition-colors cursor-pointer"
                onClick={() => navigate("/agenda")}
              >
                <div className="flex flex-col items-center justify-center min-w-[50px] text-center">
                  <span className="text-xs font-medium text-muted-foreground uppercase">
                    {format(new Date(event.start_datetime), "MMM", { locale: ptBR })}
                  </span>
                  <span className="text-2xl font-bold text-foreground">
                    {format(new Date(event.start_datetime), "dd")}
                  </span>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <h4 className="font-medium text-foreground line-clamp-1">
                      {event.title}
                    </h4>
                    <Badge
                      variant="secondary"
                      className={`shrink-0 text-xs ${eventTypeColors[event.event_type] || ""}`}
                    >
                      {eventTypeLabels[event.event_type] || event.event_type}
                    </Badge>
                  </div>
                  <p className="text-sm text-muted-foreground mt-1">
                    {event.organizer}
                  </p>
                  <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground">
                    {event.is_online ? (
                      <span className="flex items-center gap-1">
                        <Video className="h-3 w-3" />
                        Online
                      </span>
                    ) : event.location ? (
                      <span className="flex items-center gap-1">
                        <MapPin className="h-3 w-3" />
                        {event.location}
                      </span>
                    ) : null}
                    <span>•</span>
                    <span>
                      {format(new Date(event.start_datetime), "HH:mm", { locale: ptBR })}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-6 text-muted-foreground">
            <Calendar className="h-10 w-10 mx-auto mb-2 opacity-50" />
            <p>Nenhum evento programado</p>
            <Button
              variant="link"
              size="sm"
              onClick={() => navigate("/agenda")}
              className="mt-2"
            >
              Ver agenda completa
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
