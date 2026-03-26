import { forwardRef, useEffect, useRef } from "react";
import { Input } from "@/components/ui/input";
import { Loader2, MapPin, Hotel, UtensilsCrossed, Car, Landmark, Building2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { usePlacesAutocomplete, type PlaceType, type PlacePrediction, type PlaceDetails } from "@/hooks/usePlacesAutocomplete";

const TYPE_ICONS: Record<string, React.ElementType> = {
  hotel: Hotel,
  restaurant: UtensilsCrossed,
  car_rental: Car,
  attraction: Landmark,
  general: Building2,
  city: MapPin,
};

interface PlacesAutocompleteProps {
  value: string;
  onChange: (value: string) => void;
  onPlaceSelect?: (prediction: PlacePrediction, details?: PlaceDetails) => void;
  placeType?: PlaceType;
  contextCity?: string;
  placeholder?: string;
  className?: string;
  disabled?: boolean;
  fetchDetailsOnSelect?: boolean;
}

export const PlacesAutocomplete = forwardRef<HTMLInputElement, PlacesAutocompleteProps>(
  function PlacesAutocomplete(
    { value, onChange, onPlaceSelect, placeType = "general", contextCity, placeholder, className, disabled, fetchDetailsOnSelect = true },
    ref
  ) {
    const containerRef = useRef<HTMLDivElement>(null);

    const {
      predictions,
      isSearching,
      showDropdown,
      setShowDropdown,
      handleInputChange,
      handleSelect,
    } = usePlacesAutocomplete({
      placeType,
      contextCity,
      fetchDetailsOnSelect,
      onSelect: (pred, details) => {
        onChange(pred.name);
        onPlaceSelect?.(pred, details);
      },
    });

    // Close dropdown on outside click
    useEffect(() => {
      const handler = (e: MouseEvent) => {
        if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
          setShowDropdown(false);
        }
      };
      document.addEventListener("mousedown", handler);
      return () => document.removeEventListener("mousedown", handler);
    }, [setShowDropdown]);

    const Icon = TYPE_ICONS[placeType] || MapPin;

    return (
      <div ref={containerRef} className="relative">
        <Input
          ref={ref}
          value={value}
          onChange={(e) => {
            onChange(e.target.value);
            handleInputChange(e.target.value);
          }}
          onFocus={() => predictions.length > 0 && setShowDropdown(true)}
          placeholder={placeholder}
          className={className}
          disabled={disabled}
          autoComplete="off"
        />
        {isSearching && (
          <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin text-muted-foreground" />
        )}

        {showDropdown && predictions.length > 0 && (
          <div className="absolute z-50 top-full left-0 right-0 mt-1 bg-popover border border-border rounded-lg shadow-lg overflow-hidden max-h-60 overflow-y-auto">
            {predictions.map((p) => {
              const PredIcon = p.matched_type ? Icon : MapPin;
              return (
                <button
                  key={p.place_id}
                  type="button"
                  className="w-full flex items-start gap-3 px-3 py-2 hover:bg-accent/50 transition-colors text-left"
                  onClick={() => handleSelect(p)}
                >
                  <div className="mt-0.5 shrink-0">
                    <PredIcon className={cn("h-4 w-4", p.matched_type ? "text-primary" : "text-muted-foreground")} />
                  </div>
                  <div className="min-w-0">
                    <div className="text-sm font-medium truncate">{p.name}</div>
                    {p.secondary && (
                      <div className="text-xs text-muted-foreground truncate">{p.secondary}</div>
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </div>
    );
  }
);
