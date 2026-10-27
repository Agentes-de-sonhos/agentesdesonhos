import { useState } from "react";
import { airlineLogoUrl, resolveAirlineIata } from "@/lib/airlines";
import { cn } from "@/lib/utils";

export function AirlineLogo({ airline, flightNumber, size = 20, className }: { airline?: string | null; flightNumber?: string | null; size?: number; className?: string }) {
  const [failed, setFailed] = useState(false);
  const iata = resolveAirlineIata(airline, flightNumber);
  if (!iata || failed) return null;
  return (
    <span className={cn("inline-flex shrink-0 items-center justify-center overflow-hidden rounded-md border border-border/60 bg-card", className)} style={{ width: size, height: size }}>
      <img src={airlineLogoUrl(iata)} alt="" aria-hidden="true" loading="lazy" referrerPolicy="no-referrer" onError={() => setFailed(true)} className="h-full w-full object-contain p-[1px]" />
    </span>
  );
}
