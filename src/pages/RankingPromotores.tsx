import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { TopPromoterCard } from "@/components/promoter/TopPromoterCard";
import { PromoterRankingList } from "@/components/promoter/PromoterRankingList";
import { HistoricalWinners } from "@/components/promoter/HistoricalWinners";
import { Trophy } from "lucide-react";

export default function RankingPromotores() {
  return (
    <DashboardLayout>
      <div className="space-y-8">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-display font-bold text-foreground flex items-center gap-3">
            <Trophy className="h-8 w-8 text-yellow-500" />
            Ranking de Promotores
          </h1>
          <p className="text-muted-foreground mt-1">
            Acompanhe o desempenho dos promotores e veja quem lidera o ranking mensal
          </p>
        </div>

        {/* Top Promoter Highlight */}
        <TopPromoterCard />

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Ranking List - Takes 2/3 on desktop */}
          <div className="lg:col-span-2">
            <PromoterRankingList />
          </div>

          {/* Historical Winners - Takes 1/3 on desktop */}
          <div>
            <HistoricalWinners />
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
