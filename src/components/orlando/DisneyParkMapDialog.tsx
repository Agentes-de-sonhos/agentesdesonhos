import { useEffect, useRef, useState, type ReactNode } from "react";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { MagicKingdomMapTrigger } from "./MagicKingdomMapDialog";
import styles from "./MagicKingdomMapDialog.module.css";

export const DISNEY_MAPS = {
  "magic-kingdom": { name: "Magic Kingdom", count: 84 },
  epcot: { name: "EPCOT", count: 88 },
  "animal-kingdom": { name: "Disney's Animal Kingdom", count: 56 },
  "hollywood-studios": { name: "Disney's Hollywood Studios", count: 65 },
  "typhoon-lagoon": { name: "Disney's Typhoon Lagoon", count: 26 },
  "blizzard-beach": { name: "Disney's Blizzard Beach", count: 25 },
} as const;
export type DisneyMapId = keyof typeof DISNEY_MAPS;
export const UNITED_MAPS = {
  seaworld: { name: "SeaWorld Orlando", count: 69 },
  "busch-gardens": { name: "Busch Gardens Tampa Bay", count: 65 },
  aquatica: { name: "Aquatica Orlando", count: 30 },
  "discovery-cove": { name: "Discovery Cove", count: 17 },
} as const;
export type UnitedMapId = keyof typeof UNITED_MAPS;
export type ParkMapId = DisneyMapId | UnitedMapId;
export function isUnitedMapId(id: string): id is UnitedMapId {
  return Object.prototype.hasOwnProperty.call(UNITED_MAPS, id);
}
export function isParkMapId(id: string): id is ParkMapId {
  return isDisneyMapId(id) || isUnitedMapId(id);
}
export function isDisneyMapId(id: string): id is DisneyMapId {
  return Object.prototype.hasOwnProperty.call(DISNEY_MAPS, id);
}

/** Each same-origin document and image are mounted only when its own logo opens. */
export function DisneyParkMapTrigger({ park, children, className }: { park: ParkMapId; children: ReactNode; className?: string }) {
  if (park === "magic-kingdom") return <MagicKingdomMapTrigger className={className}>{children}</MagicKingdomMapTrigger>;
  return <ParkMapTrigger park={park} className={className}>{children}</ParkMapTrigger>;
}

function ParkMapTrigger({ park, children, className }: { park: Exclude<ParkMapId, "magic-kingdom">; children: ReactNode; className?: string }) {
  const [open, setOpen] = useState(false);
  const frame = useRef<HTMLIFrameElement>(null);
  const { name, count } = { ...DISNEY_MAPS, ...UNITED_MAPS }[park];
  useEffect(() => {
    if (!open) return;
    const closeFromMap = (event: MessageEvent) => {
      if (event.origin !== window.location.origin || event.source !== frame.current?.contentWindow) return;
      if (event.data?.type === `disney-park-map:${park}:close`) setOpen(false);
    };
    window.addEventListener("message", closeFromMap);
    return () => window.removeEventListener("message", closeFromMap);
  }, [open, park]);
  return <Dialog open={open} onOpenChange={setOpen}>
    <DialogTrigger asChild><Button type="button" variant="ghost" className={className} aria-label={`Abrir mapa interativo do ${name}`}>{children}</Button></DialogTrigger>
    <DialogContent hideClose className={styles.content} data-preview-interactive>
      <DialogTitle className="sr-only">Mapa interativo do {name}</DialogTitle>
      <DialogDescription className="sr-only">Mapa com {count} pontos do guia fornecido, busca e filtros de atrações, restaurantes e compras.</DialogDescription>
      <DialogClose asChild><Button type="button" variant="ghost" size="icon" className={styles.close} aria-label={`Fechar mapa do ${name}`}><X aria-hidden="true" /></Button></DialogClose>
      {open && <iframe ref={frame} src={`/maps/${park}.html`} title={`Mapa interativo do ${name}`} className={styles.frame} />}
    </DialogContent>
  </Dialog>;
}