import { useState } from "react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Plus, Trash2, CheckCircle2, Clock, AlertTriangle, Loader2, Pencil } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useFinancial } from "@/hooks/useFinancial";
import { PAYMENT_METHODS } from "@/types/financial";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

export function EntradasManager() {
  const { incomeEntries, sales, createIncome, updateIncome, deleteIncome, isCreating, isUpdating } = useFinancial();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    sale_id: "" as string | null,
    amount: 0,
    entry_date: new Date().toISOString().split("T")[0],
    payment_method: "pix",
    notes: "",
    status: "received" as string,
    expected_date: "",
  });

  const formatCurrency = (value: number) =>
    new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value);

  const today = new Date().toISOString().split("T")[0];
  const monthStart = new Date();
  monthStart.setDate(1);
  const monthStartStr = monthStart.toISOString().split("T")[0];

  const received = incomeEntries.filter(e => (e as any).status === "received" || !(e as any).status);
  const pending = incomeEntries.filter(e => (e as any).status === "pending");
  const overdue = incomeEntries.filter(e => {
    const s = (e as any).status;
    const exp = (e as any).expected_date;
    return s === "pending" && exp && exp < today;
  });

  const totalReceived = received.filter(e => e.entry_date >= monthStartStr).reduce((sum, e) => sum + Number(e.amount), 0);
  const totalPending = pending.reduce((sum, e) => sum + Number(e.amount), 0);
  const totalOverdue = overdue.reduce((sum, e) => sum + Number(e.amount), 0);

  const resetForm = () => {
    setFormData({ sale_id: null, amount: 0, entry_date: new Date().toISOString().split("T")[0], payment_method: "pix", notes: "", status: "received", expected_date: "" });
    setEditingId(null);
  };

  const openEdit = (entry: typeof incomeEntries[0]) => {
    setEditingId(entry.id);
    setFormData({
      sale_id: entry.sale_id || null,
      amount: Number(entry.amount),
      entry_date: entry.entry_date,
      payment_method: entry.payment_method,
      notes: entry.notes || "",
      status: (entry as any).status || "received",
      expected_date: (entry as any).expected_date || "",
    });
    setIsDialogOpen(true);
  };

  const handleSubmit = async () => {
    const payload = {
      sale_id: formData.sale_id || null,
      amount: formData.amount,
      entry_date: formData.entry_date,
      payment_method: formData.payment_method,
      notes: formData.notes || undefined,
    };
    if (editingId) {
      await updateIncome({ id: editingId, ...payload });
    } else {
      await createIncome(payload);
    }
    setIsDialogOpen(false);
    resetForm();
  };

  const markAsReceived = async (id: string) => {
    const { error } = await supabase
      .from("income_entries")
      .update({ status: "received", entry_date: today } as any)
      .eq("id", id);
    if (error) {
      toast({ title: "Erro", description: error.message, variant: "destructive" });
    } else {
      queryClient.invalidateQueries({ queryKey: ["income_entries"] });
      queryClient.invalidateQueries({ queryKey: ["commissions-receivable"] });
      queryClient.invalidateQueries({ queryKey: ["sale_products"] });
      toast({ title: "✅ Entrada recebida!", description: "Valor marcado como recebido." });
    }
  };

  const handleDelete = async () => { if (deleteId) { await deleteIncome(deleteId); setDeleteId(null); } };
  const isSaving = isCreating || isUpdating;

  const getStatusBadge = (entry: any) => {
    const status = entry.status || "received";
    const expectedDate = entry.expected_date;
    const isOverdue = status === "pending" && expectedDate && expectedDate < today;
    if (isOverdue) return <Badge className="bg-destructive/10 text-destructive border-destructive/20 gap-1"><AlertTriangle className="h-3 w-3" />Atrasada</Badge>;
    if (status === "pending") return <Badge className="bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20 gap-1"><Clock className="h-3 w-3" />A receber</Badge>;
    return <Badge className="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20 gap-1"><CheckCircle2 className="h-3 w-3" />Recebida</Badge>;
  };

  const renderEntryList = (entries: typeof incomeEntries, showMarkButton = false) => (
    <div className="space-y-2">
      {entries.length === 0 ? (
        <div className="border rounded-lg p-8 text-center text-muted-foreground">Nenhuma entrada encontrada</div>
      ) : (
        entries.map((entry) => (
          <div key={entry.id} className="border rounded-lg p-4 flex items-center justify-between gap-4">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-medium">{entry.sale?.client_name || entry.notes || "Entrada manual"}</span>
                {getStatusBadge(entry)}
                {(entry as any).source === "auto" && (
                  <Badge variant="outline" className="text-xs gap-1 border-primary/30 text-primary">⚡ Automática</Badge>
                )}
              </div>
              <div className="text-sm text-muted-foreground mt-1 flex items-center gap-2 flex-wrap">
                <span>{format(new Date(entry.entry_date), "dd/MM/yyyy", { locale: ptBR })}</span>
                {(entry as any).expected_date && (entry as any).status === "pending" && (
                  <><span>•</span><span>Previsto: {format(new Date((entry as any).expected_date + "T12:00:00"), "dd/MM/yyyy", { locale: ptBR })}</span></>
                )}
                <span>•</span>
                <span>{PAYMENT_METHODS[entry.payment_method] || entry.payment_method}</span>
                {entry.sale?.destination && (<><span>•</span><span>{entry.sale.destination}</span></>)}
              </div>
            </div>
            <div className="flex items-center gap-3 shrink-0">
              <span className="text-lg font-bold text-emerald-600 dark:text-emerald-400">{formatCurrency(Number(entry.amount))}</span>
              {showMarkButton && (entry as any).status === "pending" && (
                <Button variant="outline" size="sm" className="text-emerald-600 border-emerald-500/30 hover:bg-emerald-500/10" onClick={() => markAsReceived(entry.id)}>
                  <CheckCircle2 className="h-4 w-4 mr-1" /> Recebido
                </Button>
              )}
              <Button variant="ghost" size="icon" onClick={() => openEdit(entry)}>
                <Pencil className="h-4 w-4 text-muted-foreground" />
              </Button>
              <Button variant="ghost" size="icon" onClick={() => setDeleteId(entry.id)}>
                <Trash2 className="h-4 w-4 text-destructive" />
              </Button>
            </div>
          </div>
        ))
      )}
    </div>
  );

  return (
    <div className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-3">
        <Card><CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-emerald-500" />Já no bolso</CardTitle></CardHeader><CardContent><div className="text-xl font-bold text-emerald-600 dark:text-emerald-400">{formatCurrency(totalReceived)}</div><p className="text-xs text-muted-foreground">este mês</p></CardContent></Card>
        <Card><CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground flex items-center gap-2"><Clock className="h-4 w-4 text-amber-500" />A caminho</CardTitle></CardHeader><CardContent><div className="text-xl font-bold text-amber-600 dark:text-amber-400">{formatCurrency(totalPending)}</div><p className="text-xs text-muted-foreground">{pending.length} pendente{pending.length !== 1 ? "s" : ""}</p></CardContent></Card>
        <Card className={cn(totalOverdue > 0 && "ring-1 ring-destructive/30")}><CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground flex items-center gap-2"><AlertTriangle className="h-4 w-4 text-destructive" />Atrasadas</CardTitle></CardHeader><CardContent><div className={cn("text-xl font-bold", totalOverdue > 0 ? "text-destructive" : "text-muted-foreground")}>{formatCurrency(totalOverdue)}</div><p className="text-xs text-muted-foreground">{overdue.length} entrada{overdue.length !== 1 ? "s" : ""}</p></CardContent></Card>
      </div>

      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">Entradas</h3>
        <Button onClick={() => { resetForm(); setIsDialogOpen(true); }}>
          <Plus className="h-4 w-4 mr-2" /> Nova Entrada
        </Button>
      </div>

      <Tabs defaultValue="todas" className="space-y-4">
        <TabsList>
          <TabsTrigger value="todas">Todas</TabsTrigger>
          <TabsTrigger value="pendentes" className="gap-1">
            A Receber
            {pending.length > 0 && <Badge variant="secondary" className="ml-1 h-5 px-1.5 text-xs">{pending.length}</Badge>}
          </TabsTrigger>
          <TabsTrigger value="recebidas">Recebidas</TabsTrigger>
        </TabsList>
        <TabsContent value="todas">{renderEntryList(incomeEntries, true)}</TabsContent>
        <TabsContent value="pendentes">{renderEntryList(pending, true)}</TabsContent>
        <TabsContent value="recebidas">{renderEntryList(received)}</TabsContent>
      </Tabs>

      <Dialog open={isDialogOpen} onOpenChange={(open) => { setIsDialogOpen(open); if (!open) resetForm(); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingId ? "Editar Entrada" : "Nova Entrada"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Tipo</Label>
              <Select value={formData.status} onValueChange={(v) => setFormData({ ...formData, status: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="received">💰 Já recebi</SelectItem>
                  <SelectItem value="pending">⏳ Vou receber</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {sales.length > 0 && (
              <div className="space-y-2">
                <Label>Venda vinculada (opcional)</Label>
                <Select value={formData.sale_id || "none"} onValueChange={(v) => setFormData({ ...formData, sale_id: v === "none" ? null : v })}>
                  <SelectTrigger><SelectValue placeholder="Selecione uma venda" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Sem vínculo</SelectItem>
                    {sales.map((sale) => (<SelectItem key={sale.id} value={sale.id}>{sale.client_name} - {sale.destination} ({formatCurrency(Number(sale.sale_amount))})</SelectItem>))}
                  </SelectContent>
                </Select>
              </div>
            )}
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>Valor</Label>
                <Input type="number" value={formData.amount} onChange={(e) => setFormData({ ...formData, amount: Number(e.target.value) })} placeholder="0,00" />
              </div>
              <div className="space-y-2">
                <Label>{formData.status === "pending" ? "Data prevista" : "Data"}</Label>
                <Input type="date" value={formData.status === "pending" ? formData.expected_date || formData.entry_date : formData.entry_date}
                  onChange={(e) => {
                    if (formData.status === "pending") setFormData({ ...formData, expected_date: e.target.value });
                    else setFormData({ ...formData, entry_date: e.target.value });
                  }} />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Forma de pagamento</Label>
              <Select value={formData.payment_method} onValueChange={(v) => setFormData({ ...formData, payment_method: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{Object.entries(PAYMENT_METHODS).map(([key, label]) => (<SelectItem key={key} value={key}>{label}</SelectItem>))}</SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Descrição / Observações</Label>
              <Textarea value={formData.notes} onChange={(e) => setFormData({ ...formData, notes: e.target.value })} placeholder="De onde vem esse dinheiro?" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setIsDialogOpen(false); resetForm(); }}>Cancelar</Button>
            <Button onClick={handleSubmit} disabled={isSaving || formData.amount <= 0}>
              {isSaving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              {editingId ? "Salvar" : "Criar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir entrada?</AlertDialogTitle>
            <AlertDialogDescription>Esta ação não pode ser desfeita.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete}>Excluir</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
