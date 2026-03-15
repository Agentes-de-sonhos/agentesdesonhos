import { useEffect, useState } from "react";
import { getAirportsMap, formatAirportLabel, getAirportSync, isAirportsLoaded } from "@/lib/airports";

export function useAirports() {
  const [loaded, setLoaded] = useState(isAirportsLoaded());

  useEffect(() => {
    if (!loaded) {
      getAirportsMap().then(() => setLoaded(true));
    }
  }, [loaded]);

  return {
    loaded,
    formatAirportLabel,
    getAirport: getAirportSync,
  };
}
