import { useState } from "react";
import { ArrowRightLeft, Check } from "lucide-react";
import {
  DropdownMenuLabel,
  DropdownMenuItem,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";

export interface MoveStageTarget {
  id: string;
  name: string;
  /** Destino bloqueado por permissão de etapa. */
  disabled?: boolean;
}

interface MoveToStageMenuProps {
  targets: MoveStageTarget[];
  currentStageId?: string | null;
  onMoveToStage: (stageId: string) => void | Promise<void>;
}

/**
 * Submenu compartilhado "Mover" para cards de Oportunidade e Operação.
 * A persistência fica no Kanban/Module (mesma lógica do drag and drop).
 */
export function MoveToStageMenu({ targets, currentStageId, onMoveToStage }: MoveToStageMenuProps) {
  const [isMoving, setIsMoving] = useState(false);

  if (!targets.length) return null;

  const handleSelect = async (stageId: string) => {
    if (isMoving) return;
    setIsMoving(true);
    try {
      await onMoveToStage(stageId);
    } finally {
      setIsMoving(false);
    }
  };

  return (
    <DropdownMenuSub>
      <DropdownMenuSubTrigger disabled={isMoving}>
        <ArrowRightLeft className="mr-2 h-4 w-4" /> Mover
      </DropdownMenuSubTrigger>
      <DropdownMenuSubContent
        data-mobile-stage-menu
        sideOffset={6}
        alignOffset={-4}
        collisionPadding={12}
        avoidCollisions
        className="z-[300] w-56 max-h-[min(var(--radix-dropdown-menu-content-available-height),calc(100dvh-max(1rem,env(safe-area-inset-top))-max(1rem,env(safe-area-inset-bottom))))] overflow-y-auto overscroll-contain touch-pan-y max-md:!w-[calc(100vw-1.5rem)]"
      >
        <DropdownMenuLabel className="sticky top-0 z-10 bg-popover text-xs text-muted-foreground">
          Mover para
        </DropdownMenuLabel>
        {targets.map((target) => {
          const isCurrent = !!currentStageId && target.id === currentStageId;
          return (
            <DropdownMenuItem
              key={target.id}
              disabled={isCurrent || target.disabled || isMoving}
              aria-current={isCurrent ? "true" : undefined}
              onSelect={(e) => {
                if (isCurrent || target.disabled || isMoving) {
                  e.preventDefault();
                  return;
                }
                void handleSelect(target.id);
              }}
              className={cn("min-h-11 gap-2 md:min-h-0", isCurrent && "font-medium")}
            >
              <span className="flex-1 truncate">{target.name}</span>
              {isCurrent && (
                <span className="flex items-center gap-1 text-[10px] text-muted-foreground">
                  <Check className="h-3 w-3" /> atual
                </span>
              )}
            </DropdownMenuItem>
          );
        })}
      </DropdownMenuSubContent>
    </DropdownMenuSub>
  );
}
