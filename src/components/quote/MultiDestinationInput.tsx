import { useState } from "react";
import { PlacesAutocomplete } from "@/components/ui/PlacesAutocomplete";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Plus, X, Star, ArrowUp, ArrowDown } from "lucide-react";

interface MultiDestinationInputProps {
  /** Stored as comma-separated string for backward compatibility (e.g. "Paris, Roma"). */
  value: string;
  onChange: (value: string) => void;
}

function splitDestinations(v: string): string[] {
  if (!v) return [];
  return v.split(",").map((s) => s.trim()).filter(Boolean);
}

function joinDestinations(arr: string[]): string {
  return arr.map((s) => s.trim()).filter(Boolean).join(", ");
}

export function MultiDestinationInput({ value, onChange }: MultiDestinationInputProps) {
  const destinations = splitDestinations(value);
  // Always render at least one input (the "principal").
  const [draft, setDraft] = useState("");

  const update = (next: string[]) => onChange(joinDestinations(next));

  const handleSelectPrimary = (val: string) => {
    const next = [...destinations];
    next[0] = val;
    update(next);
  };

  const addDraft = () => {
    const v = draft.trim();
    if (!v) return;
    if (destinations.some((d) => d.toLowerCase() === v.toLowerCase())) {
      setDraft("");
      return;
    }
    update([...destinations, v]);
    setDraft("");
  };

  const removeAt = (idx: number) => {
    const next = destinations.filter((_, i) => i !== idx);
    update(next);
  };

  const moveUp = (idx: number) => {
    if (idx === 0) return;
    const next = [...destinations];
    [next[idx - 1], next[idx]] = [next[idx], next[idx - 1]];
    update(next);
  };

  const moveDown = (idx: number) => {
    if (idx >= destinations.length - 1) return;
    const next = [...destinations];
    [next[idx], next[idx + 1]] = [next[idx + 1], next[idx]];
    update(next);
  };

  const primary = destinations[0] || "";
  const additional = destinations.slice(1);

  return (
    <div className="space-y-2">
      {/* Primary destination input (kept compatible with single-field forms) */}
      <PlacesAutocomplete
        value={primary}
        onChange={handleSelectPrimary}
        onPlaceSelect={(pred) => handleSelectPrimary(pred.name)}
        placeType="city"
        placeholder="Ex: Paris, França"
        fetchDetailsOnSelect={false}
      />

      {/* List of additional destinations */}
      {additional.length > 0 && (
        <div className="flex flex-wrap gap-2 pt-1">
          <Badge variant="secondary" className="gap-1">
            <Star className="h-3 w-3 fill-current" />
            {primary || "Principal"}
          </Badge>
          {additional.map((dest, i) => {
            const realIdx = i + 1;
            return (
              <Badge key={`${dest}-${realIdx}`} variant="outline" className="gap-1 pl-2 pr-1 py-1">
                <span>{dest}</span>
                <button
                  type="button"
                  onClick={() => moveUp(realIdx)}
                  className="ml-1 hover:text-primary"
                  title="Mover para cima"
                  aria-label="Mover para cima"
                >
                  <ArrowUp className="h-3 w-3" />
                </button>
                <button
                  type="button"
                  onClick={() => moveDown(realIdx)}
                  className="hover:text-primary"
                  title="Mover para baixo"
                  aria-label="Mover para baixo"
                  disabled={realIdx >= destinations.length - 1}
                >
                  <ArrowDown className="h-3 w-3" />
                </button>
                <button
                  type="button"
                  onClick={() => removeAt(realIdx)}
                  className="ml-0.5 rounded-full hover:bg-destructive/10 hover:text-destructive p-0.5"
                  title="Remover"
                  aria-label="Remover destino"
                >
                  <X className="h-3 w-3" />
                </button>
              </Badge>
            );
          })}
        </div>
      )}

      {/* Add additional destination */}
      <div className="flex items-center gap-2 pt-1">
        <div className="flex-1">
          <PlacesAutocomplete
            value={draft}
            onChange={setDraft}
            onPlaceSelect={(pred) => {
              const v = pred.name.trim();
              if (!v) return;
              if (destinations.some((d) => d.toLowerCase() === v.toLowerCase())) {
                setDraft("");
                return;
              }
              update([...destinations, v]);
              setDraft("");
            }}
            placeType="city"
            placeholder="+ Adicionar outra cidade (ex: Roma)"
            fetchDetailsOnSelect={false}
          />
        </div>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={addDraft}
          disabled={!draft.trim()}
          className="shrink-0"
        >
          <Plus className="h-4 w-4 mr-1" />
          Adicionar
        </Button>
      </div>

      {destinations.length > 1 && (
        <p className="text-xs text-muted-foreground">
          A primeira cidade é o destino principal. Você pode reordenar ou remover as demais.
        </p>
      )}
    </div>
  );
}
