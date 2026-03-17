import { useState } from "react";
import { usePresence, OnlineAgent } from "@/hooks/usePresence";
import { useSubscription } from "@/hooks/useSubscription";
import { useIsMobile } from "@/hooks/use-mobile";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Switch } from "@/components/ui/switch";
import { Users } from "lucide-react";

interface OnlineAgentsStripProps {
  onAgentClick?: (agent: OnlineAgent) => void;
}

function AgentAvatar({
  agent,
  size = "md",
  onClick,
  showStatus = true,
  stackIndex = 0,
}: {
  agent: OnlineAgent;
  size?: "sm" | "md";
  onClick: () => void;
  showStatus?: boolean;
  stackIndex?: number;
}) {
  const dim = size === "sm" ? "h-8 w-8" : "h-9 w-9";
  const statusDim = size === "sm" ? "h-2 w-2" : "h-2.5 w-2.5";
  const initials = agent.name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <button
          onClick={onClick}
          className="relative flex-shrink-0 transition-all duration-200 hover:scale-110 hover:z-30 focus:outline-none focus:ring-2 focus:ring-primary/40 rounded-full"
          style={{
            marginLeft: stackIndex > 0 ? "-0.5rem" : 0,
            zIndex: 20 - stackIndex,
          }}
        >
          <Avatar
            className={`${dim} border-2 border-background shadow-sm ring-1 ring-border/30`}
          >
            <AvatarImage src={agent.avatar_url || undefined} alt={agent.name} />
            <AvatarFallback className="text-xs bg-primary/10 text-primary font-semibold">
              {initials}
            </AvatarFallback>
          </Avatar>
          {showStatus && (
            <span
              className={`absolute bottom-0 right-0 ${statusDim} rounded-full bg-emerald-500 border-2 border-background`}
            />
          )}
        </button>
      </TooltipTrigger>
      <TooltipContent side="bottom" className="text-center max-w-[200px]">
        <p className="font-semibold text-sm">{agent.name}</p>
        {agent.agency_name && (
          <p className="text-xs text-muted-foreground">{agent.agency_name}</p>
        )}
        {agent.city && (
          <p className="text-xs text-muted-foreground">{agent.city}</p>
        )}
        <div className="flex items-center justify-center gap-1 mt-1">
          <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
          <span className="text-[10px] text-emerald-600 font-medium">
            Online agora
          </span>
        </div>
      </TooltipContent>
    </Tooltip>
  );
}

export function OnlineAgentsStrip({ onAgentClick }: OnlineAgentsStripProps) {
  const { onlineUsers, onlineCount, isOnline, isOnlineLoading, toggleOnline } =
    usePresence();
  const { plan } = useSubscription();
  const isMobile = useIsMobile();
  const [popoverOpen, setPopoverOpen] = useState(false);

  const handleClick = (agent: OnlineAgent) => {
    setPopoverOpen(false);
    if (onAgentClick) {
      onAgentClick(agent);
    } else {
      window.dispatchEvent(new CustomEvent("start-dm", { detail: agent }));
    }
  };

  if (plan !== "profissional") return null;

  const maxVisible = isMobile ? 4 : 6;
  const visibleAgents = onlineUsers.slice(0, maxVisible);
  const overflowCount = onlineUsers.length - maxVisible;
  const totalOnline = onlineCount + (isOnline ? 1 : 0);

  return (
    <div className="flex items-center gap-3 bg-card rounded-xl px-4 py-2.5 border border-border shadow-sm">
      {/* Counter */}
      <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground whitespace-nowrap">
        <div className="relative">
          <Users className="h-4 w-4 text-primary" />
          <span className="absolute -top-0.5 -right-0.5 h-2 w-2 rounded-full bg-emerald-500 border border-card" />
        </div>
        <span>
          <strong className="text-foreground">{totalOnline}</strong> online
        </span>
      </div>

      {/* Stacked avatars */}
      {onlineUsers.length > 0 && (
        <>
          <div className="h-5 w-px bg-border" />
          <div className="flex items-center">
            {visibleAgents.map((agent, i) => (
              <AgentAvatar
                key={agent.user_id}
                agent={agent}
                size={isMobile ? "sm" : "md"}
                onClick={() => handleClick(agent)}
                stackIndex={i}
              />
            ))}

            {/* +N overflow button */}
            {overflowCount > 0 && (
              <Popover open={popoverOpen} onOpenChange={setPopoverOpen}>
                <PopoverTrigger asChild>
                  <button
                    className="relative flex-shrink-0 transition-all duration-200 hover:scale-110 hover:z-30 focus:outline-none focus:ring-2 focus:ring-primary/40 rounded-full"
                    style={{ marginLeft: "-0.5rem", zIndex: 10 }}
                  >
                    <div
                      className={`${isMobile ? "h-8 w-8 text-[10px]" : "h-9 w-9 text-xs"} rounded-full bg-muted border-2 border-background shadow-sm ring-1 ring-border/30 flex items-center justify-center font-semibold text-muted-foreground`}
                    >
                      +{overflowCount}
                    </div>
                  </button>
                </PopoverTrigger>
                <PopoverContent
                  side="bottom"
                  align="end"
                  className="w-72 p-3 max-h-80 overflow-y-auto"
                >
                  <p className="text-xs font-semibold text-muted-foreground mb-2 uppercase tracking-wide">
                    Todos online ({onlineUsers.length})
                  </p>
                  <div className="grid gap-1">
                    {onlineUsers.map((agent) => (
                      <button
                        key={agent.user_id}
                        onClick={() => handleClick(agent)}
                        className="flex items-center gap-3 p-2 rounded-lg hover:bg-accent/50 transition-colors w-full text-left"
                      >
                        <div className="relative flex-shrink-0">
                          <Avatar className="h-9 w-9 border border-border">
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
                          <span className="absolute bottom-0 right-0 h-2 w-2 rounded-full bg-emerald-500 border-2 border-background" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-medium truncate text-foreground">
                            {agent.name}
                          </p>
                          {(agent.agency_name || agent.city) && (
                            <p className="text-xs text-muted-foreground truncate">
                              {[agent.agency_name, agent.city]
                                .filter(Boolean)
                                .join(" · ")}
                            </p>
                          )}
                        </div>
                      </button>
                    ))}
                  </div>
                </PopoverContent>
              </Popover>
            )}
          </div>
        </>
      )}

      <div className="h-5 w-px bg-border" />

      {/* Online/Offline toggle */}
      <Tooltip>
        <TooltipTrigger asChild>
          <div className="flex items-center gap-1.5">
            <Switch
              checked={isOnline}
              onCheckedChange={toggleOnline}
              disabled={isOnlineLoading}
              className="h-5 w-9 data-[state=checked]:bg-emerald-500 data-[state=unchecked]:bg-muted [&>span]:h-4 [&>span]:w-4 [&>span]:data-[state=checked]:translate-x-4"
            />
            <span
              className={`text-xs font-medium ${isOnline ? "text-emerald-600" : "text-muted-foreground"}`}
            >
              {isOnline ? "On" : "Off"}
            </span>
          </div>
        </TooltipTrigger>
        <TooltipContent>
          <p>
            {isOnline
              ? "Você está visível para outros agentes"
              : "Você está invisível"}
          </p>
        </TooltipContent>
      </Tooltip>
    </div>
  );
}
