import { useNavigate } from "react-router-dom";
import { useUserRole } from "@/hooks/useUserRole";
import { Button } from "@/components/ui/button";
import { Settings } from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

interface AdminEditButtonProps {
  adminTab: string;
}

export function AdminEditButton({ adminTab }: AdminEditButtonProps) {
  const { isAdmin, loading } = useUserRole();
  const navigate = useNavigate();

  if (loading || !isAdmin) return null;

  return (
    <TooltipProvider delayDuration={200}>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant="outline"
            size="sm"
            className="gap-2 text-xs"
            onClick={() => navigate(`/admin?tab=${adminTab}`)}
          >
            <Settings className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Editar no Admin</span>
          </Button>
        </TooltipTrigger>
        <TooltipContent>
          <p>Ir para o painel administrativo</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
