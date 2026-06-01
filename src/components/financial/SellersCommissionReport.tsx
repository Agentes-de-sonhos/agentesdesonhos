import { useEffect, useMemo, useState } from "react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  Users, DollarSign, BarChart3, Wallet, Search, ChevronDown, ChevronRight,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useFinancial } from "@/hooks/useFinancial";
import { useSellers } from "@/hooks/useSellers";
import { parseLocalDateSafe } from "@/lib/dateParsing";
import {
  ExportButton, ExportModal, type ExportFormat,
} from "@/components/financial/ExportModal";
import {
  exportFinancialData, prepareSellerCommissionsExport, type SellerCommissionRow,
} from "@/utils/financialExport";
import { useAgencyName } from "@/hooks/useFinancialExport";
import { cn } from "@/lib/utils";

type StatusFilter = "all" | "paid" | "pending";

const fmtBRL = (v: number) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(v);

function shortId(id: string) {
  return id.slice(0, 8).toUpperCase();
}

export function SellersCommissionReport({ viewMonth, viewYear }: { viewMonth?: number; viewYear?: number } = {}) {
  const { sales, expenseEntries } = useFinancial();
  const { sellers } = useSellers();
  const agencyName = useAgencyName();

  // Default period = mês corrente
  const now = new Date();
  const defaultStart = format(new Date(now.getFullYear(), now.getMonth(), 1), "yyyy-MM-dd");
  const defaultEnd = format(new Date(now.getFullYear(), now.getMonth() + 1, 0), "yyyy-MM-dd");

  const [startDate, setStartDate] = useState(defaultStart);
  const [endDate, setEndDate] = useState(defaultEnd);

  // Sync date range with the global month/year selector when provided.
  useEffect(() => {
    if (!viewMonth || !viewYear) return;
    const s = format(new Date(viewYear, viewMonth - 1, 1), "yyyy-MM-dd");
    const e = format(new Date(viewYear, viewMonth, 0), "yyyy-MM-dd");
    setStartDate(s);
    setEndDate(e);
  }, [viewMonth, viewYear]);
  const [sellerFilter, setSellerFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [clientSearch, setClientSearch] = useState("");
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});
  const [showExport, setShowExport] = useState(false);

  // Index of commission-payment expenses by sale_id (1st match)
  const commissionPaymentBySale = useMemo(() => {
    const map = new Map<string, { entry_date: string; amount: number }>();
    expenseEntries.forEach((e: any) => {
      if (e.category === "comissao" && e.sale_id && !map.has(e.sale_id)) {
        map.set(e.sale_id, { entry_date: e.entry_date, amount: Number(e.amount) });
      }
    });
    return map;
  }, [expenseEntries]);

  const rows: SellerCommissionRow[] = useMemo(() => {
    const start = parseLocalDateSafe(startDate);
    const end = parseLocalDateSafe(endDate);
    if (!start || !end) return [];

    return sales
      .filter((s: any) => {
        if (!s.seller_id) return false;
        const pct = Number((s as any).seller_commission_percent);
        if (!pct || pct <= 0) return false;
        const d = parseLocalDateSafe(s.sale_date);
        if (!d || d < start || d > end) return false;
        if (sellerFilter !== "all" && s.seller_id !== sellerFilter) return false;
        if (clientSearch.trim()) {
          const q = clientSearch.trim().toLowerCase();
          if (!s.client_name?.toLowerCase().includes(q)) return false;
        }
        return true;
      })
      .map((s: any) => {
        const seller = sellers.find(sl => sl.id === s.seller_id);
        const pct = Number((s as any).seller_commission_percent) || 0;
        const sale_amount = Number(s.sale_amount) || 0;
        const commission_amount = sale_amount * pct / 100;
        const paid = commissionPaymentBySale.get(s.id);
        return {
          seller_name: seller?.name || "Vendedor removido",
          sale_date: s.sale_date,
          client: s.client_name || "—",
          sale_number: shortId(s.id),
          destination: s.destination || "",
          sale_amount,
          commission_percent: pct,
          commission_amount,
          status: paid ? "Paga" : "Pendente",
          payment_date: paid ? paid.entry_date : null,
        } as SellerCommissionRow;
      })
      .filter(r => {
        if (statusFilter === "paid") return r.status === "Paga";
        if (statusFilter === "pending") return r.status === "Pendente";
        return true;
      })
      .sort((a, b) =>
        a.seller_name.localeCompare(b.seller_name, "pt-BR") ||
        a.sale_date.localeCompare(b.sale_date)
      );
  }, [sales, sellers, commissionPaymentBySale, startDate, endDate, sellerFilter, statusFilter, clientSearch]);

  const summary = useMemo(() => {
    const totalCommission = rows.reduce((s, r) => s + r.commission_amount, 0);
    const totalSold = rows.reduce((s, r) => s + r.sale_amount, 0);
    const paid = rows.filter(r => r.status === "Paga").reduce((s, r) => s + r.commission_amount, 0);
    const pending = totalCommission - paid;
    const sellerCount = new Set(rows.map(r => r.seller_name)).size;
    const avg = rows.length ? totalCommission / rows.length : 0;
    return { totalCommission, totalSold, paid, pending, sellerCount, count: rows.length, avg };
  }, [rows]);

  const grouped = useMemo(() => {
    const map: Record<string, SellerCommissionRow[]> = {};
    rows.forEach(r => { (map[r.seller_name] ||= []).push(r); });
    return Object.entries(map).sort(([a], [b]) => a.localeCompare(b, "pt-BR"));
  }, [rows]);

  const handleExport = async (period: { start: Date; end: Date }, fmt: ExportFormat) => {
    // re-aplica o intervalo escolhido no modal usando as mesmas regras
    const filtered = rows.filter(r => {
      const d = parseLocalDateSafe(r.sale_date);
      return d && d >= period.start && d <= period.end;
    });
    const config = prepareSellerCommissionsExport(filtered, period);
    await exportFinancialData(
      { ...config, tabLabel: "Comissoes Vendedores", period, agencyName },
      fmt,
    );
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-2">
          <BarChart3 className="h-5 w-5 text-muted-foreground" />
          <h3 className="text-lg font-semibold">Relatório de Comissões</h3>
        </div>
        <ExportButton onClick={() => setShowExport(true)} />
      </div>

      {/* Resumo */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <SummaryCard
          icon={DollarSign}
          label="Total de Comissões"
          value={fmtBRL(summary.totalCommission)}
          sub={`${fmtBRL(summary.totalSold)} vendido`}
        />
        <SummaryCard
          icon={Users}
          label="Vendas com Comissão"
          value={String(summary.count)}
          sub={`${summary.sellerCount} vendedor(es)`}
        />
        <SummaryCard
          icon={Wallet}
          label="Comissão Média"
          value={fmtBRL(summary.avg)}
          sub="por venda"
        />
        <SummaryCard
          icon={BarChart3}
          label="Pago / Pendente"
          value={fmtBRL(summary.paid)}
          valueClassName="text-emerald-600 dark:text-emerald-400"
          sub={`${fmtBRL(summary.pending)} pendente`}
        />
      </div>

      {/* Filtros */}
      <Card>
        <CardContent className="p-4 grid gap-3 md:grid-cols-2 lg:grid-cols-5">
          <div className="space-y-1.5">
            <Label className="text-xs">De</Label>
            <Input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Até</Label>
            <Input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Vendedor</Label>
            <Select value={sellerFilter} onValueChange={setSellerFilter}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                {sellers.map(s => (
                  <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Status</Label>
            <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as StatusFilter)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                <SelectItem value="paid">Pagas</SelectItem>
                <SelectItem value="pending">Pendentes</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Cliente</Label>
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
              <Input
                value={clientSearch}
                onChange={e => setClientSearch(e.target.value)}
                placeholder="Buscar..."
                className="pl-8"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Lista agrupada */}
      {grouped.length === 0 ? (
        <Card>
          <CardContent className="py-10 text-center text-sm text-muted-foreground">
            Nenhuma venda com comissão de vendedor no período selecionado.
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {grouped.map(([seller, items]) => {
            const saleSum = items.reduce((s, r) => s + r.sale_amount, 0);
            const commSum = items.reduce((s, r) => s + r.commission_amount, 0);
            const paidSum = items.filter(r => r.status === "Paga").reduce((s, r) => s + r.commission_amount, 0);
            const pendSum = commSum - paidSum;
            const isCollapsed = collapsed[seller];
            return (
              <Card key={seller}>
                <button
                  onClick={() => setCollapsed(c => ({ ...c, [seller]: !c[seller] }))}
                  className="w-full flex items-center justify-between p-4 hover:bg-muted/40 transition-colors text-left"
                >
                  <div className="flex items-center gap-2">
                    {isCollapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                    <div>
                      <p className="font-semibold">{seller}</p>
                      <p className="text-xs text-muted-foreground">
                        {items.length} venda(s) • {fmtBRL(saleSum)} vendido
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold">{fmtBRL(commSum)}</p>
                    <p className="text-xs text-muted-foreground">
                      <span className="text-emerald-600 dark:text-emerald-400">{fmtBRL(paidSum)} pg</span>
                      {" • "}
                      <span className="text-amber-600 dark:text-amber-400">{fmtBRL(pendSum)} pend</span>
                    </p>
                  </div>
                </button>
                {!isCollapsed && (
                  <div className="overflow-x-auto border-t">
                    <table className="w-full text-sm">
                      <thead className="bg-muted/40 text-xs text-muted-foreground">
                        <tr>
                          <th className="text-left p-2 font-medium">Data</th>
                          <th className="text-left p-2 font-medium">Cliente</th>
                          <th className="text-left p-2 font-medium">Nº Venda</th>
                          <th className="text-left p-2 font-medium">Destino</th>
                          <th className="text-right p-2 font-medium">Valor</th>
                          <th className="text-right p-2 font-medium">%</th>
                          <th className="text-right p-2 font-medium">Comissão</th>
                          <th className="text-center p-2 font-medium">Status</th>
                          <th className="text-left p-2 font-medium">Pagamento</th>
                        </tr>
                      </thead>
                      <tbody>
                        {items.map((r, idx) => {
                          const d = parseLocalDateSafe(r.sale_date);
                          const pd = r.payment_date ? parseLocalDateSafe(r.payment_date) : null;
                          return (
                            <tr key={idx} className="border-t">
                              <td className="p-2 whitespace-nowrap">{d ? format(d, "dd/MM/yyyy") : "—"}</td>
                              <td className="p-2">{r.client}</td>
                              <td className="p-2 font-mono text-xs">{r.sale_number}</td>
                              <td className="p-2 text-muted-foreground">{r.destination || "—"}</td>
                              <td className="p-2 text-right whitespace-nowrap">{fmtBRL(r.sale_amount)}</td>
                              <td className="p-2 text-right">{r.commission_percent.toFixed(1)}%</td>
                              <td className="p-2 text-right whitespace-nowrap font-medium">{fmtBRL(r.commission_amount)}</td>
                              <td className="p-2 text-center">
                                <Badge
                                  variant="outline"
                                  className={cn(
                                    "text-xs",
                                    r.status === "Paga"
                                      ? "border-emerald-600/40 text-emerald-700 dark:text-emerald-400"
                                      : "border-amber-500/40 text-amber-700 dark:text-amber-400"
                                  )}
                                >
                                  {r.status}
                                </Badge>
                              </td>
                              <td className="p-2 whitespace-nowrap text-muted-foreground">
                                {pd ? format(pd, "dd/MM/yyyy") : "—"}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </Card>
            );
          })}

          {/* Rodapé total geral */}
          <Card className="border-primary/30 bg-primary/5">
            <CardContent className="p-4 flex items-center justify-between flex-wrap gap-3">
              <div className="text-xs text-muted-foreground">
                Emitido em {format(new Date(), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
              </div>
              <div className="flex items-center gap-6 text-sm">
                <div>
                  <p className="text-xs text-muted-foreground">Total Vendido</p>
                  <p className="font-bold">{fmtBRL(summary.totalSold)}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Comissão Total</p>
                  <p className="font-bold text-primary">{fmtBRL(summary.totalCommission)}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      <ExportModal
        open={showExport}
        onOpenChange={setShowExport}
        tabName="Comissões"
        onExport={handleExport}
      />
    </div>
  );
}

function SummaryCard({
  icon: Icon, label, value, sub, valueClassName,
}: {
  icon: any; label: string; value: string; sub?: string; valueClassName?: string;
}) {
  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-medium text-muted-foreground">{label}</span>
          <Icon className="h-4 w-4 text-muted-foreground" />
        </div>
        <p className={cn("text-2xl font-bold", valueClassName)}>{value}</p>
        {sub && <p className="text-xs text-muted-foreground mt-1">{sub}</p>}
      </CardContent>
    </Card>
  );
}