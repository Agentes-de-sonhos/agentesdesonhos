import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus, Trash2, ArrowUp, ArrowDown, RotateCcw, Sparkles, Loader2, Hotel, Plane, Car, ArrowRightLeft, Ticket, Shield, Ship } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { computeAutoWhatsIncluded, iconKeyForIncludedItem, type WhatsIncludedIconKey } from "@/lib/whatsIncluded";

interface Props {
  quote: any;
  onUpdated?: () => void;
}

const ICONS: Record<WhatsIncludedIconKey, typeof Sparkles> = {
  hotel: Hotel,
  flight: Plane,
  car: Car,
  transfer: ArrowRightLeft,
  attraction: Ticket,
  insurance: Shield,
  cruise: Ship,
  sparkles: Sparkles,
};

export function WhatsIncludedEditor({ quote, onUpdated }: Props) {
  const auto = useMemo(() => computeAutoWhatsIncluded(quote), [quote]);
  const initial: string[] = Array.isArray(quote?.whats_included) && quote.whats_included.length > 0
    ? quote.whats_included.map((x: any) => String(x))
    : auto;
  const isCustom = Array.isArray(quote?.whats_included) && quote.whats_included.length > 0;

  const [items, setItems] = useState<string[]>(initial);
  const [saving, setSaving] = useState(false);
  const [dirty, setDirty] = useState(false);

  useEffect(() => {
    if (!dirty) setItems(initial);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [quote?.id]);

  // Debounced autosave whenever the list changes
  useEffect(() => {
    if (!dirty) return;
    const t = setTimeout(() => { save(); }, 1200);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [items, dirty]);

  const update = (next: string[]) => {
    setItems(next);
    setDirty(true);
  };

  const save = async (override?: string[] | null) => {
    if (!quote?.id) return;
    setSaving(true);
    try {
      const value =
        override === null
          ? null
          : (override ?? items).map((x) => x.trim()).filter(Boolean);
      const { error } = await supabase
        .from("quotes")
        .update({ whats_included: value as any })
        .eq("id", quote.id);
      if (error) throw error;
      setDirty(false);
      toast.success(value === null ? "Sugestão automática restaurada" : "Lista salva");
      onUpdated?.();
    } catch (e: any) {
      toast.error("Não foi possível salvar a lista");
    } finally {
      setSaving(false);
    }
  };

  const regenerate = () => {
    const fresh = computeAutoWhatsIncluded(quote);
    setItems(fresh);
    setDirty(true);
  };

  const restoreAuto = async () => {
    setItems(computeAutoWhatsIncluded(quote));
    await save(null);
  };

  const move = (i: number, dir: -1 | 1) => {
    const j = i + dir;
    if (j < 0 || j >= items.length) return;
    const next = [...items];
    [next[i], next[j]] = [next[j], next[i]];
    update(next);
  };

  return (
    <div className="space-y-4">
      <div className="rounded-xl border bg-muted/30 p-4">
        <div className="flex items-start justify-between gap-3 flex-wrap">
          <div>
            <p className="text-sm font-semibold">O que está incluso</p>
            <p className="text-xs text-muted-foreground mt-0.5">
              {isCustom
                ? "Você está usando uma lista personalizada."
                : "Sugestão automática gerada a partir dos serviços do orçamento."}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button type="button" variant="outline" size="sm" onClick={regenerate}>
              <Sparkles className="h-3.5 w-3.5 mr-1.5" /> Gerar novamente
            </Button>
            {isCustom && (
              <Button type="button" variant="ghost" size="sm" onClick={restoreAuto} disabled={saving}>
                <RotateCcw className="h-3.5 w-3.5 mr-1.5" /> Restaurar automática
              </Button>
            )}
          </div>
        </div>
      </div>

      <ul className="space-y-2">
        {items.map((text, i) => {
          const Icon = ICONS[iconKeyForIncludedItem(text)] || Sparkles;
          return (
            <li key={i} className="flex items-center gap-2 rounded-lg border bg-background p-2">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-primary/10 text-primary">
                <Icon className="h-4 w-4" />
              </span>
              <Input
                value={text}
                onChange={(e) => {
                  const next = [...items];
                  next[i] = e.target.value;
                  update(next);
                }}
                placeholder="Descreva o item incluído"
                className="flex-1"
              />
              <div className="flex items-center gap-0.5">
                <Button type="button" size="icon" variant="ghost" onClick={() => move(i, -1)} disabled={i === 0} aria-label="Mover para cima">
                  <ArrowUp className="h-4 w-4" />
                </Button>
                <Button type="button" size="icon" variant="ghost" onClick={() => move(i, 1)} disabled={i === items.length - 1} aria-label="Mover para baixo">
                  <ArrowDown className="h-4 w-4" />
                </Button>
                <Button type="button" size="icon" variant="ghost" onClick={() => update(items.filter((_, idx) => idx !== i))} aria-label="Remover">
                  <Trash2 className="h-4 w-4 text-destructive" />
                </Button>
              </div>
            </li>
          );
        })}
      </ul>

      <div className="flex items-center justify-between gap-2 pt-2">
        <Button type="button" variant="outline" size="sm" onClick={() => update([...items, ""])}>
          <Plus className="h-3.5 w-3.5 mr-1.5" /> Adicionar item
        </Button>
        <span className="text-xs text-muted-foreground inline-flex items-center gap-1.5">
          {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : null}
          {saving ? "Salvando…" : dirty ? "Alterações pendentes…" : "Todas as alterações são salvas automaticamente"}
        </span>
      </div>
    </div>
  );
}