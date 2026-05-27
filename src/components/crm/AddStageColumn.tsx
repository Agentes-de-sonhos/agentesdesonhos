import { useState, useRef, useEffect } from "react";
import { Plus, Check, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { STAGE_COLOR_PALETTE, type StageColor } from "@/types/crm";

interface Props {
  onCreate: (name: string, color: StageColor) => Promise<void> | void;
}

const QUICK_COLORS: StageColor[] = ["blue", "amber", "violet", "emerald", "rose", "slate"];

export function AddStageColumn({ onCreate }: Props) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [color, setColor] = useState<StageColor>("slate");
  const [saving, setSaving] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open) inputRef.current?.focus();
  }, [open]);

  const save = async () => {
    const trimmed = name.trim();
    if (!trimmed) return;
    setSaving(true);
    try {
      await onCreate(trimmed, color);
      setName("");
      setColor("slate");
      setOpen(false);
    } finally {
      setSaving(false);
    }
  };

  if (!open) {
    return (
      <div className="w-[290px] flex-shrink-0">
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="w-full h-12 rounded-xl border border-dashed border-border bg-muted/30 hover:bg-muted/60 transition flex items-center justify-center gap-2 text-sm font-medium text-muted-foreground hover:text-foreground"
        >
          <Plus className="h-4 w-4" />
          Adicionar coluna
        </button>
      </div>
    );
  }

  return (
    <div className="w-[290px] flex-shrink-0">
      <div className="rounded-xl border bg-card p-3 space-y-3 shadow-sm">
        <Input
          ref={inputRef}
          value={name}
          placeholder="Nome da coluna"
          onChange={(e) => setName(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              save();
            } else if (e.key === "Escape") {
              setOpen(false);
              setName("");
            }
          }}
          maxLength={60}
          className="h-9"
        />
        <div className="flex items-center gap-1.5">
          {QUICK_COLORS.map((c) => {
            const t = STAGE_COLOR_PALETTE[c];
            const active = c === color;
            return (
              <button
                key={c}
                type="button"
                onClick={() => setColor(c)}
                className={cn(
                  "h-5 w-5 rounded-full transition",
                  t.dot,
                  active && "ring-2 ring-foreground ring-offset-1"
                )}
                aria-label={`Cor ${c}`}
              />
            );
          })}
        </div>
        <div className="flex items-center justify-end gap-1">
          <Button
            size="sm"
            variant="ghost"
            onClick={() => {
              setOpen(false);
              setName("");
            }}
          >
            <X className="h-4 w-4 mr-1" /> Cancelar
          </Button>
          <Button size="sm" onClick={save} disabled={!name.trim() || saving}>
            <Check className="h-4 w-4 mr-1" />
            {saving ? "Salvando..." : "Adicionar"}
          </Button>
        </div>
      </div>
    </div>
  );
}