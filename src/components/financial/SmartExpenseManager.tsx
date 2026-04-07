import { useState, useMemo } from "react";
import { format } from "date-fns";
import { useFinancialExport } from "@/hooks/useFinancialExport";
import { ExportButton, ExportModal, type ExportFormat } from "@/components/financial/ExportModal";
import { exportFinancialData, prepareExpensesExport } from "@/utils/financialExport";
import { ptBR } from "date-fns/locale";
import { Plus, Trash2, Tag, Loader2, Repeat, Pencil, Filter } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useFinancial } from "@/hooks/useFinancial";
import { cn } from "@/lib/utils";

const EXPENSE_CATEGORIES_EXPANDED: Record<string, string> = {
  sistema: "Sistema / Software",
  marketing: "Marketing",
  internet: "Internet / Telefone",
  aluguel: "Aluguel",
  salarios: "Salários",
  cafe_reuniao: "Café / Reunião",
  presente_fornecedor: "Presente Fornecedor",
  taxas: "Taxas / Impostos",
  fornecedor: "Fornecedor",
  comissao: "Comissão",
  transporte: "Transporte",
  outros: "Outros",
};

interface ExpenseFormState {
  description: string;
  category: string;
  amount: number;
  entry_date: string;
  expense_type: string;
  is_recurring: boolean;
  notes: string;
}

