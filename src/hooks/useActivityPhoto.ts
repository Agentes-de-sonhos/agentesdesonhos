import { useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

interface PhotoResult {
  photo_url: string | null;
  thumb_url?: string | null;
  attributions?: string[];
  source?: string;
}

const memCache = new Map<string, PhotoResult>();

function keyFor(query: string, destination?: string, location?: string) {
  return `${query}|${location ?? ""}|${destination ?? ""}`.toLowerCase();
}

/**
 * Lazily fetches a representative photo for an activity via the
 * `activity-photo` edge function (Google Places + DB cache).
 * Designed to be cheap: in-memory cache, sessionStorage cache, server-side cache.
 */
export function useActivityPhoto(opts: {
  query?: string | null;
  destination?: string | null;
  location?: string | null;
  enabled?: boolean;
}) {
  const { query, destination, location, enabled = true } = opts;
  const [data, setData] = useState<PhotoResult | null>(null);
  const [loading, setLoading] = useState(false);
  const inflight = useRef(false);

  useEffect(() => {
    if (!enabled || !query || query.trim().length < 2) return;

    const k = keyFor(query, destination ?? undefined, location ?? undefined);
    if (memCache.has(k)) {
      setData(memCache.get(k)!);
      return;
    }
    try {
      const raw = sessionStorage.getItem(`actphoto:${k}`);
      if (raw) {
        const parsed = JSON.parse(raw) as PhotoResult;
        memCache.set(k, parsed);
        setData(parsed);
        return;
      }
    } catch { /* ignore */ }

    if (inflight.current) return;
    inflight.current = true;
    setLoading(true);

    supabase.functions
      .invoke("activity-photo", {
        body: {
          query: query.trim(),
          destination: destination ?? undefined,
          location: location ?? undefined,
        },
      })
      .then(({ data: resp }) => {
        const result: PhotoResult = {
          photo_url: resp?.photo_url ?? null,
          thumb_url: resp?.thumb_url ?? null,
          attributions: resp?.attributions ?? [],
          source: resp?.source,
        };
        memCache.set(k, result);
        try {
          sessionStorage.setItem(`actphoto:${k}`, JSON.stringify(result));
        } catch { /* ignore */ }
        setData(result);
      })
      .catch(() => setData({ photo_url: null }))
      .finally(() => {
        setLoading(false);
        inflight.current = false;
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query, destination, location, enabled]);

  return { data, loading };
}
