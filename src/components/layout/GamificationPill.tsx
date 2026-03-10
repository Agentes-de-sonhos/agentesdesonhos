import { useNavigate } from "react-router-dom";
import { Star, Trophy } from "lucide-react";
import { useGamification } from "@/hooks/useGamification";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

export function GamificationPill() {
  const navigate = useNavigate();
  const { myPoints, ranking, isLoadingRanking } = useGamification();

  const myRank =
    ranking.findIndex((r) => r.total_points <= myPoints) + 1 ||
    ranking.length + 1;

  if (isLoadingRanking) {
    return <Skeleton className="h-7 w-24 rounded-full" />;
  }

  return (
    <TooltipProvider delayDuration={300}>
      <Tooltip>
        <TooltipTrigger asChild>
          <button
            onClick={() => navigate("/gamificacao")}
            className="flex items-center gap-2 bg-purple-600 rounded-full px-3 py-1.5 text-xs cursor-pointer hover:bg-purple-700 transition-colors"
          >
            <span className="flex items-center gap-1">
              <Star className="h-3.5 w-3.5 text-yellow-400" />
              <span className="font-semibold text-white/90">
                {myPoints.toFixed(0)} pts
              </span>
            </span>
            <span className="w-px h-3 bg-white/30" />
            <span className="flex items-center gap-1">
              <Trophy className="h-3.5 w-3.5 text-yellow-400" />
              <span className="text-white/70">#{myRank}º</span>
            </span>
          </button>
        </TooltipTrigger>
        <TooltipContent>
          <p>Ver ranking e gamificação</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
