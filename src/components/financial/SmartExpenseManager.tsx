import { useState, useMemo } from "react";
import { format } from "date-fns";
import { useFinancialExport } from "@/hooks/useFinancialExport";
import { ExportModal, type ExportFormat } from "@/components/financial/ExportModal";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { exportFinancialData, prepareExpensesExport } from "@/utils/financialExport";
import { ptBR } from "date-fns/locale";
import { Plus, Trash2, Tag, Loader2, Repeat, Pencil, Filter, MoreHorizontal, Download, ArrowDownCircle } from "lucide-react";
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
import { projectExpensesForMonth, type ProjectedExpense } from "@/utils/expenseRecurrence";
import { parseLocalDate } from "@/lib/dateParsing";

import { EXPENSE_CATEGORIES, EXPENSE_CATEGORY_LABELS } from "@/types/financial";

interface ExpenseFormState {
  description: string;
  category: string;
  amount: number;
  entry_date: string;
  expense_type: string;
  is_recurring: boolean;
  notes: string;
  recurrence_end_type: "indefinite" | "until_date" | "occurrences";
  recurrence_end_date: string;
  recurrence_occurrences: number;
}

interface SmartExpenseManagerProps {
  viewMonth?: number; // 1-12
  viewYear?: number;
}

export function SmartExpenseManager({ viewMonth, viewYear }: SmartExpenseManagerProps = {}) {
  const { expenseEntries, createExpense, updateExpense, deleteExpense, isCreating, isUpdating } = useFinancial();
  const { showExport, setShowExport, agencyName } = useFinancialExport("Despesas");
  const handleExportExpenses = async (period: { start: Date; end: Date }, fmt: ExportFormat) => {
    const { columns, rows, totals } = prepareExpensesExport(filteredExpenses, period);
    await exportFinancialData({ tabLabel: "Despesas", columns, rows, period, agencyName, totals }, fmt);
  };
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [sellerFilter, setSellerFilter] = useState<string>("all");
  const [formData, setFormData] = useState<ExpenseFormState>({
    description: "", category: "outros", amount: 0,
    entry_date: new Date().toISOString().split("T")[0],
    expense_type: "variable", is_recurring: false, notes: "",
    recurrence_end_type: "indefinite", recurrence_end_date: "", recurrence_occurrences: 12,
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

  // Filter by seller first
  const sellerFilteredExpenses = useMemo(() => {
    if (sellerFilter === "all") return expenseEntries;
    if (sellerFilter === "no_commission") return expenseEntries.filter(e => e.category !== 'comissao');
    return expenseEntries.filter(e => e.description === `Comissão - ${sellerFilter}`);
  }, [expenseEntries, sellerFilter]);

  // Bounds of the selected month (falls back to current month if props not provided)
  const now = new Date();
  const effMonth = viewMonth ?? now.getMonth() + 1;
  const effYear = viewYear ?? now.getFullYear();
  const monthPrefix = `${effYear}-${String(effMonth).padStart(2, "0")}`;

  // Projeção do mês selecionado:
  //  - Despesas variáveis aparecem apenas no mês de origem.
  //  - Despesas fixas + recorrentes se projetam para os meses futuros,
  //    respeitando o término configurado (indeterminado / até data / nº parcelas).
  const filteredExpenses = useMemo<ProjectedExpense[]>(
    () => projectExpensesForMonth(sellerFilteredExpenses, effYear, effMonth)
      .sort((a, b) => (b.entry_date || "").localeCompare(a.entry_date || "")),
    [sellerFilteredExpenses, effYear, effMonth]
  );

  const formatCurrency = (value: number) =>
    new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value);

  const totalMonth = filteredExpenses.reduce((sum, e) => sum + Number(e.amount), 0);
  const fixedTotal = filteredExpenses.filter(e => e.expense_type === "fixed").reduce((sum, e) => sum + Number(e.amount), 0);
  const variableTotal = filteredExpenses.filter(e => e.expense_type !== "fixed").reduce((sum, e) => sum + Number(e.amount), 0);

  const suggestCategory = (desc: string) => {
    const d = desc.toLowerCase();
    if (d.includes("sistema") || d.includes("software") || d.includes("crm") || d.includes("workspace") || d.includes("canva") || d.includes("twilio") || d.includes("microsoft")) return "sistema";
    if (d.includes("market") || d.includes("anúncio") || d.includes("ads") || d.includes("google ads") || d.includes("meta") || d.includes("facebook") || d.includes("tráfego") || d.includes("designer") || d.includes("conteúdo")) return "marketing";
    if (d.includes("internet") || d.includes("telefone") || d.includes("celular") || d.includes("telefonia")) return "internet";
    if (d.includes("aluguel") || d.includes("sala") || d.includes("escritório") || d.includes("coworking") || d.includes("condomínio") || d.includes("iptu")) return "aluguel";
    if (d.includes("salário") || d.includes("funcionário") || d.includes("colaborador") || d.includes("pró-labore") || d.includes("encargo") || d.includes("benefício")) return "salarios";
    if (d.includes("comissão") || d.includes("comissao") || d.includes("bonifica")) return "comissao";
    if (d.includes("contabil") || d.includes("cartório") || d.includes("correios") || d.includes("certificado digital") || d.includes("escritório")) return "administrativo";
    if (d.includes("tarifa banc") || d.includes("maquininha") || d.includes("juros") || d.includes("multa") || d.includes("iof") || d.includes("antecipação")) return "financeiro";
    if (d.includes("café") || d.includes("almoço") || d.includes("reunião") || d.includes("lanche") || d.includes("networking") || d.includes("visita")) return "comercial";
    if (d.includes("presente") || d.includes("brinde") || d.includes("mimo") || d.includes("fideliza")) return "relacionamento";
    if (d.includes("freelancer") || d.includes("prestador") || d.includes("assistente") || d.includes("consultoria")) return "operacional";
    if (d.includes("curso") || d.includes("treinamento") || d.includes("evento") || d.includes("feira") || d.includes("convenção") || d.includes("certificação")) return "capacitacao";
    if (d.includes("uber") || d.includes("táxi") || d.includes("taxi") || d.includes("gasolina") || d.includes("combustível") || d.includes("estacionamento") || d.includes("pedágio")) return "transporte";
    if (d.includes("taxa") || d.includes("imposto") || d.includes("darf") || d.includes("simples") || d.includes("das") || d.includes("iss") || d.includes("tributo")) return "taxas";
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
    setFormData({
      description: "", category: "outros", amount: 0,
      entry_date: new Date().toISOString().split("T")[0],
      expense_type: "variable", is_recurring: false, notes: "",
      recurrence_end_type: "indefinite", recurrence_end_date: "", recurrence_occurrences: 12,
    });
    setEditingId(null);
  };

  const openEdit = (entry: ProjectedExpense) => {
    // Sempre edita a despesa-mãe (a projeção é apenas visual).
    const sourceId = entry.source_id || entry.id;
    const source = expenseEntries.find(e => e.id === sourceId) || (entry as any);
    setEditingId(sourceId);
    setFormData({
      description: source.description, category: source.category,
      amount: Number(source.amount), entry_date: source.entry_date,
      expense_type: source.expense_type || "variable",
      is_recurring: source.is_recurring || false, notes: source.notes || "",
      recurrence_end_type: (source as any).recurrence_end_type || "indefinite",
      recurrence_end_date: (source as any).recurrence_end_date || "",
      recurrence_occurrences: Number((source as any).recurrence_occurrences) || 12,
    });
    setIsDialogOpen(true);
  };

  const handleSubmit = async () => {
    const isFixed = formData.expense_type === "fixed";
    const payload: any = {
      description: formData.description, category: formData.category as any,
      amount: formData.amount, entry_date: formData.entry_date,
      notes: formData.notes || undefined,
      expense_type: formData.expense_type,
      is_recurring: isFixed ? true : false,
      recurrence_end_type: isFixed ? formData.recurrence_end_type : "indefinite",
      recurrence_end_date: isFixed && formData.recurrence_end_type === "until_date" && formData.recurrence_end_date
        ? formData.recurrence_end_date : null,
      recurrence_occurrences: isFixed && formData.recurrence_end_type === "occurrences"
        ? (Number(formData.recurrence_occurrences) || 1) : null,
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
      {expenseEntries.length === 0 ? (
        <div className="border border-dashed rounded-lg p-10 text-center space-y-3">
          <ArrowDownCircle className="h-8 w-8 mx-auto text-muted-foreground/60" />
          <div className="space-y-1">
            <p className="text-sm font-medium">Você ainda não possui despesas cadastradas.</p>
            <p className="text-xs text-muted-foreground">
              Registre despesas para acompanhar os custos da sua agência.
            </p>
          </div>
          <Button onClick={() => { resetForm(); setIsDialogOpen(true); }} size="sm">
            <Plus className="h-4 w-4 mr-2" /> Nova Despesa
          </Button>
        </div>
      ) : (<>
      <div className="grid gap-4 sm:grid-cols-3">
        <Card><CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">Total do Mês</CardTitle></CardHeader><CardContent><div className="text-xl font-bold text-destructive">{formatCurrency(totalMonth)}</div></CardContent></Card>
        <Card><CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">Despesas Fixas</CardTitle></CardHeader><CardContent><div className="text-xl font-bold">{formatCurrency(fixedTotal)}</div></CardContent></Card>
        <Card><CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">Despesas Variáveis</CardTitle></CardHeader><CardContent><div className="text-xl font-bold">{formatCurrency(variableTotal)}</div></CardContent></Card>
      </div>

      <div className="flex items-center justify-between flex-wrap gap-2">
        <h3 className="text-lg font-semibold">Despesas</h3>
        <div className="flex items-center gap-2">
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
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" aria-label="Mais ações">
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => setShowExport(true)}>
                <Download className="h-4 w-4 mr-2" /> Exportar
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
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
                <TableRow key={entry.id} className={entry.is_projection ? "opacity-90" : ""}>
                  <TableCell>{format(parseLocalDate(entry.entry_date), "dd/MM/yyyy", { locale: ptBR })}</TableCell>
                  <TableCell className="flex items-center gap-2">
                    {entry.description}
                    {entry.is_recurring && <Repeat className="h-3 w-3 text-muted-foreground" />}
                    {entry.is_projection && (
                      <Badge variant="outline" className="text-[10px] border-blue-500/30 text-blue-600 dark:text-blue-400">
                        Recorrência
                      </Badge>
                    )}
                  </TableCell>
                  <TableCell>
                    <Badge variant="secondary" className="gap-1"><Tag className="h-3 w-3" />{EXPENSE_CATEGORY_LABELS[entry.category] || entry.category}</Badge>
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
                      <Button variant="ghost" size="icon" onClick={() => setDeleteId(entry.source_id || entry.id)}>
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
                  <SelectContent>{Object.entries(EXPENSE_CATEGORIES).map(([key, label]) => (<SelectItem key={key} value={key}>{label}</SelectItem>))}</SelectContent>
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
            {formData.expense_type === "fixed" && (
              <div className="space-y-3 rounded-md border border-blue-500/20 bg-blue-500/5 p-3">
                <div className="text-xs font-medium text-blue-700 dark:text-blue-300 flex items-center gap-1.5">
                  <Repeat className="h-3.5 w-3.5" /> Recorrência mensal
                </div>
                <div className="space-y-2">
                  <Label>Duração</Label>
                  <Select
                    value={formData.recurrence_end_type}
                    onValueChange={(v) => setFormData({ ...formData, recurrence_end_type: v as any })}
                  >
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="indefinite">Sem data final (indeterminada)</SelectItem>
                      <SelectItem value="until_date">Até uma data específica</SelectItem>
                      <SelectItem value="occurrences">Quantidade de parcelas</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                {formData.recurrence_end_type === "until_date" && (
                  <div className="space-y-2">
                    <Label>Data final</Label>
                    <Input
                      type="date"
                      value={formData.recurrence_end_date}
                      onChange={(e) => setFormData({ ...formData, recurrence_end_date: e.target.value })}
                    />
                  </div>
                )}
                {formData.recurrence_end_type === "occurrences" && (
                  <div className="space-y-2">
                    <Label>Número de parcelas (incluindo a primeira)</Label>
                    <Input
                      type="number"
                      min={1}
                      value={formData.recurrence_occurrences}
                      onChange={(e) => setFormData({ ...formData, recurrence_occurrences: Number(e.target.value) })}
                    />
                  </div>
                )}
                <p className="text-[11px] text-muted-foreground">
                  Lançamentos futuros são projetados automaticamente. Alterar ou excluir esta despesa
                  no futuro não afeta os meses já realizados.
                </p>
              </div>
            )}
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
