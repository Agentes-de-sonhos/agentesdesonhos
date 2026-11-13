import { CRUISE_SHIPS } from './index';
import type { CruiseShipContent, CruiseSailing } from './types';
export const CRUISE_FINDER_PATH = '/cruzeiros/encontre-seu-cruzeiro';
export const SEASON_PATH = '/cruzeiros/temporada-brasileira-2026-2027';
export const SEASON_SHIPS = CRUISE_SHIPS.filter(s => s.routes.feed.sailings.some(v => v.date >= '2026-11-01' && v.date <= '2027-04-30') && s.lineSlug !== 'royal-caribbean');
export type SeasonPreferences = { month: string; port: string; duration: string; interests: string[] };
export const INTERESTS = ['Descanso', 'Diversão', 'Gastronomia', 'Atividades infantis', 'Destinos'];
// Editorial associations based on the documented spaces in each ship page, not quality ratings.
const features: Record<string, string[]> = {
 'msc-virtuosa': ['Diversão', 'Atividades infantis', 'Gastronomia'],
 'msc-divina': ['Descanso', 'Gastronomia', 'Diversão'],
 'msc-musica': ['Descanso', 'Gastronomia', 'Diversão'],
 'msc-splendida': ['Atividades infantis', 'Diversão', 'Gastronomia'],
 'msc-seaview': ['Descanso', 'Atividades infantis', 'Diversão'],
 'costa-diadema': ['Diversão', 'Atividades infantis', 'Descanso'],
 'costa-serena': ['Gastronomia', 'Diversão', 'Descanso'],
 buenavista: ['Descanso', 'Atividades infantis', 'Gastronomia'],
};
export function brazilToday() { return new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Sao_Paulo', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date()); }
export function availableSailings(ship: CruiseShipContent, today = brazilToday()) {
 return ship.routes.feed.sailings.filter(s => s.status !== 'conflict' && s.date >= today && s.date >= '2026-11-01' && s.date <= '2027-04-30');
}
export function matchesSeason(s: CruiseSailing, p: SeasonPreferences) {
 return (!p.month || s.date.startsWith(p.month)) && (!p.port || s.ports[0] === p.port) && (!p.duration || (p.duration === 'short' ? s.n <= 5 : p.duration === 'week' ? s.n >= 6 && s.n <= 7 : s.n >= 8));
}
export function recommendSeason(p: SeasonPreferences, today = brazilToday(), ships = SEASON_SHIPS) {
 return ships.map(ship => {
  const sailings = availableSailings(ship, today).filter(s => matchesSeason(s,p)).sort((a,b) => a.date.localeCompare(b.date));
  const interests = p.interests.filter(i => features[ship.shipSlug]?.includes(i));
  return { ship, sailings, interests, score: interests.length };
 }).filter(r => r.sailings.length).sort((a,b) => b.score-a.score).slice(0,3);
}
