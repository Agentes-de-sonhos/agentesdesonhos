import diadema from '@/assets/cruise-season/costa-diadema-exterior.jpg';
import buenavista from '@/assets/cruise-season/buenavista-exterior.jpg';
import divina from '@/assets/cruise-season/msc-divina-exterior.jpg';
import splendida from '@/assets/cruise-season/msc-splendida-exterior.jpg';
import seaview from '@/assets/cruise-season/msc-seaview-exterior.jpg';
import serena from '@/assets/cruise-season/costa-serena-exterior.jpg';
import type { CruiseShip } from '@/lib/cruiseShips';

/** Uniform card photo standard for the season gallery: real photo of the whole ship at sea. */
const LOCAL: Record<string, string> = {
  'msc-divina': divina, 'msc-splendida': splendida, 'msc-seaview': seaview,
  'costa-diadema': diadema, 'costa-serena': serena, buenavista,
};

export function seasonCardPhoto(ship: CruiseShip): string {
  return LOCAL[ship.shipSlug] ?? ship.assets[ship.hero.image] ?? ship.hero.image;
}
