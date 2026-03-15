import { useState, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Building2,
  Upload,
  Download,
  Loader2,
  Trash2,
  Search,
  Eye,
  EyeOff,
  AlertCircle,
  CheckCircle2,
  Pencil,
} from "lucide-react";
import { toast } from "sonner";
import * as XLSX from "xlsx";
import { useNavigate } from "react-router-dom";

const TEMPLATE_HEADERS = [
  "name",
  "category",
  "specialties",
  "how_to_sell",
  "sales_channels",
  "commercial_contacts",
  "website",
  "instagram",
  "founded_year",
  "annual_revenue",
  "employees",
  "executive_team",
];

interface ImportResult {
  created: number;
  skipped: number;
  errors: string[];
}

export function AdminTourOperatorsManager() {
  const [search, setSearch] = useState("");
  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState<ImportResult | null>(null);
  const [showResultDialog, setShowResultDialog] = useState(false);
  const [editOperator, setEditOperator] = useState<any | null>(null);
  const [editForm, setEditForm] = useState<Record<string, any>>({});
  const [saving, setSaving] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  const { data: operators, isLoading } = useQuery({
    queryKey: ["admin-tour-operators"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("tour_operators")
        .select("*")
        .order("name");
      if (error) throw error;
      return data;
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("tour_operators").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-tour-operators"] });
      toast.success("Operadora removida!");
    },
    onError: (err: any) => toast.error(err.message),
  });

  const toggleActiveMutation = useMutation({
    mutationFn: async ({ id, is_active }: { id: string; is_active: boolean }) => {
      const { error } = await supabase
        .from("tour_operators")
        .update({ is_active } as any)
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-tour-operators"] });
    },
  });

  const openEdit = (op: any) => {
    setEditForm({
      name: op.name || "",
      category: op.category || "",
      specialties: op.specialties || "",
      how_to_sell: op.how_to_sell || "",
      sales_channels: op.sales_channels || "",
      commercial_contacts: op.commercial_contacts || "",
      website: op.website || "",
      instagram: op.instagram || "",
      founded_year: op.founded_year ?? "",
      annual_revenue: op.annual_revenue || "",
      employees: op.employees ?? "",
      executive_team: op.executive_team || "",
    });
    setEditOperator(op);
  };

  const handleSaveEdit = async () => {
    if (!editOperator) return;
    setSaving(true);
    try {
      const payload: any = {
        name: editForm.name.trim(),
        category: editForm.category.trim() || "Operadoras de turismo",
        specialties: editForm.specialties.trim() || null,
        how_to_sell: editForm.how_to_sell.trim() || null,
        sales_channels: editForm.sales_channels.trim() || null,
        commercial_contacts: editForm.commercial_contacts.trim() || null,
        website: editForm.website.trim() || null,
        instagram: editForm.instagram.trim() || null,
        founded_year: editForm.founded_year ? Number(editForm.founded_year) || null : null,
        annual_revenue: editForm.annual_revenue.trim() || null,
        employees: editForm.employees ? Number(editForm.employees) || null : null,
        executive_team: editForm.executive_team.trim() || null,
      };
      if (!payload.name) {
        toast.error("Nome é obrigatório");
        setSaving(false);
        return;
      }
      const { error } = await supabase
        .from("tour_operators")
        .update(payload)
        .eq("id", editOperator.id);
      if (error) throw error;
      toast.success("Operadora atualizada!");
      setEditOperator(null);
      queryClient.invalidateQueries({ queryKey: ["admin-tour-operators"] });
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setSaving(false);
    }
  };

    const ws = XLSX.utils.aoa_to_sheet([TEMPLATE_HEADERS]);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Operadoras");
    XLSX.writeFile(wb, "modelo-operadoras.xlsx");
    toast.success("Modelo baixado!");
  };

  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setImporting(true);
    const result: ImportResult = { created: 0, skipped: 0, errors: [] };

    try {
      const data = await file.arrayBuffer();
      const workbook = XLSX.read(data);
      const sheet = workbook.Sheets[workbook.SheetNames[0]];
      const rows: any[] = XLSX.utils.sheet_to_json(sheet, { defval: "" });

      if (rows.length === 0) {
        toast.error("Planilha vazia");
        setImporting(false);
        return;
      }

      // Process in batches of 50
      const BATCH_SIZE = 50;
      for (let i = 0; i < rows.length; i += BATCH_SIZE) {
        const batch = rows.slice(i, i + BATCH_SIZE);
        const toInsert = [];

        for (const row of batch) {
          const name = String(row.name || "").trim();
          if (!name) {
            result.errors.push(`Linha ${i + batch.indexOf(row) + 2}: nome vazio`);
            continue;
          }

          toInsert.push({
            name,
            category: String(row.category || "Operadoras de turismo").trim(),
            specialties: String(row.specialties || "").trim() || null,
            how_to_sell: String(row.how_to_sell || "").trim() || null,
            sales_channels: String(row.sales_channels || "").trim() || null,
            commercial_contacts: String(row.commercial_contacts || "").trim() || null,
            website: String(row.website || "").trim() || null,
            instagram: String(row.instagram || "").trim() || null,
            founded_year: row.founded_year ? Number(row.founded_year) || null : null,
            annual_revenue: String(row.annual_revenue || "").trim() || null,
            employees: row.employees ? Number(row.employees) || null : null,
            executive_team: String(row.executive_team || "").trim() || null,
          });
        }

        if (toInsert.length === 0) continue;

        const { data: inserted, error } = await supabase
          .from("tour_operators")
          .upsert(toInsert as any, { onConflict: "name", ignoreDuplicates: true })
          .select();

        if (error) {
          // Try one by one for better error handling
          for (const item of toInsert) {
            const { error: singleErr } = await supabase
              .from("tour_operators")
              .upsert(item as any, { onConflict: "name", ignoreDuplicates: true });
            if (singleErr) {
              if (singleErr.message.includes("duplicate") || singleErr.code === "23505") {
                result.skipped++;
              } else {
                result.errors.push(`${item.name}: ${singleErr.message}`);
              }
            } else {
              result.created++;
            }
          }
        } else {
          result.created += inserted?.length || toInsert.length;
        }
      }

      setImportResult(result);
      setShowResultDialog(true);
      queryClient.invalidateQueries({ queryKey: ["admin-tour-operators"] });

      if (result.created > 0) {
        toast.success(`${result.created} operadora(s) importada(s)!`);
      }
    } catch (err: any) {
      toast.error("Erro ao ler arquivo: " + err.message);
    } finally {
      setImporting(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const filtered = operators?.filter((op: any) =>
    op.name.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <Card className="border-0 shadow-md">
      <CardHeader className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <CardTitle className="flex items-center gap-2">
          <Building2 className="h-5 w-5" />
          Operadoras de Turismo
          {operators && (
            <Badge variant="secondary" className="ml-2">
              {operators.length}
            </Badge>
          )}
        </CardTitle>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" size="sm" onClick={downloadTemplate}>
            <Download className="h-4 w-4 mr-1" />
            Modelo
          </Button>
          <Button
            size="sm"
            onClick={() => fileInputRef.current?.click()}
            disabled={importing}
          >
            {importing ? (
              <Loader2 className="h-4 w-4 mr-1 animate-spin" />
            ) : (
              <Upload className="h-4 w-4 mr-1" />
            )}
            Importar Operadoras
          </Button>
          <input
            ref={fileInputRef}
            type="file"
            className="hidden"
            accept=".csv,.xlsx,.xls"
            onChange={handleImport}
          />
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar operadora..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>

        {isLoading ? (
          <div className="flex justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : !filtered?.length ? (
          <p className="text-center text-muted-foreground py-8">
            Nenhuma operadora cadastrada. Importe via planilha.
          </p>
        ) : (
          <div className="rounded-md border overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nome</TableHead>
                  <TableHead>Categoria</TableHead>
                  <TableHead>Site</TableHead>
                  <TableHead className="text-center">Status</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((op: any) => (
                  <TableRow key={op.id}>
                    <TableCell className="font-medium">{op.name}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className="text-xs">
                        {op.category}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground truncate max-w-[200px]">
                      {op.website || "—"}
                    </TableCell>
                    <TableCell className="text-center">
                      <Badge variant={op.is_active ? "default" : "secondary"}>
                        {op.is_active ? "Ativo" : "Inativo"}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => openEdit(op)}
                          title="Editar"
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => navigate(`/mapa-turismo/operadora/${op.id}`)}
                          title="Ver página"
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() =>
                            toggleActiveMutation.mutate({
                              id: op.id,
                              is_active: !op.is_active,
                            })
                          }
                          title={op.is_active ? "Desativar" : "Ativar"}
                        >
                          {op.is_active ? (
                            <EyeOff className="h-4 w-4" />
                          ) : (
                            <Eye className="h-4 w-4" />
                          )}
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => {
                            if (confirm("Remover esta operadora?")) {
                              deleteMutation.mutate(op.id);
                            }
                          }}
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>

      {/* Import Result Dialog */}
      <Dialog open={showResultDialog} onOpenChange={setShowResultDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Resultado da Importação</DialogTitle>
          </DialogHeader>
          {importResult && (
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <CheckCircle2 className="h-5 w-5 text-green-500" />
                <span>{importResult.created} operadora(s) criada(s)</span>
              </div>
              {importResult.skipped > 0 && (
                <div className="flex items-center gap-3">
                  <AlertCircle className="h-5 w-5 text-yellow-500" />
                  <span>{importResult.skipped} duplicada(s) ignorada(s)</span>
                </div>
              )}
              {importResult.errors.length > 0 && (
                <div className="space-y-2">
                  <div className="flex items-center gap-3">
                    <AlertCircle className="h-5 w-5 text-destructive" />
                    <span>{importResult.errors.length} erro(s)</span>
                  </div>
                  <div className="max-h-40 overflow-y-auto text-xs text-muted-foreground bg-muted rounded p-2 space-y-1">
                    {importResult.errors.map((err, i) => (
                      <p key={i}>{err}</p>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Edit Operator Dialog */}
      <Dialog open={!!editOperator} onOpenChange={(open) => !open && setEditOperator(null)}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Pencil className="h-5 w-5" />
              Editar Operadora
            </DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <Label>Nome *</Label>
              <Input
                value={editForm.name || ""}
                onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
              />
            </div>
            <div>
              <Label>Categoria</Label>
              <Input
                value={editForm.category || ""}
                onChange={(e) => setEditForm({ ...editForm, category: e.target.value })}
              />
            </div>
            <div>
              <Label>Especialidades</Label>
              <Input
                value={editForm.specialties || ""}
                onChange={(e) => setEditForm({ ...editForm, specialties: e.target.value })}
                placeholder="Separadas por vírgula"
              />
            </div>
            <div className="sm:col-span-2">
              <Label>Como Vender</Label>
              <Textarea
                value={editForm.how_to_sell || ""}
                onChange={(e) => setEditForm({ ...editForm, how_to_sell: e.target.value })}
                rows={4}
              />
            </div>
            <div className="sm:col-span-2">
              <Label>Canais de Venda</Label>
              <Textarea
                value={editForm.sales_channels || ""}
                onChange={(e) => setEditForm({ ...editForm, sales_channels: e.target.value })}
                rows={3}
              />
            </div>
            <div className="sm:col-span-2">
              <Label>Contatos Comerciais</Label>
              <Textarea
                value={editForm.commercial_contacts || ""}
                onChange={(e) => setEditForm({ ...editForm, commercial_contacts: e.target.value })}
                rows={3}
              />
            </div>
            <div>
              <Label>Website</Label>
              <Input
                value={editForm.website || ""}
                onChange={(e) => setEditForm({ ...editForm, website: e.target.value })}
              />
            </div>
            <div>
              <Label>Instagram</Label>
              <Input
                value={editForm.instagram || ""}
                onChange={(e) => setEditForm({ ...editForm, instagram: e.target.value })}
              />
            </div>
            <div>
              <Label>Ano de Fundação</Label>
              <Input
                type="number"
                value={editForm.founded_year || ""}
                onChange={(e) => setEditForm({ ...editForm, founded_year: e.target.value })}
              />
            </div>
            <div>
              <Label>Faturamento Anual</Label>
              <Input
                value={editForm.annual_revenue || ""}
                onChange={(e) => setEditForm({ ...editForm, annual_revenue: e.target.value })}
              />
            </div>
            <div>
              <Label>Funcionários</Label>
              <Input
                type="number"
                value={editForm.employees || ""}
                onChange={(e) => setEditForm({ ...editForm, employees: e.target.value })}
              />
            </div>
            <div>
              <Label>Equipe Executiva</Label>
              <Input
                value={editForm.executive_team || ""}
                onChange={(e) => setEditForm({ ...editForm, executive_team: e.target.value })}
              />
            </div>
          </div>
          <DialogFooter className="mt-4">
            <Button variant="outline" onClick={() => setEditOperator(null)}>
              Cancelar
            </Button>
            <Button onClick={handleSaveEdit} disabled={saving}>
              {saving && <Loader2 className="h-4 w-4 mr-1 animate-spin" />}
              Salvar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
