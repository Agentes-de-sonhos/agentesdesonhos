import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { usePresence, OnlineAgent } from "@/hooks/usePresence";
import { useUserRole } from "@/hooks/useUserRole";
import { useSubscription } from "@/hooks/useSubscription";
import { useIsMobile } from "@/hooks/use-mobile";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { UpgradeDialog } from "@/components/subscription/UpgradeDialog";
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
import {
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
} from "@/components/ui/hover-card";
import { Switch } from "@/components/ui/switch";
import { Users, MessageCircle, User, Building2, MapPin, UserPlus, Check, Clock, Loader2 } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useConnections } from "@/hooks/useTradeConnect";

interface OnlineAgentsStripProps {
  onAgentClick?: (agent: OnlineAgent) => void;
  /**
   * When true, the current user is treated as offline (Start plan).
   * Any interaction (toggle on, view profile, send message) opens the upgrade dialog.
   */
  restrictedMode?: boolean;
}

/**
 * Compact action row (Ver perfil / Mensagem / Conectar) shared by the hover card
 * and the "+N" popover list. Reuses the existing DM (`start-dm` event ->
 * ChatFloatingButton) and community connection flows — no parallel systems.
 */
function AgentActions({
  agent,
  onMessage,
  onViewProfile,
  isMessaging,
  compact = false,
}: {
  agent: OnlineAgent;
  onMessage: () => void;
  onViewProfile: () => void;
  isMessaging?: boolean;
  compact?: boolean;
}) {
  const { user } = useAuth();
  const { getConnectionStatus, getConnectionId, sendRequest, respondRequest, isSending } =
    useConnections();
  const isSelf = user?.id === agent.user_id;
  const status = isSelf ? "none" : getConnectionStatus(agent.user_id);

  if (isSelf) return null;

  const stop = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const connectProps = (() => {
    switch (status) {
      case "accepted":
        return { label: "Conectados", icon: Check, disabled: true, onClick: () => {} };
      case "pending_sent":
        return { label: "Solicitado", icon: Clock, disabled: true, onClick: () => {} };
      case "pending_received":
        return {
          label: "Aceitar",
          icon: Check,
          disabled: isSending,
          onClick: () => {
            const id = getConnectionId(agent.user_id);
            if (id) respondRequest({ connectionId: id, accept: true });
          },
        };
      case "rejected":
      default:
        return {
          label: "Conectar",
          icon: UserPlus,
          disabled: isSending,
          onClick: () => sendRequest(agent.user_id),
        };
    }
  })();

  const ConnectIcon = connectProps.icon;
  const btn = `h-7 px-2 text-[11px] gap-1 min-w-0 ${compact ? "" : "flex-1"}`;

  return (
    <div className={`flex flex-wrap items-center gap-1.5 ${compact ? "" : "mt-3"}`}>
      <Button
        size="sm"
        variant="default"
        className={btn}
        aria-label={`Ver perfil de ${agent.name}`}
        onClick={(e) => {
          stop(e);
          onViewProfile();
        }}
      >
        <User className="h-3.5 w-3.5" />
        <span className="truncate">Perfil</span>
      </Button>
      <Button
        size="sm"
        variant="outline"
        className={btn}
        aria-label={`Enviar mensagem para ${agent.name}`}
        disabled={isMessaging}
        onClick={(e) => {
          stop(e);
          onMessage();
        }}
      >
        {isMessaging ? (
          <Loader2 className="h-3.5 w-3.5 animate-spin" />
        ) : (
          <MessageCircle className="h-3.5 w-3.5" />
        )}
        <span className="truncate">Mensagem</span>
      </Button>
      <Button
        size="sm"
        variant="secondary"
        className={btn}
        aria-label={`${connectProps.label} — ${agent.name}`}
        disabled={connectProps.disabled}
        onClick={(e) => {
          stop(e);
          connectProps.onClick();
        }}
      >
        <ConnectIcon className="h-3.5 w-3.5" />
        <span className="truncate">{connectProps.label}</span>
      </Button>
    </div>
  );
}

