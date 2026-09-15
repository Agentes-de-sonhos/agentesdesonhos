/**
 * Importar serviços de um orçamento para os serviços da operação.
 *
 * Reaproveita `operation_services` (com `source_quote_service_id`) e o mapeador
 * compartilhado. Nada de reserva é criado aqui: apenas os serviços operacionais,
 * com vínculo rastreável orçamento → oportunidade → operação para a Central de
 * Reservas consumir depois.
 */
import { useEffect, useMemo, useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Search, Loader2, AlertTriangle, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { useDebounce } from "@/hooks/useDebounce";
import { useImportableQuotes } from "@/hooks/useImportableQuotes";
import {
  mapQuoteServicesToOperationRows,
  quoteLabel,
  searchImportableQuotes,
  splitAlreadyImportedServices,
  type ImportableQuote,
} from "@/lib/crmQuoteImport";
import type { Operation } from "@/types/operations";

interface Props {
  operation: Operation;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const brl = (v: number) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(Number(v) || 0);

/** Orçamento recomendado: o vinculado à operação ou o da mesma oportunidade. */
export function recommendedQuoteId(
  operation: Pick<Operation, "quote_id" | "opportunity_id">,
  quotes: ImportableQuote[],
): string | null {
  if (operation.quote_id) return operation.quote_id;
  if (!operation.opportunity_id) return null;
  const match = quotes.find((q) => q.opportunity_id === operation.opportunity_id);
  return match?.id ?? null;
}

export function ImportQuoteServicesDialog({ operation, open, onOpenChange }: Props) {
  const { quotes, isLoading, error, refetch } = useImportableQuotes(open);
  const { user } = useAuth();
  const qc = useQueryClient();

  const [term, setTerm] = useState("");
  const debounced = useDebounce(term, 250);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const recommendedId = useMemo(() => recommendedQuoteId(operation, quotes), [operation, quotes]);

  useEffect(() => {
    if (!open) return;
    setSelectedId((prev) => prev ?? recommendedId);
  }, [open, recommendedId]);

  useEffect(() => {
    if (!open) {
      setTerm("");
      setSelectedId(null);
      setSaving(false);
    }
  }, [open]);

  const results = useMemo(() => {
    const list = searchImportableQuotes(quotes, debounced);
    if (!recommendedId) return list;
    const rec = quotes.find((q) => q.id === recommendedId);
    if (!rec || list.some((q) => q.id === recommendedId)) return list;
    return [rec, ...list];
  }, [quotes, debounced, recommendedId]);

  const confirm = async () => {
    if (!selectedId || !user?.id) return;
    setSaving(true);
    let insertedIds: string[] = [];
    try {
      const { data: qs, error: qsErr } = await supabase
        .from("quote_services")
        .select("id, service_type, service_data, amount, description, order_index")
        .eq("quote_id", selectedId)
        .order("order_index", { ascending: true });
      if (qsErr) throw qsErr;
      if (!qs?.length) {
        toast.error("Este orçamento não possui serviços para importar");
        setSaving(false);
        return;
      }

      const { data: existing, error: exErr } = await supabase
        .from("operation_services" as any)
        .select("id, source_quote_service_id, position")
        .eq("operation_id", operation.id);
      if (exErr) throw exErr;

      const { pending, duplicates } = splitAlreadyImportedServices(
        qs as any[],
        ((existing || []) as any[]).map((r) => r.source_quote_service_id),
      );

      if (pending.length === 0) {
        toast.error("Os serviços deste orçamento já foram importados nesta operação");
        setSaving(false);
        return;
      }

      const rows = mapQuoteServicesToOperationRows(pending as any[], {
        operationId: operation.id,
        userId: user.id,
        quoteId: selectedId,
        opportunityId: operation.opportunity_id,
        startPosition: ((existing || []) as any[]).length,
      });

      const { data: inserted, error: insErr } = await supabase
        .from("operation_services" as any)
        .insert(rows as any)
        .select("id");
      if (insErr) throw insErr;
      insertedIds = ((inserted || []) as any[]).map((r) => r.id);

      const label = quoteLabel(quotes.find((q) => q.id === selectedId) || { id: selectedId });
      const { error: histErr } = await supabase.from("operation_timeline" as any).insert({
        operation_id: operation.id,
        user_id: user.id,
        event_type: "services_imported",
        description: `${pending.length} serviço(s) importado(s) do orçamento "${label}".`,
        metadata: { quote_id: selectedId, imported_count: pending.length },
      });
      if (histErr) throw histErr;

      // Rastreabilidade: registra o orçamento de origem quando ainda não havia.
      if (!operation.quote_id) {
        const { error: linkErr } = await supabase
          .from("operations" as any)
          .update({ quote_id: selectedId } as any)
          .eq("id", operation.id);
        if (linkErr) throw linkErr;
      }

      qc.invalidateQueries({ queryKey: ["operation-services", operation.id] });
      qc.invalidateQueries({ queryKey: ["operation-timeline", operation.id] });
      qc.invalidateQueries({ queryKey: ["operations"] });
      toast.success(
        duplicates.length > 0
          ? `${pending.length} serviço(s) importado(s). ${duplicates.length} já existia(m).`
          : `${pending.length} serviço(s) importado(s) do orçamento`,
      );
      onOpenChange(false);
    } catch (e: any) {
      // Nada parcial: desfaz os serviços inseridos nesta tentativa.
      if (insertedIds.length > 0) {
        await supabase.from("operation_services" as any).delete().in("id", insertedIds);
        qc.invalidateQueries({ queryKey: ["operation-services", operation.id] });
      }
      toast.error(e?.message || "Não foi possível importar os serviços");
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Importar serviços</DialogTitle>
          <DialogDescription>
            Escolha um orçamento da sua agência. Os serviços entram nesta operação sem alterar o
            orçamento original.
          </DialogDescription>
        </DialogHeader>

        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
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
          <p className="py-6 text-center text-sm text-muted-foreground">Nenhum orçamento encontrado.</p>
        )}

        {!isLoading && !error && !recommendedId && results.length > 0 && (
          <p className="flex items-start gap-1.5 text-xs text-muted-foreground">
            <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
            Esta operação não tem orçamento vinculado. Escolha qualquer orçamento da agência.
          </p>
        )}

        <div className="space-y-2">
          {results.map((q) => {
            const isSelected = q.id === selectedId;
            return (
              <button
                key={q.id}
                type="button"
                aria-pressed={isSelected}
                onClick={() => setSelectedId(q.id)}
                className={`w-full rounded-xl border p-3 text-left transition-colors hover:bg-muted/50 ${
                  isSelected ? "border-primary ring-1 ring-primary/40" : ""
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <p className="text-sm font-semibold break-words">{quoteLabel(q)}</p>
                  {q.id === recommendedId && (
                    <Badge variant="secondary" className="shrink-0 text-[10px]">
                      Recomendado
                    </Badge>
                  )}
                </div>
                <p className="text-xs text-muted-foreground break-words">
                  {[q.client_name, q.destination].filter(Boolean).join(" · ") || "Sem cliente"}
                </p>
                <p className="mt-1 text-xs font-medium">{brl(Number(q.total_amount ?? 0))}</p>
              </button>
            );
          })}
        </div>

        <div className="flex flex-wrap justify-end gap-2 pt-1">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>
            Cancelar
          </Button>
          <Button onClick={confirm} disabled={saving || !selectedId}>
            {saving && <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />}
            Importar serviços
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
