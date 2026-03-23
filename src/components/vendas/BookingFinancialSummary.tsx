import { Card, CardContent } from "@/components/ui/card";
import { TrendingUp, TrendingDown, DollarSign, Percent } from "lucide-react";

interface Summary {
  totalSold: number;
  totalCost: number;
  totalCommission: number;
  commissionReceived: number;
  totalPaid: number;
  totalPayments: number;
  profit: number;
}

interface Props {
  summary: Summary;
}

const fmt = (v: number) => v.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

export function BookingFinancialSummary({ summary }: Props) {
  const items = [
    { label: "Total Vendido", value: summary.totalSold, icon: DollarSign, color: "text-primary", bgColor: "bg-primary/10" },
    { label: "Custo Total", value: summary.totalCost, icon: TrendingDown, color: "text-red-500", bgColor: "bg-red-50 dark:bg-red-900/10" },
    { label: "Lucro Estimado", value: summary.profit, icon: TrendingUp, color: summary.profit >= 0 ? "text-emerald-600" : "text-red-500", bgColor: summary.profit >= 0 ? "bg-emerald-50 dark:bg-emerald-900/10" : "bg-red-50 dark:bg-red-900/10" },
    { label: "Comissão Total", value: summary.totalCommission, icon: Percent, color: "text-violet-600", bgColor: "bg-violet-50 dark:bg-violet-900/10" },
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
      {items.map((item) => (
        <Card key={item.label} className="border-0 shadow-sm">
          <CardContent className="py-4 px-4">
            <div className="flex items-center gap-3">
              <div className={`p-2 rounded-lg ${item.bgColor}`}>
                <item.icon className={`h-4 w-4 ${item.color}`} />
              </div>
              <div>
                <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">{item.label}</p>
                <p className={`text-lg font-bold ${item.color}`}>R$ {fmt(item.value)}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
