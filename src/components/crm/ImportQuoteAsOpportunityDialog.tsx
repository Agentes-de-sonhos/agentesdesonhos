/**
 * Importar orçamento → nova oportunidade (1ª etapa do funil atual).
 * Reutiliza `useOpportunities().createOpportunity` (permissões, etapa inicial e
 * histórico já existentes) e apenas vincula o orçamento original — nunca duplica
 * nem altera o orçamento.
 */
import { useMemo, useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Search, Loader2, AlertTriangle, RefreshCw } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";
import { useDebounce } from "@/hooks/useDebounce";
import { useImportableQuotes } from "@/hooks/useImportableQuotes";
import { useOpportunities, useClients } from "@/hooks/useCRM";
import { TripPeriodField } from "@/components/shared/TripPeriodField";
import {
  buildOpportunityDraftFromQuote,
  missingOpportunityFields,
  quoteLabel,
  searchImportableQuotes,
  type ImportableQuote,
  type OpportunityDraftFromQuote,
} from "@/lib/crmQuoteImport";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Abre a oportunidade já vinculada ao orçamento, evitando duplicidade. */
  onOpenExisting?: (opportunityId: string) => void;
}

const brl = (v: number) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(Number(v) || 0);

export function ImportQuoteAsOpportunityDialog({ open, onOpenChange, onOpenExisting }: Props) {
  const { quotes, isLoading, error, refetch } = useImportableQuotes(open);
  const { createOpportunity } = useOpportunities();
  const { clients } = useClients();
  const qc = useQueryClient();

  const [term, setTerm] = useState("");
  const debounced = useDebounce(term, 250);
  const [selected, setSelected] = useState<ImportableQuote | null>(null);
  const [draft, setDraft] = useState<OpportunityDraftFromQuote | null>(null);
  const [saving, setSaving] = useState(false);

  const results = useMemo(() => searchImportableQuotes(quotes, debounced), [quotes, debounced]);
  const missing = draft ? missingOpportunityFields(draft) : [];

  const reset = () => {
    setTerm("");
    setSelected(null);
    setDraft(null);
    setSaving(false);
  };

  const close = () => {
    reset();
    onOpenChange(false);
  };

  const pick = (quote: ImportableQuote) => {
    setSelected(quote);
    setDraft(buildOpportunityDraftFromQuote(quote));
  };

  const confirm = async () => {
    if (!selected || !draft || missing.length > 0) return;
    setSaving(true);
    let createdId: string | null = null;
    try {
      const created = await createOpportunity({
        client_id: draft.client_id,
        destination: draft.destination.trim(),
        start_date: draft.start_date || undefined,
        end_date: draft.end_date || undefined,
        passengers_count: draft.passengers_count,
        adults_count: draft.adults_count,
        children_count: draft.children_count,
        estimated_value: draft.estimated_value,
        notes: draft.notes || undefined,
      });
      createdId = (created as any)?.id ?? null;
      if (!createdId) throw new Error("Não foi possível criar a oportunidade");

      // Vincula o orçamento existente (sem duplicá-lo).
      const { error: linkErr } = await supabase
        .from("quotes")
        .update({ opportunity_id: createdId })
        .eq("id", selected.id);
      if (linkErr) throw linkErr;

      await supabase.from("opportunity_history").insert({
        opportunity_id: createdId,
        from_stage: null,
        to_stage: "imported_from_quote",
        notes: `Oportunidade criada a partir do orçamento "${quoteLabel(selected)}" (${selected.id}).`,
      });

      qc.invalidateQueries({ queryKey: ["opportunities"] });
      qc.invalidateQueries({ queryKey: ["importable-quotes"] });
      toast.success("Oportunidade criada a partir do orçamento");
      close();
    } catch (e: any) {
      // Nada parcial: remove a oportunidade recém-criada.
      if (createdId) {
        await supabase.from("opportunities").delete().eq("id", createdId);
        qc.invalidateQueries({ queryKey: ["opportunities"] });
      }
      if (e?.name !== "PermissionDeniedError") {
        toast.error(e?.message || "Não foi possível importar o orçamento");
      }
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => (o ? onOpenChange(true) : close())}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Importar orçamento</DialogTitle>
          <DialogDescription>
            Crie uma oportunidade a partir de um orçamento da sua agência. O orçamento original é
            apenas vinculado.
          </DialogDescription>
        </DialogHeader>

        {!selected && (
          <div className="space-y-3">
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                autoFocus
                className="pl-8"
                placeholder="Buscar por título, destino ou cliente"
                aria-label="Buscar orçamentos"
                value={term}
                onChange={(e) => setTerm(e.target.value)}
              />
            </div>

            {isLoading && (
              <div className="flex items-center justify-center gap-2 py-6 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" /> Carregando orçamentos...
              </div>
            )}

            {!isLoading && error && (
              <div className="rounded-xl border border-dashed p-4 text-center space-y-2">
                <p className="text-sm">Não foi possível carregar seus orçamentos.</p>
                <Button size="sm" variant="outline" onClick={() => refetch()}>
                  <RefreshCw className="h-3.5 w-3.5 mr-1.5" /> Tentar novamente
                </Button>
              </div>
            )}

            {!isLoading && !error && results.length === 0 && (
              <p className="py-6 text-center text-sm text-muted-foreground">
                Nenhum orçamento encontrado.
              </p>
            )}

            <div className="space-y-2">
              {results.map((q) => (
                <button
                  key={q.id}
                  type="button"
                  onClick={() => pick(q)}
                  className="w-full rounded-xl border p-3 text-left transition-colors hover:border-primary/40 hover:bg-muted/50"
                >
                  <p className="text-sm font-semibold break-words">{quoteLabel(q)}</p>
                  <p className="text-xs text-muted-foreground break-words">
                    {[q.client_name, q.destination].filter(Boolean).join(" · ") || "Sem cliente"}
                  </p>
                  <p className="mt-1 text-xs font-medium">{brl(Number(q.total_amount ?? 0))}</p>
                  {q.opportunity_id && (
                    <p className="mt-1 text-[11px] font-semibold text-amber-600">
                      Já vinculado a uma oportunidade
                    </p>
                  )}
                </button>
              ))}
            </div>
          </div>
        )}

        {selected && selected.opportunity_id && (
          <div className="space-y-4">
            <div className="flex items-start gap-2 rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm dark:border-amber-800 dark:bg-amber-950/40">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" />
              <p>
                Este orçamento já está vinculado a uma oportunidade. Para evitar duplicidade, abra a
                oportunidade existente.
              </p>
            </div>
            <div className="flex flex-wrap justify-end gap-2">
              <Button variant="outline" onClick={() => setSelected(null)}>
                Escolher outro
              </Button>
              <Button
                onClick={() => {
                  const id = selected.opportunity_id as string;
                  close();
                  onOpenExisting?.(id);
                }}
              >
                Abrir oportunidade existente
              </Button>
            </div>
          </div>
        )}

        {selected && !selected.opportunity_id && draft && (
          <div className="space-y-3">
            <p className="text-xs text-muted-foreground">
              Confirme os dados antes de criar a oportunidade na primeira etapa do funil.
            </p>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div className="sm:col-span-2">
                <Label>Cliente *</Label>
                <Select
                  value={draft.client_id || undefined}
                  onValueChange={(v) => setDraft({ ...draft, client_id: v })}
                >
                  <SelectTrigger aria-label="Cliente">
                    <SelectValue placeholder="Selecione o cliente" />
                  </SelectTrigger>
                  <SelectContent>
                    {clients.map((c) => (
                      <SelectItem key={c.id} value={c.id}>
                        {c.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="sm:col-span-2">
                <Label htmlFor="import-destination">Título / destino *</Label>
                <Input
                  id="import-destination"
                  value={draft.destination}
                  onChange={(e) => setDraft({ ...draft, destination: e.target.value })}
                />
              </div>
              <div className="sm:col-span-2">
                <TripPeriodField
                  id="import-period"
                  start={draft.start_date}
                  end={draft.end_date}
                  onChange={({ start, end }) => setDraft({ ...draft, start_date: start, end_date: end })}
                />
              </div>
              <div>
                <Label htmlFor="import-adults">Adultos</Label>
                <Input
                  id="import-adults"
                  type="number"
                  min={0}
                  value={draft.adults_count}
                  onChange={(e) => {
                    const adults = Number(e.target.value) || 0;
                    setDraft({
                      ...draft,
                      adults_count: adults,
                      passengers_count: Math.max(1, adults + draft.children_count),
                    });
                  }}
                />
              </div>
              <div>
                <Label htmlFor="import-children">Crianças</Label>
                <Input
                  id="import-children"
                  type="number"
                  min={0}
                  value={draft.children_count}
                  onChange={(e) => {
                    const children = Number(e.target.value) || 0;
                    setDraft({
                      ...draft,
                      children_count: children,
                      passengers_count: Math.max(1, draft.adults_count + children),
                    });
                  }}
                />
              </div>
              <div className="sm:col-span-2">
                <Label htmlFor="import-value">Valor estimado (R$)</Label>
                <Input
                  id="import-value"
                  type="number"
                  min={0}
                  step="0.01"
                  value={draft.estimated_value}
                  onChange={(e) => setDraft({ ...draft, estimated_value: Number(e.target.value) || 0 })}
                />
              </div>
            </div>

            {missing.length > 0 && (
              <p className="text-xs font-medium text-amber-600">
                Complete cliente e título/destino para continuar.
              </p>
            )}

            <div className="flex flex-wrap justify-end gap-2 pt-1">
              <Button variant="outline" onClick={() => setSelected(null)} disabled={saving}>
                Voltar
              </Button>
              <Button onClick={confirm} disabled={saving || missing.length > 0}>
                {saving && <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />}
                Criar oportunidade
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
