import { getLevel, getLevelProgress, getNextLevel } from "@/lib/gamification";
import { Progress } from "@/components/ui/progress";

interface LevelProgressProps {
  points: number;
  compact?: boolean;
}

export function LevelProgress({ points, compact = false }: LevelProgressProps) {
  const level = getLevel(points);
  const progress = getLevelProgress(points);
  const next = getNextLevel(points);

  if (compact) {
    return (
      <div className="flex items-center gap-2">
        <span className="text-sm">{level.icon}</span>
        <span className="text-xs font-medium">{level.name}</span>
        <Progress value={progress} className="h-1.5 w-16" />
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-2xl">{level.icon}</span>
          <div>
            <p className="font-semibold text-lg">{level.name}</p>
            <p className="text-xs text-muted-foreground">
              {points.toFixed(0)} pontos
            </p>
          </div>
        </div>
        {next && (
          <div className="text-right">
            <p className="text-xs text-muted-foreground">Próximo nível</p>
            <p className="text-sm font-medium">
              {next.icon} {next.name} ({next.min} pts)
            </p>
          </div>
        )}
      </div>
      <div className="space-y-1">
        <Progress value={progress} className="h-3" />
        <p className="text-xs text-muted-foreground text-right">{progress}%</p>
      </div>
    </div>
  );
}
