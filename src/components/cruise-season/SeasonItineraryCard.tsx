import { ArrowRight } from 'lucide-react';
import { agencySiteHref } from '@/lib/agencyContextLink';
import { seasonItineraryPath, seasonMonthLabel, type SeasonItinerary } from '@/lib/cruiseShips/seasonItineraries';
import { SeasonItineraryMap } from './SeasonItineraryMap';

const shortMonth = (month: string) => {
  const [year, number] = month.split('-');
  return `${['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'][Number(number) - 1]} ${year.slice(-2)}`;
};

export function SeasonItineraryCard({ option }: { option: SeasonItinerary }) {
  return <li className="csi-card csi-itinerary" data-itinerary={option.id}>
    <a href={agencySiteHref(seasonItineraryPath(option))} aria-label={`${option.nights} noites no ${option.ship.shipName}: ${option.ports.join(', ')}. Conheça o roteiro e solicite orçamento.`}>
      <div className="csi-photo"><SeasonItineraryMap option={option} /></div>
      <div className="csi-copy"><p className="csi-meta">{option.ship.shipName} · {option.ship.lineName}</p>
        <h4>{option.nights} noites · {option.ports.slice(1, -1).join(' + ') || option.ports.at(-1)}</h4>
        <p className="csi-origin">Saída de {option.ports[0]}</p><p className="csi-ports">{option.ports.map((port, index) => <span key={`${index}-${port}`}>{index > 0 && <ArrowRight className="csi-port-arrow" size={14} strokeWidth={3} aria-hidden="true" />}{port}</span>)}</p>
        <div className="csi-months"><strong>Meses com saídas</strong><div className="csi-month-row"><div className="csi-month-badges">{option.months.map(month => <time key={month} dateTime={month} className="csi-month-badge" title={seasonMonthLabel(month)} aria-label={seasonMonthLabel(month)}>{shortMonth(month)}</time>)}</div><span className="csi-link csi-card-arrow" aria-hidden="true"><ArrowRight size={20} /></span></div></div>
      </div>
    </a>
  </li>;
}
