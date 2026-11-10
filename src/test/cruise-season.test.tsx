import { describe,it,expect,vi,beforeAll } from 'vitest';
import { render,screen,fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { recommendSeason, SEASON_SHIPS, availableSailings } from '@/lib/cruiseShips/season';
import CruiseSeasonPage from '@/pages/whitelabel/CruiseSeasonPage';
import type { AgencyDomainInfo } from '@/lib/agencyDomains';
const submit=vi.fn().mockResolvedValue({success:true});
vi.mock('@/hooks/useAgencySiteRequest',()=>({useAgencySiteRequest:()=>({submit,state:'idle',error:null,reset:vi.fn()})}));
beforeAll(()=>{window.scrollTo=vi.fn();Element.prototype.scrollIntoView=vi.fn();});
const base={month:'',port:'',duration:'',interests:[]};
describe('Brazil season assistant',()=>{
 it('contains exactly the eight Brazilian ships',()=>expect(SEASON_SHIPS).toHaveLength(8));
 it('only offers future, non-conflicting departures',()=>{for(const s of SEASON_SHIPS)for(const v of availableSailings(s,'2026-11-10')){expect(v.date>='2026-11-10').toBe(true);expect(v.status).not.toBe('conflict');}});
 it('never relaxes hard constraints because of preferences',()=>{const p={month:'2027-01',port:'Santos',duration:'week',interests:['Diversão']};const rs=recommendSeason(p,'2026-11-10');expect(rs.length).toBeGreaterThan(0);for(const r of rs)for(const s of r.sailings){expect(s.date.startsWith(p.month)).toBe(true);expect(s.ports[0]).toBe(p.port);expect(s.n>=6&&s.n<=7).toBe(true);}});
 it('returns no match for impossible filters, rather than suggesting an incompatible ship',()=>expect(recommendSeason({...base,port:'Porto inexistente'},'2026-11-10')).toEqual([]));
 it('does not suggest expired seasons',()=>expect(recommendSeason(base,'2027-05-01')).toEqual([]));
 it('collects ages before results and submits context to the shared agency flow',async()=>{
 render(<MemoryRouter><CruiseSeasonPage info={{hostname:'agency.example',agency_name:'Agência'} as AgencyDomainInfo}/></MemoryRouter>);
 expect(screen.getAllByRole('article')).toHaveLength(8);
 for(let i=0;i<3;i++)fireEvent.click(screen.getByRole('button',{name:'Continuar →'}));
 fireEvent.change(screen.getByLabelText('Crianças'),{target:{value:'1'}});expect(screen.getByRole('button',{name:'Continuar →'})).toBeDisabled();
 fireEvent.change(screen.getByLabelText('Idade da criança 1 na viagem'),{target:{value:'7'}});fireEvent.click(screen.getByRole('button',{name:'Continuar →'}));
 fireEvent.click(screen.getByRole('button',{name:'Gastronomia'}));fireEvent.click(screen.getByRole('button',{name:'Ver sugestões →'}));
 fireEvent.click(screen.getAllByRole('button',{name:'Solicitar esta opção'})[0]);fireEvent.change(screen.getByLabelText('Nome completo'),{target:{value:'Pessoa Teste'}});fireEvent.change(screen.getByLabelText('WhatsApp com DDD'),{target:{value:'11999999999'}});fireEvent.click(screen.getByRole('checkbox'));fireEvent.submit(screen.getByRole('form'));
 expect(submit).toHaveBeenCalledWith(expect.objectContaining({service_key:'cruzeiros',consent:true,details:expect.objectContaining({criancas:1,idades_criancas:'7',preferencias:'Gastronomia'})}));
 });
});
