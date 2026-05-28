import { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { Bell, Megaphone, CheckCheck, UserPlus } from "lucide-react";
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

export function NotificationsDropdown() {
  const navigate = useNavigate();
  const [isOpen, setIsOpen] = useState(false);
  const { data: leads = [] } = useLeads();
  const markRead = useMarkLeadRead();
  const markAllRead = useMarkAllLeadsRead();

  const unreadLeads = useMemo(() => leads.filter((l) => !l.is_read), [leads]);
  const unreadCount = unreadLeads.length;
  const visibleLeads = useMemo(() => leads.slice(0, 12), [leads]);

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
          className="relative h-9 w-9 rounded-full bg-muted text-muted-foreground hover:bg-muted/80"
        >
          <Bell className="h-4 w-4" />
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

        <div className="flex items-center justify-between px-4 py-3 border-b">
          <h4 className="font-semibold text-sm">Notificações</h4>
          {unreadCount > 0 && (
            <Button
              variant="ghost"
              size="sm"
              className="h-7 text-xs text-muted-foreground hover:text-foreground"
              onClick={() => markAllRead.mutate()}
            >
              <CheckCheck className="h-3.5 w-3.5 mr-1" />
              Marcar todas como lidas
            </Button>
          )}
        </div>

        <ScrollArea className="max-h-80">
          {visibleLeads.length === 0 ? (
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
              {visibleLeads.map((lead) => (
                <button
                  key={`${lead.source}-${lead.id}`}
                  onClick={() => handleLeadClick(lead)}
                  className={cn(
                    "w-full flex items-start gap-3 px-4 py-3 text-left hover:bg-muted/50 transition-colors",
                    !lead.is_read && "bg-primary/5"
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
                          !lead.is_read && "font-medium"
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
                    <div className="flex items-center gap-1.5 mt-1.5">
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
