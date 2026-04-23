import { createContext, useContext, useMemo, ReactNode } from "react";
import type { TripService } from "@/types/trip";

export interface PoolPassenger {
  name: string;
  type?: "adulto" | "crianca" | "bebe";
}

interface PassengerPoolContextValue {
  passengers: PoolPassenger[];
  names: string[];
}

const PassengerPoolContext = createContext<PassengerPoolContextValue>({
  passengers: [],
  names: [],
});

/**
 * Extracts a unique pool of passenger names already used across all services
 * of the current trip. Isolated per-trip (does NOT share across wallets).
 * Snapshot-based: services keep their own copy of the name.
 */
function extractPoolFromServices(services: TripService[] | undefined): PoolPassenger[] {
  if (!services || services.length === 0) return [];
  const map = new Map<string, PoolPassenger>();

  const push = (name: unknown, type?: unknown) => {
    if (typeof name !== "string") return;
    const trimmed = name.trim();
    if (!trimmed) return;
    const key = trimmed.toLowerCase();
    if (map.has(key)) return;
    const t = type === "adulto" || type === "crianca" || type === "bebe" ? type : undefined;
    map.set(key, { name: trimmed, type: t });
  };

  for (const s of services) {
    const data: any = s.service_data || {};
    // Flight / Transfer / Attraction / Cruise / Train / Other -> passengers[]
    if (Array.isArray(data.passengers)) {
      for (const p of data.passengers) push(p?.name, p?.passenger_type);
    }
    // Hotel -> guests[]
    if (Array.isArray(data.guests)) {
      for (const g of data.guests) push(g?.name);
    }
    // Car rental -> drivers[]
    if (Array.isArray(data.drivers)) {
      for (const d of data.drivers) push(d?.name);
    }
    // Insurance -> insured[]
    if (Array.isArray(data.insured)) {
      for (const ip of data.insured) push(ip?.name);
    }
  }

  return Array.from(map.values()).sort((a, b) =>
    a.name.localeCompare(b.name, "pt-BR", { sensitivity: "base" })
  );
}

interface ProviderProps {
  services: TripService[] | undefined;
  children: ReactNode;
}

export function PassengerPoolProvider({ services, children }: ProviderProps) {
  const value = useMemo<PassengerPoolContextValue>(() => {
    const passengers = extractPoolFromServices(services);
    return { passengers, names: passengers.map((p) => p.name) };
  }, [services]);

  return (
    <PassengerPoolContext.Provider value={value}>
      {children}
    </PassengerPoolContext.Provider>
  );
}

export function usePassengerPool() {
  return useContext(PassengerPoolContext);
}