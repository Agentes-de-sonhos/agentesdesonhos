import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Trophy } from "lucide-react";

interface ContributorRanking {
  userId: string;
  name: string;
  avatar_url: string | null;
  count: number;
}

interface Props {
  ranking: ContributorRanking[];
}

const MEDAL_COLORS = [
  "ring-2 ring-yellow-400",
  "ring-2 ring-gray-400",
  "ring-2 ring-amber-600",
];

export function BenefitContributorsRanking({ ranking }: Props) {
  if (ranking.length === 0) return null;

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <Trophy className="h-4 w-4 text-yellow-500" />
          Top Contribuidores
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {ranking.map((r, i) => (
          <div key={r.userId} className="flex items-center gap-3">
            <span className="text-sm font-bold text-muted-foreground w-5 text-center">{i + 1}</span>
            <Avatar className={`h-8 w-8 ${i < 3 ? MEDAL_COLORS[i] : ""}`}>
              <AvatarImage src={r.avatar_url || undefined} />
              <AvatarFallback className="text-xs">{r.name?.charAt(0) || "U"}</AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">{r.name}</p>
              <p className="text-xs text-muted-foreground">{r.count} {r.count === 1 ? "benefício" : "benefícios"}</p>
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
