import { useEffect, useMemo, useState } from 'react';
import type { AgencyDomainInfo } from '@/lib/agencyDomains';
import { agencySiteHref } from '@/lib/agencyContextLink';
import { seasonItineraries, seasonMonthLabel } from '@/lib/cruiseShips/seasonItineraries';
import { emptyItineraryFilters, filterSeasonItineraries, type ItineraryFilters } from '@/lib/cruiseShips/seasonItineraryFilters';
import { SeasonItineraryCard } from '@/components/cruise-season/SeasonItineraryCard';
import '@/components/cruise-season/seasonGalleries.css';

export default function CruiseItinerariesPage({ info }: { info: AgencyDomainInfo }) {
  const options = useMemo(() => seasonItineraries().sort((a,b) => a.nights-b.nights || a.ship.shipName.localeCompare(b.ship.shipName)), []);
  const [filters, setFilters] = useState<ItineraryFilters>(emptyItineraryFilters);
  const [limit, setLimit] = useState(12);
  const results = useMemo(() => filterSeasonItineraries(options, filters), [options, filters]);
  useEffect(() => { document.title = `Roteiros de cruzeiros 2026/2027 · ${info.agency_name || 'Sua agência'}`; window.scrollTo(0, 0); }, [info.agency_name]);
  const unique = (values: string[]) => [...new Set(values)].sort((a,b) => a.localeCompare(b, 'pt-BR', { numeric: true }));
  const fields: { key: keyof ItineraryFilters; label: string; values: string[]; labelFor?: (value: string) => string }[] = [
    { key: 'company', label: 'Companhia', values: unique(options.map(o => o.ship.lineSlug)), labelFor: v => options.find(o => o.ship.lineSlug === v)!.ship.lineName },
    { key: 'ship', label: 'Navio', values: unique(options.filter(o => !filters.company || o.ship.lineSlug === filters.company).map(o => o.ship.shipSlug)), labelFor: v => options.find(o => o.ship.shipSlug === v)!.ship.shipName },
    { key: 'region', label: 'Tipo de roteiro', values: unique(options.map(o => o.region)) },
    { key: 'nights', label: 'Duração', values: unique(options.map(o => String(o.nights))), labelFor: v => `${v} noites` },
    { key: 'destination', label: 'Destinos', values: unique(options.flatMap(o => o.ports.slice(1, -1))) },
    { key: 'order', label: 'Ordem das escalas', values: unique(filterSeasonItineraries(options, { ...filters, order: '' }).map(o => o.ports.join(' → '))) },
    { key: 'port', label: 'Porto de embarque', values: unique(options.map(o => o.ports[0])) },
    { key: 'month', label: 'Mês de saída', values: unique(options.flatMap(o => o.months)), labelFor: seasonMonthLabel },
  ];
  const change = (key: keyof ItineraryFilters, value: string) => {
    setFilters(f => ({ ...f, [key]: value, ...(key === 'company' ? { ship: '' } : {}), ...(key !== 'order' ? { order: '' } : {}) })); setLimit(12);
  };
  return <main className="csi csi-catalog">
    <nav aria-label="Você está aqui"><a href={agencySiteHref('/')}>Início</a> / <a href={agencySiteHref('/cruzeiros/temporada-brasileira-2026-2027')}>Temporada brasileira</a> / Roteiros</nav>
    <div className="csi-catalog-intro"><p>Temporada brasileira 2026/2027</p><h1>Encontre o seu roteiro de cruzeiro</h1><p>Explore os itinerários cadastrados da MSC, Costa e Corazul. Escolha o roteiro para conhecer o navio e solicitar seu orçamento.</p></div>
    <section aria-label="Filtros de roteiros" className="csi-filters">{fields.map(field => <label key={field.key}>{field.label}<select value={filters[field.key]} onChange={e => change(field.key, e.target.value)}><option value="">Todos</option>{field.values.map(v => <option key={v} value={v}>{field.labelFor?.(v) ?? v}</option>)}</select></label>)}</section>
    <button type="button" onClick={() => { setFilters(emptyItineraryFilters); setLimit(12); }}>Limpar filtros</button>
    <p role="status" className="mt-4">{results.length} {results.length === 1 ? 'roteiro encontrado' : 'roteiros encontrados'}</p>
    {results.length ? <ul className="csi-results" aria-label="Todos os roteiros">{results.slice(0, limit).map(option => <SeasonItineraryCard key={option.id} option={option} />)}</ul> : <p className="my-8">Nenhum roteiro corresponde aos filtros escolhidos. Tente outras opções ou limpe os filtros.</p>}
    {limit < results.length && <button type="button" onClick={() => setLimit(n => n + 12)}>Mostrar mais roteiros ({results.length - limit})</button>}
    <p className="csi-note mt-8">Cada card reúne saídas do mesmo navio, duração e sequência de portos. Mapas esquemáticos; não representam o trajeto de navegação. Datas, cabines e disponibilidade serão confirmadas pela agência.</p>
  </main>;
}