function AgentHoverCard({
  agent,
  children,
  onMessage,
  onViewProfile,
}: {
  agent: OnlineAgent;
  children: React.ReactNode;
  onMessage: () => void;
  onViewProfile: () => void;
}) {
  const [open, setOpen] = useState(false);
  return (
    <HoverCard open={open} onOpenChange={setOpen} openDelay={300} closeDelay={200}>
      <HoverCardTrigger asChild>{children}</HoverCardTrigger>
      <HoverCardContent side="bottom" align="center" className="w-64 p-3">
        <div className="flex items-start gap-3">
          <Avatar className="h-12 w-12 border border-border">
            <AvatarImage src={agent.avatar_url || undefined} alt={agent.name} />
            <AvatarFallback className="text-sm bg-primary/10 text-primary font-semibold">
              {agent.name.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase()}
            </AvatarFallback>
          </Avatar>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold text-foreground truncate">{agent.name}</p>
            {agent.agency_name && (
              <p className="text-xs text-muted-foreground flex items-center gap-1 truncate">
                <Building2 className="h-3 w-3 flex-shrink-0" /> {agent.agency_name}
              </p>
            )}
            {agent.city && (
              <p className="text-xs text-muted-foreground flex items-center gap-1 truncate">
                <MapPin className="h-3 w-3 flex-shrink-0" /> {agent.city}
              </p>
            )}
            <div className="flex items-center gap-1 mt-1">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
              <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-medium">Online agora</span>
            </div>
          </div>
        </div>
        <AgentActions
          agent={agent}
          onViewProfile={() => {
            setOpen(false);
            onViewProfile();
          }}
          onMessage={() => {
            setOpen(false);
            onMessage();
          }}
        />
      </HoverCardContent>
    </HoverCard>
  );
}

function AgentAvatar({
  agent,
  size = "md",
  onMessage,
  onViewProfile,
  showStatus = true,
  stackIndex = 0,
}: {
  agent: OnlineAgent;
  size?: "sm" | "md";
  onMessage: () => void;
  onViewProfile: () => void;
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
    <AgentHoverCard agent={agent} onMessage={onMessage} onViewProfile={onViewProfile}>
      <button
        className="relative flex-shrink-0 transition-all duration-200 hover:scale-110 hover:z-30 focus:outline-none focus:ring-2 focus:ring-primary/40 rounded-full"
        style={{
          marginLeft: stackIndex > 0 ? "-0.5rem" : 0,
          zIndex: 20 - stackIndex,
        }}
      >
        <Avatar className={`${dim} border-2 border-background shadow-sm ring-1 ring-border/30`}>
          <AvatarImage src={agent.avatar_url || undefined} alt={agent.name} />
          <AvatarFallback className="text-xs bg-primary/10 text-primary font-semibold">
            {initials}
          </AvatarFallback>
        </Avatar>
        {showStatus && (
          <span className={`absolute bottom-0 right-0 ${statusDim} rounded-full bg-emerald-500 border-2 border-background`} />
        )}
      </button>
    </AgentHoverCard>
  );
}

