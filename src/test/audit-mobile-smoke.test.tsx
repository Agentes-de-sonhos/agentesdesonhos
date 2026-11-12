import { afterEach, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter, useLocation } from 'react-router-dom';
import { MobileTopBar, OPEN_COMMUNITY_CHAT_EVENT } from '@/components/layout/MobileTopBar';
vi.mock('@/hooks/useAuth', () => ({ useAuth: () => ({user:{id:'synthetic-user'}}) }));
vi.mock('@/integrations/supabase/client', () => ({supabase:{from:()=>({select:()=>({eq:()=>({maybeSingle:async()=>({data:{name:'Pessoa Sintética',avatar_url:null}})})})})}}));
vi.mock('@/components/community/CommunitySearchOverlay', () => ({ CommunitySearchOverlay: ({open,onOpenChange}:{open: boolean; onOpenChange: (open: boolean) => void}) => open ? <button onClick={()=>onOpenChange(false)}>Fechar pesquisa sintética</button> : null }));
afterEach(cleanup);
function Location(){return <output data-testid="route">{useLocation().pathname}</output>;}
function mount(embedded=false){render(<QueryClientProvider client={new QueryClient()}><MemoryRouter><MobileTopBar embedded={embedded}/><Location/></MemoryRouter></QueryClientProvider>);}
it('mobile avatar navigates to personal profile',()=>{mount();fireEvent.click(screen.getByLabelText('Abrir meu perfil'));expect(screen.getByTestId('route')).toHaveTextContent('/perfil');});
it.each([false,true])('mobile search opens/closes/reopens and chat emits once (embedded=%s)',(embedded)=>{mount(embedded); const listener=vi.fn();window.addEventListener(OPEN_COMMUNITY_CHAT_EVENT,listener);try{
 fireEvent.click(screen.getByLabelText('Pesquisar na comunidade'));fireEvent.click(screen.getByText('Fechar pesquisa sintética'));expect(screen.queryByText('Fechar pesquisa sintética')).toBeNull();fireEvent.click(screen.getByLabelText('Pesquisar na comunidade'));expect(screen.getByText('Fechar pesquisa sintética')).toBeInTheDocument();fireEvent.click(screen.getByLabelText('Abrir chat'));expect(listener).toHaveBeenCalledTimes(1);
}finally{window.removeEventListener(OPEN_COMMUNITY_CHAT_EVENT,listener);}});
