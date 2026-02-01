import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { 
  Trophy, 
  Settings, 
  Crown, 
  DollarSign, 
  TrendingUp, 
  Gift,
  CheckCircle,
  AlertCircle,
} from "lucide-react";
import { 
  usePromoterSettings, 
  useUpdatePromoterSettings, 
  useMonthlyRanking, 
  useMonthlyWinner,
  useConfirmWinner,
} from "@/hooks/usePromoterRanking";
import { MONTH_NAMES, RankingCriteria } from "@/types/promoter";
import { HistoricalWinners } from "@/components/promoter/HistoricalWinners";
import { Skeleton } from "@/components/ui/skeleton";

export function AdminPromoterManager() {
  const currentDate = new Date();
  const [selectedMonth, setSelectedMonth] = useState(currentDate.getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState(currentDate.getFullYear());
  const [confirmDialogOpen, setConfirmDialogOpen] = useState(false);
  const [selectedWinner, setSelectedWinner] = useState<{
    userId: string;
    name: string;
    salesCount: number;
    revenue: number;
  } | null>(null);

  const { data: settings, isLoading: settingsLoading } = usePromoterSettings();
  const updateSettings = useUpdatePromoterSettings();
  const { data: ranking, isLoading: rankingLoading } = useMonthlyRanking(selectedMonth, selectedYear);
  const { data: currentWinner } = useMonthlyWinner(selectedMonth, selectedYear);
  const confirmWinner = useConfirmWinner();

  const [prizeForm, setPrizeForm] = useState({
    name: "",
    description: "",
    imageUrl: "",
  });

  const years = Array.from({ length: 5 }, (_, i) => currentDate.getFullYear() - i);

  const sortedRanking = [...(ranking || [])].sort((a, b) => {
    if (settings?.ranking_criteria === 'revenue') {
      return b.total_revenue - a.total_revenue;
    }
    return b.sales_count - a.sales_count;
  });

  const handleCriteriaChange = (value: RankingCriteria) => {
    updateSettings.mutate({ ranking_criteria: value });
  };

  const handleSavePrize = () => {
    updateSettings.mutate({
      current_month_prize_name: prizeForm.name || null,
      current_month_prize_description: prizeForm.description || null,
      current_month_prize_image_url: prizeForm.imageUrl || null,
    });
  };

  const handleConfirmWinner = () => {
    if (!selectedWinner) return;

    confirmWinner.mutate({
      userId: selectedWinner.userId,
      month: selectedMonth,
      year: selectedYear,
      criteria: settings?.ranking_criteria || 'sales_count',
      salesCount: selectedWinner.salesCount,
      revenue: selectedWinner.revenue,
      prizeName: settings?.current_month_prize_name || prizeForm.name,
      prizeDescription: settings?.current_month_prize_description || prizeForm.description,
      prizeImageUrl: settings?.current_month_prize_image_url || prizeForm.imageUrl,
    }, {
      onSuccess: () => setConfirmDialogOpen(false),
    });
  };

  return (
    <div className="space-y-6">
      {/* Settings Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5" />
            Configurações do Ranking
          </CardTitle>
          <CardDescription>
            Defina o critério de ranking e o prêmio do mês
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {settingsLoading ? (
            <div className="space-y-4">
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
            </div>
          ) : (
            <>
              <div className="space-y-2">
                <Label>Critério de Ranking</Label>
                <Select
                  value={settings?.ranking_criteria || 'sales_count'}
                  onValueChange={(v) => handleCriteriaChange(v as RankingCriteria)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="sales_count">
                      <div className="flex items-center gap-2">
                        <TrendingUp className="h-4 w-4" />
                        Número de Vendas
                      </div>
                    </SelectItem>
                    <SelectItem value="revenue">
                      <div className="flex items-center gap-2">
                        <DollarSign className="h-4 w-4" />
                        Receita Gerada
                      </div>
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="border-t pt-4 space-y-4">
                <h4 className="font-medium flex items-center gap-2">
                  <Gift className="h-4 w-4" />
                  Prêmio do Mês Atual
                </h4>
                <div className="grid gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="prize-name">Nome do Prêmio</Label>
                    <Input
                      id="prize-name"
                      placeholder="Ex: Vale-presente R$ 500"
                      defaultValue={settings?.current_month_prize_name || ""}
                      onChange={(e) => setPrizeForm(p => ({ ...p, name: e.target.value }))}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="prize-desc">Descrição</Label>
                    <Textarea
                      id="prize-desc"
                      placeholder="Descrição detalhada do prêmio..."
                      defaultValue={settings?.current_month_prize_description || ""}
                      onChange={(e) => setPrizeForm(p => ({ ...p, description: e.target.value }))}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="prize-image">URL da Imagem (opcional)</Label>
                    <Input
                      id="prize-image"
                      placeholder="https://..."
                      defaultValue={settings?.current_month_prize_image_url || ""}
                      onChange={(e) => setPrizeForm(p => ({ ...p, imageUrl: e.target.value }))}
                    />
                  </div>
                  <Button onClick={handleSavePrize} disabled={updateSettings.isPending}>
                    Salvar Prêmio
                  </Button>
                </div>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Monthly Winner Selection */}
      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Crown className="h-5 w-5 text-yellow-500" />
                Definir Vencedor do Mês
              </CardTitle>
              <CardDescription>
                Selecione o período e confirme o vencedor
              </CardDescription>
            </div>
            <div className="flex gap-2">
              <Select
                value={selectedMonth.toString()}
                onValueChange={(v) => setSelectedMonth(parseInt(v))}
              >
                <SelectTrigger className="w-[140px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {MONTH_NAMES.map((name, index) => (
                    <SelectItem key={index} value={(index + 1).toString()}>
                      {name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select
                value={selectedYear.toString()}
                onValueChange={(v) => setSelectedYear(parseInt(v))}
              >
                <SelectTrigger className="w-[100px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {years.map((year) => (
                    <SelectItem key={year} value={year.toString()}>
                      {year}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {currentWinner?.is_confirmed && (
            <div className="mb-4 p-4 bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-800 rounded-lg">
              <div className="flex items-center gap-2 text-green-700 dark:text-green-300">
                <CheckCircle className="h-5 w-5" />
                <span className="font-medium">
                  Vencedor já confirmado para {MONTH_NAMES[selectedMonth - 1]} {selectedYear}
                </span>
              </div>
            </div>
          )}

          {rankingLoading ? (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <div key={i} className="flex items-center gap-4 p-3 border rounded-lg">
                  <Skeleton className="h-10 w-10 rounded-full" />
                  <Skeleton className="h-4 flex-1" />
                </div>
              ))}
            </div>
          ) : sortedRanking.length === 0 ? (
            <div className="text-center py-8">
              <AlertCircle className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
              <p className="text-muted-foreground">
                Nenhuma venda registrada neste período.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {sortedRanking.slice(0, 10).map((user, index) => {
                const isCurrentWinner = currentWinner?.user_id === user.user_id && currentWinner?.is_confirmed;
                
                return (
                  <div
                    key={user.user_id}
                    className={`flex items-center gap-4 p-3 border rounded-lg transition-colors ${
                      index === 0 ? "border-yellow-300 bg-yellow-50 dark:bg-yellow-950/20" : ""
                    }`}
                  >
                    <span className={`w-6 text-center font-bold ${index === 0 ? "text-yellow-600" : "text-muted-foreground"}`}>
                      {index + 1}º
                    </span>

                    <Avatar className="h-10 w-10">
                      <AvatarImage src={user.avatar_url || undefined} />
                      <AvatarFallback>
                        {user.user_name
                          .split(" ")
                          .map((n) => n[0])
                          .join("")
                          .slice(0, 2)
                          .toUpperCase()}
                      </AvatarFallback>
                    </Avatar>

                    <div className="flex-1">
                      <p className="font-medium">{user.user_name}</p>
                      <div className="flex gap-3 text-xs text-muted-foreground">
                        <span>{user.sales_count} vendas</span>
                        <span>R$ {user.total_revenue.toLocaleString("pt-BR")}</span>
                      </div>
                    </div>

                    {isCurrentWinner ? (
                      <Badge className="bg-green-100 text-green-700">
                        <Trophy className="h-3 w-3 mr-1" />
                        Campeão
                      </Badge>
                    ) : (
                      <Dialog open={confirmDialogOpen && selectedWinner?.userId === user.user_id} onOpenChange={setConfirmDialogOpen}>
                        <DialogTrigger asChild>
                          <Button
                            size="sm"
                            variant={index === 0 ? "default" : "outline"}
                            onClick={() => setSelectedWinner({
                              userId: user.user_id,
                              name: user.user_name,
                              salesCount: user.sales_count,
                              revenue: user.total_revenue,
                            })}
                          >
                            <Crown className="h-4 w-4 mr-1" />
                            Confirmar
                          </Button>
                        </DialogTrigger>
                        <DialogContent>
                          <DialogHeader>
                            <DialogTitle className="flex items-center gap-2">
                              <Trophy className="h-5 w-5 text-yellow-500" />
                              Confirmar Vencedor
                            </DialogTitle>
                          </DialogHeader>
                          <div className="py-4">
                            <p className="mb-4">
                              Confirmar <strong>{selectedWinner?.name}</strong> como Top Promotor de{" "}
                              <strong>{MONTH_NAMES[selectedMonth - 1]} {selectedYear}</strong>?
                            </p>
                            <div className="flex gap-2">
                              <Badge variant="secondary">
                                {selectedWinner?.salesCount} vendas
                              </Badge>
                              <Badge variant="secondary">
                                R$ {selectedWinner?.revenue.toLocaleString("pt-BR")}
                              </Badge>
                            </div>
                            {settings?.current_month_prize_name && (
                              <div className="mt-4 p-3 bg-muted rounded-lg">
                                <p className="text-sm">
                                  <strong>Prêmio:</strong> {settings.current_month_prize_name}
                                </p>
                              </div>
                            )}
                          </div>
                          <DialogFooter>
                            <Button variant="outline" onClick={() => setConfirmDialogOpen(false)}>
                              Cancelar
                            </Button>
                            <Button onClick={handleConfirmWinner} disabled={confirmWinner.isPending}>
                              <CheckCircle className="h-4 w-4 mr-2" />
                              Confirmar Vencedor
                            </Button>
                          </DialogFooter>
                        </DialogContent>
                      </Dialog>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Historical Winners */}
      <HistoricalWinners />
    </div>
  );
}
