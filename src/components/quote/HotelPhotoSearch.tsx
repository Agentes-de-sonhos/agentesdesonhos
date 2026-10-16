import { useEffect, useRef, useState } from "react";
import { Camera, Loader2, MapPin } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { classifyMatches, normalizeText } from "@/lib/hotelPlaceMatch";

interface HotelPrediction {
  place_id: string;
  name: string;
  secondary: string;
  is_hotel?: boolean;
}

export function HotelPhotoSearch({ name, city, onSelect, autoResolve = false, onAutoSelect }: {
  name: string;
  city: string;
  onSelect: (hotel: HotelPrediction) => void;
  autoResolve?: boolean;
  onAutoSelect?: (hotel: HotelPrediction) => void;
}) {
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<HotelPrediction[]>([]);
  const [error, setError] = useState("");
  const requestRef = useRef(0);
  const busyRef = useRef(false);
  const autoSelectRef = useRef(onAutoSelect);
  autoSelectRef.current = onAutoSelect;

  useEffect(() => {
    requestRef.current += 1;
    busyRef.current = false;
    setLoading(false);
    setResults([]);
    setError("");
    return () => { requestRef.current += 1; };
  }, [name, city]);

  const search = async (automatic = false) => {
    if (busyRef.current || name.trim().length < 3) return;
    busyRef.current = true;
    const request = ++requestRef.current;
    setLoading(true);
    setError("");
    setResults([]);
    try {
      const { data, error: failure } = await supabase.functions.invoke("hotel-autocomplete", {
        body: { input: name.trim(), city: city.trim() || undefined },
      });
      if (request !== requestRef.current) return;
      if (failure || data?.error) throw new Error("search");
      const hotels: HotelPrediction[] = (data?.predictions || []).filter(
        (p: HotelPrediction) => typeof p.place_id === "string" && !!p.place_id && typeof p.name === "string",
      );
      if (automatic) {
        const match = classifyMatches({ hotelName: name.trim(), city: city.trim() }, hotels.map((hotel) => ({
          place_id: hotel.place_id, name: hotel.name, formatted_address: hotel.secondary,
          types: hotel.is_hotel === true ? ["lodging"] : [],
        })));
        const best = match.best;
        // Require full locality, not only partial tokens accepted by the shared scorer.
        if (best && best.nameScore >= 0.9 && city.trim() &&
          normalizeText(best.candidate.formatted_address).includes(normalizeText(city))) {
          const hotel = hotels.find((item) => item.place_id === best.candidate.place_id);
          if (hotel && autoSelectRef.current) {
            autoSelectRef.current(hotel);
            return;
          }
        }
      }
      setResults(hotels);
      if (!hotels.length) setError("Nenhum hotel encontrado. Confira o nome e a cidade.");
    } catch {
      if (request === requestRef.current) setError("Não foi possível buscar hotéis agora. Tente novamente.");
    } finally {
      if (request === requestRef.current) {
        busyRef.current = false;
        setLoading(false);
      }
    }
  };

  useEffect(() => {
    if (!autoResolve) return;
    let cancelled = false;
    // Once per opening, not every keystroke; cancel StrictMode's discarded mount.
    queueMicrotask(() => { if (!cancelled) void search(true); });
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="space-y-2">
      <Button type="button" variant="outline" size="sm" disabled={loading || name.trim().length < 3}
        onClick={() => void search()} className="h-auto min-h-8 max-w-full gap-2 py-2 text-xs">
        {loading ? <Loader2 className="h-4 w-4 shrink-0 animate-spin" /> : <Camera className="h-4 w-4 shrink-0" />}
        <span className="min-w-0 whitespace-normal break-words text-left">
          {loading ? "Buscando hotel…" : `Buscar fotos de “${name.trim() || "hotel"}” no Google`}
        </span>
      </Button>
      {error && <p role="status" className="text-xs text-destructive">{error}</p>}
      {results.length > 0 && (
        <div className="space-y-1">
          <p className="text-xs font-medium text-muted-foreground">Confirme o hotel</p>
          <div className="max-h-60 overflow-y-auto rounded-md border border-border">
            {results.map((hotel) => (
              <Button key={hotel.place_id} type="button" variant="ghost"
                className="h-auto w-full justify-start gap-2 rounded-none px-3 py-3 text-left"
                onClick={() => { setResults([]); onSelect(hotel); }}>
                <MapPin className="h-4 w-4 shrink-0 text-primary" />
                <span className="min-w-0 whitespace-normal break-words">
                  <span className="block text-sm font-medium">{hotel.name}</span>
                  <span className="block text-xs text-muted-foreground">{hotel.secondary}</span>
                </span>
              </Button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}