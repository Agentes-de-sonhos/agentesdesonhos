import { usePresence, OnlineAgent } from "@/hooks/usePresence";
import { useSubscription } from "@/hooks/useSubscription";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Users } from "lucide-react";

interface OnlineAgentsStripProps {
  onAgentClick?: (agent: OnlineAgent) => void;
}

export function OnlineAgentsStrip({ onAgentClick }: OnlineAgentsStripProps) {
  const { onlineUsers, onlineCount } = usePresence();
  const { plan } = useSubscription();

  const handleClick = (agent: OnlineAgent) => {
    if (onAgentClick) {
      onAgentClick(agent);
    } else {
      // Dispatch global event for ChatFloatingButton to pick up
      window.dispatchEvent(new CustomEvent("start-dm", { detail: agent }));
    }
  };

  if (plan !== "premium") return null;

  return (
    <div className="flex items-center gap-3 bg-card rounded-xl px-4 py-2.5 border border-border shadow-sm">
      <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground whitespace-nowrap">
        <div className="relative">
          <Users className="h-4 w-4 text-primary" />
          <span className="absolute -top-0.5 -right-0.5 h-2 w-2 rounded-full bg-success border border-card" />
        </div>
        <span>
          <strong className="text-foreground">{onlineCount + 1}</strong> agentes online
        </span>
      </div>

      {onlineUsers.length > 0 && (
        <>
          <div className="h-5 w-px bg-border" />
          <div className="flex items-center gap-1 overflow-x-auto scrollbar-hide max-w-[280px] sm:max-w-[400px]">
            {onlineUsers.slice(0, 12).map((agent) => (
              <Tooltip key={agent.user_id}>
                <TooltipTrigger asChild>
                  <button
                    onClick={() => handleClick(agent)}
                    className="relative flex-shrink-0 transition-transform hover:scale-110"
                  >
                    <Avatar className="h-9 w-9 border-2 border-card">
                      <AvatarImage
                        src={agent.avatar_url || undefined}
                        alt={agent.name}
                      />
                      <AvatarFallback className="text-xs bg-primary/10 text-primary font-semibold">
                        {agent.name
                          .split(" ")
                          .map((n) => n[0])
                          .join("")
                          .slice(0, 2)
                          .toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <span className="absolute bottom-0 right-0 h-2.5 w-2.5 rounded-full bg-success border-2 border-card" />
                  </button>
                </TooltipTrigger>
                <TooltipContent side="bottom" className="text-center">
                  <p className="font-semibold">{agent.name}</p>
                  {agent.agency_name && (
                    <p className="text-xs text-muted-foreground">
                      {agent.agency_name}
                    </p>
                  )}
                  {agent.city && (
                    <p className="text-xs text-muted-foreground">{agent.city}</p>
                  )}
                </TooltipContent>
              </Tooltip>
            ))}
            {onlineUsers.length > 12 && (
              <span className="text-xs text-muted-foreground whitespace-nowrap pl-1">
                +{onlineUsers.length - 12}
              </span>
            )}
          </div>
        </>
      )}
    </div>
  );
}
