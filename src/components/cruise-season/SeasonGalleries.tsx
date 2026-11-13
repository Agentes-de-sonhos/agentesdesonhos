import { useRef, useState } from 'react';
import { ChevronLeft, ChevronRight, ArrowRight } from 'lucide-react';
import { agencySiteHref } from '@/lib/agencyContextLink';
import { cruiseShipPath } from '@/lib/cruiseShips';
import { seasonCardPhoto } from '@/lib/cruiseShips/seasonCardPhotos';
import { SEASON_SHIPS } from '@/lib/cruiseShips/season';
import { sampleSeasonItineraries, seasonItineraries, seasonItineraryPath, seasonMonthLabel } from '@/lib/cruiseShips/seasonItineraries';
import { SeasonItineraryMap } from './SeasonItineraryMap';
import './seasonGalleries.css';

function Gallery({ label, children }: { label: string; children: React.ReactNode }) {
  const rail = useRef<HTMLUListElement>(null);
  const scroll = (direction: number) => rail.current?.scrollBy({ left: direction * rail.current.clientWidth * 0.85, behavior: 'smooth' });
  return <div className="csi-gallery">
    <div className="csi-gallery-heading"><h3>{label}</h3><div className="csi-arrows">
      <button type="button" onClick={() => scroll(-1)} aria-label={`Anterior: ${label}`}><ChevronLeft size={20} /></button>
      <button type="button" onClick={() => scroll(1)} aria-label={`Próximo: ${label}`}><ChevronRight size={20} /></button>
    </div></div>
    <ul ref={rail} className="csi-rail" aria-label={label} tabIndex={0}>{children}</ul>
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
    {options.length > 0 && <><Gallery label="Roteiros para a sua próxima viagem">{options.map(option => <li key={option.id} className="csi-card" data-itinerary={option.id}>
      <a href={agencySiteHref(seasonItineraryPath(option))} aria-label={`${option.nights} noites no ${option.ship.shipName}: ${option.ports.join(', ')}. Conheça o roteiro e solicite orçamento.`}>
        <div className="csi-photo"><SeasonItineraryMap option={option} /></div>
        <div className="csi-copy"><p className="csi-meta">{option.ship.shipName} · {option.ship.lineName}</p>
          <h4>{option.nights} noites · {option.ports.slice(1, -1).join(' + ') || option.ports.at(-1)}</h4>
          <p className="csi-origin">Saída de {option.ports[0]}</p><p className="csi-ports">{option.ports.join(' → ')}</p>
          <p className="csi-months"><strong>Meses com saídas</strong><br />{option.months.map(seasonMonthLabel).join(' · ')}</p>
          <span className="csi-link">Conhecer roteiro e pedir orçamento <ArrowRight size={16} aria-hidden="true" /></span>
        </div>
      </a>
    </li>)}</Gallery><p className="csi-note">Seleção aleatória de itinerários cadastrados. Mapas esquemáticos das escalas; não representam o trajeto de navegação. Datas, cabines e disponibilidade serão confirmadas pela agência.</p></>}
  </div>;
}
