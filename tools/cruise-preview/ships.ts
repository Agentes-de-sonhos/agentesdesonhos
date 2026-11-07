import ships from '../../src/lib/cruiseShips/data/brazil-2026-27.ships.json';
export const CRUISE_SHIPS = ships.map(s => ({...s,routes:{...s.routes,geography:'/preview/navios/maps/cruise-south-america.geojson'}}));
