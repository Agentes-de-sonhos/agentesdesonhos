/**
 * Importação do "Novo Orçamento": duplicar outro orçamento ou converter um
 * roteiro em serviços com IA.
 *
 * Reaproveita `QuoteClientForm` (revisão obrigatória dos dados principais),
 * as listas já carregadas de orçamentos/roteiros (RLS por agência) e o
 * pipeline de IA `import-full-package`. Nenhum registro é criado antes da
 * confirmação final.
 */
import { useEffect, useMemo, useState } from "react";
import {
  Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Textarea } from "@/components/ui/textarea";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  ArrowLeft, CalendarDays, Copy, FileText, Loader2, Search, Sparkles, Trash2, Users,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useQuotes } from "@/hooks/useQuotes";
import { useItineraries } from "@/hooks/useItineraries";
import { useQuoteImport } from "@/hooks/useQuoteImport";
import { QuoteClientForm } from "@/components/quote/QuoteClientForm";
import { CurrencyInput } from "@/components/shared/CurrencyInput";
import type { QuoteFormData, ServiceType } from "@/types/quote";
import {
  SERVICE_TYPE_LABELS,
  hasEnoughItineraryContent,
  itineraryToImportText,
  normalizeImportedItems,
  searchItinerarySources,
  searchQuoteSources,
  type ImportedItemDraft,
} from "@/lib/quoteImportSources";

type Step = "mode" | "pick-quote" | "pick-itinerary" | "analyzing" | "items" | "review";

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onImported: (quoteId: string) => void;
}

function useDebounced(value: string, delay = 300) {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(t);
  }, [value, delay]);
  return debounced;
}

function fmtDate(value?: string | null) {
  if (!value) return "—";
  const [y, m, d] = String(value).slice(0, 10).split("-").map(Number);
  if (!y || !m || !d) return "—";
  return `${String(d).padStart(2, "0")}/${String(m).padStart(2, "0")}/${y}`;
}

