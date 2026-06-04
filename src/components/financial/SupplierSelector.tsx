import { useEffect, useMemo, useRef, useState } from "react";
import { Check, Loader2, Search } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { useDebounce } from "@/hooks/useDebounce";

interface SupplierOption {
  id: string;
  name: string;
  category: string | null;
  logo_url: string | null;
  owner_agency_id: string | null;
}

export interface SupplierSelectorValue {
  operator_id: string | null;
  supplier_name: string;
}

interface SupplierSelectorProps {
  value: SupplierSelectorValue;
  onChange: (v: SupplierSelectorValue) => void;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
}

/**
 * Reusable supplier picker for the Financial module.
 * - Searches `tour_operators` (global or owned by current agency).
 * - Selecting an option fills both `operator_id` and `supplier_name`.
 * - Typing freely keeps the legacy text-only flow: `operator_id = null`.
 */
export function SupplierSelector({
  value,
  onChange,
  placeholder = "Buscar ou digitar fornecedor",
  disabled,
  className,
}: SupplierSelectorProps) {
  const { user } = useAuth();
  const [text, setText] = useState(value.supplier_name || "");
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<SupplierOption[]>([]);
  const wrapperRef = useRef<HTMLDivElement>(null);

  const debounced = useDebounce(text, 250);

  // Keep local text in sync if parent resets value externally
  useEffect(() => {
    setText(value.supplier_name || "");
  }, [value.supplier_name]);

  // Click-outside close
  useEffect(() => {
    function onDoc(e: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);

  useEffect(() => {
    let cancelled = false;
    async function run() {
      if (!user) return;
      const q = (debounced || "").trim();
      if (q.length < 2) {
        setResults([]);
        return;
      }
      setLoading(true);
      const { data, error } = await supabase
        .from("tour_operators")
        .select("id, name, category, logo_url, owner_agency_id")
        .eq("is_active", true)
        .or(`owner_agency_id.is.null,owner_agency_id.eq.${user.id}`)
        .ilike("name", `%${q}%`)
        .order("name")
        .limit(15);
      if (!cancelled) {
        if (!error && data) setResults(data as SupplierOption[]);
        setLoading(false);
      }
    }
    run();
    return () => {
      cancelled = true;
    };
  }, [debounced, user]);

  const handleSelect = (opt: SupplierOption) => {
    onChange({ operator_id: opt.id, supplier_name: opt.name });
    setText(opt.name);
    setOpen(false);
  };

  const handleType = (next: string) => {
    setText(next);
    // Any manual edit invalidates a previously-linked operator
    if (value.operator_id || next !== value.supplier_name) {
      onChange({ operator_id: null, supplier_name: next });
    }
    setOpen(true);
  };

  const linked = !!value.operator_id;

  const showPanel = open && (loading || results.length > 0 || (debounced.trim().length >= 2));

  return (
    <div ref={wrapperRef} className={cn("relative", className)}>
      <div className="relative">
        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
        <Input
          value={text}
          disabled={disabled}
          onChange={(e) => handleType(e.target.value)}
          onFocus={() => setOpen(true)}
          placeholder={placeholder}
          className={cn("pl-8", linked && "pr-20")}
        />
        {linked && (
          <Badge
            variant="secondary"
            className="absolute right-2 top-1/2 -translate-y-1/2 text-[10px] gap-1 px-1.5 py-0"
          >
            <Check className="h-3 w-3" /> Vinculado
          </Badge>
        )}
      </div>

      {showPanel && (
        <div className="absolute z-50 mt-1 w-full rounded-md border bg-popover shadow-md max-h-64 overflow-auto">
          {loading && (
            <div className="flex items-center gap-2 px-3 py-2 text-sm text-muted-foreground">
              <Loader2 className="h-3.5 w-3.5 animate-spin" /> Buscando…
            </div>
          )}
          {!loading && results.length === 0 && (
            <div className="px-3 py-2 text-sm text-muted-foreground">
              Nenhum fornecedor encontrado. Você pode continuar digitando livremente.
            </div>
          )}
          {!loading &&
            results.map((opt) => {
              const isGlobal = opt.owner_agency_id === null;
              const isSelected = value.operator_id === opt.id;
              return (
                <button
                  type="button"
                  key={opt.id}
                  onClick={() => handleSelect(opt)}
                  className={cn(
                    "flex w-full items-center gap-2 px-3 py-2 text-left text-sm hover:bg-accent transition",
                    isSelected && "bg-accent"
                  )}
                >
                  {opt.logo_url ? (
                    <img
                      src={opt.logo_url}
                      alt=""
                      className="h-6 w-6 rounded object-contain bg-muted flex-shrink-0"
                    />
                  ) : (
                    <div className="h-6 w-6 rounded bg-muted flex-shrink-0" />
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="truncate font-medium">{opt.name}</p>
                    {opt.category && (
                      <p className="truncate text-xs text-muted-foreground">{opt.category}</p>
                    )}
                  </div>
                  <Badge
                    variant={isGlobal ? "outline" : "secondary"}
                    className="text-[10px] px-1.5 py-0 flex-shrink-0"
                  >
                    {isGlobal ? "Global" : "Minha agência"}
                  </Badge>
                </button>
              );
            })}
        </div>
      )}
    </div>
  );
}