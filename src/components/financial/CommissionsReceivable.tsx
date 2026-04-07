import { useState, useMemo } from "react";
import { useCommissionsReceivable, CommissionReceivable } from "@/hooks/useCommissionsReceivable";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useFinancialExport } from "@/hooks/useFinancialExport";
import { ExportButton, ExportModal, type ExportFormat } from "@/components/financial/ExportModal";
import { exportFinancialData, prepareCommissionsExport } from "@/utils/financialExport";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, CheckCircle, FileText, AlertTriangle, Clock, DollarSign, Filter, ChevronDown, ChevronUp, MessageSquare } from "lucide-react";
import { PRODUCT_TYPES } from "@/types/financial";
import { format } from "date-fns";
import { toast } from "sonner";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";

const fmt = (v: number) => v.toLocaleString("pt-BR", { minimumFractionDigits: 2 });

const COMMISSION_STATUSES: Record<string, { label: string; color: string; icon: string }> = {
  previsao_criada: { label: "Previsão Criada", color: "bg-muted text-muted-foreground", icon: "📋" },
  aguardando_emissao_nota: { label: "Aguardando Emissão NF", color: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400", icon: "📄" },
  aguardando_envio_nota: { label: "Aguardando Envio NF", color: "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400", icon: "📤" },
  aguardando_pagamento: { label: "Aguardando Pagamento", color: "bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-400", icon: "⏳" },
  recebido: { label: "Recebido", color: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400", icon: "✅" },
  atrasado: { label: "Atrasado", color: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400", icon: "🚨" },
  cancelado: { label: "Cancelado", color: "bg-red-50 text-red-500 dark:bg-red-900/20 dark:text-red-400", icon: "❌" },
};

const PAYMENT_RULES: Record<string, string> = {
  after_sale: "Após a venda",
  after_travel: "Após a viagem",
  after_invoice_issued: "Após emissão NF",
  after_invoice_sent: "Após envio NF",
  manual: "Data manual",
};

const INVOICE_STATUSES: Record<string, string> = {
  a_emitir: "A emitir",
  emitida: "Emitida",
  enviada: "Enviada",
};

const today = () => new Date().toISOString().slice(0, 10);
const in7days = () => {
  const d = new Date();
  d.setDate(d.getDate() + 7);
  return d.toISOString().slice(0, 10);
};

function isOverdue(c: CommissionReceivable) {
  return c.status !== "recebido" && c.status !== "cancelado" && c.expected_date && c.expected_date < today();
}

function isDueToday(c: CommissionReceivable) {
  return c.status !== "recebido" && c.status !== "cancelado" && c.expected_date === today();
}

function isDueIn7Days(c: CommissionReceivable) {
  const t = today();
  const d7 = in7days();
  return c.status !== "recebido" && c.status !== "cancelado" && c.expected_date && c.expected_date >= t && c.expected_date <= d7;
}

function SummaryCards({ commissions }: { commissions: CommissionReceivable[] }) {
  const active = commissions.filter(c => c.status !== "cancelado");
  const totalPrevisto = active.filter(c => c.status !== "recebido").reduce((s, c) => s + c.commission_amount, 0);
  const totalAguardandoNF = active.filter(c => c.status === "aguardando_emissao_nota" || c.status === "aguardando_envio_nota").reduce((s, c) => s + c.commission_amount, 0);
  const totalAguardandoPgto = active.filter(c => c.status === "aguardando_pagamento").reduce((s, c) => s + c.commission_amount, 0);
  const totalAtrasado = active.filter(c => isOverdue(c)).reduce((s, c) => s + c.commission_amount, 0);

  const now = new Date();
  const monthStart = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-01`;
  const totalRecebidoMes = active.filter(c => c.status === "recebido" && c.received_date && c.received_date >= monthStart).reduce((s, c) => s + c.commission_amount, 0);

  const cards = [
    { label: "A Receber", value: totalPrevisto, color: "text-violet-600 dark:text-violet-400", icon: DollarSign },
    { label: "Aguardando NF", value: totalAguardandoNF, color: "text-amber-600 dark:text-amber-400", icon: FileText },
    { label: "Aguardando Pagamento", value: totalAguardandoPgto, color: "text-blue-600 dark:text-blue-400", icon: Clock },
    { label: "Atrasado", value: totalAtrasado, color: "text-red-600 dark:text-red-400", icon: AlertTriangle },
    { label: "Recebido (mês)", value: totalRecebidoMes, color: "text-emerald-600 dark:text-emerald-400", icon: CheckCircle },
  ];

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
      {cards.map((c) => (
        <Card key={c.label}>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-1">
              <c.icon className={`h-4 w-4 ${c.color}`} />
              <span className="text-xs text-muted-foreground">{c.label}</span>
            </div>
            <p className={`text-lg font-bold ${c.color}`}>R$ {fmt(c.value)}</p>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

function NoteDialog({ commission, open, onOpenChange }: { commission: CommissionReceivable; open: boolean; onOpenChange: (v: boolean) => void }) {
  const qc = useQueryClient();
  const [note, setNote] = useState(commission.internal_notes || "");
  const mutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("sale_products").update({ internal_notes: note } as any).eq("id", commission.id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["commissions-receivable"] });
      toast.success("Observação salva");
      onOpenChange(false);
    },
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader><DialogTitle>Observações - Comissão</DialogTitle></DialogHeader>
        <Textarea value={note} onChange={(e) => setNote(e.target.value)} className="min-h-[100px]" placeholder="Anotações sobre esta comissão..." />
        <div className="flex justify-end gap-2">
          <Button variant="outline" size="sm" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button size="sm" onClick={() => mutation.mutate()} disabled={mutation.isPending}>
            {mutation.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" /> : null}
            Salvar
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export function CommissionsReceivable() {
  const { data: commissions = [], isLoading } = useCommissionsReceivable();
  const { showExport, setShowExport, agencyName } = useFinancialExport("Comissões");
  const handleExportCommissions = async (period: { start: Date; end: Date }, fmt: ExportFormat) => {
    const { columns, rows, totals } = prepareCommissionsExport(filtered, period);
    await exportFinancialData({ tabLabel: "Comissões", columns, rows, period, agencyName, totals }, fmt);
  };
  const qc = useQueryClient();
  const [showFilters, setShowFilters] = useState(false);
  const [noteCommission, setNoteCommission] = useState<CommissionReceivable | null>(null);

  const [filterStatus, setFilterStatus] = useState("all");
  const [filterInvoice, setFilterInvoice] = useState("all");
  const [filterProductType, setFilterProductType] = useState("all");
  const [filterSupplier, setFilterSupplier] = useState("");
  const [filterClient, setFilterClient] = useState("");
  const [filterQuickDate, setFilterQuickDate] = useState("all");
  const [filterDateFrom, setFilterDateFrom] = useState("");
  const [filterDateTo, setFilterDateTo] = useState("");

  const updateCommission = useMutation({
    mutationFn: async ({ id, ...values }: { id: string } & Record<string, any>) => {
      // Map status to commission_status column
      const updateData: any = { ...values };
      if (updateData.status) {
        updateData.commission_status = updateData.status;
        delete updateData.status;
      }
      const { error } = await supabase.from("sale_products").update(updateData).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["commissions-receivable"] });
      qc.invalidateQueries({ queryKey: ["sale_products"] });
      toast.success("Comissão atualizada");
    },
    onError: () => toast.error("Erro ao atualizar"),
  });

  const productTypes = useMemo(() => {
    const set = new Set<string>();
    commissions.forEach(c => set.add(c.product_type));
    return Array.from(set);
  }, [commissions]);

  const filtered = useMemo(() => {
    return commissions.filter(c => {
      if (filterStatus !== "all") {
        if (filterStatus === "atrasado") { if (!isOverdue(c)) return false; }
        else if (c.status !== filterStatus) return false;
      }
      if (filterInvoice !== "all") {
        if (filterInvoice === "n_a" && c.requires_invoice) return false;
        if (filterInvoice !== "n_a" && c.invoice_status !== filterInvoice) return false;
      }
      if (filterProductType !== "all" && c.product_type !== filterProductType) return false;
      if (filterSupplier) {
        if (!(c.supplier_name || "").toLowerCase().includes(filterSupplier.toLowerCase())) return false;
      }
      if (filterClient) {
        if (!c.client_name.toLowerCase().includes(filterClient.toLowerCase())) return false;
      }
      if (filterQuickDate === "today" && !isDueToday(c)) return false;
      if (filterQuickDate === "7days" && !isDueIn7Days(c)) return false;
      if (filterQuickDate === "overdue" && !isOverdue(c)) return false;
      if (filterQuickDate === "received" && c.status !== "recebido") return false;
      if (filterQuickDate === "not_received" && c.status === "recebido") return false;
      if (filterDateFrom && c.expected_date && c.expected_date < filterDateFrom) return false;
      if (filterDateTo && c.expected_date && c.expected_date > filterDateTo) return false;
      return true;
    });
  }, [commissions, filterStatus, filterInvoice, filterProductType, filterSupplier, filterClient, filterQuickDate, filterDateFrom, filterDateTo]);

  if (isLoading) {
    return <div className="flex items-center justify-center py-12"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;
  }

  return (
    <div className="space-y-6">
      <SummaryCards commissions={commissions} />

      <ExportModal open={showExport} onOpenChange={setShowExport} tabName="Comissões" onExport={handleExportCommissions} />
      <div className="flex items-center justify-between">
        <Button variant="outline" size="sm" onClick={() => setShowFilters(!showFilters)} className="gap-2">
          <Filter className="h-4 w-4" /> Filtros
          {showFilters ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
        </Button>
        <div className="flex items-center gap-2">
          <ExportButton onClick={() => setShowExport(true)} />
          <span className="text-sm text-muted-foreground">{filtered.length} comissão(ões)</span>
        </div>
      </div>

      {showFilters && (
        <Card>
          <CardContent className="p-4 grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
            <div>
              <Label className="text-xs">Status</Label>
              <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)} className="mt-1 flex h-9 w-full rounded-md border border-input bg-background px-2 py-1 text-sm">
                <option value="all">Todos</option>
                {Object.entries(COMMISSION_STATUSES).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
                <option value="atrasado">Atrasado</option>
              </select>
            </div>
            <div>
              <Label className="text-xs">Status NF</Label>
              <select value={filterInvoice} onChange={(e) => setFilterInvoice(e.target.value)} className="mt-1 flex h-9 w-full rounded-md border border-input bg-background px-2 py-1 text-sm">
                <option value="all">Todos</option>
                <option value="n_a">N/A</option>
                {Object.entries(INVOICE_STATUSES).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
              </select>
            </div>
            <div>
              <Label className="text-xs">Tipo Produto</Label>
              <select value={filterProductType} onChange={(e) => setFilterProductType(e.target.value)} className="mt-1 flex h-9 w-full rounded-md border border-input bg-background px-2 py-1 text-sm">
                <option value="all">Todos</option>
                {productTypes.map(t => <option key={t} value={t}>{PRODUCT_TYPES[t as keyof typeof PRODUCT_TYPES] || t}</option>)}
              </select>
            </div>
            <div>
              <Label className="text-xs">Fornecedor</Label>
              <Input value={filterSupplier} onChange={(e) => setFilterSupplier(e.target.value)} placeholder="Buscar..." className="mt-1 h-9" />
            </div>
            <div>
              <Label className="text-xs">Cliente</Label>
              <Input value={filterClient} onChange={(e) => setFilterClient(e.target.value)} placeholder="Buscar..." className="mt-1 h-9" />
            </div>
            <div>
              <Label className="text-xs">Período Rápido</Label>
              <select value={filterQuickDate} onChange={(e) => setFilterQuickDate(e.target.value)} className="mt-1 flex h-9 w-full rounded-md border border-input bg-background px-2 py-1 text-sm">
                <option value="all">Todos</option>
                <option value="today">Vencendo hoje</option>
                <option value="7days">Próximos 7 dias</option>
                <option value="overdue">Atrasados</option>
                <option value="received">Recebidos</option>
                <option value="not_received">Não recebidos</option>
              </select>
            </div>
            <div>
              <Label className="text-xs">Data de</Label>
              <Input type="date" value={filterDateFrom} onChange={(e) => setFilterDateFrom(e.target.value)} className="mt-1 h-9" />
            </div>
            <div>
              <Label className="text-xs">Data até</Label>
              <Input type="date" value={filterDateTo} onChange={(e) => setFilterDateTo(e.target.value)} className="mt-1 h-9" />
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <ScrollArea className="w-full">
          <div className="min-w-[1000px]">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/50">
                  <th className="text-left p-3 font-medium text-muted-foreground">Cliente</th>
                  <th className="text-left p-3 font-medium text-muted-foreground">Produto</th>
                  <th className="text-left p-3 font-medium text-muted-foreground">Fornecedor</th>
                  <th className="text-right p-3 font-medium text-muted-foreground">Venda</th>
                  <th className="text-right p-3 font-medium text-muted-foreground">Comissão</th>
                  <th className="text-center p-3 font-medium text-muted-foreground">NF</th>
                  <th className="text-left p-3 font-medium text-muted-foreground">Regra Pgto</th>
                  <th className="text-left p-3 font-medium text-muted-foreground">Previsão</th>
                  <th className="text-center p-3 font-medium text-muted-foreground">Status</th>
                  <th className="text-center p-3 font-medium text-muted-foreground">Ações</th>
                </tr>
              </thead>
              <tbody>
                {filtered.length === 0 ? (
                  <tr>
                    <td colSpan={10} className="p-8 text-center text-muted-foreground">
                      Nenhuma comissão encontrada. Adicione produtos às suas vendas para ver as comissões aqui.
                    </td>
                  </tr>
                ) : filtered.map((c) => {
                  const overdue = isOverdue(c);
                  const taxes = Number(c.non_commissionable_taxes) || 0;
                  const baseComm = Number(c.sale_price) - taxes;
                  const statusInfo = overdue
                    ? COMMISSION_STATUSES.atrasado
                    : (COMMISSION_STATUSES[c.status] || COMMISSION_STATUSES.previsao_criada);

                  return (
                    <tr key={c.id} className={`border-b hover:bg-muted/30 transition-colors ${overdue ? "bg-red-50/50 dark:bg-red-950/10" : ""}`}>
                      <td className="p-3">
                        <p className="font-medium text-foreground">{c.client_name}</p>
                        <p className="text-xs text-muted-foreground truncate max-w-[140px]">{c.destination}</p>
                      </td>
                      <td className="p-3">
                        <p className="font-medium">{PRODUCT_TYPES[c.product_type as keyof typeof PRODUCT_TYPES] || c.product_type}</p>
                        {c.description && <p className="text-xs text-muted-foreground truncate max-w-[160px]">{c.description}</p>}
                      </td>
                      <td className="p-3 text-foreground">{c.supplier_name || "—"}</td>
                      <td className="p-3 text-right">
                        <p className="font-medium">R$ {fmt(Number(c.sale_price))}</p>
                        {taxes > 0 && <p className="text-xs text-muted-foreground">Taxas: {fmt(taxes)}</p>}
                        {taxes > 0 && <p className="text-xs text-muted-foreground">Base: {fmt(baseComm)}</p>}
                      </td>
                      <td className="p-3 text-right">
                        <p className="font-semibold text-primary">R$ {fmt(c.commission_amount)}</p>
                        {c.commission_type === "percentage" && (
                          <p className="text-xs text-muted-foreground">{c.commission_value}%</p>
                        )}
                      </td>
                      <td className="p-3 text-center">
                        {c.requires_invoice ? (
                          <div>
                            <Badge variant="outline" className="text-[10px]">
                              {INVOICE_STATUSES[c.invoice_status || "a_emitir"] || c.invoice_status}
                            </Badge>
                            {c.invoice_number && <p className="text-[10px] text-muted-foreground mt-0.5">#{c.invoice_number}</p>}
                          </div>
                        ) : (
                          <span className="text-xs text-muted-foreground">N/A</span>
                        )}
                      </td>
                      <td className="p-3">
                        <p className="text-xs">{PAYMENT_RULES[c.payment_rule] || "Manual"}</p>
                        {c.payment_rule !== "manual" && c.payment_days > 0 && <p className="text-[10px] text-muted-foreground">{c.payment_days} dias</p>}
                      </td>
                      <td className="p-3">
                        {c.expected_date ? (
                          <p className={`text-xs font-medium ${overdue ? "text-red-600" : "text-foreground"}`}>
                            {format(new Date(c.expected_date + "T00:00:00"), "dd/MM/yyyy")}
                          </p>
                        ) : <span className="text-xs text-muted-foreground">—</span>}
                        {c.received_date && <p className="text-[10px] text-emerald-600">Receb: {format(new Date(c.received_date + "T00:00:00"), "dd/MM/yyyy")}</p>}
                      </td>
                      <td className="p-3 text-center">
                        <Badge className={`${statusInfo.color} border-0 text-[10px]`}>
                          {statusInfo.icon} {statusInfo.label}
                        </Badge>
                      </td>
                      <td className="p-3">
                        <div className="flex items-center gap-0.5 justify-center flex-wrap">
                          {c.requires_invoice && c.status === "aguardando_emissao_nota" && (
                            <Button variant="ghost" size="sm" className="h-7 px-1.5 text-[10px]" title="Marcar NF emitida"
                              onClick={() => updateCommission.mutate({ id: c.id, status: "aguardando_envio_nota", invoice_status: "emitida" })}>
                              📄→
                            </Button>
                          )}
                          {c.requires_invoice && c.status === "aguardando_envio_nota" && (
                            <Button variant="ghost" size="sm" className="h-7 px-1.5 text-[10px]" title="Marcar NF enviada"
                              onClick={() => updateCommission.mutate({ id: c.id, status: "aguardando_pagamento", invoice_status: "enviada" })}>
                              📤→
                            </Button>
                          )}
                          {c.status !== "recebido" && c.status !== "cancelado" && (
                            <Button variant="ghost" size="sm" className="h-7 px-1.5 text-[10px] text-emerald-600" title="Marcar como recebido"
                              onClick={() => updateCommission.mutate({ id: c.id, status: "recebido", received_date: today() })}>
                              <CheckCircle className="h-3.5 w-3.5" />
                            </Button>
                          )}
                          <Button variant="ghost" size="sm" className="h-7 px-1.5 text-[10px]" title="Observações"
                            onClick={() => setNoteCommission(c)}>
                            <MessageSquare className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </ScrollArea>
      </Card>

      {noteCommission && (
        <NoteDialog
          commission={noteCommission}
          open={!!noteCommission}
          onOpenChange={(v) => !v && setNoteCommission(null)}
        />
      )}
    </div>
  );
}
