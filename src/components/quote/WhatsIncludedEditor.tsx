import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus, Trash2, ArrowUp, ArrowDown, RotateCcw, Sparkles, Loader2, Pencil } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import {
  computeAutoWhatsIncluded,
  customWhatsIncludedItems,
  serializeWhatsIncludedItems,
  autoIncludedIconId,
  effectiveIncludedIconId,
  type WhatsIncludedItem,
} from "@/lib/whatsIncluded";
import { includedIconComponent, includedIconLabel, type IncludedIconId } from "@/lib/includedIcons";
import { IncludedIconPicker } from "@/components/quote/IncludedIconPicker";

interface Props {
  quote: any;
  onUpdated?: () => void;
}

export function WhatsIncludedEditor({ quote, onUpdated }: Props) {
  const auto = useMemo(() => computeAutoWhatsIncluded(quote), [quote]);
  const persisted = useMemo(() => customWhatsIncludedItems(quote), [quote]);
  const isCustom = persisted.length > 0;
  const initial: WhatsIncludedItem[] = isCustom ? persisted : auto.map((text) => ({ text }));

  const [items, setItems] = useState<WhatsIncludedItem[]>(initial);
  const [saving, setSaving] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [pickerIndex, setPickerIndex] = useState<number | null>(null);

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

  const update = (next: WhatsIncludedItem[]) => {
    setItems(next);
    setDirty(true);
  };

  const save = async (override?: WhatsIncludedItem[] | null) => {
    if (!quote?.id) return;
    setSaving(true);
    try {
      const value = override === null ? null : serializeWhatsIncludedItems(override ?? items);
      const { error } = await supabase
        .from("quotes")
        .update({ whats_included: value as any })
        .eq("id", quote.id);
      if (error) throw error;
      setDirty(false);
      if (value === null) toast.success("Sugestão automática restaurada");
      onUpdated?.();
    } catch (e: any) {
      toast.error("Não foi possível salvar a lista");
    } finally {
      setSaving(false);
    }
  };

  // "Gerar novamente": refaz os textos automáticos, preservando os ícones
  // escolhidos manualmente para itens com o mesmo texto. Itens sem
  // correspondência voltam à sugestão automática de ícone.
  const regenerate = () => {
    const manualByText = new Map(items.filter((i) => i.icon).map((i) => [i.text.trim(), i.icon as IncludedIconId]));
    update(computeAutoWhatsIncluded(quote).map((text) => {
      const icon = manualByText.get(text.trim());
      return icon ? { text, icon } : { text };
    }));
  };

  // "Restaurar automática": limpa a lista personalizada (inclusive ícones
  // manuais) gravando NULL, voltando à lista automática completa.
  const restoreAuto = async () => {
    setItems(computeAutoWhatsIncluded(quote).map((text) => ({ text })));
    await save(null);
  };

  const move = (i: number, dir: -1 | 1) => {
    const j = i + dir;
    if (j < 0 || j >= items.length) return;
    const next = [...items];
    [next[i], next[j]] = [next[j], next[i]];
    update(next);
  };

  const activeItem = pickerIndex !== null ? items[pickerIndex] : null;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3 flex-wrap rounded-xl border bg-card px-4 py-2.5 shadow-sm">
        <p className="text-xs text-muted-foreground">
          {isCustom
            ? "Lista personalizada."
            : "Sugestão automática gerada a partir dos serviços."}
        </p>
        <div className="flex flex-wrap gap-1.5">
          <Button type="button" variant="outline" size="sm" className="h-7 text-xs" onClick={regenerate}>
            <Sparkles className="h-3.5 w-3.5 mr-1.5" /> Gerar novamente
          </Button>
          {isCustom && (
            <Button type="button" variant="ghost" size="sm" className="h-7 text-xs" onClick={restoreAuto} disabled={saving}>
              <RotateCcw className="h-3.5 w-3.5 mr-1.5" /> Restaurar automática
            </Button>
          )}
        </div>
      </div>

      <ul className="space-y-2">
        {items.map((item, i) => {
          const Icon = includedIconComponent(effectiveIncludedIconId(item));
          const label = `Alterar ícone de ${item.text || "item"}`;
          return (
            <li key={i} className="flex items-center gap-2 rounded-xl border bg-card p-2 shadow-sm">
              <button
                type="button"
                onClick={() => setPickerIndex(i)}
                aria-label={label}
                title={`${includedIconLabel(effectiveIncludedIconId(item))} — alterar ícone`}
                className="group relative flex h-11 w-11 shrink-0 items-center justify-center rounded-md bg-primary/10 text-primary transition-colors hover:bg-primary/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring sm:h-9 sm:w-9"
              >
                <Icon className="h-4 w-4" aria-hidden="true" />
                <span
                  aria-hidden="true"
                  className="pointer-events-none absolute -right-1 -top-1 hidden h-4 w-4 items-center justify-center rounded-full bg-primary text-primary-foreground opacity-0 transition-opacity group-hover:opacity-100 group-focus-visible:opacity-100 sm:flex"
                >
                  <Pencil className="h-2.5 w-2.5" />
                </span>
              </button>
              <Input
                value={item.text}
                onChange={(e) => {
                  const next = [...items];
                  next[i] = { ...next[i], text: e.target.value };
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

      {activeItem && (
        <IncludedIconPicker
          open={pickerIndex !== null}
          onOpenChange={(open) => { if (!open) setPickerIndex(null); }}
          itemText={activeItem.text}
          currentIconId={activeItem.icon}
          autoIconId={autoIncludedIconId(activeItem.text)}
          onApply={(iconId) => {
            if (pickerIndex === null) return;
            const next = [...items];
            const { icon: _prev, ...rest } = next[pickerIndex];
            next[pickerIndex] = iconId ? { ...rest, icon: iconId } : rest;
            update(next);
            setPickerIndex(null);
          }}
        />
      )}

      <div className="flex items-center justify-between gap-2 pt-2">
        <Button type="button" variant="outline" size="sm" onClick={() => update([...items, { text: "" }])}>
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
