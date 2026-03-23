import { useState, useCallback } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { PageHeader } from "@/components/layout/PageHeader";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Loader2, Calendar, CalendarDays, CalendarRange, Clock, Plus } from "lucide-react";
import { useAgenda } from "@/hooks/useAgenda";
import { AnnualCalendar } from "@/components/agenda/AnnualCalendar";
import { MonthlyCalendar } from "@/components/agenda/MonthlyCalendar";
import { WeeklyCalendar } from "@/components/agenda/WeeklyCalendar";
import { DailyCalendar } from "@/components/agenda/DailyCalendar";
import { EventModal } from "@/components/agenda/EventModal";
import { GoogleCalendarSyncButton } from "@/components/agenda/GoogleCalendarSyncButton";

import { EventTypeFilter } from "@/components/agenda/EventTypeFilter";
import { CalendarEvent, ViewMode, AgencyEventType } from "@/types/agenda";
import { addMonths, subMonths, addWeeks, subWeeks, addDays, subDays, format } from "date-fns";

export default function Agenda() {
  const [viewMode, setViewMode] = useState<ViewMode>(() => {
    const saved = localStorage.getItem("agenda-view-mode");
    return (saved as ViewMode) || "month";
  });

  const handleViewChange = useCallback((mode: ViewMode) => {
    setViewMode(mode);
    localStorage.setItem("agenda-view-mode", mode);
  }, []);
  const [currentYear, setCurrentYear] = useState(new Date().getFullYear());
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const agenda = useAgenda(currentYear);
  const {
    allEvents,
    customEventTypes,
    allEventTypes,
    hiddenTypes,
    isLoading,
    createEvent,
    updateEvent,
    deleteEvent,
    hidePresetEvent,
    createCustomType,
    toggleEventTypeVisibility,
    highlightEvent,
    unhighlightEvent,
    highlightedEventIds,
    isCreating,
    isUpdating,
    isDeleting,
    isCreatingCustomType,
  } = agenda;

  const queryClient = useQueryClient();

  const handleSyncComplete = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ["agency-events"] });
  }, [queryClient]);

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
    event_type: string;
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

  const handleCreateCustomType = useCallback((name: string, color: string) => {
    createCustomType({ name, color });
  }, [createCustomType]);

  const navigateMonth = useCallback((direction: 'prev' | 'next') => {
    setCurrentDate(prev => direction === 'prev' ? subMonths(prev, 1) : addMonths(prev, 1));
  }, []);

  const navigateWeek = useCallback((direction: 'prev' | 'next') => {
    setCurrentDate(prev => direction === 'prev' ? subWeeks(prev, 1) : addWeeks(prev, 1));
  }, []);

  const navigateDay = useCallback((direction: 'prev' | 'next') => {
    setCurrentDate(prev => direction === 'prev' ? subDays(prev, 1) : addDays(prev, 1));
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
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <PageHeader
            pageKey="agenda"
            title="Minha Agenda"
            subtitle="Planeje e gerencie todos os seus eventos do ano"
            icon={Calendar}
            adminTab="agenda-events"
          />

          <div className="flex items-center gap-2">
            <Button
              variant={viewMode === "day" ? "default" : "outline"}
              size="sm"
              onClick={() => handleViewChange("day")}
            >
              <Clock className="h-4 w-4 mr-2" />
              Dia
            </Button>
            <Button
              variant={viewMode === "week" ? "default" : "outline"}
              size="sm"
              onClick={() => handleViewChange("week")}
            >
              <Calendar className="h-4 w-4 mr-2" />
              Semana
            </Button>
            <Button
              variant={viewMode === "month" ? "default" : "outline"}
              size="sm"
              onClick={() => handleViewChange("month")}
            >
              <CalendarDays className="h-4 w-4 mr-2" />
              Mês
            </Button>
            <Button
              variant={viewMode === "year" ? "default" : "outline"}
              size="sm"
              onClick={() => handleViewChange("year")}
            >
              <CalendarRange className="h-4 w-4 mr-2" />
              Ano
            </Button>
          </div>
        </div>

        {/* Google Calendar Sync */}
        <div className="flex justify-end">
          <GoogleCalendarSyncButton onSyncComplete={handleSyncComplete} />
        </div>

        {/* Filter Bar */}
        <EventTypeFilter
          eventTypes={allEventTypes}
          hiddenTypes={hiddenTypes}
          onToggleType={toggleEventTypeVisibility}
        />

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
                    highlightedEventIds={highlightedEventIds}
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
                {viewMode === "day" && (
                  <DailyCalendar
                    currentDate={currentDate}
                    events={allEvents}
                    onDayClick={handleDayClick}
                    onEventClick={handleEventClick}
                    onNavigate={navigateDay}
                    onToday={goToToday}
                  />
                )}
              </>
            )}
          </CardContent>
        </Card>


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
        customEventTypes={customEventTypes}
        onSave={handleSaveEvent}
        onUpdate={handleUpdateEvent}
        onDelete={handleDeleteEvent}
        onHide={handleHidePresetEvent}
        onHighlight={highlightEvent}
        onUnhighlight={unhighlightEvent}
        highlightedEventIds={highlightedEventIds}
        onCreateCustomType={handleCreateCustomType}
        isLoading={isCreating || isUpdating || isDeleting}
        isCreatingCustomType={isCreatingCustomType}
      />
    </DashboardLayout>
  );
}
