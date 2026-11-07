import { useEffect } from "react";
import { useParams } from "react-router-dom";
import { CruiseShipPage } from "@/components/cruise-ship/CruiseShipPage";
import { findCruiseShip } from "@/lib/cruiseShips";
import type { AgencyDomainInfo } from "@/lib/agencyDomains";

/** /cruzeiros/:line/:ship inside the agency's own site chrome; the tenant comes from the domain. */
export default function CruiseShipRoutePage({ info }: { info: AgencyDomainInfo }) {
  const { line, ship: shipSlug } = useParams();
  const ship = findCruiseShip(line, shipSlug);
  useEffect(() => {
    if (ship) document.title = `${ship.shipName} · ${info.agency_name ?? "Cruzeiros"}`;
    window.scrollTo(0, 0);
  }, [ship, info.agency_name]);
  if (!ship) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center p-6 text-center">
        <div className="max-w-md space-y-2">
          <h1 className="text-xl font-semibold text-foreground">Página indisponível</h1>
          <p className="text-sm text-muted-foreground">Este navio não está disponível no site.</p>
        </div>
      </div>
    );
  }
  return <CruiseShipPage key={`${ship.lineSlug}/${ship.shipSlug}`} ship={ship} hostname={info.hostname} />;
}
