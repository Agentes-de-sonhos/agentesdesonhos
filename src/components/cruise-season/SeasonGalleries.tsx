import { useEffect, useRef, useState } from 'react';
import { ChevronLeft, ChevronRight, ArrowRight } from 'lucide-react';
import { agencySiteHref } from '@/lib/agencyContextLink';
import { cruiseShipPath } from '@/lib/cruiseShips';
import { seasonCardPhoto } from '@/lib/cruiseShips/seasonCardPhotos';
import { SEASON_SHIPS } from '@/lib/cruiseShips/season';
import { sampleSeasonItineraries, seasonItineraries } from '@/lib/cruiseShips/seasonItineraries';
import { SeasonItineraryCard } from './SeasonItineraryCard';
import { SEASON_ITINERARIES_PATH } from '@/lib/cruiseShips/seasonItineraries';
import './seasonGalleries.css';

function Gallery({ label, children }: { label: string; children: React.ReactNode }) {
  const rail = useRef<HTMLUListElement>(null);
  const [edges, setEdges] = useState({ start: true, end: false });
  const update = () => { const el = rail.current; if (el) setEdges({ start: el.scrollLeft <= 4, end: el.scrollLeft + el.clientWidth >= el.scrollWidth - 4 }); };
  useEffect(() => { update(); const observer = new ResizeObserver(update); if (rail.current) observer.observe(rail.current); return () => observer.disconnect(); }, []);
  const scroll = (direction: number) => rail.current?.scrollBy({ left: direction * rail.current.clientWidth * 0.8, behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' });
  return <div className="csi-gallery">
    <div className="csi-gallery-heading"><h3>{label}</h3></div>
    <div className="csi-carousel">
      <ul ref={rail} onScroll={update} className="csi-rail" aria-label={label} tabIndex={0}>{children}</ul>
      <button className="csi-prev" type="button" disabled={edges.start} onClick={() => scroll(-1)} aria-label={`Anterior: ${label}`}><ChevronLeft size={20} /></button>
      <button className="csi-next" type="button" disabled={edges.end} onClick={() => scroll(1)} aria-label={`Próximo: ${label}`}><ChevronRight size={20} /></button>
    </div>
  </div>;
}

/** Shared by every homepage already opting into the season section and the season catalog. */
export function SeasonGalleries({ showShips = true }: { showShips?: boolean }) {
  const [options] = useState(() => sampleSeasonItineraries(seasonItineraries(), 8));
  return <div className="csi">
    {showShips && <><Gallery label="Conheça os oito navios">{SEASON_SHIPS.map(ship => <li key={ship.shipSlug} className="csi-card">
      <a href={agencySiteHref(cruiseShipPath(ship))}>
        <img src={seasonCardPhoto(ship)} alt={`${ship.shipName} em navegação`} loading="lazy" className="csi-photo" />
        <div className="csi-copy"><p className="csi-meta">{ship.lineName}</p><h4>{ship.shipName}</h4><span className="csi-link">Conheça o navio <ArrowRight size={16} aria-hidden="true" /></span></div>
      </a>
    </li>)}</Gallery><p className="csi-note">Imagens de divulgação: MSC Cruzeiros, Costa Cruzeiros e Corazul.</p></>}
    {options.length > 0 && <><Gallery label="Roteiros para a sua próxima viagem">{options.map(option => <SeasonItineraryCard key={option.id} option={option} />)}</Gallery><div className="csi-gallery-footer"><p className="csi-note">Datas, cabines e disponibilidade serão confirmadas pela agência.</p><a className="csi-all" href={agencySiteHref(SEASON_ITINERARIES_PATH)}>Ver todos os roteiros <ArrowRight size={18} aria-hidden="true" /></a></div></>}
  </div>;
}
