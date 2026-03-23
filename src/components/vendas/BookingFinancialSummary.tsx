import { Card, CardContent } from "@/components/ui/card";
import { TrendingUp, TrendingDown, DollarSign, Percent, Building2, Landmark, AlertTriangle } from "lucide-react";

interface Summary {
  totalSold: number;
  totalCost: number;
  totalCommission: number;
  commissionReceived: number;
  totalPaid: number;
  totalPayments: number;
  profit: number;
  receivedByAgency: number;
  paidDirectToSupplier: number;
  commissionPending: number;
  overdueCommissions: number;
  servicesWithoutCommission: number;
  upcomingPayments: number;
}

interface Props {
  summary: Summary;
}

const fmt = (v: number) => v.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

export function BookingFinancialSummary({ summary }: Props) {
  const mainItems = [
    { label: "Total Vendido", value: summary.totalSold, icon: DollarSign, color: "text-primary", bgColor: "bg-primary/10" },
    { label: "Recebido pela Agência", value: summary.receivedByAgency, icon: Landmark, color: "text-blue-600", bgColor: "bg-blue-50 dark:bg-blue-900/10" },
    { label: "Direto ao Fornecedor", value: summary.paidDirectToSupplier, icon: Building2, color: "text-muted-foreground", bgColor: "bg-muted" },
    { label: "Lucro Estimado", value: summary.profit, icon: TrendingUp, color: summary.profit >= 0 ? "text-emerald-600" : "text-red-500", bgColor: summary.profit >= 0 ? "bg-emerald-50 dark:bg-emerald-900/10" : "bg-red-50 dark:bg-red-900/10" },
    { label: "Comissão Recebida", value: summary.commissionReceived, icon: Percent, color: "text-emerald-600", bgColor: "bg-emerald-50 dark:bg-emerald-900/10" },
    { label: "Comissão a Receber", value: summary.commissionPending, icon: Percent, color: "text-violet-600", bgColor: "bg-violet-50 dark:bg-violet-900/10" },
  ];

  const alerts: { text: string; type: "warning" | "danger" }[] = [];
  if (summary.overdueCommissions > 0) alerts.push({ text: `${summary.overdueCommissions} comissão(ões) com data vencida`, type: "danger" });
  if (summary.servicesWithoutCommission > 0) alerts.push({ text: `${summary.servicesWithoutCommission} serviço(s) sem comissão definida`, type: "warning" });
  if (summary.upcomingPayments > 0) alerts.push({ text: `${summary.upcomingPayments} pagamento(s) próximo(s) do vencimento`, type: "warning" });

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        {mainItems.map((item) => (
          <Card key={item.label} className="border-0 shadow-sm">
            <CardContent className="py-3 px-3">
              <div className="flex items-center gap-2">
                <div className={`p-1.5 rounded-lg ${item.bgColor}`}>
                  <item.icon className={`h-3.5 w-3.5 ${item.color}`} />
                </div>
                <div className="min-w-0">
                  <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider truncate">{item.label}</p>
                  <p className={`text-sm font-bold ${item.color}`}>R$ {fmt(item.value)}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {alerts.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {alerts.map((alert, i) => (
            <div
              key={i}
              className={`flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-full font-medium ${
                alert.type === "danger"
                  ? "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400"
                  : "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400"
              }`}
            >
              <AlertTriangle className="h-3 w-3" />
              {alert.text}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
