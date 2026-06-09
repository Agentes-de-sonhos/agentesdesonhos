import { useState, useCallback, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";

interface PlacePrediction {
  place_id: string;
  name: string;
  secondary: string;
  description: string;
  is_hotel: boolean;
}

interface PlaceDetails {
  place_id: string;
  name: string;
  address: string | null;
  latitude: number | null;
  longitude: number | null;
  photo_url: string | null;
  photo_urls: string[];
}

interface UseHotelAutocompleteOptions {
  onSelect?: (prediction: PlacePrediction, details?: PlaceDetails) => void;
  fetchDetailsOnSelect?: boolean;
}

export function useHotelAutocomplete(options?: UseHotelAutocompleteOptions) {
  const [predictions, setPredictions] = useState<PlacePrediction[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [isFetchingDetails, setIsFetchingDetails] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const [selectedPlaceId, setSelectedPlaceId] = useState<string | null>(null);
  const [selectedDetails, setSelectedDetails] = useState<PlaceDetails | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const optionsRef = useRef(options);
  optionsRef.current = options;

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

  const handleSelect = useCallback(async (prediction: PlacePrediction) => {
    setSelectedPlaceId(prediction.place_id);
    setShowDropdown(false);
    setPredictions([]);

    let details: PlaceDetails | undefined;
    if (optionsRef.current?.fetchDetailsOnSelect !== false) {
      setIsFetchingDetails(true);
      try {
        const { data, error } = await supabase.functions.invoke("places-autocomplete", {
          body: { fetch_details: true, place_id: prediction.place_id, place_type: "hotel" },
        });
        if (!error && data?.place) {
          details = data.place as PlaceDetails;
          setSelectedDetails(details);
        }
      } catch {
        // silently fail — caller still gets the prediction
      } finally {
        setIsFetchingDetails(false);
      }
    }

    optionsRef.current?.onSelect?.(prediction, details);
  }, []);

  const reset = useCallback(() => {
    setPredictions([]);
    setShowDropdown(false);
    setSelectedPlaceId(null);
    setSelectedDetails(null);
  }, []);

  return {
    predictions,
    isSearching,
    isFetchingDetails,
    showDropdown,
    selectedPlaceId,
    selectedDetails,
    setShowDropdown,
    handleInputChange,
    handleSelect,
    reset,
  };
}
