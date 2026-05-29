import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useInvoices } from "@/hooks/useInvoices";
import { INVOICE_PAYMENT_METHODS, type Invoice, type InvoiceInstallment } from "@/types/invoice";

interface Props {
  invoice: Invoice;
  open: boolean;
  onOpenChange: (o: boolean) => void;
}

export function RegisterPaymentDialog({ invoice, open, onOpenChange }: Props) {
  const { addPayment, getInvoiceDetail } = useInvoices();
  const [installments, setInstallments] = useState<InvoiceInstallment[]>([]);
  const [form, setForm] = useState({
    installment_id: "",
    amount: 0,
    payment_date: new Date().toISOString().slice(0, 10),
    method: "pix",
    notes: "",
  });

  useEffect(() => {
    if (!open) return;
    (async () => {
      const full = await getInvoiceDetail(invoice.id);
      const pending = (full?.installments || []).filter(i => i.status !== "paid");
      setInstallments(pending);
      if (pending.length === 1) {
        setForm(f => ({ ...f, installment_id: pending[0].id, amount: pending[0].amount }));
      } else {
        setForm(f => ({ ...f, amount: invoice.balance }));
      }
    })();
  }, [open, invoice.id]);

  const handleSubmit = async () => {
    if (!form.amount || form.amount <= 0) return;
    await addPayment.mutateAsync({
      invoice_id: invoice.id,
      installment_id: form.installment_id || null,
      amount: form.amount,
      payment_date: form.payment_date,
      method: form.method,
      notes: form.notes,
    });
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Registrar pagamento — {invoice.invoice_number}</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          {installments.length > 0 && (
            <div>
              <Label>Parcela (opcional)</Label>
              <Select
                value={form.installment_id || "none"}
                onValueChange={(v) => {
                  if (v === "none") setForm(f => ({ ...f, installment_id: "" }));
                  else {
                    const ins = installments.find(i => i.id === v);
                    setForm(f => ({ ...f, installment_id: v, amount: ins?.amount || f.amount }));
                  }
                }}
              >
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Pagamento avulso</SelectItem>
                  {installments.map(i => (
                    <SelectItem key={i.id} value={i.id}>
                      {i.label} — {new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(i.amount)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Valor recebido</Label>
              <Input
                type="number" step="0.01"
                value={form.amount}
                onChange={e => setForm({ ...form, amount: Number(e.target.value) })}
              />
            </div>
            <div>
              <Label>Data</Label>
              <Input
                type="date"
                value={form.payment_date}
                onChange={e => setForm({ ...form, payment_date: e.target.value })}
              />
            </div>
            <div className="col-span-2">
              <Label>Forma de pagamento</Label>
              <Select value={form.method} onValueChange={v => setForm({ ...form, method: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {Object.entries(INVOICE_PAYMENT_METHODS).map(([k, v]) => (
                    <SelectItem key={k} value={k}>{v}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="col-span-2">
              <Label>Observação</Label>
              <Textarea rows={2} value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} />
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button onClick={handleSubmit} disabled={addPayment.isPending}>
            {addPayment.isPending ? "Registrando..." : "Registrar pagamento"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}