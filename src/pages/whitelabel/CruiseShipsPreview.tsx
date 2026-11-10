import { useEffect, type CSSProperties } from "react";
import { useSearchParams } from "react-router-dom";
import CruiseSeasonPage from "./CruiseSeasonPage";
import type { AgencyDomainInfo } from "@/lib/agencyDomains";
import { CRUISE_SHIPS } from "@/lib/cruiseShips";
import { CruiseShipPage } from "@/components/cruise-ship/CruiseShipPage";

/** Read-only review of PR content, available only on this project's Pages previews. */
export default function CruiseShipsPreview() {
  const [params, setParams] = useSearchParams();
  const host = window.location.hostname;
  const allowed = host.endsWith(".agentesdesonhos.pages.dev") || host === "localhost";
  const ships = CRUISE_SHIPS.filter(s => s.lineSlug !== "royal-caribbean");
  const season = params.has("temporada");
  const ship = ships.find(s => s.shipSlug === params.get("navio")) ?? ships[0];
  useEffect(() => {
    if (!allowed) return;
    document.title = `Prévia · ${ship.shipName}`;
    const meta = document.createElement("meta");
    meta.name = "robots"; meta.content = "noindex,nofollow";
    document.head.appendChild(meta);
    return () => meta.remove();
  }, [allowed, ship.shipName]);
  if (!allowed) return <main className="p-8">Página indisponível.</main>;
  return <div className="cruise-preview" style={{ "--primary": "224 38% 12%", "--secondary": "32 70% 60%", "--foreground": "224 38% 12%", "--muted-foreground": "210 10% 40%", "--background": "0 0% 100%", "--border": "210 10% 88%", "--primary-foreground": "0 0% 100%", "--wl-ink": "224 38% 12%", "--wl-sand": "240 33% 98%" } as CSSProperties}>
    <header className="border-b bg-background p-4 text-foreground">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-4">
        <div><strong>Prévia dos navios</strong><p className="text-sm">Versão para revisão. Envio de orçamento desativado; identidade visual de referência.</p></div>
        <button onClick={()=>setParams({temporada:"1"})}>Temporada 26/27</button><label className="ml-auto">Escolha o navio <select className="rounded border bg-background p-2" value={ship.shipSlug} onChange={e => { setParams({ navio: e.target.value }); window.scrollTo(0, 0); }}>
          {ships.map(s => <option key={s.shipSlug} value={s.shipSlug}>{s.shipName}</option>)}
        </select></label>
      </div>
    </header>
    {season ? <CruiseSeasonPage info={{hostname:"review.preview.local",agency_name:"Prévia da agência"} as AgencyDomainInfo} /> : <CruiseShipPage key={ship.shipSlug} ship={ship} hostname="review.preview.local" />}
  </div>;
}
