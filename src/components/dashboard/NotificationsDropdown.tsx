import { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { Bell, Calendar, Megaphone, Clock, Check, CheckCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { useAgenda } from "@/hooks/useAgenda";
import { useReminders } from "@/hooks/useReminders";
import { format, isToday, isTomorrow, parseISO, startOfDay, addDays } from "date-fns";
import { ptBR } from "date-fns/locale";
import { cn } from "@/lib/utils";

interface Notification {
  id: string;
  title: string;
  description?: string;
  type: "agenda" | "reminder" | "admin";
  date: Date;
  isRead: boolean;
  link?: string;
}

export function NotificationsDropdown() {
  const navigate = useNavigate();
  const { getUpcomingEvents } = useAgenda();
  const { reminders } = useReminders();
  const [readNotifications, setReadNotifications] = useState<Set<string>>(
    () => {
      const saved = localStorage.getItem("readNotifications");
      return saved ? new Set(JSON.parse(saved)) : new Set();
    }
  );
  const [isOpen, setIsOpen] = useState(false);

  // Generate notifications from agenda events and reminders
  const notifications = useMemo(() => {
    const items: Notification[] = [];
    const today = startOfDay(new Date());
    const nextWeek = addDays(today, 7);

    // Add upcoming events (today and next 7 days)
    const upcomingEvents = getUpcomingEvents(20);
    upcomingEvents.forEach((event) => {
      const eventDate = parseISO(event.event_date);
      if (eventDate >= today && eventDate <= nextWeek) {
        items.push({
          id: `event-${event.id}`,
          title: event.title,
          description: isToday(eventDate)
            ? "Hoje"
            : isTomorrow(eventDate)
            ? "Amanhã"
            : format(eventDate, "EEEE, d 'de' MMMM", { locale: ptBR }),
          type: "agenda",
          date: eventDate,
          isRead: readNotifications.has(`event-${event.id}`),
          link: "/agenda",
        });
      }
    });

    // Add trip reminders
    reminders.forEach((reminder) => {
      const reminderDate = parseISO(reminder.reminder_date);
      if (reminderDate >= today) {
        items.push({
          id: `reminder-${reminder.id}`,
          title: `Lembrete: ${reminder.trip?.client_name || "Viagem"}`,
          description: `${reminder.trip?.destination || ""} - ${
            reminder.daysRemaining
          } dias para a viagem`,
          type: "reminder",
          date: reminderDate,
          isRead: readNotifications.has(`reminder-${reminder.id}`),
          link: "/trip-wallet",
        });
      }
    });

    // Sort by date, unread first
    return items.sort((a, b) => {
      if (a.isRead !== b.isRead) return a.isRead ? 1 : -1;
      return a.date.getTime() - b.date.getTime();
    });
  }, [getUpcomingEvents, reminders, readNotifications]);

  const unreadCount = notifications.filter((n) => !n.isRead).length;

  const markAsRead = (id: string) => {
    const newRead = new Set(readNotifications);
    newRead.add(id);
    setReadNotifications(newRead);
    localStorage.setItem("readNotifications", JSON.stringify([...newRead]));
  };

  const markAllAsRead = () => {
    const newRead = new Set(notifications.map((n) => n.id));
    setReadNotifications(newRead);
    localStorage.setItem("readNotifications", JSON.stringify([...newRead]));
  };

  const handleNotificationClick = (notification: Notification) => {
    markAsRead(notification.id);
    setIsOpen(false);
    if (notification.link) {
      navigate(notification.link);
    }
  };

  const getTypeIcon = (type: Notification["type"]) => {
    switch (type) {
      case "agenda":
        return <Calendar className="h-4 w-4 text-primary" />;
      case "reminder":
        return <Clock className="h-4 w-4 text-accent-foreground" />;
      case "admin":
        return <Megaphone className="h-4 w-4 text-secondary-foreground" />;
    }
  };

  const getTypeLabel = (type: Notification["type"]) => {
    switch (type) {
      case "agenda":
        return "Agenda";
      case "reminder":
        return "Lembrete";
      case "admin":
        return "Aviso";
    }
  };

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="relative h-9 w-9 rounded-full hover:bg-muted"
        >
          <Bell className="h-4.5 w-4.5 text-muted-foreground" />
          {unreadCount > 0 && (
            <span className="absolute -top-0.5 -right-0.5 flex h-4.5 w-4.5 items-center justify-center rounded-full bg-primary text-[10px] font-medium text-primary-foreground">
              {unreadCount > 9 ? "9+" : unreadCount}
            </span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent
        className="w-80 p-0"
        align="end"
        sideOffset={8}
      >
        <div className="flex items-center justify-between px-4 py-3 border-b">
          <h4 className="font-semibold text-sm">Notificações</h4>
          {unreadCount > 0 && (
            <Button
              variant="ghost"
              size="sm"
              className="h-7 text-xs text-muted-foreground hover:text-foreground"
              onClick={markAllAsRead}
            >
              <CheckCheck className="h-3.5 w-3.5 mr-1" />
              Marcar todas como lidas
            </Button>
          )}
        </div>

        <ScrollArea className="max-h-80">
          {notifications.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 px-4 text-center">
              <Bell className="h-10 w-10 text-muted-foreground/30 mb-3" />
              <p className="text-sm text-muted-foreground">
                Nenhuma notificação
              </p>
              <p className="text-xs text-muted-foreground/70 mt-1">
                Você está em dia com tudo!
              </p>
            </div>
          ) : (
            <div className="divide-y">
              {notifications.map((notification) => (
                <button
                  key={notification.id}
                  onClick={() => handleNotificationClick(notification)}
                  className={cn(
                    "w-full flex items-start gap-3 px-4 py-3 text-left hover:bg-muted/50 transition-colors",
                    !notification.isRead && "bg-primary/5"
                  )}
                >
                  <div className="mt-0.5">
                    {getTypeIcon(notification.type)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p
                        className={cn(
                          "text-sm truncate",
                          !notification.isRead && "font-medium"
                        )}
                      >
                        {notification.title}
                      </p>
                      {!notification.isRead && (
                        <span className="h-2 w-2 rounded-full bg-primary flex-shrink-0" />
                      )}
                    </div>
                    {notification.description && (
                      <p className="text-xs text-muted-foreground mt-0.5 truncate">
                        {notification.description}
                      </p>
                    )}
                    <Badge
                      variant="secondary"
                      className="mt-1.5 text-[10px] px-1.5 py-0 h-4"
                    >
                      {getTypeLabel(notification.type)}
                    </Badge>
                  </div>
                </button>
              ))}
            </div>
          )}
        </ScrollArea>

        {notifications.length > 0 && (
          <>
            <Separator />
            <div className="p-2">
              <Button
                variant="ghost"
                size="sm"
                className="w-full text-xs h-8"
                onClick={() => {
                  setIsOpen(false);
                  navigate("/agenda");
                }}
              >
                Ver agenda completa
              </Button>
            </div>
          </>
        )}
      </PopoverContent>
    </Popover>
  );
}
