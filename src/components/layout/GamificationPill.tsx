import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Star, Trophy } from "lucide-react";
import { useGamificationLite } from "@/hooks/useGamificationLite";
import { UpgradeDialog } from "@/components/subscription/UpgradeDialog";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface GamificationPillProps {
  /** When true, clicking opens the upgrade dialog instead of navigating to /gamificacao */
  restrictedMode?: boolean;
}

export function GamificationPill({ restrictedMode = false }: GamificationPillProps = {}) {
  const navigate = useNavigate();
  const { myPoints, level } = useGamificationLite();
  const [upgradeOpen, setUpgradeOpen] = useState(false);

  const handleClick = () => {
    if (restrictedMode) {
      setUpgradeOpen(true);
      return;
    }
    navigate("/gamificacao");
  };

  return (
    <>
    <TooltipProvider delayDuration={300}>
      <Tooltip>
        <TooltipTrigger asChild>
          <button
            onClick={handleClick}
            className="flex items-center gap-2 bg-purple-600 rounded-full px-3 py-1.5 text-xs cursor-pointer hover:bg-purple-700 transition-colors"
          >
            <span className="hidden sm:inline">{level.icon}</span>
            <span className="flex items-center gap-1">
              <Star className="h-3.5 w-3.5 text-yellow-400" />
              <span className="font-semibold text-white/90">
                {myPoints.toFixed(0)} pts
              </span>
            </span>
          </button>
        </TooltipTrigger>
        <TooltipContent>
          <p>{restrictedMode ? "Disponível em planos pagos — clique para fazer upgrade" : `${level.icon} ${level.name} · Ver gamificação`}</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
    <UpgradeDialog
      open={upgradeOpen}
      onOpenChange={setUpgradeOpen}
      title="Gamificação exclusiva dos planos pagos"
      description="Faça upgrade para acumular pontos, subir de nível e desbloquear conquistas."
    />
    </>
  );
}
