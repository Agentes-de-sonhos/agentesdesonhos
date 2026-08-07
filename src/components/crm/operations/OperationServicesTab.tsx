import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Plus, Trash2, Pencil, Sparkles, Info, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { useOperationServices, type OperationService, type OperationServiceFlag } from "@/hooks/useOperationServices";
import { OPERATION_SERVICE_LABELS, serviceTypeLabel, mapServiceDataToOperationService } from "@/lib/operationServiceMap";
import { AIImportServiceModal } from "@/components/shared/AIImportServiceModal";
import type { Operation } from "@/types/operations";

const FLAGS: { key: OperationServiceFlag; label: string }[] = [
  { key: "is_confirmed", label: "Confirmado" },
  { key: "is_paid", label: "Pago" },
  { key: "is_issued", label: "Emitido" },
  { key: "is_delivered", label: "Entregue" },
];

const brl = (v: number) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(Number(v) || 0);

interface Props {
  operation: Operation;
}

type Draft = Partial<OperationService> & { id?: string };

export function OperationServicesTab({ operation }: Props) {
  const {
    services,
    isLoading,
    isImporting,
    addService,
    updateService,
    removeService,
    toggleFlag,
  } = useOperationServices({
    operationId: operation.id,
    quoteId: operation.quote_id,
    opportunityId: operation.opportunity_id,
  });

  const [draft, setDraft] = useState<Draft | null>(null);
  const [aiOpen, setAiOpen] = useState(false);

  const total = useMemo(
    () => services.reduce((sum, s) => sum + (Number(s.amount) || 0), 0),
    [services],
  );

  const saveDraft = async () => {
    if (!draft) return;
    if (!draft.name?.trim()) {
      toast.error("Informe o nome do serviço");
      return;
    }
    if (draft.id) {
      await updateService({ id: draft.id, ...draft });
      toast.success("Serviço atualizado");
    } else {
      await addService(draft);
    }
    setDraft(null);
  };

  const renderFlag = (s: OperationService, flag: OperationServiceFlag, label: string) => (
    <Checkbox
      checked={!!s[flag]}
      aria-label={`${label} — ${s.name}`}
      onCheckedChange={(c) => toggleFlag(s.id, flag, !!c)}
    />
  );

  return (
    <div className="space-y-3 mt-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <Button size="sm" onClick={() => setDraft({ service_type: "other", amount: 0 })}>
          <Plus className="h-4 w-4 mr-1.5" /> Adicionar serviço
        </Button>
        <button
          type="button"
          onClick={() => setAiOpen(true)}
          className="ml-auto inline-flex items-center gap-1.5 rounded-full border border-violet-200 dark:border-violet-800 bg-violet-50 dark:bg-violet-950/40 px-2.5 py-1 text-xs font-semibold text-violet-700 dark:text-violet-300 transition-colors hover:bg-violet-100 dark:hover:bg-violet-900/50"
        >
          <Sparkles className="h-3.5 w-3.5" /> Importar com IA
        </button>
      </div>

      <p className="text-xs text-muted-foreground flex items-start gap-1.5">
        <Info className="h-3.5 w-3.5 mt-0.5 shrink-0" />
        Marque Confirmado, Pago, Emitido e Entregue conforme a operação avança. Cada marcação é independente.
      </p>

      {(isLoading || isImporting) && services.length === 0 && (
        <div className="flex items-center justify-center gap-2 py-8 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" /> Carregando serviços...
        </div>
      )}

      {!isLoading && !isImporting && services.length === 0 && (
        <div className="rounded-xl border border-dashed p-6 text-center space-y-2">
          <p className="text-sm font-semibold">Nenhum serviço nesta viagem ainda.</p>
          <p className="text-xs text-muted-foreground">
            Adicione manualmente ou importe de um documento com IA. Se houver um orçamento vinculado,
            os serviços são trazidos automaticamente.
          </p>
        </div>
      )}

      {services.length > 0 && (
        <>
          {/* Desktop matrix */}
          <div className="hidden md:block overflow-x-auto rounded-xl border">
            <table className="w-full min-w-[860px] text-sm">
              <thead className="bg-muted/50">
                <tr className="text-left">
                  <th className="px-3 py-2 font-semibold">Serviço</th>
                  <th className="px-3 py-2 font-semibold">Tipo</th>
                  <th className="px-3 py-2 font-semibold">Fornecedor / Destino</th>
                  <th className="px-3 py-2 font-semibold text-right">Valor</th>
                  {FLAGS.map((f) => (
                    <th key={f.key} scope="col" className="px-3 py-2 font-semibold text-center whitespace-nowrap">
                      {f.label}
                    </th>
                  ))}
                  <th className="px-3 py-2" />
                </tr>
              </thead>
              <tbody>
                {services.map((s) => (
                  <tr key={s.id} className="border-t">
                    <td className="px-3 py-2 font-medium">{s.name}</td>
                    <td className="px-3 py-2 text-muted-foreground">{serviceTypeLabel(s.service_type)}</td>
                    <td className="px-3 py-2 text-muted-foreground">
                      {[s.supplier, s.destination].filter(Boolean).join(" · ") || "—"}
                    </td>
                    <td className="px-3 py-2 text-right">{brl(s.amount)}</td>
                    {FLAGS.map((f) => (
                      <td key={f.key} className="px-3 py-2 text-center">{renderFlag(s, f.key, f.label)}</td>
                    ))}
                    <td className="px-3 py-2">
                      <div className="flex justify-end gap-1">
                        <Button variant="ghost" size="icon" className="h-7 w-7" aria-label="Editar serviço" onClick={() => setDraft(s)}>
                          <Pencil className="h-3.5 w-3.5" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-7 w-7" aria-label="Remover serviço" onClick={() => removeService(s.id)}>
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="border-t bg-muted/30">
                  <td className="px-3 py-2 font-semibold" colSpan={3}>Total</td>
                  <td className="px-3 py-2 text-right font-semibold">{brl(total)}</td>
                  <td colSpan={5} />
                </tr>
              </tfoot>
            </table>
          </div>

          {/* Mobile cards */}
          <div className="md:hidden space-y-2">
            {services.map((s) => (
              <div key={s.id} className="rounded-xl border p-3 space-y-2">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="font-medium break-words">{s.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {serviceTypeLabel(s.service_type)}
                      {[s.supplier, s.destination].filter(Boolean).length > 0 &&
                        ` · ${[s.supplier, s.destination].filter(Boolean).join(" · ")}`}
                    </p>
                    <p className="text-xs font-semibold mt-1">{brl(s.amount)}</p>
                  </div>
                  <div className="flex gap-1 shrink-0">
                    <Button variant="ghost" size="icon" className="h-7 w-7" aria-label="Editar serviço" onClick={() => setDraft(s)}>
                      <Pencil className="h-3.5 w-3.5" />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-7 w-7" aria-label="Remover serviço" onClick={() => removeService(s.id)}>
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  {FLAGS.map((f) => (
                    <label key={f.key} className="flex items-center gap-2 text-xs">
                      {renderFlag(s, f.key, f.label)}
                      {f.label}
                    </label>
                  ))}
                </div>
              </div>
            ))}
            <div className="flex justify-between rounded-xl border bg-muted/30 px-3 py-2 text-sm font-semibold">
              <span>Total</span><span>{brl(total)}</span>
            </div>
          </div>
        </>
      )}

      {/* Add / edit dialog */}
      <Dialog open={!!draft} onOpenChange={(o) => !o && setDraft(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{draft?.id ? "Editar serviço" : "Adicionar serviço"}</DialogTitle>
            <DialogDescription>Alterações aqui não afetam o orçamento original.</DialogDescription>
          </DialogHeader>
          {draft && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="sm:col-span-2">
                <Label>Serviço *</Label>
                <Input value={draft.name ?? ""} onChange={(e) => setDraft({ ...draft, name: e.target.value })} />
              </div>
              <div>
                <Label>Tipo</Label>
                <Select value={draft.service_type ?? "other"} onValueChange={(v) => setDraft({ ...draft, service_type: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {Object.entries(OPERATION_SERVICE_LABELS).map(([k, label]) => (
                      <SelectItem key={k} value={k}>{label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Valor (R$)</Label>
                <Input type="number" min={0} step="0.01" value={draft.amount ?? 0}
                  onChange={(e) => setDraft({ ...draft, amount: Number(e.target.value) })} />
              </div>
              <div>
                <Label>Fornecedor</Label>
                <Input value={draft.supplier ?? ""} onChange={(e) => setDraft({ ...draft, supplier: e.target.value })} />
              </div>
              <div>
                <Label>Destino</Label>
                <Input value={draft.destination ?? ""} onChange={(e) => setDraft({ ...draft, destination: e.target.value })} />
              </div>
              <div>
                <Label>Início</Label>
                <Input type="date" value={draft.start_date ?? ""} onChange={(e) => setDraft({ ...draft, start_date: e.target.value })} />
              </div>
              <div>
                <Label>Fim</Label>
                <Input type="date" value={draft.end_date ?? ""} onChange={(e) => setDraft({ ...draft, end_date: e.target.value })} />
              </div>
              <div className="sm:col-span-2">
                <Label>Observações</Label>
                <Textarea rows={2} value={draft.notes ?? ""} onChange={(e) => setDraft({ ...draft, notes: e.target.value })} />
              </div>
              <div className="sm:col-span-2 flex justify-end gap-2 pt-1">
                <Button variant="outline" onClick={() => setDraft(null)}>Cancelar</Button>
                <Button onClick={saveDraft}>Salvar</Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <AIImportServiceModal
        open={aiOpen}
        onOpenChange={setAiOpen}
        onImport={async (result) => {
          const mapped = mapServiceDataToOperationService(result.service_type, result.service_data || {});
          await addService({ ...mapped, service_data: result.service_data || {} });
          setAiOpen(false);
        }}
      />
    </div>
  );
}
