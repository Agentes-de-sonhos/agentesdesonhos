import { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { Bell, Megaphone, CheckCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";

interface Notification {
  id: string;
  title: string;
  description?: string;
  type: "admin";
  date: Date;
  isRead: boolean;
  link?: string;
}

export function NotificationsDropdown() {
  const navigate = useNavigate();
  const [readNotifications, setReadNotifications] = useState<Set<string>>(
    () => {
      const saved = localStorage.getItem("readNotifications");
      return saved ? new Set(JSON.parse(saved)) : new Set();
    }
  );
  const [isOpen, setIsOpen] = useState(false);

  // For now, notifications will come from admin-sent messages (future implementation)
  const notifications = useMemo(() => {
    const items: Notification[] = [];
    // Future: fetch admin notifications from database
    return items;
  }, [readNotifications]);

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
                    <Megaphone className="h-4 w-4 text-secondary-foreground" />
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
                      Aviso
                    </Badge>
                  </div>
                </button>
              ))}
            </div>
          )}
        </ScrollArea>
      </PopoverContent>
    </Popover>
  );
}
