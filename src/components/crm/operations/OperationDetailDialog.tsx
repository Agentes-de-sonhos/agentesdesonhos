import { useEffect, useState } from "react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Plus, Trash2, Upload, FileText, Clock, ListChecks, Paperclip,
  Info, Copy, ExternalLink, MessageCircle,
} from "lucide-react";
import { toast } from "sonner";
import {
  useOperationTasks,
  useOperationTimeline,
  useOperationAttachments,
  useOperations,
} from "@/hooks/useOperations";
import type { Operation, OperationStage } from "@/types/operations";
import { OPERATION_STAGES, STAGE_CHECKLISTS, getStageMeta } from "@/types/operations";

interface Props {
  operation: Operation | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function OperationDetailDialog({ operation, open, onOpenChange }: Props) {
  const { updateOperation, deleteOperation } = useOperations();
  const { tasks, seedChecklist, toggleTask, addTask, removeTask } = useOperationTasks(operation?.id ?? null);
  const { events, addNote } = useOperationTimeline(operation?.id ?? null);
  const { attachments, uploadFile, removeAttachment } = useOperationAttachments(operation?.id ?? null);

  const [form, setForm] = useState<Partial<Operation>>({});
  const [newTaskLabel, setNewTaskLabel] = useState("");
  const [noteText, setNoteText] = useState("");

  useEffect(() => {
    if (operation) setForm(operation);
  }, [operation]);

  useEffect(() => {
    if (operation && open) {
      // Auto-seed checklist for current stage if none exists yet
      seedChecklist(operation.stage).catch(() => {});
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [operation?.id, operation?.stage, open]);

  if (!operation) return null;

  const meta = getStageMeta(operation.stage);
  const currentStageTasks = tasks.filter((t) => t.stage === operation.stage);

  const handleSave = async () => {
    await updateOperation({ id: operation.id, ...form });
    toast.success("Operação atualizada");
  };

  const handleDelete = async () => {
    if (!confirm("Remover esta operação?")) return;
    await deleteOperation(operation.id);
    onOpenChange(false);
  };

  const phone = operation.client?.phone?.replace(/\D/g, "");
  const whatsappLink = phone ? `https://wa.me/55${phone}` : null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-start justify-between gap-3">
            <div>
              <DialogTitle className="text-xl">{operation.title || operation.client?.name}</DialogTitle>
              <p className="text-sm text-muted-foreground mt-1">
                {operation.client?.name} {operation.destination && `· ${operation.destination}`}
              </p>
            </div>
            <Badge className={`${meta.bg} ${meta.text} ${meta.border} border`}>{meta.label}</Badge>
          </div>
        </DialogHeader>

        <Tabs defaultValue="overview" className="mt-2">
          <TabsList className="grid grid-cols-4 w-full">
            <TabsTrigger value="overview" className="gap-1"><Info className="h-3.5 w-3.5" />Visão geral</TabsTrigger>
            <TabsTrigger value="checklist" className="gap-1"><ListChecks className="h-3.5 w-3.5" />Checklist</TabsTrigger>
            <TabsTrigger value="timeline" className="gap-1"><Clock className="h-3.5 w-3.5" />Timeline</TabsTrigger>
            <TabsTrigger value="attachments" className="gap-1"><Paperclip className="h-3.5 w-3.5" />Anexos</TabsTrigger>
          </TabsList>

          {/* OVERVIEW */}
          <TabsContent value="overview" className="space-y-4 mt-4">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Título</Label>
                <Input value={form.title ?? ""} onChange={(e) => setForm({ ...form, title: e.target.value })} />
              </div>
              <div>
                <Label>Destino</Label>
                <Input value={form.destination ?? ""} onChange={(e) => setForm({ ...form, destination: e.target.value })} />
              </div>
              <div>
                <Label>Embarque</Label>
                <Input type="date" value={form.travel_start_date ?? ""} onChange={(e) => setForm({ ...form, travel_start_date: e.target.value })} />
              </div>
              <div>
                <Label>Retorno</Label>
                <Input type="date" value={form.travel_end_date ?? ""} onChange={(e) => setForm({ ...form, travel_end_date: e.target.value })} />
              </div>
              <div>
                <Label>Passageiros</Label>
                <Input type="number" min={1} value={form.passengers_count ?? 1} onChange={(e) => setForm({ ...form, passengers_count: Number(e.target.value) })} />
              </div>
              <div>
                <Label>Valor da venda (R$)</Label>
                <Input type="number" min={0} step="0.01" value={form.sale_amount ?? 0} onChange={(e) => setForm({ ...form, sale_amount: Number(e.target.value) })} />
              </div>
              <div>
                <Label>Prioridade</Label>
                <Select value={form.priority ?? "normal"} onValueChange={(v) => setForm({ ...form, priority: v as any })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="normal">Normal</SelectItem>
                    <SelectItem value="alta">Alta</SelectItem>
                    <SelectItem value="urgente">Urgente</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Status financeiro</Label>
                <Select value={form.payment_status ?? "pendente"} onValueChange={(v) => setForm({ ...form, payment_status: v as any })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="pendente">Pendente</SelectItem>
                    <SelectItem value="parcial">Parcial</SelectItem>
                    <SelectItem value="pago">Pago</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="col-span-2">
                <Label>Etapa</Label>
                <Select value={form.stage ?? operation.stage} onValueChange={(v) => setForm({ ...form, stage: v as OperationStage })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {OPERATION_STAGES.map((s) => (
                      <SelectItem key={s.key} value={s.key}>{s.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="col-span-2">
                <Label>Observações</Label>
                <Textarea rows={3} value={form.notes ?? ""} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
              </div>
            </div>

            {whatsappLink && (
              <div className="flex flex-wrap gap-2">
                <Button asChild variant="outline" size="sm">
                  <a href={whatsappLink} target="_blank" rel="noreferrer">
                    <MessageCircle className="h-4 w-4 mr-1.5" /> WhatsApp do cliente
                  </a>
                </Button>
                {operation.trip_id && (
                  <Button variant="outline" size="sm" onClick={() => {
                    navigator.clipboard.writeText(`${window.location.origin}/carteira/${operation.trip_id}`);
                    toast.success("Link copiado");
                  }}>
                    <Copy className="h-4 w-4 mr-1.5" /> Copiar link da carteira
                  </Button>
                )}
              </div>
            )}

            <div className="flex justify-between pt-4 border-t">
              <Button variant="destructive" size="sm" onClick={handleDelete}>
                <Trash2 className="h-4 w-4 mr-1.5" /> Remover
              </Button>
              <Button onClick={handleSave}>Salvar alterações</Button>
            </div>
          </TabsContent>

          {/* CHECKLIST */}
          <TabsContent value="checklist" className="space-y-3 mt-4">
            <div className="text-sm text-muted-foreground">
              Checklist sugerido para a etapa <strong>{meta.label}</strong>
            </div>
            <div className="space-y-2">
              {currentStageTasks.map((task) => (
                <div key={task.id} className="flex items-center gap-2 p-2 rounded-md border bg-card">
                  <Checkbox
                    checked={task.is_done}
                    onCheckedChange={(c) => toggleTask({ id: task.id, is_done: !!c })}
                  />
                  <span className={task.is_done ? "line-through text-muted-foreground flex-1" : "flex-1"}>
                    {task.label}
                  </span>
                  <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => removeTask(task.id)}>
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              ))}
              {currentStageTasks.length === 0 && (
                <p className="text-sm text-muted-foreground text-center py-4">
                  Nenhuma tarefa nesta etapa ainda.
                </p>
              )}
            </div>
            <div className="flex gap-2">
              <Input
                placeholder="Adicionar tarefa..."
                value={newTaskLabel}
                onChange={(e) => setNewTaskLabel(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && newTaskLabel.trim()) {
                    addTask({ stage: operation.stage, label: newTaskLabel.trim() });
                    setNewTaskLabel("");
                  }
                }}
              />
              <Button
                onClick={() => {
                  if (!newTaskLabel.trim()) return;
                  addTask({ stage: operation.stage, label: newTaskLabel.trim() });
                  setNewTaskLabel("");
                }}
              >
                <Plus className="h-4 w-4" />
              </Button>
            </div>
          </TabsContent>

          {/* TIMELINE */}
          <TabsContent value="timeline" className="space-y-3 mt-4">
            <div className="flex gap-2">
              <Textarea
                placeholder="Adicionar uma nota ou registro..."
                value={noteText}
                onChange={(e) => setNoteText(e.target.value)}
                rows={2}
              />
              <Button
                onClick={async () => {
                  if (!noteText.trim()) return;
                  await addNote(noteText.trim());
                  setNoteText("");
                  toast.success("Nota registrada");
                }}
              >Adicionar</Button>
            </div>
            <div className="space-y-2">
              {events.map((ev) => (
                <div key={ev.id} className="flex gap-3 p-3 rounded-md border bg-card">
                  <div className="w-1 rounded-full bg-primary/40" />
                  <div className="flex-1">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">
                        {ev.event_type === "operation_created" ? "Operação criada"
                          : ev.event_type === "stage_changed" ? "Etapa alterada"
                          : ev.event_type === "manual_note" ? "Nota"
                          : ev.event_type}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {format(new Date(ev.created_at), "dd/MM/yy HH:mm", { locale: ptBR })}
                      </span>
                    </div>
                    {ev.description && <p className="text-sm text-muted-foreground mt-1">{ev.description}</p>}
                    {ev.event_type === "stage_changed" && (ev.metadata as any)?.from && (
                      <p className="text-xs text-muted-foreground mt-1">
                        {getStageMeta((ev.metadata as any).from).label} → {getStageMeta((ev.metadata as any).to).label}
                      </p>
                    )}
                  </div>
                </div>
              ))}
              {events.length === 0 && (
                <p className="text-sm text-muted-foreground text-center py-4">Sem eventos ainda.</p>
              )}
            </div>
          </TabsContent>

          {/* ATTACHMENTS */}
          <TabsContent value="attachments" className="space-y-3 mt-4">
            <div>
              <input
                id="op-file-input"
                type="file"
                className="hidden"
                onChange={async (e) => {
                  const f = e.target.files?.[0];
                  if (f) await uploadFile({ file: f, category: "documento" });
                  e.target.value = "";
                }}
              />
              <Button asChild>
                <label htmlFor="op-file-input" className="cursor-pointer">
                  <Upload className="h-4 w-4 mr-1.5" /> Anexar arquivo
                </label>
              </Button>
            </div>
            <div className="space-y-2">
              {attachments.map((att) => (
                <div key={att.id} className="flex items-center gap-2 p-2 rounded-md border bg-card">
                  <FileText className="h-4 w-4 text-muted-foreground" />
                  <a href={att.file_url} target="_blank" rel="noreferrer" className="text-sm flex-1 truncate hover:underline">
                    {att.file_name}
                  </a>
                  <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => removeAttachment(att.id)}>
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              ))}
              {attachments.length === 0 && (
                <p className="text-sm text-muted-foreground text-center py-4">Nenhum anexo ainda.</p>
              )}
            </div>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}