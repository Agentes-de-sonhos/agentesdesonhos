import { useEffect, useState } from "react";
import { Loader2, Plus, Trash2, UserRound } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export interface ItineraryPassengerEntry {
  name: string;
  age?: number | null;
}

interface Props {
  passengers: ItineraryPassengerEntry[];
  saving?: boolean;
  onSave: (passengers: ItineraryPassengerEntry[]) => Promise<void> | void;
}

/**
 * Gestão dos nomes dos viajantes depois do roteiro criado. Os nomes ficam
 * na própria coluna `passengers` do roteiro, que já alimenta a capa, o link
 * público e o PDF, então nada precisa ser refeito.
 */
export function ItineraryPassengersCard({ passengers, saving, onSave }: Props) {
  const [list, setList] = useState<ItineraryPassengerEntry[]>(passengers ?? []);

  useEffect(() => {
    setList(passengers ?? []);
  }, [passengers]);

  const update = (index: number, patch: Partial<ItineraryPassengerEntry>) =>
    setList((prev) => prev.map((p, i) => (i === index ? { ...p, ...patch } : p)));

  const handleSave = async () => {
    const cleaned = list
      .map((p) => ({ name: (p.name || "").trim(), age: p.age ?? null }))
      .filter((p) => p.name.length > 0);
    await onSave(cleaned);
  };

  return (
    <div className="space-y-3 rounded-xl border border-border/60 bg-card p-4">
      <div className="flex items-center justify-between gap-2">
        <div className="inline-flex items-center gap-2 text-sm font-semibold">
          <UserRound className="h-4 w-4 text-primary" />
          Nomes dos viajantes
        </div>
        <Button
          type="button"
          size="sm"
          variant="outline"
          className="rounded-lg"
          onClick={() => setList((prev) => [...prev, { name: "", age: null }])}
        >
          <Plus className="mr-1.5 h-3.5 w-3.5" />
          Adicionar
        </Button>
      </div>

      {list.length === 0 ? (
        <p className="text-xs text-muted-foreground">
          Nenhum nome informado ainda. Adicione os viajantes para que apareçam na capa, no link do cliente e no PDF.
        </p>
      ) : (
        <div className="space-y-2">
          {list.map((p, index) => (
            <div key={index} className="flex items-end gap-2">
              <div className="min-w-0 flex-1 space-y-1.5">
                {index === 0 ? (
                  <Label htmlFor={`passenger-name-${index}`} className="text-xs text-muted-foreground">
                    Nome completo
                  </Label>
                ) : null}
                <Input
                  id={`passenger-name-${index}`}
                  value={p.name}
                  placeholder="Nome do viajante"
                  onChange={(e) => update(index, { name: e.target.value })}
                />
              </div>
              <div className="w-20 space-y-1.5">
                {index === 0 ? (
                  <Label htmlFor={`passenger-age-${index}`} className="text-xs text-muted-foreground">
                    Idade
                  </Label>
                ) : null}
                <Input
                  id={`passenger-age-${index}`}
                  type="number"
                  min={0}
                  max={120}
                  value={p.age ?? ""}
                  onChange={(e) =>
                    update(index, { age: e.target.value === "" ? null : Math.max(0, parseInt(e.target.value, 10) || 0) })
                  }
                />
              </div>
              <Button
                type="button"
                size="icon"
                variant="ghost"
                className="h-10 w-10 shrink-0 text-destructive hover:text-destructive"
                aria-label="Remover viajante"
                onClick={() => setList((prev) => prev.filter((_, i) => i !== index))}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          ))}
        </div>
      )}

      <div className="flex justify-end">
        <Button type="button" size="sm" className="rounded-lg" disabled={saving} onClick={handleSave}>
          {saving ? <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" /> : null}
          Salvar viajantes
        </Button>
      </div>
    </div>
  );
}

export default ItineraryPassengersCard;
