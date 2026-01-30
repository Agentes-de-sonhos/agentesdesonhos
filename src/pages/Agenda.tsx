import { useState, useMemo } from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Calendar,
  ChevronLeft,
  ChevronRight,
  Loader2,
  CalendarDays,
  MapPin,
  Globe,
  Clock,
  ExternalLink,
  Users,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import {
  format,
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  eachDayOfInterval,
  isSameMonth,
  isSameDay,
  addMonths,
  subMonths,
  addWeeks,
  subWeeks,
  parseISO,
} from "date-fns";
import { ptBR } from "date-fns/locale";

type ViewMode = "month" | "week";

interface Event {
  id: string;
  title: string;
  event_type: string;
  organizer: string;
  start_datetime: string;
  end_datetime: string;
  location: string | null;
  is_online: boolean;
  registration_url: string | null;
  description: string | null;
  is_active: boolean;
}

const eventTypeColors: Record<string, string> = {
  treinamento: "bg-blue-500",
  feira: "bg-purple-500",
  webinar: "bg-green-500",
  workshop: "bg-orange-500",
  outro: "bg-gray-500",
};

const eventTypeLabels: Record<string, string> = {
  treinamento: "Treinamento",
  feira: "Feira",
  webinar: "Webinar",
  workshop: "Workshop",
  outro: "Outro",
};

