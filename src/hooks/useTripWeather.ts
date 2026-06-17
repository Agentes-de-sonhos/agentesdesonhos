import { useEffect, useState } from "react";
import { format, differenceInDays } from "date-fns";

export interface DayWeather {
  code: number;
  tmax: number;
  tmin: number;
}

const CACHE_TTL_MS = 6 * 60 * 60 * 1000; // 6h
// Open-Meteo's forecast endpoint accepts at most ~15 days ahead of today.
// Using a larger value triggers an "out of allowed range" error that
// rejects the entire request (no day comes back), so keep this conservative.
const FORECAST_HORIZON_DAYS = 15;

interface CacheShape {
  savedAt: number;
  data: Record<string, DayWeather>;
  timezone?: string;
}

function readCache(key: string): { data: Record<string, DayWeather>; timezone?: string } | null {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return null;
    const parsed: CacheShape = JSON.parse(raw);
    if (Date.now() - parsed.savedAt > CACHE_TTL_MS) return null;
    return { data: parsed.data, timezone: parsed.timezone };
  } catch { return null; }
}

function writeCache(key: string, data: Record<string, DayWeather>, timezone?: string) {
  try {
    localStorage.setItem(key, JSON.stringify({ savedAt: Date.now(), data, timezone }));
  } catch { /* ignore */ }
}

/**
 * Fetches daily weather forecast (Open-Meteo, no API key) for a destination
 * between startDate and endDate. Only days within ~16 days from today are
 * supported by the forecast endpoint; days beyond that are omitted.
 */
export function useTripWeather(
  destination: string | undefined,
  startDate: Date,
  endDate: Date
) {
  const [data, setData] = useState<Record<string, DayWeather>>({});
  const [timezone, setTimezone] = useState<string | undefined>(undefined);

  useEffect(() => {
    if (!destination) return;

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    // Always include today (so the local clock can show today's temp), even if
    // the trip starts in the future or already ended.
    const start = new Date(Math.min(startDate.getTime(), today.getTime()));
    const tripStartAhead = differenceInDays(startDate, today);
    const tooFar = tripStartAhead > FORECAST_HORIZON_DAYS;

    const effectiveEnd = new Date(
      Math.min(
        Math.max(endDate.getTime(), today.getTime()),
        today.getTime() + FORECAST_HORIZON_DAYS * 86400000
      )
    );
    const skipWeather = tooFar || effectiveEnd.getTime() < start.getTime();

    const startStr = format(start, "yyyy-MM-dd");
    const endStr = format(effectiveEnd, "yyyy-MM-dd");
    const cacheKey = `wx:${destination}:${startStr}:${endStr}`;

    const cached = readCache(cacheKey);
    if (cached && cached.timezone) {
      setData(cached.data);
      setTimezone(cached.timezone);
      if (skipWeather) return;
      // Even with cached weather we have timezone; nothing else to fetch.
      return;
    }
    if (cached) {
      // Old cache without timezone — keep weather but still fetch geo for tz.
      setData(cached.data);
    }

    let cancelled = false;
    (async () => {
      try {
        // City may have country/state; take first comma-separated chunk.
        const cityQuery = destination.split(",")[0].trim();
        let place: any = null;
        for (const lang of ["pt", "en"]) {
          try {
            const r = await fetch(
              `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(cityQuery)}&count=1&language=${lang}&format=json`
            );
            const j = await r.json();
            if (j?.results?.[0]) { place = j.results[0]; break; }
          } catch { /* try next */ }
        }
        if (!place) {
          console.warn("[useTripWeather] geocoding failed for", cityQuery);
          return;
        }
        const tz: string | undefined = place.timezone;
        if (!cancelled && tz) setTimezone(tz);

        if (skipWeather) {
          if (!cancelled) writeCache(cacheKey, {}, tz);
          return;
        }

        const fetchForecast = async (s: string, e: string) => {
          const r = await fetch(
            `https://api.open-meteo.com/v1/forecast?latitude=${place.latitude}&longitude=${place.longitude}&daily=weather_code,temperature_2m_max,temperature_2m_min&timezone=auto&start_date=${s}&end_date=${e}`
          );
          return r.json();
        };
        let wx = await fetchForecast(startStr, endStr);
        // If Open-Meteo rejects the range (e.g. end_date past the allowed
        // horizon), retry with a tighter window so we still get the days that
        // ARE within range instead of returning nothing.
        if (wx?.error) {
          const safeEnd = new Date(today.getTime() + 14 * 86400000);
          const safeStart = new Date(Math.min(start.getTime(), safeEnd.getTime()));
          wx = await fetchForecast(
            format(safeStart, "yyyy-MM-dd"),
            format(safeEnd, "yyyy-MM-dd")
          );
        }
        const out: Record<string, DayWeather> = {};
        const dates: string[] = wx?.daily?.time ?? [];
        const codes: number[] = wx?.daily?.weather_code ?? [];
        const tmax: number[] = wx?.daily?.temperature_2m_max ?? [];
        const tmin: number[] = wx?.daily?.temperature_2m_min ?? [];
        dates.forEach((d, i) => {
          out[d] = { code: codes[i], tmax: Math.round(tmax[i]), tmin: Math.round(tmin[i]) };
        });
        if (!cancelled) {
          setData(out);
          writeCache(cacheKey, out, tz);
        }
      } catch { /* silent */ }
    })();

    return () => { cancelled = true; };
  }, [destination, startDate.getTime(), endDate.getTime()]);

  return { weatherByDate: data, timezone };
}
