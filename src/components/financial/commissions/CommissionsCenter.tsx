import { useState } from "react";
import { Loader2, Receipt, FileText, CalendarClock, Trophy } from "lucide-react";
import { cn } from "@/lib/utils";
import { useCommissionsReceivable } from "@/hooks/useCommissionsReceivable";
import { CommissionsReceivable } from "@/components/financial/CommissionsReceivable";
import { EnhancedSummary } from "./EnhancedSummary";
import { InvoicesCenter } from "./InvoicesCenter";
import { FutureCashflow } from "./FutureCashflow";
import { SuppliersRanking } from "./SuppliersRanking";

const SUBTABS = [
  { key: "comissoes", label: "Comissões", icon: Receipt },
  { key: "notas", label: "Notas Fiscais", icon: FileText },
  { key: "futuro", label: "Fluxo Futuro", icon: CalendarClock },
  { key: "ranking", label: "Ranking Fornecedores", icon: Trophy },
] as const;

type SubKey = typeof SUBTABS[number]["key"];

export function CommissionsCenter({ viewMonth, viewYear }: { viewMonth?: number; viewYear?: number }) {
  const [sub, setSub] = useState<SubKey>("comissoes");
  const { data: allCommissions = [], isLoading } = useCommissionsReceivable();

  if (isLoading) {
    return <div className="flex items-center justify-center py-12"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;
  }

  return (
    <div className="space-y-5">
      <EnhancedSummary commissions={allCommissions} />

      <div className="flex items-center gap-1 flex-wrap border-b pb-1">
        {SUBTABS.map(t => {
          const Icon = t.icon;
          const isActive = sub === t.key;
          return (
            <button key={t.key} onClick={() => setSub(t.key)}
              className={cn(
                "flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium transition-colors whitespace-nowrap",
                isActive ? "bg-primary text-primary-foreground shadow-sm" : "text-muted-foreground hover:bg-muted hover:text-foreground",
              )}>
              <Icon className="h-4 w-4" />
              <span>{t.label}</span>
            </button>
          );
        })}
      </div>

      {sub === "comissoes" && <CommissionsReceivable viewMonth={viewMonth} viewYear={viewYear} />}
      {sub === "notas" && <InvoicesCenter commissions={allCommissions} />}
      {sub === "futuro" && <FutureCashflow commissions={allCommissions} />}
      {sub === "ranking" && <SuppliersRanking commissions={allCommissions} />}
    </div>
  );
}