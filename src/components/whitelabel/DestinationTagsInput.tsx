import { useState } from "react";
import { Plus, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export const TAG_SEPARATOR = ", ";
const MAX_TAGS = 12;

/** "Itália, Grécia" -> ["Itália", "Grécia"] (aceita também " e " e "/"). */
export function parseDestinationTags(value: string): string[] {
  const out: string[] = [];
  const seen = new Set<string>();
  for (const raw of String(value ?? "").split(/\s*(?:,|;|\/|\||\s+e\s+)\s*/i)) {
    const tag = raw.trim();
    if (!tag) continue;
    const key = tag.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(tag);
  }
  return out.slice(0, MAX_TAGS);
}

export function serializeDestinationTags(tags: string[]): string {
  return tags.join(TAG_SEPARATOR);
}

export interface DestinationTagsInputProps {
  id: string;
  label: string;
  /** Valor serializado, compatível com o payload atual (texto único). */
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  error?: string;
  help?: string;
  required?: boolean;
  editorial?: boolean;
  className?: string;
}

/**
 * Campo livre de múltiplos destinos em etiquetas. Enter (ou o botão Adicionar)
 * transforma o texto digitado em etiqueta; cada etiqueta tem X para remover.
 * Aceita países, cidades, regiões e circuitos sem depender de fonte externa.
 */
export function DestinationTagsInput({
  id, label, value, onChange, placeholder, error, help, required, editorial, className,
}: DestinationTagsInputProps) {
  const [draft, setDraft] = useState("");
  const tags = parseDestinationTags(value);

  const commit = (text: string) => {
    const next = parseDestinationTags([...tags, text].join(TAG_SEPARATOR));
    onChange(serializeDestinationTags(next));
    setDraft("");
  };

  const remove = (index: number) => {
    onChange(serializeDestinationTags(tags.filter((_, i) => i !== index)));
  };

  const describedBy = error ? `${id}-error` : help ? `${id}-help` : undefined;

  return (
    <div className={cn("min-w-0", className)}>
      <Label
        htmlFor={id}
        className={
          editorial
            ? "text-[11px] font-semibold uppercase tracking-[0.08em] text-muted-foreground"
            : "text-xs font-semibold uppercase tracking-[0.06em] text-muted-foreground"
        }
      >
        {label}
        {required && <span aria-hidden="true" className="ml-0.5 text-destructive">*</span>}
      </Label>

      <div className="mt-2 flex gap-2">
        <Input
          id={id}
          autoComplete="off"
          className={cn("min-w-0 flex-1 bg-card", editorial ? "h-12 rounded-lg" : "h-11 rounded-xl", error && "border-destructive")}
          placeholder={placeholder}
          value={draft}
          aria-invalid={!!error}
          aria-describedby={describedBy}
          onChange={(event) => setDraft(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter" || event.key === ",") {
              event.preventDefault();
              if (draft.trim()) commit(draft);
            } else if (event.key === "Backspace" && !draft && tags.length) {
              remove(tags.length - 1);
            }
          }}
          onBlur={() => { if (draft.trim()) commit(draft); }}
        />
        <Button
          type="button"
          variant="outline"
          className={cn("shrink-0", editorial ? "h-12 rounded-lg" : "h-11 rounded-xl")}
          onClick={() => { if (draft.trim()) commit(draft); }}
          aria-label="Adicionar destino"
        >
          <Plus className="h-4 w-4" aria-hidden="true" />
          <span className="ml-1.5 hidden sm:inline">Adicionar</span>
        </Button>
      </div>

      {tags.length > 0 && (
        <ul className="mt-2 flex flex-wrap gap-1.5">
          {tags.map((tag, index) => (
            <li key={`${tag}-${index}`}>
              <span className="inline-flex items-center gap-1 rounded-full border border-border bg-muted/60 py-1 pl-3 pr-1 text-sm text-foreground">
                {tag}
                <button
                  type="button"
                  onClick={() => remove(index)}
                  aria-label={`Remover ${tag}`}
                  className="grid h-5 w-5 place-items-center rounded-full text-muted-foreground transition-colors hover:bg-background hover:text-foreground focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
                >
                  <X className="h-3 w-3" aria-hidden="true" />
                </button>
              </span>
            </li>
          ))}
        </ul>
      )}

      {error ? (
        <p id={`${id}-error`} role="alert" className="mt-1 text-xs text-destructive">{error}</p>
      ) : help ? (
        <p id={`${id}-help`} className="mt-1 text-xs text-muted-foreground">{help}</p>
      ) : null}
    </div>
  );
}