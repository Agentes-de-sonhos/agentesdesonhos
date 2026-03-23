import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Plus, CheckCircle, Loader2, Trash2, X, Check } from "lucide-react";
import { BookingPayment, PAYMENT_METHODS } from "@/hooks/useBookings";
import { format } from "date-fns";

interface Props {
  bookingId: string;
  payments: BookingPayment[];
  onAdd: (v: any) => void;
  onUpdate: (v: any) => void;
  onDelete: (id: string) => void;
  isAdding: boolean;
}

const statusLabels: Record<string, string> = { pendente: "Pendente", pago: "Pago", atrasado: "Atrasado" };
const statusColors: Record<string, string> = {
  pendente: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
  pago: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400",
  atrasado: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
};

const fmt = (v: number) => v.toLocaleString("pt-BR", { minimumFractionDigits: 2 });

export function PaymentsList({ bookingId, payments, onAdd, onUpdate, onDelete, isAdding }: Props) {
  const [showForm, setShowForm] = useState(false);
  const [method, setMethod] = useState("pix");
  const [amount, setAmount] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [installNum, setInstallNum] = useState("");
  const [totalInstall, setTotalInstall] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onAdd({
      booking_id: bookingId,
      payment_method: method,
      amount: Number(amount),
      due_date: dueDate || null,
      installment_number: installNum ? Number(installNum) : null,
      total_installments: totalInstall ? Number(totalInstall) : null,
      status: "pendente",
    });
    setShowForm(false);
    setAmount("");
    setDueDate("");
    setInstallNum("");
    setTotalInstall("");
  };

  const markPaid = (p: BookingPayment) => {
    onUpdate({ id: p.id, status: "pago", payment_date: new Date().toISOString().slice(0, 10) });
  };

  const totalPaid = payments.filter((p) => p.status === "pago").reduce((s, p) => s + Number(p.amount), 0);
  const totalPending = payments.filter((p) => p.status !== "pago").reduce((s, p) => s + Number(p.amount), 0);

  return (
    <div className="space-y-2">
      {/* Mini summary */}
      {payments.length > 0 && (
        <div className="flex items-center gap-4 text-sm mb-2 px-1">
          <span className="text-emerald-600 dark:text-emerald-400 font-medium">✓ Recebido: R$ {fmt(totalPaid)}</span>
          <span className="text-amber-600 dark:text-amber-400 font-medium">◷ Pendente: R$ {fmt(totalPending)}</span>
        </div>
      )}

      {payments.map((p) => (
        <Card key={p.id} className="group hover:shadow-sm transition-shadow">
          <CardContent className="py-3 px-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-foreground">R$ {fmt(Number(p.amount))}</span>
                  <Badge className={`${statusColors[p.status]} border-0 text-[10px]`}>{statusLabels[p.status] || p.status}</Badge>
                  <span className="text-xs text-muted-foreground">{PAYMENT_METHODS[p.payment_method] || p.payment_method}</span>
                </div>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {p.due_date && `Vencimento: ${format(new Date(p.due_date + "T00:00:00"), "dd/MM/yyyy")}`}
                  {p.installment_number && ` • Parcela ${p.installment_number}/${p.total_installments}`}
                  {p.payment_date && ` • Pago em: ${format(new Date(p.payment_date + "T00:00:00"), "dd/MM/yyyy")}`}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-1">
              {p.status !== "pago" && (
                <Button variant="ghost" size="sm" onClick={() => markPaid(p)} className="gap-1 text-emerald-600 h-7 px-2 text-xs">
                  <CheckCircle className="h-3.5 w-3.5" /> Pago
                </Button>
              )}
              <Button variant="ghost" size="sm" className="h-7 px-2 text-xs text-destructive opacity-0 group-hover:opacity-100" onClick={() => onDelete(p.id)}>
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            </div>
          </CardContent>
        </Card>
      ))}

      {showForm ? (
        <form onSubmit={handleSubmit} className="border rounded-lg p-4 space-y-3 bg-muted/30">
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            <div>
              <Label className="text-xs">Forma de Pagamento</Label>
              <select value={method} onChange={(e) => setMethod(e.target.value)} className="mt-1 flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm">
                {Object.entries(PAYMENT_METHODS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
              </select>
            </div>
            <div>
              <Label className="text-xs">Valor *</Label>
              <Input type="number" step="0.01" value={amount} onChange={(e) => setAmount(e.target.value)} required className="mt-1" />
            </div>
            <div>
              <Label className="text-xs">Vencimento</Label>
              <Input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} className="mt-1" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs">Parcela Nº</Label>
              <Input type="number" value={installNum} onChange={(e) => setInstallNum(e.target.value)} className="mt-1" placeholder="1" />
            </div>
            <div>
              <Label className="text-xs">Total Parcelas</Label>
              <Input type="number" value={totalInstall} onChange={(e) => setTotalInstall(e.target.value)} className="mt-1" placeholder="1" />
            </div>
          </div>
          <div className="flex gap-2 justify-end">
            <Button type="button" variant="outline" size="sm" onClick={() => setShowForm(false)}><X className="h-3.5 w-3.5 mr-1" />Cancelar</Button>
            <Button type="submit" size="sm" disabled={isAdding}>
              {isAdding ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" /> : <Check className="h-3.5 w-3.5 mr-1" />}
              Registrar
            </Button>
          </div>
        </form>
      ) : (
        <Button variant="outline" onClick={() => setShowForm(true)} className="w-full gap-2 border-dashed">
          <Plus className="h-4 w-4" /> Adicionar Pagamento
        </Button>
      )}
    </div>
  );
}
