import { useState, useMemo, useRef, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Plus } from "lucide-react";
import type { ClientSubcategory } from "@/types/crm";

interface SubcategoryComboboxProps {
  categoryId: string | null;
  subcategories: ClientSubcategory[];
  value: string | null;
  onChange: (id: string | null) => void;
  onCreateNew: (name: string, categoryId: string) => Promise<ClientSubcategory>;
  disabled?: boolean;
}

export function SubcategoryCombobox({
  categoryId,
  subcategories,
  value,
  onChange,
  onCreateNew,
  disabled,
}: SubcategoryComboboxProps) {
  const [query, setQuery] = useState("");
  const [isOpen, setIsOpen] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);

  const filtered = useMemo(() => {
    if (!categoryId) return [];
    const forCategory = subcategories.filter((s) => s.category_id === categoryId);
    if (!query) return forCategory;
    return forCategory.filter((s) => s.name.toLowerCase().includes(query.toLowerCase()));
  }, [subcategories, categoryId, query]);

  const selectedName = useMemo(() => {
    if (!value) return "";
    return subcategories.find((s) => s.id === value)?.name || "";
  }, [value, subcategories]);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const handleSelect = (id: string) => {
    onChange(id);
    setQuery("");
    setIsOpen(false);
  };

  const handleCreate = async () => {
    if (!categoryId || !query.trim()) return;
    const result = await onCreateNew(query.trim(), categoryId);
    if (result) {
      onChange(result.id);
      setQuery("");
      setIsOpen(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && query.trim() && filtered.length === 0 && categoryId) {
      e.preventDefault();
      handleCreate();
    }
  };

  const exactMatch = filtered.some((s) => s.name.toLowerCase() === query.toLowerCase());

  if (!categoryId) {
    return (
      <Input
        placeholder="Selecione uma categoria primeiro"
        disabled
        className="text-muted-foreground"
      />
    );
  }

  return (
    <div ref={wrapperRef} className="relative">
      <div className="relative">
        {value && selectedName ? (
          <div className="flex items-center gap-2">
            <Badge variant="secondary" className="text-sm py-1 px-3">
              {selectedName}
              <button
                type="button"
                className="ml-1.5 text-muted-foreground hover:text-foreground"
                onClick={() => {
                  onChange(null);
                  setQuery("");
                }}
              >
                ✕
              </button>
            </Badge>
          </div>
        ) : (
          <Input
            placeholder="Buscar ou criar subcategoria..."
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setIsOpen(true);
            }}
            onFocus={() => setIsOpen(true)}
            onKeyDown={handleKeyDown}
            disabled={disabled}
          />
        )}
      </div>

      {isOpen && !value && (
        <div className="absolute z-50 mt-1 w-full rounded-md border bg-popover shadow-lg max-h-48 overflow-y-auto">
          {filtered.map((sub) => (
            <button
              key={sub.id}
              type="button"
              className="flex w-full items-center px-3 py-2 text-sm hover:bg-accent text-left transition-colors"
              onClick={() => handleSelect(sub.id)}
            >
              {sub.name}
            </button>
          ))}
          {filtered.length === 0 && !query && (
            <p className="px-3 py-2 text-sm text-muted-foreground">Nenhuma subcategoria cadastrada</p>
          )}
          {query.trim() && !exactMatch && (
            <button
              type="button"
              className="flex w-full items-center gap-2 px-3 py-2 text-sm font-medium text-primary hover:bg-accent border-t transition-colors"
              onClick={handleCreate}
            >
              <Plus className="h-4 w-4" />
              Criar "{query.trim()}"
            </button>
          )}
        </div>
      )}
    </div>
  );
}
