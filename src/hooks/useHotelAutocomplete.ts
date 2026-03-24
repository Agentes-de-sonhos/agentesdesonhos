import { useState, useCallback, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";

interface PlacePrediction {
  place_id: string;
  name: string;
  secondary: string;
  description: string;
  is_hotel: boolean;
}

interface UseHotelAutocompleteOptions {
  onSelect?: (prediction: PlacePrediction) => void;
}

export function useHotelAutocomplete(options?: UseHotelAutocompleteOptions) {
  const [predictions, setPredictions] = useState<PlacePrediction[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const [selectedPlaceId, setSelectedPlaceId] = useState<string | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const fetchAutocomplete = useCallback(async (input: string, city?: string) => {
    if (input.trim().length < 3) {
      setPredictions([]);
      setShowDropdown(false);
      return;
    }

    setIsSearching(true);
    try {
      const { data, error } = await supabase.functions.invoke("hotel-autocomplete", {
        body: { input: input.trim(), city: city?.trim() || undefined },
      });

      if (!error && data?.predictions) {
        setPredictions(data.predictions);
        setShowDropdown(data.predictions.length > 0);
      }
    } catch {
      // silently fail
    } finally {
      setIsSearching(false);
    }
  }, []);

  const handleInputChange = useCallback((value: string, city?: string) => {
    setSelectedPlaceId(null);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => fetchAutocomplete(value, city), 300);
  }, [fetchAutocomplete]);

  const handleSelect = useCallback((prediction: PlacePrediction) => {
    setSelectedPlaceId(prediction.place_id);
    setShowDropdown(false);
    setPredictions([]);
    options?.onSelect?.(prediction);
  }, [options]);

  const reset = useCallback(() => {
    setPredictions([]);
    setShowDropdown(false);
    setSelectedPlaceId(null);
  }, []);

  return {
    predictions,
    isSearching,
    showDropdown,
    selectedPlaceId,
    setShowDropdown,
    handleInputChange,
    handleSelect,
    reset,
  };
}
