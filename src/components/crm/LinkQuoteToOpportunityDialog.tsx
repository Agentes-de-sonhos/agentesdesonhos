/**
 * "Gerar / vincular orçamento" do card de Oportunidades.
 * Vínculo usa a relação existente `quotes.opportunity_id`; a lista vem de
 * useImportableQuotes (filtrada pelo titular da agência + RLS).
 */
import { useMemo, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { FilePlus2, Link2, Loader2, Search, ArrowLeft } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useImportableQuotes } from "@/hooks/useImportableQuotes";
import { useAgencyOwnerId } from "@/hooks/useAgencyOwnerId";
import { quoteLabel, type ImportableQuote } from "@/lib/crmQuoteImport";
import {
  Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";

type LinkableQuote = ImportableQuote & { status?: string | null; public_access_code?: string | null };

const STATUS_LABELS: Record<string, string> = {
  draft: "Rascunho", sent: "Enviado", approved: "Aprovado", accepted: "Aceito",
  rejected: "Recusado", expired: "Expirado", published: "Publicado",
};

const norm = (v: unknown) =>
  String(v ?? "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim();

export function searchLinkableQuotes(quotes: LinkableQuote[], term: string, limit = 50) {
  const q = norm(term);
  const list = !q ? quotes : quotes.filter((x) =>
    [x.trip_title, x.destination, x.client_name, x.public_access_code, x.id].some((f) => norm(f).includes(q)));
  return list.slice(0, limit);
}

const brl = (v?: number | null) =>
  (Number(v) || 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

interface Props {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  opportunityId: string;
  onGenerateNew: () => void;
}

export function LinkQuoteToOpportunityDialog({ open, onOpenChange, opportunityId, onGenerateNew }: Props) {
  const [mode, setMode] = useState<"choose" | "link">("choose");
  const [term, setTerm] = useState("");
  const [savingId, setSavingId] = useState<string | null>(null);
  const qc = useQueryClient();
  const { agencyOwnerId } = useAgencyOwnerId();
  const { quotes, isLoading } = useImportableQuotes(open && mode === "link");
  const results = useMemo(() => searchLinkableQuotes(quotes as LinkableQuote[], term), [quotes, term]);

  const close = (o: boolean) => {
    if (!o) { setMode("choose"); setTerm(""); }
    onOpenChange(o);
  };

  const link = async (q: LinkableQuote) => {
    if (savingId) return;
    if (q.opportunity_id === opportunityId) {
      toast.info("Este orçamento já está vinculado a esta oportunidade.");
      return;
    }
    if (q.opportunity_id) {
      toast.error("Este orçamento já está vinculado a outra oportunidade.");
      return;
    }
    if (!agencyOwnerId) return;
    setSavingId(q.id);
    try {
      // Filtros por agência e "sem vínculo" evitam cruzar tenants e corridas.
      const { data, error } = await supabase
        .from("quotes")
        .update({ opportunity_id: opportunityId })
        .eq("id", q.id)
        .eq("user_id", agencyOwnerId)
        .is("opportunity_id", null)
        .select("id");
      if (error) throw error;
      if (!data?.length) {
        toast.error("Não foi possível vincular: o orçamento não pertence à sua agência ou já foi vinculado.");
        qc.invalidateQueries({ queryKey: ["importable-quotes"] });
        return;
      }
      await supabase.from("opportunity_history").insert({
        opportunity_id: opportunityId,
        to_stage: "Orçamento vinculado",
        notes: `Orçamento existente "${quoteLabel(q)}" vinculado à oportunidade.`,
      } as any);
      qc.invalidateQueries({ queryKey: ["opportunities"] });
      qc.invalidateQueries({ queryKey: ["importable-quotes"] });
      qc.invalidateQueries({ queryKey: ["opportunity-history"] });
      toast.success("Orçamento vinculado à oportunidade");
      close(false);
    } catch (e: any) {
      toast.error("Não foi possível vincular o orçamento", { description: e?.message });
    } finally {
      setSavingId(null);
    }
  };

  return (
    <Dialog open={open} onOpenChange={close}>
      <DialogContent className="flex max-h-[90dvh] w-[calc(100vw-1.5rem)] max-w-lg flex-col rounded-lg">
        <DialogHeader>
          <DialogTitle>{mode === "choose" ? "Gerar / vincular orçamento" : "Vincular orçamento existente"}</DialogTitle>
          <DialogDescription>
            {mode === "choose"
              ? "Escolha como deseja associar um orçamento a esta oportunidade."
              : "Pesquise por título, número, cliente ou destino."}
          </DialogDescription>
        </DialogHeader>

        {mode === "choose" ? (
          <div className="grid gap-3">
            <Button variant="outline" className="h-auto justify-start gap-3 py-3"
              onClick={() => { close(false); onGenerateNew(); }}>
              <FilePlus2 className="h-5 w-5" /> Gerar novo orçamento
            </Button>
            <Button variant="outline" className="h-auto justify-start gap-3 py-3" onClick={() => setMode("link")}>
              <Link2 className="h-5 w-5" /> Vincular orçamento existente
            </Button>
          </div>
        ) : (
          <div className="flex min-h-0 flex-1 flex-col gap-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input autoFocus className="pl-9" placeholder="Buscar orçamento..." value={term}
                onChange={(e) => setTerm(e.target.value)} aria-label="Buscar orçamento" />
            </div>
            <div className="min-h-0 flex-1 space-y-2 overflow-y-auto">
              {isLoading ? (
                <div className="flex justify-center py-6"><Loader2 className="h-5 w-5 animate-spin" /></div>
              ) : results.length === 0 ? (
                <p className="py-6 text-center text-sm text-muted-foreground">Nenhum orçamento encontrado.</p>
              ) : results.map((q) => {
                const linkedHere = q.opportunity_id === opportunityId;
                const linkedOther = !!q.opportunity_id && !linkedHere;
                return (
                  <button key={q.id} type="button" disabled={!!savingId || linkedOther}
                    onClick={() => link(q)}
                    className="w-full rounded-md border border-border p-3 text-left transition-colors hover:bg-muted disabled:opacity-60">
                    <div className="flex items-start justify-between gap-2">
                      <span className="font-medium">
                        {q.public_access_code ? `#${q.public_access_code} · ` : ""}{quoteLabel(q)}
                      </span>
                      {savingId === q.id && <Loader2 className="h-4 w-4 animate-spin" />}
                    </div>
                    <div className="mt-1 text-xs text-muted-foreground">
                      {q.client_name || "Sem cliente"} · {q.destination || "Sem destino"} · {brl(q.total_amount)}
                    </div>
                    <div className="mt-2 flex flex-wrap gap-1">
                      {q.status && <Badge variant="secondary">{STATUS_LABELS[q.status] || q.status}</Badge>}
                      {linkedHere && <Badge>Já vinculado a esta oportunidade</Badge>}
                      {linkedOther && <Badge variant="outline">Vinculado a outra oportunidade</Badge>}
                    </div>
                  </button>
                );
              })}
            </div>
            <Button variant="ghost" className="self-start" onClick={() => setMode("choose")}>
              <ArrowLeft className="mr-2 h-4 w-4" /> Voltar
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
