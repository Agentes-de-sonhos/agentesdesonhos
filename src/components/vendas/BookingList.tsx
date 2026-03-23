import { useState, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Plus, Trash2, Search, Filter, ChevronRight } from "lucide-react";
import { Booking, BOOKING_STATUSES, STATUS_COLORS } from "@/hooks/useBookings";
import { format } from "date-fns";

interface Props {
  bookings: Booking[];
  paymentsByBooking: Map<string, { paid: number; pending: number }>;
  commissionsByBooking: Map<string, { received: number; pending: number }>;
  onNew: () => void;
  onSelect: (id: string) => void;
  onDelete: (id: string) => void;
}

const fmt = (v: number) => v.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

export function BookingList({ bookings, paymentsByBooking, commissionsByBooking, onNew, onSelect, onDelete }: Props) {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");

  const filtered = useMemo(() => {
    return bookings.filter((b) => {
      if (statusFilter !== "all" && b.status !== statusFilter) return false;
      if (search) {
        const q = search.toLowerCase();
        return (
          b.trip_name.toLowerCase().includes(q) ||
          (b.client?.name || "").toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [bookings, search, statusFilter]);

  // Summary stats
  const totalSales = bookings.reduce((s, b) => s + Number(b.total_amount), 0);
  const totalPaid = Array.from(paymentsByBooking.values()).reduce((s, p) => s + p.paid, 0);
  const totalPending = totalSales - totalPaid;
  const totalCommPending = Array.from(commissionsByBooking.values()).reduce((s, c) => s + c.pending, 0);

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="border-0 shadow-sm bg-primary/5">
          <CardContent className="py-4 px-5">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Total Vendido</p>
            <p className="text-2xl font-bold text-primary mt-1">R$ {fmt(totalSales)}</p>
          </CardContent>
        </Card>
        <Card className="border-0 shadow-sm bg-emerald-50 dark:bg-emerald-900/10">
          <CardContent className="py-4 px-5">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Recebido</p>
            <p className="text-2xl font-bold text-emerald-600 dark:text-emerald-400 mt-1">R$ {fmt(totalPaid)}</p>
          </CardContent>
        </Card>
        <Card className="border-0 shadow-sm bg-amber-50 dark:bg-amber-900/10">
          <CardContent className="py-4 px-5">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">A Receber</p>
            <p className="text-2xl font-bold text-amber-600 dark:text-amber-400 mt-1">R$ {fmt(totalPending > 0 ? totalPending : 0)}</p>
          </CardContent>
        </Card>
        <Card className="border-0 shadow-sm bg-violet-50 dark:bg-violet-900/10">
          <CardContent className="py-4 px-5">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Comissão Pendente</p>
            <p className="text-2xl font-bold text-violet-600 dark:text-violet-400 mt-1">R$ {fmt(totalCommPending)}</p>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
        <div className="flex items-center gap-2 flex-wrap">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar venda ou cliente..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 w-64"
            />
          </div>
          <div className="flex items-center gap-1">
            <Filter className="h-4 w-4 text-muted-foreground" />
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="h-10 rounded-md border border-input bg-background px-3 py-2 text-sm"
            >
              <option value="all">Todos os status</option>
              {Object.entries(BOOKING_STATUSES).map(([k, v]) => (
                <option key={k} value={k}>{v}</option>
              ))}
            </select>
          </div>
        </div>
        <Button onClick={onNew} className="gap-2 shrink-0">
          <Plus className="h-4 w-4" /> Nova Venda
        </Button>
      </div>

      {/* List */}
      {filtered.length === 0 ? (
        <Card>
          <CardContent className="py-16 text-center text-muted-foreground">
            {bookings.length === 0
              ? "Nenhuma venda cadastrada. Clique em \"Nova Venda\" para começar."
              : "Nenhuma venda encontrada com os filtros selecionados."}
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {/* Table header */}
          <div className="hidden md:grid grid-cols-[1fr_120px_120px_120px_120px_80px] gap-4 px-5 py-2 text-xs font-medium text-muted-foreground uppercase tracking-wider">
            <span>Viagem / Cliente</span>
            <span className="text-right">Total</span>
            <span className="text-right">Recebido</span>
            <span className="text-right">A Receber</span>
            <span className="text-right">Comissão</span>
            <span></span>
          </div>
          {filtered.map((b) => {
            const payments = paymentsByBooking.get(b.id) || { paid: 0, pending: 0 };
            const commissions = commissionsByBooking.get(b.id) || { received: 0, pending: 0 };
            const aReceber = Math.max(Number(b.total_amount) - payments.paid, 0);
            const colors = STATUS_COLORS[b.status] || STATUS_COLORS.lead;

            return (
              <Card
                key={b.id}
                className="cursor-pointer hover:shadow-md transition-all border hover:border-primary/20 group"
                onClick={() => onSelect(b.id)}
              >
                <CardContent className="py-3 px-5">
                  <div className="md:grid md:grid-cols-[1fr_120px_120px_120px_120px_80px] md:gap-4 md:items-center">
                    {/* Trip info */}
                    <div className="space-y-0.5">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-foreground">{b.trip_name}</span>
                        <Badge className={`${colors.bg} ${colors.text} border-0 text-[10px] px-2`}>
                          {BOOKING_STATUSES[b.status] || b.status}
                        </Badge>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {b.client?.name || "Sem cliente"}
                        {b.start_date && ` • ${format(new Date(b.start_date + "T00:00:00"), "dd/MM/yyyy")}`}
                        {b.end_date && ` → ${format(new Date(b.end_date + "T00:00:00"), "dd/MM/yyyy")}`}
                      </p>
                    </div>

                    {/* Financial columns - desktop */}
                    <span className="hidden md:block text-right font-semibold text-foreground">
                      R$ {fmt(Number(b.total_amount))}
                    </span>
                    <span className="hidden md:block text-right text-emerald-600 dark:text-emerald-400 font-medium">
                      R$ {fmt(payments.paid)}
                    </span>
                    <span className="hidden md:block text-right text-amber-600 dark:text-amber-400 font-medium">
                      R$ {fmt(aReceber)}
                    </span>
                    <span className="hidden md:block text-right text-violet-600 dark:text-violet-400 font-medium">
                      R$ {fmt(commissions.pending)}
                    </span>

                    {/* Mobile financial row */}
                    <div className="flex md:hidden items-center gap-4 mt-2 text-xs">
                      <span className="font-semibold">R$ {fmt(Number(b.total_amount))}</span>
                      <span className="text-emerald-600">Rec: R$ {fmt(payments.paid)}</span>
                      <span className="text-amber-600">Pend: R$ {fmt(aReceber)}</span>
                    </div>

                    {/* Actions */}
                    <div className="hidden md:flex items-center justify-end gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-destructive opacity-0 group-hover:opacity-100 transition-opacity"
                        onClick={(e) => { e.stopPropagation(); onDelete(b.id); }}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                      <ChevronRight className="h-4 w-4 text-muted-foreground" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
