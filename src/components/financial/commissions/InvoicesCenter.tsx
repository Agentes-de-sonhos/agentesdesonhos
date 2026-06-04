import { useMemo, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { CommissionReceivable } from "@/hooks/useCommissionsReceivable";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { FileText, Send, Edit, FilePlus, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import { fmt, INVOICE_STATUS_LABEL, PRODUCT_LABEL, todayStr } from "./utils";

const STATUS_COLOR: Record<string, string> = {
  a_emitir: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
  emitida: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
  enviada: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400",
  dispensada: "bg-muted text-muted-foreground",
};

export function InvoicesCenter({ commissions }: { commissions: CommissionReceivable[] }) {
  const qc = useQueryClient();
  const [filter, setFilter] = useState<string>("all");
  const [editing, setEditing] = useState<CommissionReceivable | null>(null);
  const [confirmDispense, setConfirmDispense] = useState<CommissionReceivable | null>(null);

  const needsInvoice = useMemo(
    () => commissions.filter(c => c.requires_invoice && c.status !== "cancelado"),
    [commissions],
  );

  const counts = useMemo(() => ({
    all: needsInvoice.length,
    a_emitir: needsInvoice.filter(c => (c.invoice_status || "a_emitir") === "a_emitir").length,
    emitida: needsInvoice.filter(c => c.invoice_status === "emitida").length,
    enviada: needsInvoice.filter(c => c.invoice_status === "enviada").length,
    dispensada: needsInvoice.filter(c => c.invoice_status === "dispensada").length,
  }), [needsInvoice]);

  const filtered = useMemo(() => {
    if (filter === "all") return needsInvoice;
    return needsInvoice.filter(c => (c.invoice_status || "a_emitir") === filter);
  }, [needsInvoice, filter]);

  const mutate = useMutation({
    mutationFn: async ({ id, values }: { id: string; values: Record<string, any> }) => {
      const { error } = await supabase.from("sale_products").update(values).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["commissions-receivable"] });
      toast.success("Nota fiscal atualizada com sucesso");
    },
    onError: (err: any) =>
      toast.error("Não foi possível atualizar a nota fiscal", {
        description: err?.message ? "Tente novamente em instantes." : undefined,
      }),
  });

  const markIssued = (c: CommissionReceivable) =>
    mutate.mutate({ id: c.id, values: { invoice_status: "emitida", invoice_issued_date: todayStr(), commission_status: "aguardando_envio_nota" } });
  const markSent = (c: CommissionReceivable) =>
    mutate.mutate({ id: c.id, values: { invoice_status: "enviada", invoice_sent_date: todayStr(), commission_status: "aguardando_pagamento" } });
  const markDispensed = (c: CommissionReceivable) =>
    mutate.mutate({ id: c.id, values: { invoice_status: "dispensada" } });

  const tabs: { key: string; label: string }[] = [
    { key: "all", label: `Todas (${counts.all})` },
    { key: "a_emitir", label: `A Emitir (${counts.a_emitir})` },
    { key: "emitida", label: `Emitidas (${counts.emitida})` },
    { key: "enviada", label: `Enviadas (${counts.enviada})` },
    { key: "dispensada", label: `Dispensadas (${counts.dispensada})` },
  ];

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 flex-wrap">
        {tabs.map(t => (
          <button key={t.key}
            onClick={() => setFilter(t.key)}
            className={`px-3 py-1.5 rounded-md text-xs font-medium border ${filter === t.key ? "bg-primary text-primary-foreground border-primary" : "bg-background text-muted-foreground hover:bg-muted"}`}>
            {t.label}
          </button>
        ))}
      </div>

      <Card>
        <div className="overflow-x-auto">
          <table className="w-full text-sm min-w-[900px]">
            <thead>
              <tr className="border-b bg-muted/50">
                <th className="text-left p-3 font-medium text-muted-foreground">Fornecedor</th>
                <th className="text-left p-3 font-medium text-muted-foreground">Cliente</th>
                <th className="text-left p-3 font-medium text-muted-foreground">Produto</th>
                <th className="text-right p-3 font-medium text-muted-foreground">Comissão</th>
                <th className="text-center p-3 font-medium text-muted-foreground">Status NF</th>
                <th className="text-left p-3 font-medium text-muted-foreground">Previsão</th>
                <th className="text-center p-3 font-medium text-muted-foreground">Ações</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr><td colSpan={7} className="p-10 text-center">
                  <div className="space-y-1">
                    <FileText className="h-6 w-6 mx-auto text-muted-foreground/60" />
                    <p className="text-sm font-medium">Nenhuma nota fiscal encontrada para os filtros selecionados.</p>
                    <p className="text-xs text-muted-foreground">
                      Marque "Requer nota fiscal" ao cadastrar produtos para acompanhá-las aqui.
                    </p>
                  </div>
                </td></tr>
              ) : filtered.map(c => {
                const status = c.invoice_status || "a_emitir";
                return (
                  <tr key={c.id} className="border-b hover:bg-muted/30">
                    <td className="p-3 font-medium">{c.supplier_name || "—"}</td>
                    <td className="p-3">{c.client_name}</td>
                    <td className="p-3">{PRODUCT_LABEL[c.product_type] || c.product_type}</td>
                    <td className="p-3 text-right font-semibold text-primary">R$ {fmt(c.commission_amount)}</td>
                    <td className="p-3 text-center">
                      <Badge className={`${STATUS_COLOR[status]} border-0 text-[10px]`}>{INVOICE_STATUS_LABEL[status]}</Badge>
                      {c.invoice_number && <p className="text-[10px] text-muted-foreground mt-0.5">#{c.invoice_number}</p>}
                    </td>
                    <td className="p-3 text-xs">{c.expected_date ? format(new Date(c.expected_date + "T00:00:00"), "dd/MM/yyyy") : "—"}</td>
                    <td className="p-3">
                      <div className="flex items-center justify-center gap-1 flex-wrap">
                        {status === "a_emitir" && (
                          <Button size="sm" variant="ghost" className="h-7 px-2 text-[11px]" disabled={mutate.isPending}
                            onClick={() => markIssued(c)} title="Marca como emitida e registra a data de hoje">
                            <FilePlus className="h-3.5 w-3.5 mr-1" /> Emitir
                          </Button>
                        )}
                        {status === "emitida" && (
                          <Button size="sm" variant="ghost" className="h-7 px-2 text-[11px]" disabled={mutate.isPending}
                            onClick={() => markSent(c)} title="Marca como enviada e registra a data de hoje">
                            <Send className="h-3.5 w-3.5 mr-1" /> Enviar
                          </Button>
                        )}
                        {status !== "dispensada" && (
                          <Button size="sm" variant="ghost" className="h-7 px-2 text-[11px]" disabled={mutate.isPending}
                            onClick={() => setConfirmDispense(c)} title="Marcar como dispensada (não exige nota fiscal)">
                            Dispensar
                          </Button>
                        )}
                        <Button size="sm" variant="ghost" className="h-7 px-2 text-[11px]" disabled={mutate.isPending}
                          onClick={() => setEditing(c)} title="Editar número e datas da nota fiscal">
                          <Edit className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Card>

      {editing && (
        <EditInvoiceDialog
          commission={editing}
          onClose={() => setEditing(null)}
          onSave={(values) => {
            mutate.mutate({ id: editing.id, values });
            setEditing(null);
          }}
          isSaving={mutate.isPending}
        />
      )}

      <AlertDialog open={!!confirmDispense} onOpenChange={(v) => !v && setConfirmDispense(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Dispensar nota fiscal?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação marcará esta comissão como dispensada de nota fiscal. Use apenas
              quando o fornecedor não exigir NF para pagamento.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (confirmDispense) markDispensed(confirmDispense);
                setConfirmDispense(null);
              }}
            >
              Confirmar dispensa
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function EditInvoiceDialog({ commission, onClose, onSave, isSaving }: {
  commission: CommissionReceivable;
  onClose: () => void;
  onSave: (v: Record<string, any>) => void;
  isSaving: boolean;
}) {
  const [status, setStatus] = useState(commission.invoice_status || "a_emitir");
  const [number, setNumber] = useState(commission.invoice_number || "");
  const [issued, setIssued] = useState(commission.invoice_issued_date || "");
  const [sent, setSent] = useState(commission.invoice_sent_date || "");

  return (
    <Dialog open onOpenChange={(v) => !v && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2"><FileText className="h-4 w-4" /> Editar Nota Fiscal</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div>
            <Label className="text-xs">Status da NF</Label>
            <select value={status} onChange={(e) => setStatus(e.target.value)} className="mt-1 flex h-9 w-full rounded-md border border-input bg-background px-2 text-sm">
              <option value="a_emitir">A Emitir</option>
              <option value="emitida">Emitida</option>
              <option value="enviada">Enviada</option>
              <option value="dispensada">Dispensada</option>
            </select>
          </div>
          <div>
            <Label className="text-xs">Número da NF</Label>
            <Input value={number} onChange={(e) => setNumber(e.target.value)} placeholder="Ex: 12345" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs">Data emissão</Label>
              <Input type="date" value={issued} onChange={(e) => setIssued(e.target.value)} />
            </div>
            <div>
              <Label className="text-xs">Data envio</Label>
              <Input type="date" value={sent} onChange={(e) => setSent(e.target.value)} />
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancelar</Button>
          <Button disabled={isSaving} onClick={() => onSave({
            invoice_status: status,
            invoice_number: number || null,
            invoice_issued_date: issued || null,
            invoice_sent_date: sent || null,
          })}>
            {isSaving && <Loader2 className="h-4 w-4 animate-spin mr-1" />} Salvar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}