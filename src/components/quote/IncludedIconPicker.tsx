import { useEffect, useMemo, useState } from "react";
import { Search, RotateCcw, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import {
  INCLUDED_ICON_CATEGORIES,
  includedIconComponent,
  includedIconDef,
  searchIncludedIcons,
  sanitizeIncludedIconId,
  type IncludedIconCategory,
  type IncludedIconId,
} from "@/lib/includedIcons";

const RECENTS_KEY = "quote-included-icons-recent";
const RECENTS_LIMIT = 8;

function readRecents(): IncludedIconId[] {
  try {
    const raw = JSON.parse(localStorage.getItem(RECENTS_KEY) || "[]");
    if (!Array.isArray(raw)) return [];
    return raw.map((x) => sanitizeIncludedIconId(x)).filter(Boolean).slice(0, RECENTS_LIMIT) as IncludedIconId[];
  } catch {
    return [];
  }
}

function pushRecent(id: IncludedIconId) {
  try {
    const next = [id, ...readRecents().filter((x) => x !== id)].slice(0, RECENTS_LIMIT);
    localStorage.setItem(RECENTS_KEY, JSON.stringify(next));
  } catch {
    /* localStorage indisponível: "Recentes" apenas não aparece */
  }
}

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Texto do item, usado na prévia e nos rótulos acessíveis. */
  itemText: string;
  /** Ícone manual atual (se houver). */
  currentIconId?: IncludedIconId;
  /** Sugestão automática para este item. */
  autoIconId: IncludedIconId;
  /** `null` = voltar a usar a sugestão automática. */
  onApply: (iconId: IncludedIconId | null) => void;
}

export function IncludedIconPicker({ open, onOpenChange, itemText, currentIconId, autoIconId, onApply }: Props) {
  const [term, setTerm] = useState("");
  const [category, setCategory] = useState<IncludedIconCategory | "todos">("todos");
  const [selected, setSelected] = useState<IncludedIconId>(currentIconId || autoIconId);
  const [recents, setRecents] = useState<IncludedIconId[]>([]);

  useEffect(() => {
    if (!open) return;
    setTerm("");
    setCategory("todos");
    setSelected(currentIconId || autoIconId);
    setRecents(readRecents());
  }, [open, currentIconId, autoIconId]);

  const results = useMemo(() => searchIncludedIcons(term, category), [term, category]);
  const PreviewIcon = includedIconComponent(selected);

  const apply = () => {
    pushRecent(selected);
    onApply(selected === autoIconId && !currentIconId ? null : selected);
    onOpenChange(false);
  };

  const useAuto = () => {
    setSelected(autoIconId);
    onApply(null);
    onOpenChange(false);
  };

  const renderGrid = (defs: ReturnType<typeof searchIncludedIcons>) => (
    <ul className="grid grid-cols-4 gap-2 sm:grid-cols-6 md:grid-cols-8" role="list">
      {defs.map((def) => {
        const Icon = def.Icon;
        const active = def.id === selected;
        return (
          <li key={def.id}>
            <button
              type="button"
              onClick={() => setSelected(def.id)}
              aria-pressed={active}
              title={def.label}
              className={cn(
                "flex h-11 w-full min-h-11 flex-col items-center justify-center gap-0.5 rounded-xl border text-muted-foreground transition-colors",
                "hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                active && "border-primary bg-primary/10 text-primary ring-2 ring-primary/40",
              )}
            >
              <Icon className="h-5 w-5" aria-hidden="true" />
              <span className="sr-only">{def.label}</span>
            </button>
          </li>
        );
      })}
    </ul>
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        data-testid="included-icon-picker"
        className="flex h-[100dvh] max-h-[100dvh] w-screen max-w-none flex-col gap-4 rounded-none px-4 pb-[max(1rem,env(safe-area-inset-bottom))] pt-[max(1rem,env(safe-area-inset-top))] sm:h-auto sm:max-h-[90vh] sm:w-full sm:max-w-2xl sm:rounded-lg sm:p-6"
      >
        <DialogHeader className="shrink-0 text-left">
          <DialogTitle className="text-base">Alterar ícone de “{itemText || "item"}”</DialogTitle>
          <DialogDescription className="text-xs">
            Escolha um ícone da coleção. O texto do item não muda.
          </DialogDescription>
        </DialogHeader>

        <div className="relative shrink-0">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
          <Input
            aria-label="Buscar ícone"
            placeholder="Buscar: avião, hotel, transfer, ingresso, navio, seguro…"
            value={term}
            onChange={(e) => setTerm(e.target.value)}
            className="h-11 pl-9"
          />
        </div>

        <div className="-mx-1 flex shrink-0 gap-1.5 overflow-x-auto px-1 pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {[{ key: "todos" as const, label: "Todos" }, ...INCLUDED_ICON_CATEGORIES].map((cat) => (
            <Button
              key={cat.key}
              type="button"
              size="sm"
              variant={category === cat.key ? "default" : "outline"}
              onClick={() => setCategory(cat.key as IncludedIconCategory | "todos")}
              aria-pressed={category === cat.key}
              className="h-9 shrink-0 whitespace-nowrap rounded-full text-xs"
            >
              {cat.label}
            </Button>
          ))}
        </div>

        <div className="min-h-0 flex-1 space-y-4 overflow-y-auto overscroll-contain">
          {!term && category === "todos" && recents.length > 0 && (
            <section aria-labelledby="included-icons-recents">
              <h4 id="included-icons-recents" className="mb-2 text-xs font-semibold text-muted-foreground">Recentes</h4>
              {renderGrid(recents.map((id) => includedIconDef(id)))}
            </section>
          )}
          {results.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">Nenhum ícone encontrado para essa busca.</p>
          ) : (
            <section aria-label="Ícones disponíveis">{renderGrid(results)}</section>
          )}
        </div>

        <div className="flex shrink-0 items-center gap-2 rounded-xl border bg-muted/30 p-3">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-primary/10 text-primary">
            <PreviewIcon className="h-4 w-4" aria-hidden="true" />
          </span>
          <span className="min-w-0 flex-1 truncate text-sm">{itemText || "Item incluído"}</span>
          <span className="shrink-0 text-xs text-muted-foreground">{includedIconDef(selected).label}</span>
        </div>

        <DialogFooter className="shrink-0 gap-2 sm:justify-between">
          <Button type="button" variant="ghost" className="h-10 min-h-11 gap-1.5 sm:min-h-10" onClick={useAuto}>
            <RotateCcw className="h-3.5 w-3.5" /> Usar sugestão automática
          </Button>
          <div className="flex gap-2">
            <Button type="button" variant="outline" className="h-10 min-h-11 sm:min-h-10" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="button" className="h-10 min-h-11 gap-1.5 sm:min-h-10" onClick={apply}>
              <Check className="h-3.5 w-3.5" /> Aplicar
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
