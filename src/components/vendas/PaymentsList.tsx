import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Plus, CheckCircle, Loader2, Trash2, X, Check, Landmark, Building2 } from "lucide-react";
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

const RECEIPT_TYPES: Record<string, string> = {
  via_agencia: "Via Agência",
  direto_fornecedor: "Direto ao Fornecedor",
};

const fmt = (v: number) => v.toLocaleString("pt-BR", { minimumFractionDigits: 2 });

export function PaymentsList({ bookingId, payments, onAdd, onUpdate, onDelete, isAdding }: Props) {
  const [showForm, setShowForm] = useState(false);
  const [method, setMethod] = useState("pix");
  const [amount, setAmount] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [installNum, setInstallNum] = useState("");
  const [totalInstall, setTotalInstall] = useState("");
  const [receiptType, setReceiptType] = useState("via_agencia");

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
      receipt_type: receiptType,
    });
    setShowForm(false);
    setAmount("");
    setDueDate("");
    setInstallNum("");
    setTotalInstall("");
    setReceiptType("via_agencia");
  };

  const markPaid = (p: BookingPayment) => {
    onUpdate({ id: p.id, status: "pago", payment_date: new Date().toISOString().slice(0, 10) });
  };

  const agencyPayments = payments.filter((p) => p.receipt_type !== "direto_fornecedor");
  const directPayments = payments.filter((p) => p.receipt_type === "direto_fornecedor");

  const totalAgencyPaid = agencyPayments.filter((p) => p.status === "pago").reduce((s, p) => s + Number(p.amount), 0);
  const totalAgencyPending = agencyPayments.filter((p) => p.status !== "pago").reduce((s, p) => s + Number(p.amount), 0);
  const totalDirectPaid = directPayments.filter((p) => p.status === "pago").reduce((s, p) => s + Number(p.amount), 0);
  const totalDirectPending = directPayments.filter((p) => p.status !== "pago").reduce((s, p) => s + Number(p.amount), 0);

  const renderCard = (p: BookingPayment) => {
    const isDirect = p.receipt_type === "direto_fornecedor";
    return (
      <Card key={p.id} className={`group hover:shadow-sm transition-shadow ${isDirect ? "border-l-4 border-l-muted-foreground/30" : "border-l-4 border-l-blue-500"}`}>
        <CardContent className="py-3 px-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            {isDirect ? (
              <Building2 className="h-4 w-4 text-muted-foreground shrink-0" />
            ) : (
              <Landmark className="h-4 w-4 text-blue-600 shrink-0" />
            )}
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-semibold text-foreground">R$ {fmt(Number(p.amount))}</span>
                <Badge className={`${statusColors[p.status]} border-0 text-[10px]`}>{statusLabels[p.status] || p.status}</Badge>
                <span className="text-xs text-muted-foreground">{PAYMENT_METHODS[p.payment_method] || p.payment_method}</span>
                <Badge variant="outline" className={`text-[10px] ${isDirect ? "text-muted-foreground" : "text-blue-600 border-blue-200"}`}>
                  {isDirect ? "Direto Fornecedor" : "Via Agência"}
                </Badge>
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
    );
  };

  return (
    <div className="space-y-4">
      {/* Summary */}
      {payments.length > 0 && (
        <div className="flex flex-wrap items-center gap-x-6 gap-y-1 text-sm px-1">
          <span className="flex items-center gap-1 text-blue-600 font-medium"><Landmark className="h-3.5 w-3.5" /> Agência: R$ {fmt(totalAgencyPaid)} recebido / R$ {fmt(totalAgencyPending)} pendente</span>
          <span className="flex items-center gap-1 text-muted-foreground font-medium"><Building2 className="h-3.5 w-3.5" /> Direto: R$ {fmt(totalDirectPaid)} pago / R$ {fmt(totalDirectPending)} pendente</span>
        </div>
      )}

      {/* Agency payments */}
      {agencyPayments.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs font-semibold uppercase tracking-wider text-blue-600 flex items-center gap-1.5 px-1"><Landmark className="h-3 w-3" /> Via Agência</p>
          {agencyPayments.map(renderCard)}
        </div>
      )}

      {/* Direct payments */}
      {directPayments.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5 px-1"><Building2 className="h-3 w-3" /> Direto ao Fornecedor</p>
          {directPayments.map(renderCard)}
        </div>
      )}

      {showForm ? (
        <form onSubmit={handleSubmit} className="border rounded-lg p-4 space-y-3 bg-muted/30">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div>
              <Label className="text-xs">Tipo de Recebimento *</Label>
              <select value={receiptType} onChange={(e) => setReceiptType(e.target.value)} className="mt-1 flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm">
                {Object.entries(RECEIPT_TYPES).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
              </select>
            </div>
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
