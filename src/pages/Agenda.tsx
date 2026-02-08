import { useState, useCallback } from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Loader2, Calendar, CalendarDays, CalendarRange, Plus } from "lucide-react";
import { useAgenda } from "@/hooks/useAgenda";
import { AnnualCalendar } from "@/components/agenda/AnnualCalendar";
import { MonthlyCalendar } from "@/components/agenda/MonthlyCalendar";
import { WeeklyCalendar } from "@/components/agenda/WeeklyCalendar";
import { EventModal } from "@/components/agenda/EventModal";
import { CalendarLegend } from "@/components/agenda/CalendarLegend";
import { CalendarEvent, ViewMode, AgencyEventType } from "@/types/agenda";
import { addMonths, subMonths, addWeeks, subWeeks, format } from "date-fns";

export default function Agenda() {
  const [viewMode, setViewMode] = useState<ViewMode>("year");
  const [currentYear, setCurrentYear] = useState(new Date().getFullYear());
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const {
    allEvents,
    isLoading,
    createEvent,
    updateEvent,
    deleteEvent,
    hidePresetEvent,
    isCreating,
    isUpdating,
    isDeleting,
  } = useAgenda(currentYear);

  const handleDayClick = useCallback((date: string) => {
    setSelectedDate(date);
    setSelectedEvent(null);
    setIsModalOpen(true);
  }, []);

  const handleEventClick = useCallback((event: CalendarEvent) => {
    setSelectedDate(event.event_date);
    setSelectedEvent(event);
    setIsModalOpen(true);
  }, []);

  const handleSaveEvent = useCallback((eventData: {
    title: string;
    description: string | null;
    event_type: AgencyEventType;
    event_date: string;
    event_time: string | null;
    color: string | null;
  }) => {
    createEvent(eventData);
  }, [createEvent]);

  const handleUpdateEvent = useCallback((id: string, updates: Partial<CalendarEvent>) => {
    updateEvent({ id, ...updates });
  }, [updateEvent]);

  const handleDeleteEvent = useCallback((id: string) => {
    deleteEvent(id);
  }, [deleteEvent]);

  const handleHidePresetEvent = useCallback((id: string) => {
    hidePresetEvent(id);
  }, [hidePresetEvent]);

  const navigateMonth = useCallback((direction: 'prev' | 'next') => {
    setCurrentDate(prev => direction === 'prev' ? subMonths(prev, 1) : addMonths(prev, 1));
  }, []);

  const navigateWeek = useCallback((direction: 'prev' | 'next') => {
    setCurrentDate(prev => direction === 'prev' ? subWeeks(prev, 1) : addWeeks(prev, 1));
  }, []);

  const goToToday = useCallback(() => {
    setCurrentDate(new Date());
    setCurrentYear(new Date().getFullYear());
  }, []);

  const handleYearChange = useCallback((year: number) => {
    setCurrentYear(year);
  }, []);

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-display font-bold text-foreground flex items-center gap-3">
              <Calendar className="h-8 w-8 text-primary" />
              Minha Agenda
            </h1>
            <p className="text-muted-foreground mt-1">
              Planeje e gerencie todos os seus eventos do ano
            </p>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant={viewMode === "year" ? "default" : "outline"}
              size="sm"
              onClick={() => setViewMode("year")}
            >
              <CalendarRange className="h-4 w-4 mr-2" />
              Ano
            </Button>
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

        {/* Calendar Card */}
        <Card className="border-0 shadow-lg">
          <CardContent className="pt-6">
            {isLoading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            ) : (
              <>
                {viewMode === "year" && (
                  <AnnualCalendar
                    year={currentYear}
                    events={allEvents}
                    onDayClick={handleDayClick}
                    onEventClick={handleEventClick}
                    onYearChange={handleYearChange}
                  />
                )}
                {viewMode === "month" && (
                  <MonthlyCalendar
                    currentDate={currentDate}
                    events={allEvents}
                    onDayClick={handleDayClick}
                    onEventClick={handleEventClick}
                    onNavigate={navigateMonth}
                    onToday={goToToday}
                  />
                )}
                {viewMode === "week" && (
                  <WeeklyCalendar
                    currentDate={currentDate}
                    events={allEvents}
                    onDayClick={handleDayClick}
                    onEventClick={handleEventClick}
                    onNavigate={navigateWeek}
                    onToday={goToToday}
                  />
                )}
              </>
            )}
          </CardContent>
        </Card>

        {/* Legend */}
        <CalendarLegend />

        {/* Quick Add Button (FAB) */}
        <Button
          size="lg"
          className="fixed bottom-6 right-6 rounded-full shadow-lg h-14 w-14 p-0 z-50"
          onClick={() => {
            setSelectedDate(format(new Date(), 'yyyy-MM-dd'));
            setSelectedEvent(null);
            setIsModalOpen(true);
          }}
        >
          <Plus className="h-6 w-6" />
        </Button>
      </div>

      {/* Event Modal */}
      <EventModal
        open={isModalOpen}
        onOpenChange={setIsModalOpen}
        selectedDate={selectedDate}
        event={selectedEvent}
        onSave={handleSaveEvent}
        onUpdate={handleUpdateEvent}
        onDelete={handleDeleteEvent}
        onHide={handleHidePresetEvent}
        isLoading={isCreating || isUpdating || isDeleting}
      />
    </DashboardLayout>
  );
}
