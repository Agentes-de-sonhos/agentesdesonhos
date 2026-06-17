import { useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { parseDestinationParts } from "@/lib/destination-parts";

const memCache = new Map<string, string | null>();

/**
 * Cascading cover-photo lookup for a destination string.
 * Tries the first city → second → third → full string, returning the
 * first non-null result from the `activity-photo` edge function.
 * Reuses the same backend (Google Places + Unsplash + Pexels, landscape).
 */
export function useDestinationCoverPhoto(opts: {
  destination?: string | null;
  enabled?: boolean;
}) {
  const { destination, enabled = true } = opts;
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const inflight = useRef(false);

  useEffect(() => {
    if (!enabled || !destination) {
      setPhotoUrl(null);
      return;
    }
    const parts = parseDestinationParts(destination);
    if (parts.length === 0) return;
    const cacheKey = parts.join("|").toLowerCase();
    if (memCache.has(cacheKey)) {
      setPhotoUrl(memCache.get(cacheKey)!);
      return;
    }
    if (inflight.current) return;
    inflight.current = true;
    setLoading(true);

    (async () => {
      let found: string | null = null;
      for (const part of parts) {
        try {
          const { data } = await supabase.functions.invoke("activity-photo", {
            body: { query: part, destination: part },
          });
          if (data?.photo_url) {
            found = data.photo_url as string;
            break;
          }
        } catch {
          /* try next */
        }
      }
      memCache.set(cacheKey, found);
      setPhotoUrl(found);
      setLoading(false);
      inflight.current = false;
    })();
  }, [destination, enabled]);

  return { photoUrl, loading };
}
