import { useState, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Plus, Trash2, Loader2, Pencil, Copy, X, Check } from "lucide-react";
import { BookingService, SERVICE_TYPES, SERVICE_ICONS, useClients } from "@/hooks/useBookings";
import { format } from "date-fns";

interface Props {
  bookingId: string;
  services: BookingService[];
  onAdd: (values: any) => void;
  onUpdate: (values: any) => void;
  onDelete: (id: string) => void;
  onDuplicate: (svc: BookingService) => void;
  isAdding: boolean;
  onAddCommission?: (values: any) => void;
}

const fmt = (v: number) => v.toLocaleString("pt-BR", { minimumFractionDigits: 2 });

const statusLabels: Record<string, string> = { pendente: "Pendente", confirmado: "Confirmado", cancelado: "Cancelado" };
const statusColors: Record<string, string> = {
  pendente: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
  confirmado: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400",
  cancelado: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
};

const PAYMENT_RULES: Record<string, string> = {
  apos_venda: "X dias após a venda",
  apos_viagem: "X dias após a viagem",
  apos_emissao_nf: "X dias após emissão da NF",
  apos_envio_nf: "X dias após envio da NF",
  data_manual: "Data manual",
};

const INVOICE_STATUSES: Record<string, string> = {
  nao_aplica: "Não se aplica",
  a_emitir: "A emitir",
  emitida: "Emitida",
  enviada: "Enviada",
  aprovada: "Aprovada",
  recusada: "Recusada",
};

const COMMISSION_STATUSES: Record<string, string> = {
  previsao_criada: "Previsão criada",
  aguardando_emissao_nota: "Aguardando emissão de NF",
  aguardando_envio_nota: "Aguardando envio de NF",
  aguardando_pagamento: "Aguardando pagamento",
  recebido: "Recebido",
  parcialmente_recebido: "Parcialmente recebido",
  atrasado: "Atrasado",
  cancelado: "Cancelado",
};

function calcCommission(salePrice: number, taxes: number, commType: string, commValue: number) {
  const base = salePrice - taxes;
  if (commType === "percentage") return base * (commValue / 100);
  return commValue;
}

function calcDU(salePrice: number, duType: string, duValue: number) {
  if (duType === "percentage") return salePrice * (duValue / 100);
  return duValue;
}

const selectClass = "mt-1 flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm";

