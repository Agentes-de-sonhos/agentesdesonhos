import { Loader2, Search, Wallet, FileText, Users, AlertTriangle, Link2, Check } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { cn } from "@/lib/utils";
import type { OperationBundle, OperationCandidate, SourceOption } from "@/hooks/useOperationSources";
import type { Divergence, Precedence, ServicePair } from "@/lib/saleImport";

const fmt = (v: number) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(v || 0);

// ---------------- Step: localizar operação ----------------

export function StepLocateOperation({
  term, setTerm, results, loading, selectedKey, onSelect,
}: {
  term: string;
  setTerm: (v: string) => void;
  results: OperationCandidate[];
  loading: boolean;
  selectedKey: string | null;
  onSelect: (c: OperationCandidate) => void;
}) {
  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-base font-semibold">Localizar operação</h3>
        <p className="text-sm text-muted-foreground">
          Busque por cliente, destino ou título. A busca cobre CRM, Carteiras Digitais e Orçamentos.
        </p>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          autoFocus
          value={term}
          onChange={(e) => setTerm(e.target.value)}
          placeholder="Ex.: Maria Silva, Orlando, Lua de mel..."
          className="pl-9"
        />
      </div>

      {loading && (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" /> Buscando fontes vinculadas...
        </div>
      )}

      {!loading && term.trim().length >= 2 && results.length === 0 && (
        <div className="rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">
          Nenhuma operação encontrada. Você pode voltar e cadastrar a venda manualmente.
        </div>
      )}

      <div className="space-y-2 max-h-[320px] overflow-y-auto pr-1">
        {results.map((c) => (
          <button
            key={c.key}
            type="button"
            onClick={() => onSelect(c)}
            className={cn(
              "w-full rounded-lg border p-3 text-left transition-colors hover:border-primary/50",
              selectedKey === c.key && "border-primary bg-primary/5",
            )}
          >
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="truncate font-medium">{c.clientName || "Cliente não identificado"}</p>
                <p className="truncate text-sm text-muted-foreground">{c.destination || "Sem destino"}</p>
              </div>
              {c.estimatedValue > 0 && (
                <span className="shrink-0 text-sm font-semibold">{fmt(c.estimatedValue)}</span>
              )}
            </div>
            <div className="mt-2 flex flex-wrap gap-1">
              {c.hasOpportunity && <Badge variant="secondary" className="gap-1"><Users className="h-3 w-3" /> CRM</Badge>}
              {c.tripIds.length > 0 && <Badge variant="secondary" className="gap-1"><Wallet className="h-3 w-3" /> Carteira ({c.tripIds.length})</Badge>}
              {c.quoteIds.length > 0 && <Badge variant="secondary" className="gap-1"><FileText className="h-3 w-3" /> Orçamento ({c.quoteIds.length})</Badge>}
              {c.operationId && <Badge variant="secondary" className="gap-1"><Link2 className="h-3 w-3" /> Operação</Badge>}
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}

// ---------------- Step: fontes encontradas ----------------

function SourceCard({
  option, selected, onToggle,
}: { option: SourceOption; selected: boolean; onToggle: () => void }) {
  return (
    <button
      type="button"
      onClick={onToggle}
      className={cn(
        "w-full rounded-lg border p-3 text-left transition-colors hover:border-primary/50",
        selected && "border-primary bg-primary/5",
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate text-sm font-medium">{option.label}</p>
          <p className="truncate text-xs text-muted-foreground">{option.subtitle}</p>
        </div>
        <div className="shrink-0 text-right">
          <p className="text-sm font-semibold">{fmt(option.total)}</p>
          <p className="text-xs text-muted-foreground">{option.services.length} serviços</p>
        </div>
      </div>
      {selected && (
        <p className="mt-2 flex items-center gap-1 text-xs font-medium text-primary">
          <Check className="h-3 w-3" /> Selecionado
        </p>
      )}
    </button>
  );
}

export function StepOperationSources({
  bundle, loading, walletId, setWalletId, quoteId, setQuoteId,
  precedence, setPrecedence, pairs, divergences, excluded, toggleExcluded,
}: {
  bundle: OperationBundle | null;
  loading: boolean;
  walletId: string | null;
  setWalletId: (v: string | null) => void;
  quoteId: string | null;
  setQuoteId: (v: string | null) => void;
  precedence: Precedence;
  setPrecedence: (p: Precedence) => void;
  pairs: ServicePair[];
  divergences: Divergence[];
  excluded: Set<string>;
  toggleExcluded: (key: string) => void;
}) {
  if (loading || !bundle) {
    return (
      <div className="flex items-center justify-center py-12 text-sm text-muted-foreground">
        <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Resolvendo fontes vinculadas...
      </div>
    );
  }

  const noSources = bundle.wallets.length === 0 && bundle.quotes.length === 0;

  return (
    <div className="space-y-5">
      <div>
        <h3 className="text-base font-semibold">Fontes encontradas</h3>
        <p className="text-sm text-muted-foreground">
          Escolha quais fontes usar. Detalhes operacionais vêm da Carteira; valores comerciais vêm do Orçamento.
        </p>
      </div>

      {bundle.hasSale && (
        <div className="flex items-start gap-2 rounded-lg border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900 dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-200">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
          <span>Já existe uma venda registrada para esta operação. Verifique antes de criar uma duplicidade.</span>
        </div>
      )}

      {noSources && (
        <div className="rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">
          Esta operação não possui Carteira Digital nem Orçamento vinculados. Adicione os produtos manualmente na próxima etapa.
        </div>
      )}

      {bundle.wallets.length > 0 && (
        <div className="space-y-2">
          <Label className="flex items-center gap-2 text-xs uppercase tracking-wide text-muted-foreground">
            <Wallet className="h-3.5 w-3.5" /> Carteiras Digitais
          </Label>
          <div className="grid gap-2">
            {bundle.wallets.map((w) => (
              <SourceCard
                key={w.id}
                option={w}
                selected={walletId === w.id}
                onToggle={() => setWalletId(walletId === w.id ? null : w.id)}
              />
            ))}
          </div>
        </div>
      )}

      {bundle.quotes.length > 0 && (
        <div className="space-y-2">
          <Label className="flex items-center gap-2 text-xs uppercase tracking-wide text-muted-foreground">
            <FileText className="h-3.5 w-3.5" /> Orçamentos
          </Label>
          <div className="grid gap-2">
            {bundle.quotes.map((q) => (
              <SourceCard
                key={q.id}
                option={q}
                selected={quoteId === q.id}
                onToggle={() => setQuoteId(quoteId === q.id ? null : q.id)}
              />
            ))}
          </div>
        </div>
      )}

      {walletId && quoteId && (
        <div className="rounded-lg border bg-muted/30 p-3 space-y-2">
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Precedência de dados</p>
          <div className="grid gap-2 sm:grid-cols-2">
            <label className="flex items-center gap-2 text-sm">
              <Checkbox
                checked={precedence.details === "wallet"}
                onCheckedChange={(v) => setPrecedence({ ...precedence, details: v ? "wallet" : "quote" })}
              />
              Detalhes pela Carteira
            </label>
            <label className="flex items-center gap-2 text-sm">
              <Checkbox
                checked={precedence.values === "quote"}
                onCheckedChange={(v) => setPrecedence({ ...precedence, values: v ? "quote" : "wallet" })}
              />
              Valores pelo Orçamento
            </label>
          </div>
        </div>
      )}

      {divergences.length > 0 && (
        <div className="space-y-2 rounded-lg border border-amber-300 bg-amber-50 p-3 dark:border-amber-800 dark:bg-amber-950/40">
          <p className="flex items-center gap-2 text-sm font-medium text-amber-900 dark:text-amber-200">
            <AlertTriangle className="h-4 w-4" /> Divergências entre as fontes ({divergences.length})
          </p>
          <ul className="space-y-1 text-xs text-amber-900 dark:text-amber-200">
            {divergences.slice(0, 8).map((d, i) => (
              <li key={`${d.key}-${d.field}-${i}`}>
                <strong>{d.label}</strong>{" "}
                {d.field === "price" && `valor difere — Carteira ${d.walletValue} · Orçamento ${d.quoteValue}`}
                {d.field === "date" && `data difere — Carteira ${d.walletValue} · Orçamento ${d.quoteValue}`}
                {d.field === "missing" && `presente em apenas uma fonte (Carteira: ${d.walletValue} · Orçamento: ${d.quoteValue})`}
              </li>
            ))}
          </ul>
        </div>
      )}

      {pairs.length > 0 && (
        <div className="space-y-2">
          <Label className="text-xs uppercase tracking-wide text-muted-foreground">
            Serviços que serão importados
          </Label>
          <div className="divide-y rounded-lg border">
            {pairs.map((p) => {
              const title = p.wallet?.title || p.quote?.title || "Serviço";
              const price = (p.quote?.price || p.wallet?.price || 0);
              return (
                <label key={p.key} className="flex cursor-pointer items-center gap-3 p-3">
                  <Checkbox
                    checked={!excluded.has(p.key)}
                    onCheckedChange={() => toggleExcluded(p.key)}
                  />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{title}</p>
                    <p className="text-xs text-muted-foreground">
                      {p.kind === "both" && "Carteira + Orçamento"}
                      {p.kind === "wallet_only" && "Somente Carteira"}
                      {p.kind === "quote_only" && "Somente Orçamento"}
                    </p>
                  </div>
                  <span className="shrink-0 text-sm font-semibold">{fmt(price)}</span>
                </label>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}