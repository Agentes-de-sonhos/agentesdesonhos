import { Check, UserPlus, X } from "lucide-react";
import { DropdownMenuItem } from "@/components/ui/dropdown-menu";
import { useCommunityNetwork } from "@/hooks/useCommunityNetwork";

interface ConnectMenuItemProps {
  targetUserId: string;
  targetName?: string | null;
}

/**
 * Ação de conexão dentro do menu de três pontos, complementando o botão compacto
 * do cabeçalho. Some quando já existe conexão aceita.
 */
export function ConnectMenuItem({ targetUserId, targetName }: ConnectMenuItemProps) {
  const { currentUserId, getRelation, sendRequest, cancelRequest, respondRequest, isMutating } =
    useCommunityNetwork();

  if (!currentUserId || currentUserId === targetUserId) return null;

  const relation = getRelation(targetUserId);
  if (relation.state === "accepted") return null;

  const name = targetName?.trim() || "este membro";

  if (relation.state === "pending_sent") {
    return (
      <DropdownMenuItem
        disabled={isMutating}
        data-connect-menu="pending_sent"
        onSelect={(event) => {
          event.preventDefault();
          if (relation.connectionId) cancelRequest(relation.connectionId);
        }}
      >
        <X className="mr-2 h-4 w-4" /> Cancelar solicitação
      </DropdownMenuItem>
    );
  }

  if (relation.state === "pending_received") {
    return (
      <>
        <DropdownMenuItem
          disabled={isMutating}
          data-connect-menu="accept"
          onSelect={(event) => {
            event.preventDefault();
            if (relation.connectionId)
              respondRequest({ connectionId: relation.connectionId, accept: true });
          }}
        >
          <Check className="mr-2 h-4 w-4" /> Aceitar conexão
        </DropdownMenuItem>
        <DropdownMenuItem
          disabled={isMutating}
          data-connect-menu="reject"
          onSelect={(event) => {
            event.preventDefault();
            if (relation.connectionId)
              respondRequest({ connectionId: relation.connectionId, accept: false });
          }}
        >
          <X className="mr-2 h-4 w-4" /> Recusar conexão
        </DropdownMenuItem>
      </>
    );
  }

  return (
    <DropdownMenuItem
      disabled={isMutating}
      data-connect-menu="connect"
      onSelect={(event) => {
        event.preventDefault();
        sendRequest(targetUserId);
      }}
    >
      <UserPlus className="mr-2 h-4 w-4" /> Conectar com {name}
    </DropdownMenuItem>
  );
}
