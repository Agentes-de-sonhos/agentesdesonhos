/**
 * Bloco de sugestões inteligentes para Ingressos/Atrações (Orçamentos).
 *
 * Nunca dispara IA automaticamente por tecla: toda chamada parte de uma ação
 * explícita do usuário (buscar sugestões, confirmar produto, escolher tipo).
 * Texto livre continua totalmente válido — as sugestões são opcionais.
 */
import { useCallback, useState } from "react";
import { Button } from "@/components/ui/button";
import { Loader2, Search, Sparkles, Ticket } from "lucide-react";
import {
  AI_SUGGESTION_NOTICE,
  MIN_PRODUCT_QUERY,
  fetchProductSuggestions,
  fetchTicketDescription,
  fetchTicketTypeSuggestions,
  type ProductSuggestion,
  type TicketTypeSuggestion,
} from "@/lib/attractionSuggestions";
import { cn } from "@/lib/utils";

interface Props {
  productName: string;
  ticketType: string;
  destination?: string | null;
  /** Descrição atual do serviço — usada para não sobrescrever texto do usuário. */
  currentDescription: string;
  onProductSelect: (name: string) => void;
  onTicketTypeSelect: (label: string) => void;
  onDescriptionSuggest: (text: string) => void;
  /** Termo confirmado para a busca de fotos sugeridas. */
  onConfirmedProductChange?: (name: string | null) => void;
}

export function AttractionAISuggestions({
  productName,
  ticketType,
  destination,
  currentDescription,
  onProductSelect,
  onTicketTypeSelect,
  onDescriptionSuggest,
  onConfirmedProductChange,
}: Props) {
  const [products, setProducts] = useState<ProductSuggestion[] | null>(null);
  const [loadingProducts, setLoadingProducts] = useState(false);
  const [confirmed, setConfirmed] = useState<string | null>(null);
  const [types, setTypes] = useState<TicketTypeSuggestion[] | null>(null);
  const [loadingTypes, setLoadingTypes] = useState(false);
  const [pendingDescription, setPendingDescription] = useState<string | null>(null);
  const [loadingDescription, setLoadingDescription] = useState(false);

  const trimmedName = (productName || "").trim();
  const canSearch = trimmedName.length >= MIN_PRODUCT_QUERY && !loadingProducts;

  const searchProducts = useCallback(async () => {
    if (trimmedName.length < MIN_PRODUCT_QUERY) return;
    setLoadingProducts(true);
    const list = await fetchProductSuggestions(trimmedName, destination);
    setProducts(list);
    setLoadingProducts(false);
  }, [trimmedName, destination]);

  const confirmProduct = useCallback(async (name: string) => {
    setConfirmed(name);
    onConfirmedProductChange?.(name);
    setTypes(null);
    setLoadingTypes(true);
    const list = await fetchTicketTypeSuggestions(name, destination);
    setTypes(list);
    setLoadingTypes(false);
  }, [destination, onConfirmedProductChange]);

  const pickProduct = useCallback(async (name: string) => {
    onProductSelect(name);
    setProducts(null);
    await confirmProduct(name);
  }, [confirmProduct, onProductSelect]);

  const pickTicketType = useCallback(async (label: string) => {
    onTicketTypeSelect(label);
    setLoadingDescription(true);
    setPendingDescription(null);
    const text = await fetchTicketDescription(confirmed || trimmedName, label, destination);
    setLoadingDescription(false);
    if (!text) return;
    if ((currentDescription || "").trim()) {
      setPendingDescription(text);
      return;
    }
    onDescriptionSuggest(text);
  }, [confirmed, trimmedName, destination, currentDescription, onDescriptionSuggest, onTicketTypeSelect]);

  return (
    <div className="space-y-3 rounded-lg border border-dashed border-border bg-muted/30 p-3" data-testid="attraction-ai-suggestions">
      <div className="flex flex-wrap items-center gap-2">
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="gap-1.5"
          disabled={!canSearch}
          onClick={() => void searchProducts()}
          data-testid="attraction-search-products"
        >
          {loadingProducts ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Search className="h-3.5 w-3.5" />}
          Buscar sugestões
        </Button>
        {trimmedName.length >= 2 && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="gap-1.5"
            disabled={loadingTypes}
            onClick={() => void confirmProduct(trimmedName)}
            data-testid="attraction-confirm-product"
          >
            {loadingTypes ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Ticket className="h-3.5 w-3.5" />}
            Usar “{trimmedName}” e sugerir tipos
          </Button>
        )}
      </div>

      {products !== null && (
        products.length === 0 ? (
          <p className="text-xs text-muted-foreground">
            Nenhuma sugestão encontrada. Continue digitando o nome livremente.
          </p>
        ) : (
          <div className="flex flex-wrap gap-2" data-testid="attraction-product-suggestions">
            {products.map((p) => (
              <button
                key={`${p.name}|${p.location ?? ""}`}
                type="button"
                onClick={() => void pickProduct(p.name)}
                className="rounded-full border border-border bg-background px-3 py-1 text-xs hover:bg-muted"
              >
                {p.name}
                {p.location ? <span className="text-muted-foreground"> · {p.location}</span> : null}
              </button>
            ))}
          </div>
        )
      )}

      {types !== null && (
        types.length === 0 ? (
          <p className="text-xs text-muted-foreground">
            Não encontramos modalidades sugeridas. Preencha o tipo de ingresso livremente.
          </p>
        ) : (
          <div className="space-y-1.5" data-testid="attraction-ticket-type-suggestions">
            <p className="text-xs font-medium">Tipos de ingresso sugeridos</p>
            <div className="flex flex-wrap gap-2">
              {types.map((t) => (
                <button
                  key={t.label}
                  type="button"
                  onClick={() => void pickTicketType(t.label)}
                  className={cn(
                    "rounded-full border px-3 py-1 text-xs hover:bg-muted",
                    (ticketType || "").trim() === t.label
                      ? "border-primary bg-primary/10"
                      : "border-border bg-background",
                  )}
                >
                  {t.label}
                </button>
              ))}
            </div>
          </div>
        )
      )}

      {loadingDescription && (
        <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <Loader2 className="h-3 w-3 animate-spin" /> Gerando descrição sugerida…
        </p>
      )}

      {pendingDescription && (
        <div className="space-y-1.5 rounded-md border border-border bg-background p-2" data-testid="attraction-description-replace">
          <p className="text-xs text-muted-foreground">
            Já existe uma descrição preenchida. Deseja substituí-la pela sugestão?
          </p>
          <p className="text-xs">{pendingDescription}</p>
          <div className="flex gap-2">
            <Button
              type="button"
              size="sm"
              variant="outline"
              className="gap-1.5"
              onClick={() => { onDescriptionSuggest(pendingDescription); setPendingDescription(null); }}
            >
              <Sparkles className="h-3.5 w-3.5" /> Substituir pela sugestão
            </Button>
            <Button type="button" size="sm" variant="ghost" onClick={() => setPendingDescription(null)}>
              Manter a atual
            </Button>
          </div>
        </div>
      )}

      <p className="text-[11px] text-muted-foreground">{AI_SUGGESTION_NOTICE}</p>
    </div>
  );
}
