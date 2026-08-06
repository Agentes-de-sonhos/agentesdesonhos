import { useMemo, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  CloudDownload,
  ExternalLink,
  FileText,
  Image as ImageIcon,
  Loader2,
  Pencil,
  Plus,
  RefreshCw,
  Trash2,
  Check,
  Undo2,
  X,
} from "lucide-react";
import { SupplierCombobox } from "./SupplierCombobox";
import { ConfirmDeleteDialog } from "./ConfirmDeleteDialog";
import {
  useDriveMaterialImports,
  type MaterialImportSource,
  type MaterialImportedFile,
} from "@/hooks/useDriveMaterialImports";
import { IMPORT_STATUS_LABEL, formatFileSize } from "@/lib/materials/driveFolder";

const MATERIAL_CATEGORIES = [
  "Operadoras de turismo",
  "Consolidadoras",
  "Companhias aéreas",
  "Hospedagem",
  "Locadoras de veículos",
  "Cruzeiros",
  "Seguros viagem",
  "Parques e atrações",
  "Receptivos",
  "Outros",
];

const STATUS_FILTERS = [
  { value: "a_revisar", label: "A revisar" },
  { value: "aprovado", label: "Aprovados" },
  { value: "descartado", label: "Descartados" },
  { value: "todos", label: "Todos" },
];

const emptyForm = { id: undefined as string | undefined, supplier_id: "", label: "", folder_url: "", is_active: true };

