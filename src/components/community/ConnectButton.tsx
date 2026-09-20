import { Check, Clock, Loader2, UserPlus, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { useCommunityNetwork } from "@/hooks/useCommunityNetwork";

interface ConnectButtonProps {
  targetUserId: string;
  /** Usado apenas para rótulos acessíveis. */
  targetName?: string | null;
  className?: string;
}

/**
 * Botão compacto de conexão reutilizado pelo feed do dashboard, pela página
 * completa da Comunidade e por Minha Rede.
 */
export function ConnectButton({ targetUserId, targetName, className }: ConnectButtonProps) {
  const { currentUserId, getRelation, sendRequest, cancelRequest, respondRequest, isMutating } =
    useCommunityNetwork();

  if (!currentUserId || currentUserId === targetUserId) return null;

  const relation = getRelation(targetUserId);
  if (relation.state === "accepted") return null;

  const person = targetName ? ` com ${targetName}` : "";

  if (relation.state === "pending_sent") {
    return (
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            type="button"
            size="sm"
            variant="ghost"
            disabled={isMutating}
            aria-label={`Cancelar solicitação de conexão${person}`}
            onClick={(event) => {
              event.preventDefault();
              event.stopPropagation();
              if (relation.connectionId) cancelRequest(relation.connectionId);
            }}
            className={cn("h-8 gap-1 px-2 text-xs text-muted-foreground", className)}
            data-connect-state="pending_sent"
          >
            {isMutating ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Clock className="h-3.5 w-3.5" />}
            Pendente
          </Button>
        </TooltipTrigger>
        <TooltipContent>Cancelar solicitação</TooltipContent>
      </Tooltip>
    );
  }

  if (relation.state === "pending_received") {
    return (
      <div className={cn("flex items-center gap-1", className)} data-connect-state="pending_received">
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              type="button"
              size="sm"
              variant="secondary"
              disabled={isMutating}
              aria-label={`Aceitar conexão${person}`}
              onClick={(event) => {
                event.preventDefault();
                event.stopPropagation();
                if (relation.connectionId)
                  respondRequest({ connectionId: relation.connectionId, accept: true });
              }}
              className="h-8 gap-1 px-2 text-xs"
            >
              <Check className="h-3.5 w-3.5" />
              Aceitar
            </Button>
          </TooltipTrigger>
          <TooltipContent>Aceitar solicitação</TooltipContent>
        </Tooltip>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              type="button"
              size="icon"
              variant="ghost"
              disabled={isMutating}
              aria-label={`Recusar conexão${person}`}
              onClick={(event) => {
                event.preventDefault();
                event.stopPropagation();
                if (relation.connectionId)
                  respondRequest({ connectionId: relation.connectionId, accept: false });
              }}
              className="h-8 w-8 text-muted-foreground"
            >
              <X className="h-3.5 w-3.5" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>Recusar solicitação</TooltipContent>
        </Tooltip>
      </div>
    );
  }

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button
          type="button"
          size="sm"
          variant="outline"
          disabled={isMutating}
          aria-label={`Conectar${person}`}
          onClick={(event) => {
            event.preventDefault();
            event.stopPropagation();
            sendRequest(targetUserId);
          }}
          className={cn("h-8 gap-1 px-2 text-xs", className)}
          data-connect-state="none"
        >
          {isMutating ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <UserPlus className="h-3.5 w-3.5" />}
          Conectar
        </Button>
      </TooltipTrigger>
      <TooltipContent>Enviar solicitação de conexão</TooltipContent>
    </Tooltip>
  );
}
