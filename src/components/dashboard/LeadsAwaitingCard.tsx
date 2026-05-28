import { useNavigate } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Inbox, ArrowRight, AlertCircle, CheckCircle2, Sparkles } from "lucide-react";
import { useLeadStats } from "@/hooks/useLeadAlerts";

export function LeadsAwaitingCard() {
  const navigate = useNavigate();
  const stats = useLeadStats();

  const hasPending = stats.novos > 0 || stats.semInteracao > 0;

  return (
    <Card className="border-0 shadow-card">
      <CardContent className="pt-5 pb-5 space-y-4">
        <div className="flex items-start justify-between gap-3">
          <div className="w-fit">
            <h2 className="font-display text-base sm:text-lg font-semibold text-foreground flex items-center gap-2">
              <Inbox className="h-5 w-5 text-amber-600" />
              Leads aguardando atendimento
            </h2>
            <div className="mt-2 h-1 w-full rounded-full bg-amber-600" />
          </div>
          {hasPending && (
            <Badge className="bg-red-100 text-red-700 border border-red-200 animate-pulse">
              Ação necessária
            </Badge>
          )}
        </div>

        <div className="grid grid-cols-3 gap-2">
          <div className="rounded-xl bg-amber-600/10 border border-amber-600/20 px-3 py-3 text-center">
            <div className="flex items-center justify-center gap-1 text-amber-700">
              <Sparkles className="h-3.5 w-3.5" />
              <span className="text-[10px] uppercase tracking-wide font-semibold">Novos</span>
            </div>
            <p className="text-2xl font-bold text-foreground mt-1">{stats.novos}</p>
          </div>
          <div className="rounded-xl bg-orange-600/10 border border-orange-600/20 px-3 py-3 text-center">
            <div className="flex items-center justify-center gap-1 text-orange-700">
              <AlertCircle className="h-3.5 w-3.5" />
              <span className="text-[10px] uppercase tracking-wide font-semibold">Sem interação</span>
            </div>
            <p className="text-2xl font-bold text-foreground mt-1">{stats.semInteracao}</p>
          </div>
          <div className="rounded-xl bg-emerald-600/10 border border-emerald-600/20 px-3 py-3 text-center">
            <div className="flex items-center justify-center gap-1 text-emerald-700">
              <CheckCircle2 className="h-3.5 w-3.5" />
              <span className="text-[10px] uppercase tracking-wide font-semibold">Hoje</span>
            </div>
            <p className="text-2xl font-bold text-foreground mt-1">{stats.atendidosHoje}</p>
          </div>
        </div>

        <Button
          variant="ghost"
          className="w-full text-amber-700 hover:text-amber-800 hover:bg-amber-600/5"
          onClick={() => navigate("/meus-leads")}
        >
          Abrir central de leads
          <ArrowRight className="h-4 w-4 ml-2" />
        </Button>
      </CardContent>
    </Card>
  );
}