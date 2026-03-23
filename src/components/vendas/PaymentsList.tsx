import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Plus, CheckCircle, Loader2 } from "lucide-react";
import { BookingPayment, PAYMENT_METHODS } from "@/hooks/useBookings";
import { format } from "date-fns";

interface Props {
  bookingId: string;
  payments: BookingPayment[];
  onAdd: (v: any) => void;
  onUpdate: (v: any) => void;
  isAdding: boolean;
}

const statusLabels: Record<string, string> = { pendente: "Pendente", pago: "Pago", atrasado: "Atrasado" };
const statusColors: Record<string, string> = { pendente: "bg-yellow-100 text-yellow-800", pago: "bg-green-100 text-green-800", atrasado: "bg-red-100 text-red-800" };

export function PaymentsList({ bookingId, payments, onAdd, onUpdate, isAdding }: Props) {
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

  return (
    <div className="space-y-3">
      {payments.map((p) => (
        <Card key={p.id}>
          <CardContent className="py-3 flex items-center justify-between">
            <div>
              <div className="flex items-center gap-2">
                <span className="font-medium">R$ {Number(p.amount).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</span>
                <Badge className={statusColors[p.status]}>{statusLabels[p.status] || p.status}</Badge>
                <span className="text-xs text-muted-foreground">{PAYMENT_METHODS[p.payment_method] || p.payment_method}</span>
              </div>
              <p className="text-xs text-muted-foreground">
                {p.due_date && `Vencimento: ${format(new Date(p.due_date + "T00:00:00"), "dd/MM/yyyy")}`}
                {p.installment_number && ` • Parcela ${p.installment_number}/${p.total_installments}`}
                {p.payment_date && ` • Pago em: ${format(new Date(p.payment_date + "T00:00:00"), "dd/MM/yyyy")}`}
              </p>
            </div>
            {p.status !== "pago" && (
              <Button variant="ghost" size="sm" onClick={() => markPaid(p)} className="gap-1 text-green-600">
                <CheckCircle className="h-4 w-4" /> Pago
              </Button>
            )}
          </CardContent>
        </Card>
      ))}

      {showForm ? (
        <form onSubmit={handleSubmit} className="border rounded-lg p-4 space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Forma de Pagamento</Label>
              <select value={method} onChange={(e) => setMethod(e.target.value)} className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm">
                {Object.entries(PAYMENT_METHODS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
              </select>
            </div>
            <div>
              <Label>Valor *</Label>
              <Input type="number" step="0.01" value={amount} onChange={(e) => setAmount(e.target.value)} required />
            </div>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div><Label>Vencimento</Label><Input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} /></div>
            <div><Label>Parcela Nº</Label><Input type="number" value={installNum} onChange={(e) => setInstallNum(e.target.value)} /></div>
            <div><Label>Total Parcelas</Label><Input type="number" value={totalInstall} onChange={(e) => setTotalInstall(e.target.value)} /></div>
          </div>
          <div className="flex gap-2">
            <Button type="submit" disabled={isAdding}>{isAdding ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : null}Registrar</Button>
            <Button type="button" variant="outline" onClick={() => setShowForm(false)}>Cancelar</Button>
          </div>
        </form>
      ) : (
        <Button variant="outline" onClick={() => setShowForm(true)} className="w-full gap-2">
          <Plus className="h-4 w-4" /> Adicionar Pagamento
        </Button>
      )}
    </div>
  );
}
