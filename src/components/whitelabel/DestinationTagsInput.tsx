import { useRef, useState } from "react";
import { X } from "lucide-react";
import { Label } from "@/components/ui/label";
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
 * Campo livre de múltiplos destinos em etiquetas DENTRO da própria caixa.
 *
 * Não existe botão "Adicionar": Enter, Tab, vírgula e blur confirmam o texto
 * digitado como etiqueta; cada etiqueta tem X acessível; Backspace com input
 * vazio remove a última. Clicar em qualquer área do campo foca o input. As
 * etiquetas rolam horizontalmente dentro do campo (flex-nowrap), então o campo
 * nunca cresce nem quebra a grade de linha única do bloco inicial.
 */
export function DestinationTagsInput({
  id, label, value, onChange, placeholder, error, help, required, editorial, className,
}: DestinationTagsInputProps) {
  const [draft, setDraft] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  const tags = parseDestinationTags(value);

  const commit = (text: string) => {
    if (!text.trim()) return;
    const next = parseDestinationTags([...tags, text].join(TAG_SEPARATOR));
    onChange(serializeDestinationTags(next));
    setDraft("");
  };

  const remove = (index: number) => {
    onChange(serializeDestinationTags(tags.filter((_, i) => i !== index)));
  };

  const describedBy = error ? `${id}-error` : help ? `${id}-help` : undefined;

  return (
    <div className={cn("relative min-w-0", className)}>
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

      <div
        data-testid={`${id}-field`}
        onMouseDown={(event) => {
          if (event.target === event.currentTarget) {
            event.preventDefault();
            inputRef.current?.focus();
          }
        }}
        className={cn(
          "mt-2 flex w-full min-w-0 cursor-text items-center gap-1.5 overflow-x-auto overflow-y-hidden whitespace-nowrap border border-input bg-card px-2 focus-within:ring-1 focus-within:ring-ring [&::-webkit-scrollbar]:h-0",
          editorial ? "h-12 rounded-lg" : "h-11 rounded-xl",
          error && "border-destructive",
        )}
      >
        {tags.map((tag, index) => (
          <span
            key={`${tag}-${index}`}
            className="inline-flex h-7 shrink-0 items-center gap-1 rounded-full border border-border bg-muted/60 pl-2.5 pr-1 text-sm text-foreground"
          >
            {tag}
            <button
              type="button"
              tabIndex={-1}
              onMouseDown={(event) => event.preventDefault()}
              onClick={() => { remove(index); inputRef.current?.focus(); }}
              aria-label={`Remover ${tag}`}
              className="grid h-5 w-5 place-items-center rounded-full text-muted-foreground transition-colors hover:bg-background hover:text-foreground focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
            >
              <X className="h-3 w-3" aria-hidden="true" />
            </button>
          </span>
        ))}
        <input
          ref={inputRef}
          id={id}
          autoComplete="off"
          className="h-full min-w-[7rem] flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
          placeholder={tags.length ? "Digite outro destino..." : placeholder}
          value={draft}
          aria-invalid={!!error}
          aria-describedby={describedBy}
          onChange={(event) => setDraft(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter" || event.key === ",") {
              event.preventDefault();
              commit(draft);
            } else if (event.key === "Tab" && draft.trim()) {
              commit(draft);
            } else if (event.key === "Backspace" && !draft && tags.length) {
              remove(tags.length - 1);
            }
          }}
          onBlur={() => commit(draft)}
        />
      </div>

      {error ? (
        <p id={`${id}-error`} role="alert" className="mt-1 text-xs text-destructive">{error}</p>
      ) : help ? (
        <p
          id={`${id}-help`}
          className="mt-1 text-xs text-muted-foreground lg:absolute lg:left-0 lg:top-full lg:mt-1 lg:whitespace-nowrap"
        >
          {help}
        </p>
      ) : null}
    </div>
  );
}