export function SmartExpenseManager() {
  const { expenseEntries, createExpense, updateExpense, deleteExpense, isCreating, isUpdating } = useFinancial();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [sellerFilter, setSellerFilter] = useState<string>("all");
  const [formData, setFormData] = useState<ExpenseFormState>({
    description: "", category: "outros", amount: 0,
    entry_date: new Date().toISOString().split("T")[0],
    expense_type: "variable", is_recurring: false, notes: "",
  });

  // Extract unique seller names from commission expenses
  const sellerNames = useMemo(() => {
    const names = new Set<string>();
    expenseEntries.forEach(e => {
      if (e.category === 'comissao' && e.description.startsWith('Comissão - ')) {
        names.add(e.description.replace('Comissão - ', ''));
      }
    });
    return Array.from(names).sort();
  }, [expenseEntries]);

  const filteredExpenses = useMemo(() => {
    if (sellerFilter === "all") return expenseEntries;
    if (sellerFilter === "no_commission") return expenseEntries.filter(e => e.category !== 'comissao');
    return expenseEntries.filter(e => e.description === `Comissão - ${sellerFilter}`);
  }, [expenseEntries, sellerFilter]);

  const formatCurrency = (value: number) =>
    new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value);

  const monthStart = new Date();
  monthStart.setDate(1);
  const monthStartStr = monthStart.toISOString().split("T")[0];
  const monthlyExpenses = filteredExpenses.filter(e => e.entry_date >= monthStartStr);
  const totalMonth = monthlyExpenses.reduce((sum, e) => sum + Number(e.amount), 0);
  const fixedTotal = monthlyExpenses.filter(e => e.expense_type === "fixed").reduce((sum, e) => sum + Number(e.amount), 0);
  const variableTotal = monthlyExpenses.filter(e => e.expense_type !== "fixed").reduce((sum, e) => sum + Number(e.amount), 0);

  const suggestCategory = (desc: string) => {
    const d = desc.toLowerCase();
    if (d.includes("sistema") || d.includes("software") || d.includes("crm")) return "sistema";
    if (d.includes("market") || d.includes("anúncio") || d.includes("google") || d.includes("meta") || d.includes("facebook")) return "marketing";
    if (d.includes("internet") || d.includes("telefone") || d.includes("celular")) return "internet";
    if (d.includes("aluguel") || d.includes("sala") || d.includes("escritório")) return "aluguel";
    if (d.includes("salário") || d.includes("funcionário") || d.includes("colaborador")) return "salarios";
    if (d.includes("café") || d.includes("almoço") || d.includes("reunião") || d.includes("lanche")) return "cafe_reuniao";
    if (d.includes("presente") || d.includes("brinde") || d.includes("mimo")) return "presente_fornecedor";
    if (d.includes("taxa") || d.includes("imposto") || d.includes("darf") || d.includes("simples")) return "taxas";
    if (d.includes("uber") || d.includes("gasolina") || d.includes("estacionamento")) return "transporte";
    return null;
  };

  const handleDescriptionChange = (desc: string) => {
    const suggested = suggestCategory(desc);
    setFormData(prev => ({
      ...prev, description: desc,
      ...(suggested && prev.category === "outros" ? { category: suggested } : {}),
    }));
  };

  const resetForm = () => {
    setFormData({ description: "", category: "outros", amount: 0, entry_date: new Date().toISOString().split("T")[0], expense_type: "variable", is_recurring: false, notes: "" });
    setEditingId(null);
  };

  const openEdit = (entry: typeof expenseEntries[0]) => {
    setEditingId(entry.id);
    setFormData({
      description: entry.description, category: entry.category,
      amount: Number(entry.amount), entry_date: entry.entry_date,
      expense_type: entry.expense_type || "variable",
      is_recurring: entry.is_recurring || false, notes: entry.notes || "",
    });
    setIsDialogOpen(true);
  };

  const handleSubmit = async () => {
    const payload = {
      description: formData.description, category: formData.category as any,
      amount: formData.amount, entry_date: formData.entry_date,
      notes: formData.notes || undefined,
    };
    if (editingId) {
      await updateExpense({ id: editingId, ...payload });
    } else {
      await createExpense(payload);
    }
    setIsDialogOpen(false);
    resetForm();
  };

  const handleDelete = async () => { if (deleteId) { await deleteExpense(deleteId); setDeleteId(null); } };
  const isSaving = isCreating || isUpdating;

  return (
    <div className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-3">
        <Card><CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">Total do Mês</CardTitle></CardHeader><CardContent><div className="text-xl font-bold text-destructive">{formatCurrency(totalMonth)}</div></CardContent></Card>
        <Card><CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">Despesas Fixas</CardTitle></CardHeader><CardContent><div className="text-xl font-bold">{formatCurrency(fixedTotal)}</div></CardContent></Card>
        <Card><CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">Despesas Variáveis</CardTitle></CardHeader><CardContent><div className="text-xl font-bold">{formatCurrency(variableTotal)}</div></CardContent></Card>
      </div>

      <ExportModal open={showExport} onOpenChange={setShowExport} tabName="Despesas" onExport={handleExportExpenses} />
      <div className="flex items-center justify-between flex-wrap gap-2">
        <h3 className="text-lg font-semibold">Despesas</h3>
        <div className="flex items-center gap-2">
          <ExportButton onClick={() => setShowExport(true)} />
          {sellerNames.length > 0 && (
            <Select value={sellerFilter} onValueChange={setSellerFilter}>
              <SelectTrigger className="w-[180px] h-9">
                <Filter className="h-3.5 w-3.5 mr-1.5 text-muted-foreground" />
                <SelectValue placeholder="Filtrar" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas</SelectItem>
                <SelectItem value="no_commission">Sem comissões</SelectItem>
                {sellerNames.map(name => (
                  <SelectItem key={name} value={name}>Comissão - {name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
          <Button onClick={() => { resetForm(); setIsDialogOpen(true); }}>
            <Plus className="h-4 w-4 mr-2" /> Nova Despesa
          </Button>
        </div>
      </div>

      <div className="border rounded-lg">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Data</TableHead>
              <TableHead>Descrição</TableHead>
              <TableHead>Categoria</TableHead>
              <TableHead>Tipo</TableHead>
              <TableHead className="text-right">Valor</TableHead>
              <TableHead className="w-[80px]"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredExpenses.length === 0 ? (
              <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground py-8">Nenhuma despesa encontrada</TableCell></TableRow>
            ) : (
              filteredExpenses.map((entry) => (
                <TableRow key={entry.id}>
                  <TableCell>{format(new Date(entry.entry_date), "dd/MM/yyyy", { locale: ptBR })}</TableCell>
                  <TableCell className="flex items-center gap-2">
                    {entry.description}
                    {entry.is_recurring && <Repeat className="h-3 w-3 text-muted-foreground" />}
                  </TableCell>
                  <TableCell>
                    <Badge variant="secondary" className="gap-1"><Tag className="h-3 w-3" />{EXPENSE_CATEGORIES_EXPANDED[entry.category] || entry.category}</Badge>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline" className={cn("text-xs", entry.expense_type === "fixed" ? "border-blue-500/30 text-blue-600 dark:text-blue-400" : "")}>
                      {entry.expense_type === "fixed" ? "Fixa" : "Variável"}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right font-medium text-destructive">-{formatCurrency(Number(entry.amount))}</TableCell>
                  <TableCell>
                    <div className="flex items-center gap-0.5">
                      <Button variant="ghost" size="icon" onClick={() => openEdit(entry)}>
                        <Pencil className="h-4 w-4 text-muted-foreground" />
                      </Button>
                      <Button variant="ghost" size="icon" onClick={() => setDeleteId(entry.id)}>
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <Dialog open={isDialogOpen} onOpenChange={(open) => { setIsDialogOpen(open); if (!open) resetForm(); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingId ? "Editar Despesa" : "Nova Despesa"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Descrição</Label>
              <Input value={formData.description} onChange={(e) => handleDescriptionChange(e.target.value)} placeholder="Ex: Sistema CRM, Café com fornecedor..." />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>Categoria</Label>
                <Select value={formData.category} onValueChange={(v) => setFormData({ ...formData, category: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{Object.entries(EXPENSE_CATEGORIES_EXPANDED).map(([key, label]) => (<SelectItem key={key} value={key}>{label}</SelectItem>))}</SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Valor</Label>
                <Input type="number" value={formData.amount} onChange={(e) => setFormData({ ...formData, amount: Number(e.target.value) })} placeholder="0,00" />
              </div>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>Data</Label>
                <Input type="date" value={formData.entry_date} onChange={(e) => setFormData({ ...formData, entry_date: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label>Tipo</Label>
                <Select value={formData.expense_type} onValueChange={(v) => setFormData({ ...formData, expense_type: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="fixed">Fixa (recorrente)</SelectItem>
                    <SelectItem value="variable">Variável (eventual)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <Label>Observações</Label>
              <Textarea value={formData.notes} onChange={(e) => setFormData({ ...formData, notes: e.target.value })} placeholder="Observações opcionais" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setIsDialogOpen(false); resetForm(); }}>Cancelar</Button>
            <Button onClick={handleSubmit} disabled={isSaving || !formData.description || formData.amount <= 0}>
              {isSaving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              {editingId ? "Salvar" : "Criar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir despesa?</AlertDialogTitle>
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
