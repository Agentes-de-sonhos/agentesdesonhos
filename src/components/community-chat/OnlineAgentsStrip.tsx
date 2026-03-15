import { usePresence, OnlineAgent } from "@/hooks/usePresence";
import { useSubscription } from "@/hooks/useSubscription";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Switch } from "@/components/ui/switch";
import { Users } from "lucide-react";

interface OnlineAgentsStripProps {
  onAgentClick?: (agent: OnlineAgent) => void;
}

export function OnlineAgentsStrip({ onAgentClick }: OnlineAgentsStripProps) {
  const { onlineUsers, onlineCount, isOnline, isOnlineLoading, toggleOnline } = usePresence();
  const { plan } = useSubscription();

  const handleClick = (agent: OnlineAgent) => {
    if (onAgentClick) {
      onAgentClick(agent);
    } else {
      window.dispatchEvent(new CustomEvent("start-dm", { detail: agent }));
    }
  };

  if (plan !== "premium") return null;

  return (
    <div className="flex items-center gap-3 bg-card rounded-xl px-4 py-2.5 border border-border shadow-sm">
      {/* Online/Offline toggle */}
      <Tooltip>
        <TooltipTrigger asChild>
          <div className="flex items-center gap-1.5">
            <Switch
              checked={isOnline}
              onCheckedChange={toggleOnline}
              disabled={isOnlineLoading}
              className="h-5 w-9 data-[state=checked]:bg-green-500 data-[state=unchecked]:bg-muted [&>span]:h-4 [&>span]:w-4 [&>span]:data-[state=checked]:translate-x-4"
            />
            <span className={`text-xs font-medium ${isOnline ? "text-green-600" : "text-muted-foreground"}`}>
              {isOnline ? "On" : "Off"}
            </span>
          </div>
        </TooltipTrigger>
        <TooltipContent>
          <p>{isOnline ? "Você está visível para outros agentes" : "Você está invisível"}</p>
        </TooltipContent>
      </Tooltip>

      <div className="h-5 w-px bg-border" />

      <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground whitespace-nowrap">
        <div className="relative">
          <Users className="h-4 w-4 text-primary" />
          <span className="absolute -top-0.5 -right-0.5 h-2 w-2 rounded-full bg-success border border-card" />
        </div>
        <span>
          <strong className="text-foreground">{onlineCount + (isOnline ? 1 : 0)}</strong> agentes online
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