function ServiceForm({ bookingId, onSubmit, onCancel, isLoading, initial }: {
  bookingId: string;
  onSubmit: (v: any) => void;
  onCancel: () => void;
  isLoading: boolean;
  initial?: BookingService;
}) {
  const { data: clients = [] } = useClients();

  // === Block 1: Product Data ===
  const [serviceType, setServiceType] = useState(initial?.service_type || "hotel");
  const [supplierId, setSupplierId] = useState(initial?.supplier_id || "");
  const [description, setDescription] = useState(initial?.description || "");
  const [salePrice, setSalePrice] = useState(initial ? String(initial.sale_price) : "");
  const [costPrice, setCostPrice] = useState(initial ? String(initial.cost_price) : "");
  const [status, setStatus] = useState(initial?.status || "pendente");

  // === Block 2: Commission ===
  const [taxes, setTaxes] = useState(initial ? String(initial.non_commissionable_taxes) : "0");
  const [commType, setCommType] = useState(initial?.commission_type || "percentage");
  const [commValue, setCommValue] = useState(initial ? String(initial.commission_value) : "");
  const [duType, setDuType] = useState(initial?.du_type || "fixed");
  const [duValue, setDuValue] = useState(initial ? String(initial.du_value) : "0");

  // === Block 3: Receivable & Invoice ===
  const [paymentRule, setPaymentRule] = useState("apos_venda");
  const [paymentDays, setPaymentDays] = useState("30");
  const [expectedDate, setExpectedDate] = useState(initial?.expected_commission_date || "");
  const [requiresInvoice, setRequiresInvoice] = useState(false);
  const [invoiceStatus, setInvoiceStatus] = useState("nao_aplica");
  const [invoiceNumber, setInvoiceNumber] = useState("");
  const [invoiceIssuedDate, setInvoiceIssuedDate] = useState("");
  const [invoiceSentDate, setInvoiceSentDate] = useState("");
  const [commissionStatus, setCommissionStatus] = useState("previsao_criada");
  const [internalNotes, setInternalNotes] = useState("");

  const isAereo = serviceType === "aereo" || serviceType === "voo";

  const computed = useMemo(() => {
    const sp = Number(salePrice) || 0;
    const tx = Number(taxes) || 0;
    const base = sp - tx;
    const commission = calcCommission(sp, tx, commType, Number(commValue) || 0);
    const du = isAereo ? calcDU(sp, duType, Number(duValue) || 0) : 0;
    const profit = commission + du;
    return { base, commission, du, profit };
  }, [salePrice, taxes, commType, commValue, duType, duValue, isAereo]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const payload = {
      ...(initial ? { id: initial.id } : { booking_id: bookingId }),
      service_type: serviceType,
      supplier_id: supplierId || null,
      description: description || null,
      sale_price: Number(salePrice) || 0,
      cost_price: Number(costPrice) || 0,
      non_commissionable_taxes: Number(taxes) || 0,
      commission_type: commType,
      commission_value: Number(commValue) || 0,
      du_value: isAereo ? (Number(duValue) || 0) : 0,
      du_type: duType,
      expected_commission: computed.commission,
      expected_commission_date: expectedDate || null,
      status,
      // Commission control data (will be used to create booking_commission)
      _commission_control: {
        supplier_id: supplierId || null,
        commission_amount: computed.commission,
        payment_rule: paymentRule,
        payment_days: Number(paymentDays) || 0,
        expected_date: expectedDate || null,
        requires_invoice: requiresInvoice,
        invoice_status: requiresInvoice ? invoiceStatus : "nao_aplica",
        invoice_number: invoiceNumber || null,
        invoice_issued_date: invoiceIssuedDate || null,
        invoice_sent_date: invoiceSentDate || null,
        status: commissionStatus,
        internal_notes: internalNotes || null,
      },
    };
    onSubmit(payload);
  };

  const sectionHeader = (title: string, num: number) => (
    <div className="flex items-center gap-2 pt-2 pb-1 border-b border-border/50">
      <span className="flex items-center justify-center w-6 h-6 rounded-full bg-primary/10 text-primary text-xs font-bold">{num}</span>
      <span className="text-sm font-semibold text-foreground">{title}</span>
    </div>
  );

  return (
    <form onSubmit={handleSubmit} className="border rounded-lg p-4 space-y-5 bg-muted/30">
      {/* ═══ BLOCK 1: Dados do Produto ═══ */}
      {sectionHeader("Dados do Produto", 1)}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
        <div>
          <Label className="text-xs">Tipo *</Label>
          <select value={serviceType} onChange={(e) => setServiceType(e.target.value)} className={selectClass}>
            {Object.entries(SERVICE_TYPES).map(([k, v]) => <option key={k} value={k}>{SERVICE_ICONS[k]} {v}</option>)}
          </select>
        </div>
        <div>
          <Label className="text-xs">Fornecedor</Label>
          <select value={supplierId} onChange={(e) => setSupplierId(e.target.value)} className={selectClass}>
            <option value="">Selecione</option>
            {clients.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </div>
        <div>
          <Label className="text-xs">Status</Label>
          <select value={status} onChange={(e) => setStatus(e.target.value)} className={selectClass}>
            {Object.entries(statusLabels).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </select>
        </div>
      </div>
      <div>
        <Label className="text-xs">Descrição</Label>
        <Input value={description} onChange={(e) => setDescription(e.target.value)} className="mt-1" placeholder="Ex: Hotel Marriott Paris - 5 noites" />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <Label className="text-xs">Valor Venda *</Label>
          <Input type="number" step="0.01" value={salePrice} onChange={(e) => setSalePrice(e.target.value)} className="mt-1" required />
        </div>
        <div>
          <Label className="text-xs">Custo (ref.)</Label>
          <Input type="number" step="0.01" value={costPrice} onChange={(e) => setCostPrice(e.target.value)} className="mt-1" />
        </div>
      </div>

      {/* ═══ BLOCK 2: Comissão e Cálculo ═══ */}
      {sectionHeader("Comissão e Cálculo", 2)}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
        <div>
          <Label className="text-xs">Taxas não comissionáveis</Label>
          <Input type="number" step="0.01" value={taxes} onChange={(e) => setTaxes(e.target.value)} className="mt-1" placeholder="0" />
        </div>
        <div>
          <Label className="text-xs">Tipo Comissão</Label>
          <select value={commType} onChange={(e) => setCommType(e.target.value)} className={selectClass}>
            <option value="percentage">Percentual (%)</option>
            <option value="fixed">Valor Fixo (R$)</option>
          </select>
        </div>
        <div>
          <Label className="text-xs">{commType === "percentage" ? "% Comissão" : "Valor Comissão (R$)"}</Label>
          <Input type="number" step="0.01" value={commValue} onChange={(e) => setCommValue(e.target.value)} className="mt-1" />
        </div>
      </div>

      {/* DU - Aéreo only */}
      {isAereo && (
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3 p-3 rounded-md border border-dashed border-primary/30 bg-primary/5">
          <div className="col-span-full">
            <Label className="text-xs font-semibold">DU (Taxa de serviço do agente) — Aéreo</Label>
          </div>
          <div>
            <Label className="text-xs">Tipo DU</Label>
            <select value={duType} onChange={(e) => setDuType(e.target.value)} className={selectClass}>
              <option value="fixed">Valor Fixo (R$)</option>
              <option value="percentage">Percentual (%)</option>
            </select>
          </div>
          <div>
            <Label className="text-xs">{duType === "percentage" ? "% DU" : "Valor DU (R$)"}</Label>
            <Input type="number" step="0.01" value={duValue} onChange={(e) => setDuValue(e.target.value)} className="mt-1" />
          </div>
          <div className="flex flex-col justify-end">
            <p className="text-xs font-medium text-foreground">DU: R$ {fmt(computed.du)}</p>
          </div>
        </div>
      )}

      {/* Summary */}
      <div className="flex items-center justify-between p-3 rounded-md bg-muted/50 border">
        <div className="text-xs text-muted-foreground space-y-0.5">
          <p>Base comissionável: R$ {fmt(computed.base)}</p>
          <p>Comissão: R$ {fmt(computed.commission)}</p>
          {isAereo && computed.du > 0 && <p>DU: R$ {fmt(computed.du)}</p>}
        </div>
        <div className="text-right">
          <span className="text-xs text-muted-foreground">Lucro do Agente</span>
          <p className="text-sm font-bold text-foreground">R$ {fmt(computed.profit)}</p>
        </div>
      </div>

      {/* ═══ BLOCK 3: Recebimento e Nota Fiscal ═══ */}
      {sectionHeader("Recebimento e Nota Fiscal", 3)}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
        <div>
          <Label className="text-xs">Regra de Recebimento</Label>
          <select value={paymentRule} onChange={(e) => setPaymentRule(e.target.value)} className={selectClass}>
            {Object.entries(PAYMENT_RULES).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </select>
        </div>
        {paymentRule !== "data_manual" && (
          <div>
            <Label className="text-xs">Prazo (dias)</Label>
            <Input type="number" value={paymentDays} onChange={(e) => setPaymentDays(e.target.value)} className="mt-1" />
          </div>
        )}
        <div>
          <Label className="text-xs">Data prevista recebimento</Label>
          <Input type="date" value={expectedDate} onChange={(e) => setExpectedDate(e.target.value)} className="mt-1" />
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
        <div>
          <Label className="text-xs">Status do Recebimento</Label>
          <select value={commissionStatus} onChange={(e) => setCommissionStatus(e.target.value)} className={selectClass}>
            {Object.entries(COMMISSION_STATUSES).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </select>
        </div>
        <div className="flex items-center gap-2 pt-5">
          <Switch checked={requiresInvoice} onCheckedChange={(v) => {
            setRequiresInvoice(v);
            if (!v) setInvoiceStatus("nao_aplica");
            else setInvoiceStatus("a_emitir");
          }} />
          <Label className="text-xs">Exige Nota Fiscal?</Label>
        </div>
      </div>

      {requiresInvoice && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 p-3 rounded-md border border-dashed border-amber-400/40 bg-amber-50/30 dark:bg-amber-900/10">
          <div>
            <Label className="text-xs">Status da NF</Label>
            <select value={invoiceStatus} onChange={(e) => setInvoiceStatus(e.target.value)} className={selectClass}>
              {Object.entries(INVOICE_STATUSES).filter(([k]) => k !== "nao_aplica").map(([k, v]) => <option key={k} value={k}>{v}</option>)}
            </select>
          </div>
          <div>
            <Label className="text-xs">Nº da NF</Label>
            <Input value={invoiceNumber} onChange={(e) => setInvoiceNumber(e.target.value)} className="mt-1" placeholder="Ex: 12345" />
          </div>
          <div>
            <Label className="text-xs">Data emissão NF</Label>
            <Input type="date" value={invoiceIssuedDate} onChange={(e) => setInvoiceIssuedDate(e.target.value)} className="mt-1" />
          </div>
          <div>
            <Label className="text-xs">Data envio NF</Label>
            <Input type="date" value={invoiceSentDate} onChange={(e) => setInvoiceSentDate(e.target.value)} className="mt-1" />
          </div>
        </div>
      )}

      <div>
        <Label className="text-xs">Observações internas</Label>
        <Textarea value={internalNotes} onChange={(e) => setInternalNotes(e.target.value)} className="mt-1" rows={2} placeholder="Notas sobre o recebimento desta comissão..." />
      </div>

      <div className="flex gap-2 justify-end">
        <Button type="button" variant="outline" size="sm" onClick={onCancel}><X className="h-3.5 w-3.5 mr-1" />Cancelar</Button>
        <Button type="submit" size="sm" disabled={isLoading}>
          {isLoading ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" /> : <Check className="h-3.5 w-3.5 mr-1" />}
          {initial ? "Salvar" : "Adicionar"}
        </Button>
      </div>
    </form>
  );
}

export function ServicesList({ bookingId, services, onAdd, onUpdate, onDelete, onDuplicate, isAdding, onAddCommission }: Props) {
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  const handleAddWithCommission = async (v: any) => {
    const commControl = v._commission_control;
    delete v._commission_control;
    onAdd(v);
    // Commission will be created after service is added via BookingDetail
  };

  const handleUpdateWithCommission = (v: any) => {
    delete v._commission_control;
    onUpdate(v);
  };

  return (
    <div className="space-y-2">
      {services.map((s) => {
        if (editingId === s.id) {
          return (
            <ServiceForm
              key={s.id}
              bookingId={bookingId}
              initial={s}
              onSubmit={(v) => { handleUpdateWithCommission(v); setEditingId(null); }}
              onCancel={() => setEditingId(null)}
              isLoading={false}
            />
          );
        }
        const taxes = Number(s.non_commissionable_taxes) || 0;
        const commission = calcCommission(Number(s.sale_price), taxes, s.commission_type, Number(s.commission_value));
        const isAereo = s.service_type === "aereo" || s.service_type === "voo";
        const du = isAereo ? calcDU(Number(s.sale_price), s.du_type, Number(s.du_value)) : 0;
        const profit = commission + du;

        return (
          <Card key={s.id} className="group hover:shadow-sm transition-shadow">
            <CardContent className="py-3 px-4">
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-start gap-3 min-w-0 flex-1">
                  <span className="text-2xl mt-0.5">{SERVICE_ICONS[s.service_type] || "📦"}</span>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-medium text-foreground">{SERVICE_TYPES[s.service_type] || s.service_type}</span>
                      <Badge className={`${statusColors[s.status] || ""} border-0 text-[10px]`}>
                        {statusLabels[s.status] || s.status}
                      </Badge>
                    </div>
                    {s.description && <p className="text-sm text-muted-foreground truncate mt-0.5">{s.description}</p>}
                    <p className="text-xs text-muted-foreground mt-1">
                      Fornecedor: {s.supplier?.name || "—"}
                      {s.expected_commission_date && ` • Comissão: ${format(new Date(s.expected_commission_date + "T00:00:00"), "dd/MM/yyyy")}`}
                    </p>
                  </div>
                </div>
                <div className="text-right shrink-0">
                  <p className="font-semibold text-foreground">R$ {fmt(Number(s.sale_price))}</p>
                  {taxes > 0 && <p className="text-xs text-muted-foreground">Taxas: R$ {fmt(taxes)}</p>}
                  <p className="text-xs text-muted-foreground">Custo: R$ {fmt(Number(s.cost_price))}</p>
                  <p className={`text-xs font-medium ${profit >= 0 ? "text-emerald-600" : "text-red-500"}`}>
                    Lucro: R$ {fmt(profit)}
                    {isAereo && du > 0 && <span className="text-muted-foreground font-normal"> (Com+DU)</span>}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-1 mt-2 justify-end opacity-0 group-hover:opacity-100 transition-opacity">
                <Button variant="ghost" size="sm" className="h-7 px-2 text-xs gap-1" onClick={() => setEditingId(s.id)}>
                  <Pencil className="h-3 w-3" /> Editar
                </Button>
                <Button variant="ghost" size="sm" className="h-7 px-2 text-xs gap-1" onClick={() => onDuplicate(s)}>
                  <Copy className="h-3 w-3" /> Duplicar
                </Button>
                <Button variant="ghost" size="sm" className="h-7 px-2 text-xs gap-1 text-destructive" onClick={() => onDelete(s.id)}>
                  <Trash2 className="h-3 w-3" /> Remover
                </Button>
              </div>
            </CardContent>
          </Card>
        );
      })}

      {showForm ? (
        <ServiceForm
          bookingId={bookingId}
          onSubmit={(v) => { handleAddWithCommission(v); setShowForm(false); }}
          onCancel={() => setShowForm(false)}
          isLoading={isAdding}
        />
      ) : (
        <Button variant="outline" onClick={() => setShowForm(true)} className="w-full gap-2 border-dashed">
          <Plus className="h-4 w-4" /> Adicionar Serviço
        </Button>
      )}
    </div>
  );
}
