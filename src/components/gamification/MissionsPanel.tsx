import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Target, CheckCircle2 } from "lucide-react";
import type { MissionProgress } from "@/hooks/useGamification";

interface MissionsPanelProps {
  missions: MissionProgress[];
  onComplete: (missionKey: string) => void;
  filter?: "daily" | "weekly" | "strategic";
}

const typeLabels = {
  daily: "Diárias",
  weekly: "Semanais",
  strategic: "Estratégicas",
};

const typeBadgeColors = {
  daily: "bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300",
  weekly: "bg-purple-100 text-purple-700 dark:bg-purple-950 dark:text-purple-300",
  strategic: "bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300",
};

export function MissionsPanel({ missions, onComplete, filter }: MissionsPanelProps) {
  const filtered = filter ? missions.filter((m) => m.mission.type === filter) : missions;

  const grouped = {
    daily: filtered.filter((m) => m.mission.type === "daily"),
    weekly: filtered.filter((m) => m.mission.type === "weekly"),
    strategic: filtered.filter((m) => m.mission.type === "strategic"),
  };

  const renderMission = (mp: MissionProgress) => {
    const { mission, progress, completed } = mp;
    const totalRequired = mission.requirements.reduce((s, r) => s + r.count, 0);
    const totalProgress = mission.requirements.reduce(
      (s, r, i) => s + Math.min(progress[i], r.count),
      0
    );
    const pct = totalRequired > 0 ? Math.round((totalProgress / totalRequired) * 100) : 0;
    const canClaim = !completed && pct >= 100;

    return (
      <div
        key={mission.key}
        className={`p-3 rounded-lg border transition-colors ${
          completed
            ? "bg-green-50 border-green-200 dark:bg-green-950/30 dark:border-green-900"
            : canClaim
            ? "bg-primary/5 border-primary/30 animate-pulse"
            : "bg-muted/30 border-border"
        }`}
      >
        <div className="flex items-start gap-3">
          <span className="text-xl mt-0.5">{mission.icon}</span>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <p className="text-sm font-semibold truncate">{mission.title}</p>
              {completed && <CheckCircle2 className="h-4 w-4 text-green-500 flex-shrink-0" />}
            </div>
            <p className="text-xs text-muted-foreground mb-2">{mission.description}</p>
            {!completed && (
              <div className="space-y-1">
                <Progress value={pct} className="h-2" />
                <div className="flex items-center justify-between">
                  <span className="text-xs text-muted-foreground">
                    {totalProgress}/{totalRequired}
                  </span>
                  <Badge variant="outline" className="text-xs">
                    +{mission.bonusPoints} pts
                  </Badge>
                </div>
              </div>
            )}
            {canClaim && (
              <Button
                size="sm"
                className="mt-2 w-full"
                onClick={() => onComplete(mission.key)}
              >
                🎁 Resgatar Bônus
              </Button>
            )}
            {completed && (
              <p className="text-xs text-green-600 dark:text-green-400 font-medium mt-1">
                ✅ Concluída! +{mission.bonusPoints} pts
              </p>
            )}
          </div>
        </div>
      </div>
    );
  };

  if (filter) {
    return <div className="space-y-3">{filtered.map(renderMission)}</div>;
  }

  return (
    <div className="space-y-6">
      {(["daily", "weekly", "strategic"] as const).map((type) =>
        grouped[type].length > 0 ? (
          <div key={type}>
            <div className="flex items-center gap-2 mb-3">
              <Badge className={typeBadgeColors[type]}>{typeLabels[type]}</Badge>
            </div>
            <div className="space-y-3">{grouped[type].map(renderMission)}</div>
          </div>
        ) : null
      )}
    </div>
  );
}
