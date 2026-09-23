import { useState } from "react";
import { Check, Pencil, Plane, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import {
  INITIAL_SETUP_HIGHLIGHT_CLASS,
  isInitialSetupItemPending,
  suggestQuoteTitle,
} from "@/lib/quoteInitialSetup";
import type { Quote } from "@/types/quote";

/**
 * Título do orçamento, agora no bloco Configuração da capa.
 * Enquanto está vazio, recebe realce azul suave e a orientação "Adicione um
 * título"; ao preencher, volta ao visual normal.
 */
export function QuoteTitleField({ quote, onUpdated }: { quote: Quote; onUpdated?: () => void }) {
  const current = ((quote as any).trip_title || "") as string;
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(current);
  const [saving, setSaving] = useState(false);
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const pending = isInitialSetupItemPending(quote as any, "title");
  const suggestion = suggestQuoteTitle(quote as any);

  const save = async (value: string) => {
    const val = value.trim() || null;
    setSaving(true);
    const { error } = await supabase.from("quotes").update({ trip_title: val } as any).eq("id", quote.id);
    setSaving(false);
    if (error) {
      toast({ title: "Erro ao salvar título", description: error.message, variant: "destructive" });
      return;
    }
    queryClient.invalidateQueries({ queryKey: ["quote", quote.id] });
    onUpdated?.();
    setEditing(false);
    toast({ title: "Título atualizado" });
  };

  return (
    <div
      data-testid="quote-title-field"
      data-pending={pending ? "true" : "false"}
      className={cn("border border-border/70 bg-card p-3 rounded-lg", pending && INITIAL_SETUP_HIGHLIGHT_CLASS)}
    >
      <div className="flex min-w-0 items-center gap-2 text-sm">
        <Plane className="h-4 w-4 shrink-0 text-sky-500" />
        <span className="text-muted-foreground">Título do orçamento:</span>
        {editing ? (
          <span className="flex flex-1 items-center gap-1">
            <Input
              className="h-8 text-sm"
              value={draft}
              autoFocus
              aria-label="Título do orçamento"
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") void save(draft);
                if (e.key === "Escape") {
                  setDraft(current);
                  setEditing(false);
                }
              }}
              placeholder="Ex.: Viagem para Orlando em julho"
            />
            <Button variant="ghost" size="icon" className="h-7 w-7" disabled={saving} onClick={() => void save(draft)} title="Salvar">
              <Check className="h-3.5 w-3.5" />
            </Button>
          </span>
        ) : (
          <>
            <span
              className="min-w-0 flex-1 cursor-pointer truncate font-medium hover:underline"
              onClick={() => {
                setDraft(current);
                setEditing(true);
              }}
            >
              {current || <span className="font-normal italic text-muted-foreground">Adicione um título</span>}
            </span>
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7"
              title="Editar título"
              onClick={() => {
                setDraft(current);
                setEditing(true);
              }}
            >
              <Pencil className="h-3.5 w-3.5" />
            </Button>
          </>
        )}
      </div>
      {pending && suggestion ? (
        <div className="mt-2 flex flex-wrap items-center gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="h-7 text-xs"
            data-testid="quote-title-suggestion"
            disabled={saving}
            onClick={() => void save(suggestion)}
          >
            <Sparkles className="mr-1.5 h-3.5 w-3.5 text-sky-500" />
            Usar sugestão: {suggestion}
          </Button>
          <span className="text-[11px] text-muted-foreground">Você pode editar depois.</span>
        </div>
      ) : null}
    </div>
  );
}
