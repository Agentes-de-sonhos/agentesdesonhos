import { ArrowRight } from 'lucide-react';
import { agencySiteHref } from '@/lib/agencyContextLink';
import { seasonItineraryPath, seasonMonthLabel, type SeasonItinerary } from '@/lib/cruiseShips/seasonItineraries';
import { SeasonItineraryMap } from './SeasonItineraryMap';

export function SeasonItineraryCard({ option }: { option: SeasonItinerary }) {
  return <li className="csi-card csi-itinerary" data-itinerary={option.id}>
    <a href={agencySiteHref(seasonItineraryPath(option))} aria-label={`${option.nights} noites no ${option.ship.shipName}: ${option.ports.join(', ')}. Conheça o roteiro e solicite orçamento.`}>
      <div className="csi-photo"><SeasonItineraryMap option={option} /></div>
      <div className="csi-copy"><p className="csi-meta">{option.ship.shipName} · {option.ship.lineName}</p>
        <h4>{option.nights} noites · {option.ports.slice(1, -1).join(' + ') || option.ports.at(-1)}</h4>
        <p className="csi-origin">Saída de {option.ports[0]}</p><p className="csi-ports">{option.ports.join(' → ')}</p>
        <p className="csi-months"><strong>Meses com saídas</strong><br />{option.months.map(seasonMonthLabel).join(' · ')}</p>
        <span className="csi-link">Conhecer roteiro e pedir orçamento <ArrowRight size={16} aria-hidden="true" /></span>
      </div>
    </a>
  </li>;
}
