import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Star, ArrowRight, Calendar } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import { eventTypeLabels } from "@/types/agenda";

export function HighlightedEventsCard() {
  const navigate = useNavigate();
  const { user } = useAuth();

  const { data: events, isLoading } = useQuery({
    queryKey: ["highlighted-events-dashboard", user?.id],
    queryFn: async () => {
      if (!user) return [];

      // Get highlighted event IDs
      const { data: highlights, error: hError } = await supabase
        .from("highlighted_events" as any)
        .select("event_id, event_source")
        .eq("user_id", user.id);
      if (hError) throw hError;
      if (!highlights || highlights.length === 0) return [];

      const agencyIds = highlights
        .filter((h: any) => h.event_source === "agency")
        .map((h: any) => h.event_id);
      const presetIds = highlights
        .filter((h: any) => h.event_source === "preset")
        .map((h: any) => h.event_id);

      const results: any[] = [];

      if (agencyIds.length > 0) {
        const { data } = await supabase
          .from("agency_events")
          .select("id, title, event_date, event_type, color, event_time")
          .in("id", agencyIds);
        if (data) results.push(...data);
      }

      if (presetIds.length > 0) {
        const { data } = await supabase
          .from("preset_events")
          .select("id, title, event_date, event_type, color")
          .in("id", presetIds);
        if (data) results.push(...data.map((e) => ({ ...e, event_time: null })));
      }

      // Sort by date and limit to 5
      return results
        .sort((a, b) => a.event_date.localeCompare(b.event_date))
        .slice(0, 5);
    },
    enabled: !!user,
  });

  if (!events || events.length === 0) return null;

  return (
    <Card className="h-full">
      <CardHeader className="pb-3">
        <CardTitle className="text-lg flex items-center gap-2">
          <Star className="h-5 w-5 text-yellow-500 fill-yellow-500" />
          Eventos Importantes
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        {isLoading ? (
          <p className="text-sm text-muted-foreground">Carregando...</p>
        ) : (
          <>
            {events.map((event: any) => (
              <div
                key={event.id}
                className="flex items-center gap-3 p-2 rounded-lg border hover:border-primary/30 cursor-pointer transition-colors"
                onClick={() => navigate("/agenda")}
              >
                <div
                  className="w-3 h-3 rounded-full flex-shrink-0"
                  style={{ backgroundColor: event.color || "#6b7280" }}
                />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{event.title}</p>
                  <p className="text-xs text-muted-foreground">
                    {format(parseISO(event.event_date), "dd MMM yyyy", { locale: ptBR })}
                    {event.event_time && ` às ${event.event_time.slice(0, 5)}`}
                  </p>
                </div>
              </div>
            ))}
            <Button
              variant="outline"
              size="sm"
              className="w-full mt-2"
              onClick={() => navigate("/agenda")}
            >
              Ver agenda <ArrowRight className="h-4 w-4 ml-1" />
            </Button>
          </>
        )}
      </CardContent>
    </Card>
  );
}
