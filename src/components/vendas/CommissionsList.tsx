import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Plus, CheckCircle, Loader2, X, Check, Pencil, FileText, AlertTriangle, Clock } from "lucide-react";
import { BookingService, BookingCommission, SERVICE_TYPES, SERVICE_ICONS } from "@/hooks/useBookings";
import { format } from "date-fns";
import { Textarea } from "@/components/ui/textarea";

interface Props {
  services: BookingService[];
  commissions: BookingCommission[];
  onAdd: (v: any) => void;
  onUpdate: (v: any) => void;
  isAdding: boolean;
  booking?: { start_date?: string | null; end_date?: string | null } | null;
}

const fmt = (v: number) => v.toLocaleString("pt-BR", { minimumFractionDigits: 2 });

const COMMISSION_STATUSES: Record<string, { label: string; color: string }> = {
  previsao_criada: { label: "Previsão Criada", color: "bg-muted text-muted-foreground" },
  aguardando_emissao_nota: { label: "Aguardando Emissão NF", color: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400" },
  aguardando_envio_nota: { label: "Aguardando Envio NF", color: "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400" },
  aguardando_pagamento: { label: "Aguardando Pagamento", color: "bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-400" },
  recebido: { label: "Recebido", color: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400" },
  atrasado: { label: "Atrasado", color: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400" },
  cancelado: { label: "Cancelado", color: "bg-red-50 text-red-500 dark:bg-red-900/20 dark:text-red-400" },
};

const PAYMENT_RULES: Record<string, string> = {
  after_sale: "X dias após a venda",
  after_trip: "X dias após a viagem",
  after_invoice_issued: "X dias após emissão da NF",
  after_invoice_sent: "X dias após envio da NF",
  manual: "Data manual",
};

const INVOICE_STATUSES: Record<string, string> = {
  pendente_emissao: "Pendente Emissão",
  emitida: "Emitida",
  enviada: "Enviada",
};

function CommissionForm({ services, onSubmit, onCancel, isLoading, initial, booking }: {
  services: BookingService[];
  onSubmit: (v: any) => void;
  onCancel: () => void;
  isLoading: boolean;
  initial?: BookingCommission;
  booking?: { start_date?: string | null; end_date?: string | null } | null;
}) {
  const [serviceId, setServiceId] = useState(initial?.booking_service_id || "");
  const [amount, setAmount] = useState(initial ? String(initial.commission_amount) : "");
  const [paymentRule, setPaymentRule] = useState(initial?.payment_rule || "manual");
  const [paymentDays, setPaymentDays] = useState(initial ? String(initial.payment_days) : "0");
  const [expectedDate, setExpectedDate] = useState(initial?.expected_date || "");
  const [requiresInvoice, setRequiresInvoice] = useState(initial?.requires_invoice || false);
  const [invoiceStatus, setInvoiceStatus] = useState(initial?.invoice_status || "pendente_emissao");
  const [invoiceNumber, setInvoiceNumber] = useState(initial?.invoice_number || "");
  const [invoiceIssuedDate, setInvoiceIssuedDate] = useState(initial?.invoice_issued_date || "");
  const [invoiceSentDate, setInvoiceSentDate] = useState(initial?.invoice_sent_date || "");
  const [status, setStatus] = useState(initial?.status || "previsao_criada");
  const [internalNotes, setInternalNotes] = useState(initial?.internal_notes || "");

  const selectedService = services.find(s => s.id === serviceId);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const svc = services.find((s) => s.id === serviceId);

    // Auto-determine status based on invoice requirements
    let finalStatus = status;
    if (!initial) {
      if (requiresInvoice) {
        finalStatus = "aguardando_emissao_nota";
      } else {
        finalStatus = "aguardando_pagamento";
      }
    }

    const payload = {
      ...(initial ? { id: initial.id } : {}),
      booking_service_id: serviceId,
      supplier_id: svc?.supplier_id || null,
      commission_amount: Number(amount),
      payment_rule: paymentRule,
      payment_days: Number(paymentDays) || 0,
      expected_date: expectedDate || null,
      requires_invoice: requiresInvoice,
      invoice_status: requiresInvoice ? invoiceStatus : null,
      invoice_number: requiresInvoice ? (invoiceNumber || null) : null,
      invoice_issued_date: requiresInvoice ? (invoiceIssuedDate || null) : null,
      invoice_sent_date: requiresInvoice ? (invoiceSentDate || null) : null,
      status: finalStatus,
      internal_notes: internalNotes || null,
    };
    onSubmit(payload);
  };

  return (
    <form onSubmit={handleSubmit} className="border rounded-lg p-4 space-y-4 bg-muted/30">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <div>
          <Label className="text-xs">Serviço *</Label>
          <select value={serviceId} onChange={(e) => setServiceId(e.target.value)} required className="mt-1 flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm">
            <option value="">Selecione o serviço</option>
            {services.map((s) => (
              <option key={s.id} value={s.id}>{SERVICE_ICONS[s.service_type]} {SERVICE_TYPES[s.service_type] || s.service_type} - {s.description || s.supplier?.name || "Sem descrição"}</option>
            ))}
          </select>
        </div>
        <div>
          <Label className="text-xs">Valor Comissão (R$) *</Label>
          <Input type="number" step="0.01" value={amount} onChange={(e) => setAmount(e.target.value)} required className="mt-1" />
        </div>
      </div>

      {selectedService && (
        <p className="text-xs text-muted-foreground px-1">
          Fornecedor: {selectedService.supplier?.name || "—"} • Venda: R$ {fmt(Number(selectedService.sale_price))}
        </p>
      )}

      {/* Regra de pagamento */}
      <div className="space-y-3 p-3 rounded-md border bg-background">
        <h4 className="text-xs font-semibold text-foreground flex items-center gap-1.5"><Clock className="h-3.5 w-3.5" /> Regra de Pagamento</h4>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div>
            <Label className="text-xs">Regra</Label>
            <select value={paymentRule} onChange={(e) => setPaymentRule(e.target.value)} className="mt-1 flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm">
              {Object.entries(PAYMENT_RULES).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
            </select>
          </div>
          {paymentRule !== "manual" && (
            <div>
              <Label className="text-xs">Prazo (dias)</Label>
              <Input type="number" value={paymentDays} onChange={(e) => setPaymentDays(e.target.value)} className="mt-1" />
            </div>
          )}
          <div>
            <Label className="text-xs">Data Prevista Recebimento</Label>
            <Input type="date" value={expectedDate} onChange={(e) => setExpectedDate(e.target.value)} className="mt-1" />
          </div>
        </div>
      </div>

      {/* Nota Fiscal */}
      <div className="space-y-3 p-3 rounded-md border bg-background">
        <div className="flex items-center justify-between">
          <h4 className="text-xs font-semibold text-foreground flex items-center gap-1.5"><FileText className="h-3.5 w-3.5" /> Nota Fiscal</h4>
          <label className="flex items-center gap-2 cursor-pointer">
            <input type="checkbox" checked={requiresInvoice} onChange={(e) => setRequiresInvoice(e.target.checked)} className="rounded border-input" />
            <span className="text-xs">Exige NF</span>
          </label>
        </div>
        {requiresInvoice && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div>
              <Label className="text-xs">Status NF</Label>
              <select value={invoiceStatus} onChange={(e) => setInvoiceStatus(e.target.value)} className="mt-1 flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm">
                {Object.entries(INVOICE_STATUSES).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
              </select>
            </div>
            <div>
              <Label className="text-xs">Nº da NF</Label>
              <Input value={invoiceNumber} onChange={(e) => setInvoiceNumber(e.target.value)} className="mt-1" placeholder="Ex: 12345" />
            </div>
            <div>
              <Label className="text-xs">Data Emissão</Label>
              <Input type="date" value={invoiceIssuedDate} onChange={(e) => setInvoiceIssuedDate(e.target.value)} className="mt-1" />
            </div>
            <div>
              <Label className="text-xs">Data Envio</Label>
              <Input type="date" value={invoiceSentDate} onChange={(e) => setInvoiceSentDate(e.target.value)} className="mt-1" />
            </div>
          </div>
        )}
      </div>

      {/* Status (apenas edição) */}
      {initial && (
        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label className="text-xs">Status da Comissão</Label>
            <select value={status} onChange={(e) => setStatus(e.target.value)} className="mt-1 flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm">
              {Object.entries(COMMISSION_STATUSES).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
            </select>
          </div>
          {status === "recebido" && (
            <div>
              <Label className="text-xs">Data Recebimento</Label>
              <Input type="date" value={initial.received_date || new Date().toISOString().slice(0, 10)} className="mt-1" readOnly />
            </div>
          )}
        </div>
      )}

      {/* Observações */}
      <div>
        <Label className="text-xs">Observações Internas</Label>
        <Textarea value={internalNotes} onChange={(e) => setInternalNotes(e.target.value)} className="mt-1 min-h-[60px]" placeholder="Anotações sobre esta comissão..." />
      </div>

      <div className="flex gap-2 justify-end">
        <Button type="button" variant="outline" size="sm" onClick={onCancel}><X className="h-3.5 w-3.5 mr-1" />Cancelar</Button>
        <Button type="submit" size="sm" disabled={isLoading}>
          {isLoading ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" /> : <Check className="h-3.5 w-3.5 mr-1" />}
          {initial ? "Salvar" : "Registrar"}
        </Button>
      </div>
    </form>
  );
}

export function CommissionsList({ services, commissions, onAdd, onUpdate, isAdding, booking }: Props) {
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  const totalReceived = commissions.filter((c) => c.status === "recebido").reduce((s, c) => s + Number(c.commission_amount), 0);
  const totalPending = commissions.filter((c) => c.status !== "recebido" && c.status !== "cancelado").reduce((s, c) => s + Number(c.commission_amount), 0);
  const overdueCount = commissions.filter(c => c.status === "atrasado" || (c.status !== "recebido" && c.status !== "cancelado" && c.expected_date && c.expected_date < new Date().toISOString().slice(0, 10))).length;

  const handleMarkReceived = (c: BookingCommission) => {
    onUpdate({ id: c.id, status: "recebido", received_date: new Date().toISOString().slice(0, 10) });
  };

  const handleUpdateStatus = (c: BookingCommission, newStatus: string) => {
    onUpdate({ id: c.id, status: newStatus });
  };

  return (
    <div className="space-y-2">
      {/* Summary */}
      {commissions.length > 0 && (
        <div className="flex items-center gap-4 text-sm mb-2 px-1 flex-wrap">
          <span className="text-emerald-600 dark:text-emerald-400 font-medium">✓ Recebido: R$ {fmt(totalReceived)}</span>
          <span className="text-violet-600 dark:text-violet-400 font-medium">◷ A receber: R$ {fmt(totalPending)}</span>
          {overdueCount > 0 && (
            <span className="text-red-600 dark:text-red-400 font-medium flex items-center gap-1">
              <AlertTriangle className="h-3.5 w-3.5" /> {overdueCount} atrasada(s)
            </span>
          )}
        </div>
      )}

      {commissions.map((c) => {
        if (editingId === c.id) {
          return (
            <CommissionForm
              key={c.id}
              services={services}
              initial={c}
              onSubmit={(v) => { onUpdate(v); setEditingId(null); }}
              onCancel={() => setEditingId(null)}
              isLoading={false}
              booking={booking}
            />
          );
        }

        const svc = services.find((s) => s.id === c.booking_service_id);
        const statusInfo = COMMISSION_STATUSES[c.status] || { label: c.status, color: "bg-muted text-muted-foreground" };
        const isOverdue = c.status !== "recebido" && c.status !== "cancelado" && c.expected_date && c.expected_date < new Date().toISOString().slice(0, 10);

        return (
          <Card key={c.id} className={`group hover:shadow-sm transition-shadow ${isOverdue ? "border-red-300 dark:border-red-800" : ""}`}>
            <CardContent className="py-3 px-4">
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-start gap-3 min-w-0 flex-1">
                  <span className="text-lg mt-0.5">{svc ? SERVICE_ICONS[svc.service_type] || "📦" : "📦"}</span>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-semibold text-foreground">R$ {fmt(Number(c.commission_amount))}</span>
                      <Badge className={`${statusInfo.color} border-0 text-[10px]`}>
                        {isOverdue ? "Atrasado" : statusInfo.label}
                      </Badge>
                      {c.requires_invoice && c.invoice_status && (
                        <Badge variant="outline" className="text-[10px] gap-1">
                          <FileText className="h-2.5 w-2.5" />
                          {INVOICE_STATUSES[c.invoice_status] || c.invoice_status}
                          {c.invoice_number && ` #${c.invoice_number}`}
                        </Badge>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {svc && `${SERVICE_TYPES[svc.service_type] || svc.service_type} • `}
                      Fornecedor: {c.supplier?.name || svc?.supplier?.name || "—"}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {PAYMENT_RULES[c.payment_rule] || "Manual"}
                      {c.payment_rule !== "manual" && c.payment_days > 0 && ` (${c.payment_days} dias)`}
                      {c.expected_date && ` • Previsto: ${format(new Date(c.expected_date + "T00:00:00"), "dd/MM/yyyy")}`}
                      {c.received_date && ` • Recebido: ${format(new Date(c.received_date + "T00:00:00"), "dd/MM/yyyy")}`}
                    </p>
                    {c.internal_notes && <p className="text-xs text-muted-foreground/70 mt-0.5 italic truncate">{c.internal_notes}</p>}
                  </div>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  {c.status !== "recebido" && c.status !== "cancelado" && (
                    <Button variant="ghost" size="sm" onClick={() => handleMarkReceived(c)} className="gap-1 text-emerald-600 h-7 px-2 text-xs">
                      <CheckCircle className="h-3.5 w-3.5" /> Recebido
                    </Button>
                  )}
                  <Button variant="ghost" size="sm" onClick={() => setEditingId(c.id)} className="gap-1 h-7 px-2 text-xs">
                    <Pencil className="h-3 w-3" /> Editar
                  </Button>
                </div>
              </div>

              {/* Quick status actions for invoice flow */}
              {c.requires_invoice && c.status !== "recebido" && c.status !== "cancelado" && (
                <div className="flex gap-1 mt-2 flex-wrap">
                  {c.status === "aguardando_emissao_nota" && (
                    <Button variant="outline" size="sm" className="h-6 text-[10px] px-2" onClick={() => onUpdate({ id: c.id, status: "aguardando_envio_nota", invoice_status: "emitida" })}>
                      NF Emitida →
                    </Button>
                  )}
                  {c.status === "aguardando_envio_nota" && (
                    <Button variant="outline" size="sm" className="h-6 text-[10px] px-2" onClick={() => onUpdate({ id: c.id, status: "aguardando_pagamento", invoice_status: "enviada" })}>
                      NF Enviada →
                    </Button>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        );
      })}

      {services.length === 0 ? (
        <Card>
          <CardContent className="py-8 text-center text-muted-foreground text-sm">
            Adicione serviços primeiro para registrar comissões.
          </CardContent>
        </Card>
      ) : showForm ? (
        <CommissionForm
          services={services}
          onSubmit={(v) => { onAdd(v); setShowForm(false); }}
          onCancel={() => setShowForm(false)}
          isLoading={isAdding}
          booking={booking}
        />
      ) : (
        <Button variant="outline" onClick={() => setShowForm(true)} className="w-full gap-2 border-dashed">
          <Plus className="h-4 w-4" /> Adicionar Comissão
        </Button>
      )}
    </div>
  );
}
