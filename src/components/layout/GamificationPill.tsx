import { useNavigate } from "react-router-dom";
import { Star, Trophy } from "lucide-react";
import { useGamificationLite } from "@/hooks/useGamificationLite";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

export function GamificationPill() {
  const navigate = useNavigate();
  const { myPoints, level } = useGamificationLite();

  return (
    <TooltipProvider delayDuration={300}>
      <Tooltip>
        <TooltipTrigger asChild>
          <button
            onClick={() => navigate("/gamificacao")}
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
          <p>{level.icon} {level.name} · Ver gamificação</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
