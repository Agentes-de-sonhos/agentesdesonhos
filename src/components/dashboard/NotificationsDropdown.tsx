import { useState, useMemo, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { AtSign, Bell, CheckCheck, Send, UserPlus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import { useLeads, useMarkAllLeadsRead, useMarkLeadRead, type LeadItem } from "@/hooks/useLeadAlerts";
import {
  useCommunityNotifications,
  useMarkCommunityNotificationsRead,
  type CommunityNotificationItem,
} from "@/hooks/useCommunityNotifications";

export function NotificationsDropdown() {
  const navigate = useNavigate();
  const [isOpen, setIsOpen] = useState(false);
  const { data: leads = [] } = useLeads();
  const markRead = useMarkLeadRead();
  const markAllRead = useMarkAllLeadsRead();
  const { data: communityNotifications = [] } = useCommunityNotifications();
  const markCommunityRead = useMarkCommunityNotificationsRead();

  // Auto-cleanup (client-side): hide read leads older than 24 hours,
  // and cap the list to the most recent 100 items to keep the panel performant.
  const cleanedLeads = useMemo(() => {
    const ONE_DAY_MS = 24 * 60 * 60 * 1000;
    const cutoff = Date.now() - ONE_DAY_MS;
    return leads
      .filter((l) => {
        if (!l.is_read) return true;
        return new Date(l.created_at).getTime() >= cutoff;
      })
      .slice(0, 100);
  }, [leads]);

  const unreadLeads = useMemo(
    () => cleanedLeads.filter((l) => !l.is_read),
    [cleanedLeads]
  );
  const unreadCommunity = useMemo(
    () => communityNotifications.filter((item) => !item.read_at),
    [communityNotifications]
  );
  const unreadCount = unreadLeads.length + unreadCommunity.length;
  const visibleLeads = cleanedLeads;
  const hasAnything = visibleLeads.length > 0 || communityNotifications.length > 0;

  // Auto-mark all as read as soon as the panel opens. This prevents the badge
  // and unread highlight from staying active after the user has seen the list.
  const autoMarkedRef = useRef(false);
  useEffect(() => {
    if (!isOpen) {
      autoMarkedRef.current = false;
      return;
    }
    if (autoMarkedRef.current || unreadCount === 0) return;
    autoMarkedRef.current = true;
    if (unreadLeads.length > 0) markAllRead.mutate();
    if (unreadCommunity.length > 0) markCommunityRead.mutate(undefined);
  }, [isOpen, unreadCount, unreadLeads.length, unreadCommunity.length, markAllRead, markCommunityRead]);

  const handleCommunityClick = (item: CommunityNotificationItem) => {
    setIsOpen(false);
    navigate(item.post_id ? `/comunidade?post=${item.post_id}` : "/comunidade");
  };

  const communityLabel = (item: CommunityNotificationItem) => {
    const who = item.actor_name || "Alguém";
    if (item.type === "mention") {
      return item.comment_id
        ? `${who} mencionou você em um comentário`
        : `${who} mencionou você em uma publicação`;
    }
    if (item.type === "share") return `${who} enviou uma publicação para você`;
    return `${who} interagiu com você na Comunidade`;
  };

  const handleLeadClick = (lead: LeadItem) => {
    if (!lead.is_read) markRead.mutate({ id: lead.id, source: lead.source });
    setIsOpen(false);
    navigate("/meus-leads");
  };

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          aria-label="Notificações"
          aria-expanded={isOpen}
          className="relative h-11 w-11 overflow-visible rounded-full bg-muted text-foreground hover:bg-accent md:h-9 md:w-9"
        >
          <Bell className="h-4 w-4" />
          {unreadCount > 0 && (
            <span
              className={cn(
                "absolute -right-1 -top-1 z-10 flex items-center justify-center rounded-full bg-primary text-primary-foreground text-[10px] font-bold leading-none ring-2 ring-background",
                unreadCount > 9 ? "px-1 h-[18px] min-w-[18px]" : "h-[18px] w-[18px]",
                "animate-[notification-badge-pulse_2s_ease-in-out_infinite] will-change-transform"
              )}
              style={{ transformOrigin: "center" }}
            >
              {unreadCount > 99 ? "99+" : unreadCount}
            </span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent
        className="w-[calc(100vw-1rem)] max-w-[22rem] overflow-hidden p-0"
        align="end"
        sideOffset={8}
      >
        <div className="sticky top-0 z-10 flex items-center justify-between px-4 py-3 border-b bg-background">
          <h4 className="font-semibold text-sm">Notificações</h4>
          {unreadCount > 0 && (
            <Button
              variant="ghost"
              size="sm"
              className="min-h-11 text-xs text-foreground hover:bg-accent md:min-h-8"
              onClick={() => {
                markAllRead.mutate();
                markCommunityRead.mutate(undefined);
              }}
            >
              <CheckCheck className="h-3.5 w-3.5 mr-1" />
              Marcar todas como lidas
            </Button>
          )}
        </div>

        <ScrollArea className="h-[420px]">
          {!hasAnything ? (
            <div className="flex flex-col items-center justify-center py-8 px-4 text-center">
              <Bell className="h-10 w-10 text-muted-foreground/30 mb-3" />
              <p className="text-sm text-muted-foreground">
                Nenhuma notificação
              </p>
              <p className="text-xs text-muted-foreground/70 mt-1">
                Você está em dia com seus leads!
              </p>
            </div>
          ) : (
            <div className="divide-y">
              {communityNotifications.map((item) => (
                <button
                  key={`community-${item.id}`}
                  onClick={() => handleCommunityClick(item)}
                  className={cn(
                    "w-full flex items-start gap-3 px-4 py-3 text-left hover:bg-muted/50 transition-colors",
                    !item.read_at && "bg-primary/5 border-l-2 border-l-primary"
                  )}
                >
                  <div className="mt-0.5">
                    {item.type === "share" ? (
                      <Send className="h-4 w-4 text-primary" />
                    ) : (
                      <AtSign className="h-4 w-4 text-primary" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className={cn("text-sm truncate", !item.read_at && "font-semibold text-foreground")}>
                      {communityLabel(item)}
                    </p>
                    <span className="text-[10px] text-muted-foreground">
                      {new Date(item.created_at).toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" })}
                    </span>
                  </div>
                </button>
              ))}
              {visibleLeads.map((lead) => (
                <button
                  key={`${lead.source}-${lead.id}`}
                  onClick={() => handleLeadClick(lead)}
                  className={cn(
                    "w-full flex items-start gap-3 px-4 py-3 text-left hover:bg-muted/50 transition-colors",
                    !lead.is_read && "bg-primary/5 border-l-2 border-l-primary"
                  )}
                >
                  <div className="mt-0.5">
                    <UserPlus className="h-4 w-4 text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p
                        className={cn(
                          "text-sm truncate",
                          !lead.is_read && "font-semibold text-foreground"
                        )}
                      >
                        Novo lead: {lead.lead_name}
                      </p>
                      {!lead.is_read && (
                        <span className="h-2 w-2 rounded-full bg-primary flex-shrink-0" />
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5 truncate">
                      {lead.lead_phone}
                      {lead.destination ? ` · ${lead.destination}` : ""}
                    </p>
                    <div className="flex items-center gap-1.5 mt-1.5 flex-wrap">
                      <Badge
                        variant="secondary"
                        className={cn(
                          "text-[10px] px-1.5 py-0 h-4",
                          lead.source === "conversational"
                            ? "bg-emerald-100 text-emerald-700"
                            : "bg-pink-100 text-pink-700"
                        )}
                      >
                        {lead.source === "conversational" ? "🟢 Conversacional" : "🩷 Vendas"}
                      </Badge>
                      <span className="text-[10px] text-muted-foreground">
                        {new Date(lead.created_at).toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" })}
                      </span>
                    </div>
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
