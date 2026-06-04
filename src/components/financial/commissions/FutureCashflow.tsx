import { useMemo } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { CalendarClock } from "lucide-react";
import { CommissionReceivable } from "@/hooks/useCommissionsReceivable";
import { fmt, isActive, isReceived, todayStr } from "./utils";

const MONTH_NAMES = ["Janeiro","Fevereiro","Março","Abril","Maio","Junho","Julho","Agosto","Setembro","Outubro","Novembro","Dezembro"];

export function FutureCashflow({ commissions }: { commissions: CommissionReceivable[] }) {
  const today = todayStr();

  const grouped = useMemo(() => {
    const map = new Map<string, { key: string; label: string; total: number; bySupplier: Map<string, number>; count: number }>();
    commissions
      .filter(c => isActive(c) && !isReceived(c) && c.expected_date && c.expected_date >= today)
      .forEach(c => {
        const d = new Date(c.expected_date! + "T00:00:00");
        const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
        const label = `${MONTH_NAMES[d.getMonth()]} ${d.getFullYear()}`;
        if (!map.has(key)) {
          map.set(key, { key, label, total: 0, bySupplier: new Map(), count: 0 });
        }
        const m = map.get(key)!;
        m.total += c.commission_amount;
        m.count += 1;
        const sup = c.supplier_name || "Sem fornecedor";
        m.bySupplier.set(sup, (m.bySupplier.get(sup) || 0) + c.commission_amount);
      });
    return Array.from(map.values()).sort((a, b) => a.key.localeCompare(b.key));
  }, [commissions, today]);

  if (grouped.length === 0) {
    return (
      <Card>
        <CardContent className="p-10 text-center space-y-2">
          <CalendarClock className="h-8 w-8 mx-auto text-muted-foreground/60" />
          <p className="text-sm font-medium">Nenhum recebimento previsto para este período.</p>
          <p className="text-xs text-muted-foreground">
            Cadastre vendas com previsão de pagamento para visualizar aqui o fluxo futuro de comissões.
          </p>
        </CardContent>
      </Card>
    );
  }

  const grandTotal = grouped.reduce((s, g) => s + g.total, 0);

  return (
    <div className="space-y-4">
      <Card>
        <CardContent className="p-4 flex items-center justify-between">
          <div>
            <p className="text-xs text-muted-foreground">Total Previsto (Futuro)</p>
            <p className="text-2xl font-bold text-primary">R$ {fmt(grandTotal)}</p>
          </div>
          <p className="text-xs text-muted-foreground">{grouped.length} mês(es)</p>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {grouped.map(g => {
          const suppliers = Array.from(g.bySupplier.entries()).sort((a, b) => b[1] - a[1]);
          return (
            <Card key={g.key}>
              <CardContent className="p-4">
                <div className="flex items-center justify-between mb-3">
                  <h4 className="font-semibold">{g.label}</h4>
                  <span className="text-xs text-muted-foreground">{g.count} recebimento(s)</span>
                </div>
                <table className="w-full text-sm">
                  <tbody>
                    {suppliers.map(([name, total]) => (
                      <tr key={name} className="border-b last:border-0">
                        <td className="py-1.5 text-foreground">{name}</td>
                        <td className="py-1.5 text-right font-medium">R$ {fmt(total)}</td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr className="border-t-2">
                      <td className="pt-2 font-semibold">Total</td>
                      <td className="pt-2 text-right font-bold text-primary">R$ {fmt(g.total)}</td>
                    </tr>
                  </tfoot>
                </table>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}