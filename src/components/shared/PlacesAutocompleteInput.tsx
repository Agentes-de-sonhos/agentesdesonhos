import { useCallback, useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, Loader2, MapPin, Building2 } from "lucide-react";

export interface PlacesPrediction {
  place_id: string;
  name: string;
  secondary: string;
  description?: string;
  is_hotel?: boolean;
}

interface PlacesAutocompleteInputProps {
  value: string;
  onChange: (value: string) => void;
  onSelect: (prediction: PlacesPrediction) => void;
  placeholder?: string;
  cityContext?: string;
  selectedPlaceId?: string | null;
  /** Minimum chars before search triggers. Default 3. */
  minChars?: number;
  /** Debounce ms. Default 300. */
  debounceMs?: number;
  className?: string;
  autoFocus?: boolean;
}

/**
 * Generic Google Places autocomplete input.
 * Reuses the `hotel-autocomplete` edge function (which already supports any establishment).
 */
export function PlacesAutocompleteInput({
  value,
  onChange,
  onSelect,
  placeholder,
  cityContext,
  selectedPlaceId,
  minChars = 3,
  debounceMs = 300,
  className,
  autoFocus,
}: PlacesAutocompleteInputProps) {
  const [predictions, setPredictions] = useState<PlacesPrediction[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const wrapperRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) setShowDropdown(false);
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const fetchAutocomplete = useCallback(async (input: string) => {
    if (input.trim().length < minChars) { setPredictions([]); setShowDropdown(false); return; }
    setIsSearching(true);
    try {
      const { data } = await supabase.functions.invoke("hotel-autocomplete", {
        body: { input: input.trim(), city: cityContext?.trim() || undefined },
      });
      if (data?.predictions) {
        setPredictions(data.predictions);
        setShowDropdown(data.predictions.length > 0);
      }
    } catch { /* silent */ } finally { setIsSearching(false); }
  }, [cityContext, minChars]);

  const handleInput = (v: string) => {
    onChange(v);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => fetchAutocomplete(v), debounceMs);
  };

  const handlePick = (p: PlacesPrediction) => {
    onSelect(p);
    setShowDropdown(false);
    setPredictions([]);
  };

  return (
    <div className={"relative " + (className || "")} ref={wrapperRef}>
      <div className="relative">
        <Input
          placeholder={placeholder}
          value={value || ""}
          onChange={(e) => handleInput(e.target.value)}
          onFocus={() => predictions.length > 0 && setShowDropdown(true)}
          autoComplete="off"
          autoFocus={autoFocus}
        />
        {isSearching && (
          <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin text-muted-foreground" />
        )}
        {selectedPlaceId && !isSearching && (
          <CheckCircle2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-emerald-500" />
        )}
      </div>
      {showDropdown && predictions.length > 0 && (
        <div className="absolute z-50 top-full left-0 right-0 mt-1 bg-popover border border-border rounded-lg shadow-lg overflow-hidden">
          {predictions.map((p) => (
            <button
              key={p.place_id}
              type="button"
              className="w-full flex items-start gap-3 px-3 py-2 hover:bg-accent/50 transition-colors text-left"
              onClick={() => handlePick(p)}
            >
              <div className="mt-0.5 shrink-0">
                {p.is_hotel ? (
                  <Building2 className="h-4 w-4 text-primary" />
                ) : (
                  <MapPin className="h-4 w-4 text-muted-foreground" />
                )}
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium text-foreground truncate">{p.name}</p>
                {p.secondary && (
                  <p className="text-xs text-muted-foreground truncate">{p.secondary}</p>
                )}
              </div>
              {p.is_hotel && (
                <Badge variant="secondary" className="text-[10px] shrink-0 mt-0.5">Hotel</Badge>
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

/**
 * Helper: given a Places `secondary` string ("Avenida X, City, Country"), split into parts.
 */
export function parsePlaceSecondary(secondary: string): { city?: string; country?: string; address?: string } {
  if (!secondary) return {};
  const parts = secondary.split(",").map((s) => s.trim()).filter(Boolean);
  if (parts.length === 0) return {};
  const country = parts.length >= 2 ? parts[parts.length - 1] : undefined;
  const city = parts.length >= 3 ? parts[parts.length - 2] : parts[0];
  return { city, country, address: secondary };
}