export default function Agenda() {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [viewMode, setViewMode] = useState<ViewMode>("month");
  const [selectedEvent, setSelectedEvent] = useState<Event | null>(null);

  const { data: events = [], isLoading } = useQuery({
    queryKey: ["events"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("events")
        .select("*")
        .eq("is_active", true)
        .order("start_datetime", { ascending: true });

      if (error) throw error;
      return data as Event[];
    },
  });

  const calendarDays = useMemo(() => {
    if (viewMode === "month") {
      const monthStart = startOfMonth(currentDate);
      const monthEnd = endOfMonth(currentDate);
      const calendarStart = startOfWeek(monthStart, { weekStartsOn: 0 });
      const calendarEnd = endOfWeek(monthEnd, { weekStartsOn: 0 });
      return eachDayOfInterval({ start: calendarStart, end: calendarEnd });
    } else {
      const weekStart = startOfWeek(currentDate, { weekStartsOn: 0 });
      const weekEnd = endOfWeek(currentDate, { weekStartsOn: 0 });
      return eachDayOfInterval({ start: weekStart, end: weekEnd });
    }
  }, [currentDate, viewMode]);

  const getEventsForDay = (day: Date) => {
    return events.filter((event) => {
      const eventStart = parseISO(event.start_datetime);
      return isSameDay(eventStart, day);
    });
  };

  const navigatePrevious = () => {
    if (viewMode === "month") {
      setCurrentDate(subMonths(currentDate, 1));
    } else {
      setCurrentDate(subWeeks(currentDate, 1));
    }
  };

  const navigateNext = () => {
    if (viewMode === "month") {
      setCurrentDate(addMonths(currentDate, 1));
    } else {
      setCurrentDate(addWeeks(currentDate, 1));
    }
  };

  const goToToday = () => {
    setCurrentDate(new Date());
  };

  const weekDays = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-display font-bold text-foreground flex items-center gap-3">
              <Calendar className="h-8 w-8 text-primary" />
              Agenda
            </h1>
            <p className="text-muted-foreground mt-1">
              Eventos, treinamentos e feiras do setor de turismo
            </p>
          </div>
        </div>

        {/* Calendar Card */}
        <Card className="border-0 shadow-lg">
          <CardHeader className="pb-4">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              {/* Navigation */}
              <div className="flex items-center gap-2">
                <Button variant="outline" size="icon" onClick={navigatePrevious}>
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <Button variant="outline" onClick={goToToday}>
                  Hoje
                </Button>
                <Button variant="outline" size="icon" onClick={navigateNext}>
                  <ChevronRight className="h-4 w-4" />
                </Button>
                <CardTitle className="ml-4 text-xl">
                  {viewMode === "month"
                    ? format(currentDate, "MMMM yyyy", { locale: ptBR })
                    : `Semana de ${format(startOfWeek(currentDate, { weekStartsOn: 0 }), "d 'de' MMMM", { locale: ptBR })}`}
                </CardTitle>
              </div>

              {/* View Mode Toggle */}
              <div className="flex items-center gap-2">
                <Button
                  variant={viewMode === "month" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setViewMode("month")}
                >
                  <CalendarDays className="h-4 w-4 mr-2" />
                  Mês
                </Button>
                <Button
                  variant={viewMode === "week" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setViewMode("week")}
                >
                  <Calendar className="h-4 w-4 mr-2" />
                  Semana
                </Button>
              </div>
            </div>
          </CardHeader>

          <CardContent>
            {isLoading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            ) : (
              <div className="border rounded-lg overflow-hidden">
                {/* Week Days Header */}
                <div className="grid grid-cols-7 bg-muted">
                  {weekDays.map((day) => (
                    <div
                      key={day}
                      className="py-3 text-center text-sm font-medium text-muted-foreground border-b"
                    >
                      {day}
                    </div>
                  ))}
                </div>

                {/* Calendar Grid */}
                <div className={`grid grid-cols-7 ${viewMode === "week" ? "min-h-[300px]" : ""}`}>
                  {calendarDays.map((day, index) => {
                    const dayEvents = getEventsForDay(day);
                    const isCurrentMonth = isSameMonth(day, currentDate);
                    const isToday = isSameDay(day, new Date());

                    return (
                      <div
                        key={index}
                        className={`min-h-[100px] sm:min-h-[120px] p-1 sm:p-2 border-b border-r ${
                          !isCurrentMonth && viewMode === "month" ? "bg-muted/30" : "bg-background"
                        }`}
                      >
                        <div
                          className={`text-sm font-medium mb-1 w-7 h-7 flex items-center justify-center rounded-full ${
                            isToday
                              ? "bg-primary text-primary-foreground"
                              : !isCurrentMonth && viewMode === "month"
                              ? "text-muted-foreground"
                              : "text-foreground"
                          }`}
                        >
                          {format(day, "d")}
                        </div>
                        <div className="space-y-1">
                          {dayEvents.slice(0, viewMode === "week" ? 5 : 3).map((event) => (
                            <button
                              key={event.id}
                              onClick={() => setSelectedEvent(event)}
                              className={`w-full text-left text-xs p-1 rounded truncate text-white hover:opacity-80 transition-opacity ${
                                eventTypeColors[event.event_type] || "bg-gray-500"
                              }`}
                            >
                              {event.title}
                            </button>
                          ))}
                          {dayEvents.length > (viewMode === "week" ? 5 : 3) && (
                            <span className="text-xs text-muted-foreground">
                              +{dayEvents.length - (viewMode === "week" ? 5 : 3)} mais
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Legend */}
        <div className="flex flex-wrap gap-3">
          {Object.entries(eventTypeLabels).map(([type, label]) => (
            <div key={type} className="flex items-center gap-2">
              <div className={`w-3 h-3 rounded ${eventTypeColors[type]}`} />
              <span className="text-sm text-muted-foreground">{label}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Event Detail Dialog */}
      <Dialog open={!!selectedEvent} onOpenChange={() => setSelectedEvent(null)}>
        <DialogContent className="sm:max-w-[500px]">
          {selectedEvent && (
            <>
              <DialogHeader>
                <div className="flex items-center gap-2 mb-2">
                  <Badge
                    className={`${
                      eventTypeColors[selectedEvent.event_type] || "bg-gray-500"
                    } text-white border-0`}
                  >
                    {eventTypeLabels[selectedEvent.event_type] || selectedEvent.event_type}
                  </Badge>
                </div>
                <DialogTitle className="text-xl">{selectedEvent.title}</DialogTitle>
                <DialogDescription className="flex items-center gap-2 mt-1">
                  <Users className="h-4 w-4" />
                  {selectedEvent.organizer}
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-4 mt-4">
                {/* Date and Time */}
                <div className="flex items-start gap-3">
                  <Clock className="h-5 w-5 text-muted-foreground mt-0.5" />
                  <div>
                    <p className="font-medium">
                      {format(parseISO(selectedEvent.start_datetime), "EEEE, d 'de' MMMM 'de' yyyy", {
                        locale: ptBR,
                      })}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {format(parseISO(selectedEvent.start_datetime), "HH:mm")} -{" "}
                      {format(parseISO(selectedEvent.end_datetime), "HH:mm")}
                    </p>
                  </div>
                </div>

                {/* Location */}
                <div className="flex items-start gap-3">
                  {selectedEvent.is_online ? (
                    <Globe className="h-5 w-5 text-muted-foreground mt-0.5" />
                  ) : (
                    <MapPin className="h-5 w-5 text-muted-foreground mt-0.5" />
                  )}
                  <div>
                    <p className="font-medium">
                      {selectedEvent.is_online ? "Evento Online" : selectedEvent.location || "Local a definir"}
                    </p>
                  </div>
                </div>

                {/* Description */}
                {selectedEvent.description && (
                  <div className="pt-2 border-t">
                    <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                      {selectedEvent.description}
                    </p>
                  </div>
                )}

                {/* Registration Button */}
                {selectedEvent.registration_url && (
                  <div className="pt-4">
                    <Button asChild className="w-full">
                      <a
                        href={selectedEvent.registration_url}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        <ExternalLink className="h-4 w-4 mr-2" />
                        Inscrever-se
                      </a>
                    </Button>
                  </div>
                )}
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}
