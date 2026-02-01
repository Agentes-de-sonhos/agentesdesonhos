import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Trophy, Crown, Gift } from "lucide-react";
import { useMonthlyWinner, usePromoterSettings } from "@/hooks/usePromoterRanking";
import { MONTH_NAMES } from "@/types/promoter";
import { Skeleton } from "@/components/ui/skeleton";

interface TopPromoterCardProps {
  month?: number;
  year?: number;
}

export function TopPromoterCard({ month, year }: TopPromoterCardProps) {
  const currentDate = new Date();
  const targetMonth = month ?? currentDate.getMonth() + 1;
  const targetYear = year ?? currentDate.getFullYear();

  const { data: winner, isLoading: winnerLoading } = useMonthlyWinner(targetMonth, targetYear);
  const { data: settings } = usePromoterSettings();

  if (winnerLoading) {
    return (
      <Card className="border-2 border-yellow-400/50 bg-gradient-to-br from-yellow-50 to-amber-50 dark:from-yellow-950/20 dark:to-amber-950/20">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Trophy className="h-5 w-5 text-yellow-500" />
            Top Promotor do Mês
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-4">
            <Skeleton className="h-16 w-16 rounded-full" />
            <div className="space-y-2">
              <Skeleton className="h-5 w-32" />
              <Skeleton className="h-4 w-24" />
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!winner || !winner.is_confirmed) {
    return (
      <Card className="border-2 border-dashed border-muted-foreground/30">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Trophy className="h-5 w-5 text-muted-foreground" />
            Top Promotor do Mês
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-6">
            <Crown className="h-12 w-12 text-muted-foreground/30 mx-auto mb-3" />
            <p className="text-muted-foreground">
              O vencedor de {MONTH_NAMES[targetMonth - 1]} {targetYear} ainda não foi definido.
            </p>
            {settings?.current_month_prize_name && (
              <div className="mt-4 p-3 bg-primary/5 rounded-lg">
                <p className="text-sm font-medium flex items-center justify-center gap-2">
                  <Gift className="h-4 w-4 text-primary" />
                  Prêmio: {settings.current_month_prize_name}
                </p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    );
  }

  const criteriaLabel = winner.ranking_criteria === 'revenue' ? 'receita' : 'vendas';

  return (
    <Card className="border-2 border-yellow-400/50 bg-gradient-to-br from-yellow-50 to-amber-50 dark:from-yellow-950/20 dark:to-amber-950/20 overflow-hidden">
      <div className="absolute top-0 right-0 w-32 h-32 bg-yellow-400/10 rounded-full -translate-y-1/2 translate-x-1/2" />
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Trophy className="h-5 w-5 text-yellow-500" />
          Top Promotor - {MONTH_NAMES[targetMonth - 1]} {targetYear}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex items-center gap-4">
          <div className="relative">
            <Avatar className="h-16 w-16 border-4 border-yellow-400">
              <AvatarImage src={winner.profile?.avatar_url || undefined} />
              <AvatarFallback className="bg-yellow-100 text-yellow-700 text-xl font-bold">
                {winner.profile?.name
                  ?.split(" ")
                  .map((n) => n[0])
                  .join("")
                  .slice(0, 2)
                  .toUpperCase() || "?"}
              </AvatarFallback>
            </Avatar>
            <div className="absolute -top-2 -right-2 bg-yellow-400 rounded-full p-1">
              <Crown className="h-4 w-4 text-yellow-900" />
            </div>
          </div>

          <div className="flex-1">
            <p className="font-bold text-lg">{winner.profile?.name || "Promotor"}</p>
            <div className="flex flex-wrap gap-2 mt-1">
              <Badge className="bg-yellow-100 text-yellow-700 hover:bg-yellow-200">
                🏆 Campeão
              </Badge>
              <Badge variant="secondary">
                {winner.total_sales_count} vendas
              </Badge>
              <Badge variant="secondary">
                R$ {winner.total_revenue.toLocaleString("pt-BR")}
              </Badge>
            </div>
          </div>
        </div>

        {winner.prize_name && (
          <div className="mt-4 p-3 bg-white/50 dark:bg-black/20 rounded-lg">
            <p className="text-sm font-medium flex items-center gap-2">
              <Gift className="h-4 w-4 text-primary" />
              Prêmio: {winner.prize_name}
            </p>
            {winner.prize_description && (
              <p className="text-xs text-muted-foreground mt-1">
                {winner.prize_description}
              </p>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
