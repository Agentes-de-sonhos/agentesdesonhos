import { useState, useCallback, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";

export type PlaceType = "city" | "hotel" | "restaurant" | "car_rental" | "attraction" | "general";

export interface PlacePrediction {
  place_id: string;
  name: string;
  secondary: string;
  description: string;
  types: string[];
  matched_type: boolean;
}

export interface PlaceDetails {
  place_id: string;
  name: string;
  address: string | null;
  photo_url: string | null;
  photo_urls: string[];
  place_type: string | null;
  latitude: number | null;
  longitude: number | null;
}

interface UsePlacesAutocompleteOptions {
  placeType?: PlaceType;
  contextCity?: string;
  onSelect?: (prediction: PlacePrediction, details?: PlaceDetails) => void;
  fetchDetailsOnSelect?: boolean;
}

export function usePlacesAutocomplete(options?: UsePlacesAutocompleteOptions) {
  const [predictions, setPredictions] = useState<PlacePrediction[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [isFetchingDetails, setIsFetchingDetails] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const [selectedPlaceId, setSelectedPlaceId] = useState<string | null>(null);
  const [selectedDetails, setSelectedDetails] = useState<PlaceDetails | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const optionsRef = useRef(options);
  optionsRef.current = options;

  const fetchAutocomplete = useCallback(async (input: string) => {
    if (input.trim().length < 3) {
      setPredictions([]);
      setShowDropdown(false);
      return;
    }

    setIsSearching(true);
    try {
      // Para campos de Destino (cidade), usamos a base própria de cidades
      // (tabela public.cities). Google Places NÃO é utilizado neste caso.
      if (optionsRef.current?.placeType === "city") {
        const { data, error } = await supabase.rpc("search_cities", {
          q: input.trim(),
          max_results: 10,
        });
        if (!error && Array.isArray(data)) {
          const preds: PlacePrediction[] = data.map((row: {
            id: number;
            name: string;
            country: string;
            admin_name: string | null;
            iso2: string | null;
            lat: number | null;
            lng: number | null;
          }) => {
            const secondary = [row.admin_name, row.country].filter(Boolean).join(", ");
            return {
              place_id: `city:${row.id}`,
              name: row.name,
              secondary,
              description: `${row.name}, ${secondary}`,
              types: ["locality", "political"],
              matched_type: true,
            };
          });
          setPredictions(preds);
          setShowDropdown(preds.length > 0);
        } else {
          setPredictions([]);
          setShowDropdown(false);
        }
        return;
      }

      const { data, error } = await supabase.functions.invoke("places-autocomplete", {
        body: {
          input: input.trim(),
          place_type: optionsRef.current?.placeType || "general",
          context_city: optionsRef.current?.contextCity || undefined,
        },
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

  const fetchDetails = useCallback(async (placeId: string): Promise<PlaceDetails | null> => {
    // Place IDs gerados pela base interna de cidades não possuem detalhes
    // no Google Places. Retornamos null para manter o fluxo (a seleção
    // já contém nome/país; coordenadas vêm do row se necessário).
    if (placeId.startsWith("city:")) {
      return null;
    }
    setIsFetchingDetails(true);
    try {
      const { data, error } = await supabase.functions.invoke("places-autocomplete", {
        body: {
          fetch_details: true,
          place_id: placeId,
          place_type: optionsRef.current?.placeType || "general",
        },
      });

      if (!error && data?.place) {
        setSelectedDetails(data.place);
        return data.place;
      }
      return null;
    } catch {
      return null;
    } finally {
      setIsFetchingDetails(false);
    }
  }, []);

  const handleInputChange = useCallback((value: string) => {
    setSelectedPlaceId(null);
    setSelectedDetails(null);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => fetchAutocomplete(value), 300);
  }, [fetchAutocomplete]);

  const handleSelect = useCallback(async (prediction: PlacePrediction) => {
    setSelectedPlaceId(prediction.place_id);
    setShowDropdown(false);
    setPredictions([]);

    let details: PlaceDetails | undefined;
    if (optionsRef.current?.fetchDetailsOnSelect !== false) {
      const d = await fetchDetails(prediction.place_id);
      if (d) details = d;
    }

    optionsRef.current?.onSelect?.(prediction, details);
  }, [fetchDetails]);

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
    fetchDetails,
    reset,
  };
}