export function QuoteImportDialog({ open, onOpenChange, onImported }: Props) {
  const { toast } = useToast();
  const { quotes, isLoading: quotesLoading } = useQuotes();
  const { itineraries, isLoading: itinerariesLoading, getItineraryWithDetails } = useItineraries();
  const { importFromQuote, importFromItems, isImporting } = useQuoteImport();

  const [step, setStep] = useState<Step>("mode");
  const [term, setTerm] = useState("");
  const debouncedTerm = useDebounced(term);
  const [sourceQuote, setSourceQuote] = useState<any | null>(null);
  const [sourceItinerary, setSourceItinerary] = useState<any | null>(null);
  const [items, setItems] = useState<ImportedItemDraft[]>([]);
  const [error, setError] = useState<string | null>(null);

  const reset = () => {
    setStep("mode");
    setTerm("");
    setSourceQuote(null);
    setSourceItinerary(null);
    setItems([]);
    setError(null);
  };

  useEffect(() => {
    if (!open) reset();
  }, [open]);

  const quoteResults = useMemo(
    () => searchQuoteSources(quotes as any[], debouncedTerm),
    [quotes, debouncedTerm],
  );
  const itineraryResults = useMemo(
    () => searchItinerarySources(itineraries as any[], debouncedTerm),
    [itineraries, debouncedTerm],
  );

  /* ─── Roteiro → IA (só após confirmar o roteiro) ─── */
  const analyzeItinerary = async (itinerary: any) => {
    setError(null);
    setStep("analyzing");
    try {
      const details = await getItineraryWithDetails(itinerary.id);
      const full = { ...itinerary, ...details };
      if (!hasEnoughItineraryContent(full as any)) {
        setError("Este roteiro não tem atividades suficientes para gerar um orçamento.");
        setStep("pick-itinerary");
        return;
      }
      setSourceItinerary(full);
      const text = itineraryToImportText(full as any);
      const { data, error: fnError } = await supabase.functions.invoke("import-full-package", {
        body: { text },
      });
      let body: any = data;
      if (fnError) {
        try {
          const ctx = (fnError as any)?.context;
          if (ctx && typeof ctx.json === "function") body = await ctx.json();
        } catch { /* noop */ }
      }
      const normalized = normalizeImportedItems(body?.blocks);
      if (!normalized.length) {
        setError("A IA não identificou serviços neste roteiro. Revise o roteiro e tente novamente.");
        setStep("pick-itinerary");
        return;
      }
      setItems(normalized);
      setStep("items");
    } catch (e: any) {
      setError(e?.message || "Não foi possível analisar o roteiro.");
      setStep("pick-itinerary");
    }
  };

  /* ─── Criação final ─── */
  const handleReviewSubmit = async (data: QuoteFormData) => {
    const overrides = {
      client_id: data.client_id || null,
      client_name: data.client_name,
      destination: data.destination,
      start_date: data.start_date,
      end_date: data.end_date,
      adults_count: data.adults_count,
      children_count: data.children_count,
      currency: data.currency,
      currency_mode: data.currency_mode,
      exchange_rate: data.exchange_rate ?? null,
    };
    try {
      const created = sourceQuote
        ? await importFromQuote(sourceQuote.id, overrides)
        : await importFromItems(overrides, items);
      toast({
        title: "Orçamento criado",
        description: sourceQuote
          ? "A cópia foi criada. O orçamento original não foi alterado."
          : "Os itens aprovados foram adicionados ao novo orçamento.",
      });
      onOpenChange(false);
      onImported(created.id);
    } catch (e: any) {
      toast({
        title: "Erro ao importar",
        description: e?.message || "Não foi possível criar o orçamento.",
        variant: "destructive",
      });
    }
  };

  const reviewDefaults = sourceQuote
    ? {
        client_id: null,
        client_name: null,
        destination: sourceQuote.destination,
        start_date: sourceQuote.start_date,
        end_date: sourceQuote.end_date,
        adults_count: sourceQuote.adults_count,
        children_count: sourceQuote.children_count,
      }
    : {
        client_id: sourceItinerary?.clientId ?? null,
        client_name: sourceItinerary?.clientName ?? null,
        destination: sourceItinerary?.destination ?? "",
        start_date: sourceItinerary?.startDate ?? null,
        end_date: sourceItinerary?.endDate ?? null,
        adults_count: sourceItinerary?.travelersCount ?? 2,
        children_count: 0,
      };

  const titles: Record<Step, { title: string; description: string }> = {
    mode: { title: "Importar", description: "Escolha a origem dos dados do novo orçamento." },
    "pick-quote": { title: "Importar de outro orçamento", description: "Pesquise por cliente ou destino." },
    "pick-itinerary": { title: "Importar de roteiro", description: "Pesquise por cliente ou destino." },
    analyzing: { title: "Analisando roteiro", description: "A IA está identificando os serviços." },
    items: { title: "Revisar itens", description: "Confirme, ajuste ou remova cada item antes de criar." },
    review: { title: "Revisar dados principais", description: "Confirme cliente, período e passageiros." },
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !isImporting && onOpenChange(v)}>
      <DialogContent className="max-h-[88vh] w-[calc(100vw-1.5rem)] max-w-2xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {step !== "mode" && step !== "analyzing" && (
              <button
                type="button"
                onClick={() => setStep(step === "review" ? (sourceQuote ? "pick-quote" : "items") : "mode")}
                className="text-muted-foreground hover:text-foreground"
                aria-label="Voltar"
              >
                <ArrowLeft className="h-4 w-4" />
              </button>
            )}
            {titles[step].title}
          </DialogTitle>
          <DialogDescription>{titles[step].description}</DialogDescription>
        </DialogHeader>

        {error && (
          <p className="rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive">{error}</p>
        )}

        {step === "mode" && (
          <div className="grid gap-3 sm:grid-cols-2">
            <button
              type="button"
              onClick={() => { setTerm(""); setStep("pick-quote"); }}
              className="rounded-xl border border-border bg-card p-4 text-left transition-all hover:-translate-y-0.5 hover:shadow-sm"
            >
              <Copy className="mb-2 h-4 w-4 text-primary" />
              <p className="font-semibold">Importar de outro orçamento</p>
              <p className="text-sm text-muted-foreground">
                Usa um orçamento existente como base, sem alterar o original.
              </p>
            </button>
            <button
              type="button"
              onClick={() => { setTerm(""); setStep("pick-itinerary"); }}
              className="rounded-xl border border-border bg-card p-4 text-left transition-all hover:-translate-y-0.5 hover:shadow-sm"
            >
              <Sparkles className="mb-2 h-4 w-4 text-primary" />
              <p className="font-semibold">Importar de roteiro</p>
              <p className="text-sm text-muted-foreground">
                A IA transforma as atividades do roteiro em serviços para revisão.
              </p>
            </button>
          </div>
        )}

        {(step === "pick-quote" || step === "pick-itinerary") && (
          <div className="space-y-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={term}
                onChange={(e) => setTerm(e.target.value)}
                placeholder="Pesquisar por cliente ou destino"
                className="pl-9"
              />
            </div>

            {(step === "pick-quote" ? quotesLoading : itinerariesLoading) ? (
              <div className="flex items-center justify-center py-8 text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" />
              </div>
            ) : (
              <ScrollArea className="max-h-[46vh]">
                <div className="space-y-2 pr-2">
                  {step === "pick-quote" && quoteResults.length === 0 && (
                    <p className="py-8 text-center text-sm text-muted-foreground">
                      Nenhum orçamento encontrado.
                    </p>
                  )}
                  {step === "pick-itinerary" && itineraryResults.length === 0 && (
                    <p className="py-8 text-center text-sm text-muted-foreground">
                      Nenhum roteiro encontrado.
                    </p>
                  )}

                  {step === "pick-quote" && quoteResults.map((q: any) => (
                    <button
                      key={q.id}
                      type="button"
                      onClick={() => { setSourceQuote(q); setSourceItinerary(null); setStep("review"); }}
                      className="w-full rounded-lg border border-border p-3 text-left transition-colors hover:bg-muted/40"
                    >
                      <p className="truncate font-medium">{q.client_name || "Sem cliente"}</p>
                      <p className="truncate text-sm text-muted-foreground">{q.destination || "Sem destino"}</p>
                      <p className="mt-1 text-xs text-muted-foreground">
                        {fmtDate(q.start_date)} — {fmtDate(q.end_date)} · criado em {fmtDate(q.created_at)}
                      </p>
                    </button>
                  ))}

                  {step === "pick-itinerary" && itineraryResults.map((it: any) => (
                    <button
                      key={it.id}
                      type="button"
                      onClick={() => analyzeItinerary(it)}
                      className="w-full rounded-lg border border-border p-3 text-left transition-colors hover:bg-muted/40"
                    >
                      <p className="truncate font-medium">{it.clientName || "Sem cliente"}</p>
                      <p className="truncate text-sm text-muted-foreground">{it.destination || "Sem destino"}</p>
                      <p className="mt-1 text-xs text-muted-foreground">
                        {fmtDate(it.startDate)} — {fmtDate(it.endDate)} · criado em {fmtDate(it.createdAt)}
                      </p>
                    </button>
                  ))}
                </div>
              </ScrollArea>
            )}
          </div>
        )}

        {step === "analyzing" && (
          <div className="flex flex-col items-center gap-3 py-10 text-center">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
            <p className="text-sm text-muted-foreground">
              Lendo o roteiro e classificando os serviços. Isso pode levar alguns instantes.
            </p>
          </div>
        )}

        {step === "items" && (
          <div className="space-y-3">
            <ScrollArea className="max-h-[46vh]">
              <div className="space-y-3 pr-2">
                {items.map((item, idx) => (
                  <div key={item.id} className="space-y-2 rounded-lg border border-border p-3">
                    <div className="flex items-start justify-between gap-2">
                      <Input
                        value={item.title}
                        onChange={(e) =>
                          setItems((prev) => prev.map((p, i) => (i === idx ? { ...p, title: e.target.value } : p)))
                        }
                        className="h-9"
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        aria-label="Excluir item"
                        onClick={() => setItems((prev) => prev.filter((_, i) => i !== idx))}
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                    <div className="grid gap-2 sm:grid-cols-2">
                      <div className="space-y-1">
                        <Label className="text-xs">Tipo de serviço</Label>
                        <Select
                          value={item.service_type}
                          onValueChange={(v) =>
                            setItems((prev) =>
                              prev.map((p, i) => (i === idx ? { ...p, service_type: v as ServiceType } : p)),
                            )
                          }
                        >
                          <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                          <SelectContent>
                            {(Object.keys(SERVICE_TYPE_LABELS) as ServiceType[]).map((t) => (
                              <SelectItem key={t} value={t}>{SERVICE_TYPE_LABELS[t]}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs">Valor</Label>
                        <CurrencyInput
                          value={item.amount}
                          onChange={(v) =>
                            setItems((prev) => prev.map((p, i) => (i === idx ? { ...p, amount: v || 0 } : p)))
                          }
                        />
                      </div>
                    </div>
                    <Textarea
                      value={item.description || ""}
                      onChange={(e) =>
                        setItems((prev) => prev.map((p, i) => (i === idx ? { ...p, description: e.target.value } : p)))
                      }
                      placeholder="Descrição (opcional)"
                      className="min-h-[60px] text-sm"
                    />
                  </div>
                ))}
                {items.length === 0 && (
                  <p className="py-8 text-center text-sm text-muted-foreground">
                    Nenhum item restante. Volte e escolha outro roteiro.
                  </p>
                )}
              </div>
            </ScrollArea>
            <Button
              type="button"
              className="w-full"
              disabled={items.length === 0}
              onClick={() => setStep("review")}
            >
              Continuar para os dados principais
            </Button>
          </div>
        )}

        {step === "review" && (
          <div className="space-y-4">
            <div className="rounded-lg border border-amber-300/60 bg-amber-50 p-3 text-sm text-amber-900">
              <p className="flex items-center gap-2 font-semibold">
                <CalendarDays className="h-4 w-4" /> Confira as datas
              </p>
              <p className="mt-1">
                As datas vêm da origem e provavelmente são diferentes neste novo orçamento. Confirme o
                período antes de criar.
              </p>
            </div>
            {sourceQuote && (
              <p className="flex items-center gap-2 text-xs text-muted-foreground">
                <FileText className="h-3.5 w-3.5" />
                Base: {sourceQuote.client_name} · {sourceQuote.destination}
                <Badge variant="secondary" className="text-[11px]">Original preservado</Badge>
              </p>
            )}
            {!sourceQuote && (
              <p className="flex items-center gap-2 text-xs text-muted-foreground">
                <Users className="h-3.5 w-3.5" />
                {items.length} {items.length === 1 ? "item aprovado" : "itens aprovados"} do roteiro
              </p>
            )}
            <QuoteClientForm
              onSubmit={handleReviewSubmit}
              isLoading={isImporting}
              draftKey="quote-import-review"
              submitLabel="Criar orçamento importado"
              defaults={reviewDefaults as any}
            />
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