export function MaterialsDriveImportPanel() {
  const {
    sources,
    sourcesLoading,
    files,
    filesLoading,
    saveSource,
    deleteSource,
    syncSource,
    approveFile,
    setFileStatus,
    openFile,
  } = useDriveMaterialImports();

  const [formOpen, setFormOpen] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [deleteTarget, setDeleteTarget] = useState<MaterialImportSource | null>(null);
  const [selectedSourceId, setSelectedSourceId] = useState<string>("todas");
  const [statusFilter, setStatusFilter] = useState<string>("a_revisar");
  const [approveTarget, setApproveTarget] = useState<MaterialImportedFile | null>(null);
  const [approveCategory, setApproveCategory] = useState("Operadoras de turismo");
  const [approveTitle, setApproveTitle] = useState("");

  const visibleFiles = useMemo(() => {
    return files.filter((f) => {
      const bySource = selectedSourceId === "todas" || f.source_id === selectedSourceId;
      const byStatus = statusFilter === "todos" || f.status === statusFilter;
      return bySource && byStatus;
    });
  }, [files, selectedSourceId, statusFilter]);

  const pendingCount = files.filter((f) => f.status === "a_revisar").length;

  const openNew = () => {
    setForm(emptyForm);
    setFormOpen(true);
  };

  const openEdit = (source: MaterialImportSource) => {
    setForm({
      id: source.id,
      supplier_id: source.supplier_id,
      label: source.label || "",
      folder_url: source.folder_url,
      is_active: source.is_active,
    });
    setFormOpen(true);
  };

  const submitForm = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.supplier_id) return;
    saveSource.mutate(
      {
        id: form.id,
        supplier_id: form.supplier_id,
        label: form.label,
        folder_url: form.folder_url,
        is_active: form.is_active,
      },
      { onSuccess: () => setFormOpen(false) },
    );
  };

  return (
    <div className="space-y-6">
      <Card className="border-dashed">
        <CardHeader className="pb-3">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <CardTitle className="flex items-center gap-2 text-base">
                <CloudDownload className="h-4 w-4 text-primary" />
                Pastas compartilhadas do Google Drive
              </CardTitle>
              <CardDescription>
                Cadastre o link da pasta enviada pela operadora e importe os arquivos originais para a galeria interna.
                Os itens entram sempre como <strong>A revisar</strong> e só ficam visíveis após aprovação.
              </CardDescription>
            </div>
            <Button size="sm" onClick={openNew} className="gap-2">
              <Plus className="h-4 w-4" /> Nova fonte
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          {sourcesLoading ? (
            <div className="flex justify-center py-6">
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            </div>
          ) : sources.length === 0 ? (
            <p className="text-sm text-muted-foreground py-4 text-center">
              Nenhuma fonte cadastrada. Adicione a pasta do Google Drive da operadora para começar.
            </p>
          ) : (
            sources.map((source) => {
              const result = source.last_sync_result;
              return (
                <div
                  key={source.id}
                  className="rounded-lg border bg-card p-3 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div className="min-w-0 space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="font-medium truncate">
                        {source.tour_operators?.name || "Fornecedor"}
                        {source.label ? ` • ${source.label}` : ""}
                      </p>
                      <Badge variant={source.is_active ? "default" : "secondary"}>
                        {source.is_active ? "Ativa" : "Inativa"}
                      </Badge>
                    </div>
                    <a
                      href={source.folder_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs text-primary hover:underline inline-flex items-center gap-1 break-all"
                    >
                      {source.folder_url} <ExternalLink className="h-3 w-3 flex-shrink-0" />
                    </a>
                    <p className="text-xs text-muted-foreground">
                      {source.last_sync_at
                        ? `Última importação: ${new Date(source.last_sync_at).toLocaleString("pt-BR")}${
                            result
                              ? ` — ${result.added} novos, ${result.existing} existentes, ${result.ignored} ignorados, ${result.failed} falhas`
                              : ""
                          }`
                        : "Nunca importada"}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <Button
                      size="sm"
                      variant="outline"
                      className="gap-2"
                      disabled={!source.is_active || (syncSource.isPending && syncSource.variables === source.id)}
                      onClick={() => syncSource.mutate(source.id)}
                    >
                      {syncSource.isPending && syncSource.variables === source.id ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <RefreshCw className="h-4 w-4" />
                      )}
                      Importar
                    </Button>
                    <Button size="icon" variant="ghost" onClick={() => openEdit(source)} aria-label="Editar fonte">
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button
                      size="icon"
                      variant="ghost"
                      className="text-destructive"
                      onClick={() => setDeleteTarget(source)}
                      aria-label="Remover fonte"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              );
            })
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <CardTitle className="text-base">Arquivos importados</CardTitle>
              <CardDescription>
                {pendingCount > 0
                  ? `${pendingCount} item(ns) aguardando revisão.`
                  : "Nenhum item aguardando revisão."}
              </CardDescription>
            </div>
            <div className="flex flex-wrap gap-2">
              <Select value={selectedSourceId} onValueChange={setSelectedSourceId}>
                <SelectTrigger className="w-[220px]">
                  <SelectValue placeholder="Fonte" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todas">Todas as fontes</SelectItem>
                  {sources.map((s) => (
                    <SelectItem key={s.id} value={s.id}>
                      {s.tour_operators?.name || "Fornecedor"}
                      {s.label ? ` • ${s.label}` : ""}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-[160px]">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  {STATUS_FILTERS.map((s) => (
                    <SelectItem key={s.value} value={s.value}>
                      {s.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {filesLoading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            </div>
          ) : visibleFiles.length === 0 ? (
            <p className="text-sm text-muted-foreground py-8 text-center">Nenhum arquivo neste filtro.</p>
          ) : (
            <div className="space-y-2">
              {visibleFiles.map((file) => {
                const isImage = (file.mime_type || "").startsWith("image/");
                return (
                  <div
                    key={file.id}
                    className="rounded-lg border p-3 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"
                  >
                    <div className="flex items-start gap-3 min-w-0">
                      <div className="h-9 w-9 rounded-md bg-muted flex items-center justify-center flex-shrink-0">
                        {isImage ? (
                          <ImageIcon className="h-4 w-4 text-muted-foreground" />
                        ) : (
                          <FileText className="h-4 w-4 text-muted-foreground" />
                        )}
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-medium truncate">{file.file_name}</p>
                        <p className="text-xs text-muted-foreground">
                          {file.tour_operators?.name || "Fornecedor"} • {formatFileSize(file.size_bytes)} • Google Drive •{" "}
                          {new Date(file.imported_at).toLocaleDateString("pt-BR")}
                        </p>
                        <div className="mt-1 flex items-center gap-2">
                          <Badge
                            variant={
                              file.status === "aprovado"
                                ? "default"
                                : file.status === "descartado"
                                  ? "destructive"
                                  : "secondary"
                            }
                          >
                            {IMPORT_STATUS_LABEL[file.status] || file.status}
                          </Badge>
                          {file.source_url && (
                            <a
                              href={file.source_url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-xs text-primary hover:underline inline-flex items-center gap-1"
                            >
                              Origem <ExternalLink className="h-3 w-3" />
                            </a>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="flex flex-wrap items-center gap-2 flex-shrink-0">
                      <Button size="sm" variant="outline" onClick={() => openFile(file)}>
                        Abrir original
                      </Button>
                      {file.status !== "aprovado" && (
                        <Button
                          size="sm"
                          className="gap-1"
                          onClick={() => {
                            setApproveTarget(file);
                            setApproveTitle(file.file_name.replace(/\.[^.]+$/, ""));
                            setApproveCategory("Operadoras de turismo");
                          }}
                        >
                          <Check className="h-4 w-4" /> Aprovar
                        </Button>
                      )}
                      {file.status !== "a_revisar" && (
                        <Button
                          size="sm"
                          variant="outline"
                          className="gap-1"
                          onClick={() => setFileStatus.mutate({ file, status: "a_revisar" })}
                        >
                          <Undo2 className="h-4 w-4" /> A revisar
                        </Button>
                      )}
                      {file.status !== "descartado" && (
                        <Button
                          size="sm"
                          variant="ghost"
                          className="gap-1 text-destructive"
                          onClick={() => setFileStatus.mutate({ file, status: "descartado" })}
                        >
                          <X className="h-4 w-4" /> Descartar
                        </Button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={formOpen} onOpenChange={setFormOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{form.id ? "Editar fonte" : "Nova fonte do Google Drive"}</DialogTitle>
            <DialogDescription>
              A pasta precisa estar compartilhada como “Qualquer pessoa com o link” com permissão de leitura/download.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={submitForm} className="space-y-4">
            <div className="space-y-2">
              <Label>Fornecedor / operadora *</Label>
              <SupplierCombobox
                value={form.supplier_id}
                onChange={(v) => setForm((f) => ({ ...f, supplier_id: v || "" }))}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="drive-label">Identificação (opcional)</Label>
              <Input
                id="drive-label"
                value={form.label}
                onChange={(e) => setForm((f) => ({ ...f, label: e.target.value }))}
                placeholder="Ex.: Campanha Verão"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="drive-url">Link da pasta do Google Drive *</Label>
              <Input
                id="drive-url"
                value={form.folder_url}
                onChange={(e) => setForm((f) => ({ ...f, folder_url: e.target.value }))}
                placeholder="https://drive.google.com/drive/folders/..."
                required
              />
            </div>
            <div className="flex items-center justify-between rounded-lg border p-3">
              <div>
                <Label>Fonte ativa</Label>
                <p className="text-xs text-muted-foreground">Somente fontes ativas podem ser importadas.</p>
              </div>
              <Switch
                checked={form.is_active}
                onCheckedChange={(v) => setForm((f) => ({ ...f, is_active: v }))}
              />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setFormOpen(false)}>
                Cancelar
              </Button>
              <Button type="submit" disabled={saveSource.isPending || !form.supplier_id}>
                {saveSource.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                Salvar
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={!!approveTarget} onOpenChange={(v) => !v && setApproveTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Aprovar e publicar material</DialogTitle>
            <DialogDescription>
              O arquivo será publicado na galeria de Materiais do fornecedor e ficará visível para os agentes.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="approve-title">Título</Label>
              <Input id="approve-title" value={approveTitle} onChange={(e) => setApproveTitle(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Categoria</Label>
              <Select value={approveCategory} onValueChange={setApproveCategory}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {MATERIAL_CATEGORIES.map((c) => (
                    <SelectItem key={c} value={c}>
                      {c}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setApproveTarget(null)}>
              Cancelar
            </Button>
            <Button
              disabled={approveFile.isPending}
              onClick={() => {
                if (!approveTarget) return;
                approveFile.mutate(
                  { file: approveTarget, category: approveCategory, title: approveTitle },
                  { onSuccess: () => setApproveTarget(null) },
                );
              }}
            >
              {approveFile.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Aprovar e publicar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ConfirmDeleteDialog
        open={!!deleteTarget}
        onOpenChange={(v) => !v && setDeleteTarget(null)}
        onConfirm={() => {
          if (deleteTarget) deleteSource.mutate(deleteTarget.id);
          setDeleteTarget(null);
        }}
        title="Remover fonte de importação?"
        description="Os arquivos já importados continuam na galeria. Apenas a configuração da pasta será removida."
      />
    </div>
  );
}