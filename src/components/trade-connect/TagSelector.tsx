import { useState, useRef } from "react";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Plus, X, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";

interface TagSelectorProps {
  label: string;
  options: string[];
  selected: string[];
  onChange: (selected: string[]) => void;
  maxItems?: number;
  allowCustom?: boolean;
  customPlaceholder?: string;
}

export function TagSelector({
  label,
  options,
  selected,
  onChange,
  maxItems,
  allowCustom = true,
  customPlaceholder = "Adicionar novo...",
}: TagSelectorProps) {
  const [customInput, setCustomInput] = useState("");
  const [showInput, setShowInput] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const normalize = (s: string) => s.trim().toLowerCase();

  const allOptions = [...new Set([...options, ...selected])];
  const isAtLimit = maxItems ? selected.length >= maxItems : false;

  const toggleTag = (tag: string) => {
    if (selected.includes(tag)) {
      onChange(selected.filter((t) => t !== tag));
    } else if (!isAtLimit) {
      onChange([...selected, tag]);
    }
  };

  const addCustom = () => {
    const trimmed = customInput.trim();
    if (!trimmed || trimmed.length < 2 || trimmed.length > 40) return;

    const normalizedNew = normalize(trimmed);
    const isDuplicate = allOptions.some((o) => normalize(o) === normalizedNew);

    if (isDuplicate) {
      // If it exists but not selected, select it
      const existing = allOptions.find((o) => normalize(o) === normalizedNew);
      if (existing && !selected.includes(existing) && !isAtLimit) {
        onChange([...selected, existing]);
      }
    } else if (!isAtLimit) {
      // Capitalize first letter
      const formatted = trimmed.charAt(0).toUpperCase() + trimmed.slice(1);
      onChange([...selected, formatted]);
    }

    setCustomInput("");
  };

  const isCustom = (tag: string) => !options.includes(tag);

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <span className="text-sm font-semibold text-foreground">{label}</span>
        {maxItems && (
          <span className="text-xs text-muted-foreground">
            {selected.length}/{maxItems}
          </span>
        )}
      </div>

      {/* Selected tags */}
      {selected.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mb-2">
          {selected.map((tag) => (
            <Badge
              key={tag}
              className={cn(
                "cursor-pointer transition-all gap-1 pr-1",
                isCustom(tag)
                  ? "bg-accent text-accent-foreground border-accent"
                  : "bg-primary text-primary-foreground"
              )}
              onClick={() => toggleTag(tag)}
            >
              {isCustom(tag) && <Sparkles className="h-3 w-3" />}
              {tag}
              <X className="h-3 w-3 ml-0.5 hover:opacity-70" />
            </Badge>
          ))}
        </div>
      )}

      {/* Available options */}
      <div className="flex flex-wrap gap-1.5">
        {allOptions
          .filter((o) => !selected.includes(o))
          .map((tag) => (
            <Badge
              key={tag}
              variant="outline"
              className={cn(
                "cursor-pointer transition-all text-xs hover:bg-muted",
                isAtLimit && "opacity-40 cursor-not-allowed"
              )}
              onClick={() => !isAtLimit && toggleTag(tag)}
            >
              {isCustom(tag) && <Sparkles className="h-3 w-3 mr-1" />}
              {tag}
            </Badge>
          ))}
      </div>

      {/* Custom input */}
      {allowCustom && (
        <div className="mt-2">
          {showInput ? (
            <div className="flex gap-2">
              <Input
                ref={inputRef}
                value={customInput}
                onChange={(e) => setCustomInput(e.target.value.slice(0, 40))}
                placeholder={customPlaceholder}
                className="h-8 text-sm flex-1"
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    addCustom();
                  }
                  if (e.key === "Escape") {
                    setShowInput(false);
                    setCustomInput("");
                  }
                }}
                disabled={isAtLimit}
                autoFocus
              />
              <button
                type="button"
                className="text-xs text-muted-foreground hover:text-foreground"
                onClick={() => {
                  setShowInput(false);
                  setCustomInput("");
                }}
              >
                Cancelar
              </button>
            </div>
          ) : (
            <button
              type="button"
              className={cn(
                "inline-flex items-center gap-1 text-xs text-primary hover:text-primary/80 font-medium transition-colors",
                isAtLimit && "opacity-40 cursor-not-allowed"
              )}
              onClick={() => {
                if (!isAtLimit) {
                  setShowInput(true);
                  setTimeout(() => inputRef.current?.focus(), 50);
                }
              }}
              disabled={isAtLimit}
            >
              <Plus className="h-3.5 w-3.5" />
              Criar novo
            </button>
          )}
        </div>
      )}
    </div>
  );
}
