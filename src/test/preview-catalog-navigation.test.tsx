import { HelmetProvider } from "react-helmet-async";
import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, cleanup, fireEvent } from '@testing-library/react';
import { MemoryRouter, Routes, Route, useParams } from 'react-router-dom';
import { agencyContextHref, agencySiteHref } from '@/lib/agencyContextLink';
import { resolveAdsPreviewFixture } from '@/lib/adsBriefingPreview';
import * as fixtures from '@/lib/adsBriefingPreview';
import AdsBriefingPreview from '@/pages/adsPreview/AdsBriefingPreview';
vi.mock('@/components/whitelabel/AgencySiteLayout', () => ({ AgencySiteLayout: ({children}:any) => children }));
vi.mock('@/hooks/useAgencyFavicon', () => ({useAgencyFavicon:()=>{}}));
vi.mock('@/pages/whitelabel/CruiseShipRoutePage', () => ({default:()=> {const p=useParams();return <p>{p.line}/{p.ship}</p>}}));
vi.mock('@/pages/whitelabel/AgencySiteHome', () => ({default:()=> <p>Home</p>}));
vi.stubGlobal('scrollTo', vi.fn());
afterEach(()=>{cleanup();delete document.body.dataset.selected});
function open(path:string){
 Object.defineProperty(window,'location',{value:{...window.location,hostname:'localhost',pathname:'/ads-briefing-preview/briefing-23-v1',search:''},writable:true});
 render(<HelmetProvider><MemoryRouter initialEntries={['/ads-briefing-preview/briefing-23-v1/'+path]}><Routes><Route path='/ads-briefing-preview/:jobId/*' element={<AdsBriefingPreview/>}/></Routes></MemoryRouter></HelmetProvider>);
}
describe('complete preview catalog',()=>{
 it.each(Object.entries(fixtures).filter(([key,value])=>key.endsWith('_JOB_ID') && typeof value === 'string').map(([,value])=>value as string))('enables shared pages for %s',id=>{
  expect(resolveAdsPreviewFixture(id)?.pages).toMatchObject({resorts:expect.any(Object),orlandoTickets:true,editorial:true});
 });
 it('retains the preview prefix, query and anchor for both kinds of link',()=>{
  open('');
  const p='/cruzeiros/temporada-brasileira-2026-2027?mes=11#cs-contact';
  expect(agencyContextHref(p)).toBe('/ads-briefing-preview/briefing-23-v1'+p);
  expect(agencySiteHref(p)).toBe(agencyContextHref(p));
 });
 it('opens the season and allows local filter buttons',async()=>{
  open('cruzeiros/temporada-brasileira-2026-2027');
  expect(await screen.findByText('Qual cruzeiro combina com você?')).toBeInTheDocument();
  expect(screen.getAllByRole('link', {name:/Conheça .* e seus roteiros/})).toHaveLength(8);
  fireEvent.click(screen.getByRole('button',{name:/Continuar/}));
  expect(await screen.findByText('De onde gostaria de embarcar?')).toBeInTheDocument();
 });
 it('keeps external actions and submits blocked',async()=>{
  open('cruzeiros/temporada-brasileira-2026-2027');
  await screen.findByText('Qual cruzeiro combina com você?');
  const form=document.createElement('form'); document.body.append(form);
  expect(form.dispatchEvent(new Event('submit',{bubbles:true,cancelable:true}))).toBe(false);
  const link=document.createElement('a');link.href='https://wa.me/5511999999999';document.body.append(link);
  expect(link.dispatchEvent(new MouseEvent('click',{bubbles:true,cancelable:true}))).toBe(false);
  expect(window.open('https://example.com')).toBeNull();
  form.remove();link.remove();
 });
 it('passes the ship route parameters to the shared page',async()=>{
  open('cruzeiros/msc/msc-seaview');
  expect(await screen.findByText('msc/msc-seaview')).toBeInTheDocument();
 });
});