export function OnlineAgentsStrip({ onAgentClick, restrictedMode = false }: OnlineAgentsStripProps) {
  const { onlineUsers, onlineCount, isOnline, isOnlineLoading, toggleOnline } =
    usePresence();
  const { hasFeature } = useSubscription();
  const { isAdmin } = useUserRole();
  const isMobile = useIsMobile();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [popoverOpen, setPopoverOpen] = useState(false);
  const [upgradeOpen, setUpgradeOpen] = useState(false);

  const handleMessage = (agent: OnlineAgent) => {
    setPopoverOpen(false);
    if (restrictedMode) {
      setUpgradeOpen(true);
      return;
    }
    // Never open a conversation with yourself.
    if (user?.id === agent.user_id) return;
    if (onAgentClick) {
      onAgentClick(agent);
    } else {
      window.dispatchEvent(new CustomEvent("start-dm", { detail: agent }));
    }
  };

  const handleViewProfile = (agent: OnlineAgent) => {
    setPopoverOpen(false);
    if (restrictedMode) {
      setUpgradeOpen(true);
      return;
    }
    navigate(`/comunidade/agente/${agent.user_id}`);
  };

  if (!restrictedMode && !isAdmin && !hasFeature("community")) return null;

  const maxVisible = isMobile ? 4 : 6;
  const visibleAgents = onlineUsers.slice(0, maxVisible);
  const overflowCount = onlineUsers.length - maxVisible;
  // In restricted mode, current user is always offline regardless of presence state
  const effectiveIsOnline = restrictedMode ? false : isOnline;
  const totalOnline = onlineCount + (effectiveIsOnline ? 1 : 0);

  const handleToggle = (checked: boolean) => {
    if (restrictedMode) {
      setUpgradeOpen(true);
      return;
    }
    toggleOnline(checked);
  };

  return (
    <>
    <div className="flex items-center gap-3 bg-card rounded-xl px-4 py-2.5 border border-border shadow-sm">
      <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground whitespace-nowrap">
        <div className="relative">
          <Users className="h-4 w-4 text-primary" />
          <span className="absolute -top-0.5 -right-0.5 h-2 w-2 rounded-full bg-emerald-500 border border-card" />
        </div>
        <span>
          <strong className="text-foreground">{totalOnline}</strong> online
        </span>
      </div>

      {onlineUsers.length > 0 && (
        <>
          <div className="h-5 w-px bg-border" />
          <div className="flex items-center">
            {visibleAgents.map((agent, i) => (
              <AgentAvatar
                key={agent.user_id}
                agent={agent}
                size={isMobile ? "sm" : "md"}
                onMessage={() => handleMessage(agent)}
                onViewProfile={() => handleViewProfile(agent)}
                stackIndex={i}
              />
            ))}

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
                  className="w-80 p-3 max-h-80 overflow-y-auto"
                >
                  <p className="text-xs font-semibold text-muted-foreground mb-2 uppercase tracking-wide">
                    Todos online ({onlineUsers.length})
                  </p>
                  <div className="grid gap-1">
                    {onlineUsers.map((agent) => (
                      <div
                        key={agent.user_id}
                        className="flex items-center gap-3 p-2 rounded-lg hover:bg-accent/50 transition-colors"
                      >
                        <div className="relative flex-shrink-0">
                          <Avatar className="h-9 w-9 border border-border">
                            <AvatarImage src={agent.avatar_url || undefined} alt={agent.name} />
                            <AvatarFallback className="text-xs bg-primary/10 text-primary font-semibold">
                              {agent.name.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase()}
                            </AvatarFallback>
                          </Avatar>
                          <span className="absolute bottom-0 right-0 h-2 w-2 rounded-full bg-emerald-500 border-2 border-background" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-medium truncate text-foreground">{agent.name}</p>
                          {(agent.agency_name || agent.city) && (
                            <p className="text-xs text-muted-foreground truncate">
                              {[agent.agency_name, agent.city].filter(Boolean).join(" · ")}
                            </p>
                          )}
                        </div>
                        <div className="flex-shrink-0">
                          <AgentActions
                            agent={agent}
                            compact
                            onViewProfile={() => handleViewProfile(agent)}
                            onMessage={() => handleMessage(agent)}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </PopoverContent>
              </Popover>
            )}
          </div>
        </>
      )}

      <div className="h-5 w-px bg-border" />

      <Tooltip>
        <TooltipTrigger asChild>
          <div className="flex items-center gap-1.5">
            <Switch
              checked={effectiveIsOnline}
              onCheckedChange={handleToggle}
              disabled={!restrictedMode && isOnlineLoading}
              className="h-5 w-9 data-[state=checked]:bg-emerald-500 data-[state=unchecked]:bg-muted [&>span]:h-4 [&>span]:w-4 [&>span]:data-[state=checked]:translate-x-4"
            />
            <span className={`text-xs font-medium ${effectiveIsOnline ? "text-emerald-600" : "text-muted-foreground"}`}>
              {effectiveIsOnline ? "On" : "Off"}
            </span>
          </div>
        </TooltipTrigger>
        <TooltipContent>
          <p>{restrictedMode ? "Disponível em planos pagos — clique para fazer upgrade" : (effectiveIsOnline ? "Você está visível para outros agentes" : "Você está invisível")}</p>
        </TooltipContent>
      </Tooltip>
    </div>
    <UpgradeDialog
      open={upgradeOpen}
      onOpenChange={setUpgradeOpen}
      requiredFeature="community"
      title="Recurso exclusivo dos planos pagos"
      description="Para ficar online, ver perfis e enviar mensagens para outros agentes, faça upgrade do seu plano."
    />
    </>
  );
}
