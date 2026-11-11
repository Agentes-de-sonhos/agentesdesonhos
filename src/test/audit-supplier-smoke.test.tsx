import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { TravelFileService } from '@/types/travelFile';
import { ServiceFinancialRuleDialog } from '@/components/reservas/ServiceFinancialRuleDialog';
const mocks = vi.hoisted(() => ({ rpc: vi.fn(), error: vi.fn(), success: vi.fn() }));
vi.mock('sonner', () => ({ toast: { error: mocks.error, success: mocks.success } }));
vi.mock('@/integrations/supabase/client', () => ({ supabase: { rpc: mocks.rpc, from: () => ({ select: () => ({ order: async () => ({ data: [], error: null }) }) }) } }));
const service = {
 id: 'synthetic-service', file_id: 'synthetic-file', service_type: 'hotel',
 product_name: 'Hotel sintético', operator_id: null, supplier_name: 'Original',
 city: null, destination: null, country: null, start_date: null, end_date: null,
 quantity: 1, passengers_count: 1, currency: 'BRL', requested_amount: 100,
 reconfirmed_amount: 100, sold_amount: 100, cost_amount: 88, commission_amount: 12,
 responsible_team_member_id: null, is_required: false, status: 'booked',
 snapshot: { supplier_name: 'Snapshot' }, created_at: '2026-11-11T00:00:00Z',
 financial_rule_status: 'confirmed',
} satisfies TravelFileService;
// The dialog consumes a service, not its parent file's conversion status.
// Server-side authorization after file conversion is covered by the SQL smoke.
type RpcResult = { error: null | { message: string } };

function mount() {
 const close = vi.fn(); const client = new QueryClient({defaultOptions:{queries:{retry:false},mutations:{retry:false}}});
 const tree = (open: boolean) => <QueryClientProvider client={client}><ServiceFinancialRuleDialog open={open} onOpenChange={close} fileId="synthetic-file" service={service}/></QueryClientProvider>;
 const view = render(tree(true)); return {close, client, view, tree};
}
beforeEach(() => { vi.clearAllMocks(); mocks.rpc.mockResolvedValue({error:null}); });
afterEach(cleanup);
it('saves booked supplier through real hook with identity-only RPC payload', async () => {
 const {close} = mount(); fireEvent.change(screen.getByLabelText('Nome do fornecedor'), {target:{value:'  Nova operadora  '}});
 fireEvent.click(screen.getByText('Salvar fornecedor'));
 await waitFor(() => expect(close).toHaveBeenCalledWith(false));
 expect(mocks.rpc).toHaveBeenCalledExactlyOnceWith('travel_file_service_set_supplier', {_service_id:'synthetic-service',_operator_id:null,_supplier_name:'Nova operadora'});
 expect(service.commission_amount).toBe(12); expect(service.cost_amount).toBe(88);
});
it.each(['FORBIDDEN: Sem permissão', 'NETWORK: Falha temporária'])('keeps dialog and edits after %s, permits retry', async (message) => {
 mocks.rpc.mockResolvedValueOnce({error:{message}}); const {close} = mount();
 fireEvent.change(screen.getByLabelText('Nome do fornecedor'), {target:{value:'Fornecedor corrigido'}});
 fireEvent.click(screen.getByText('Salvar fornecedor'));
 await waitFor(() => expect(mocks.error).toHaveBeenCalledWith(message.split(': ')[1]));
 expect(close).not.toHaveBeenCalled(); expect(mocks.success).not.toHaveBeenCalled(); expect(screen.getByLabelText('Nome do fornecedor')).toHaveValue('Fornecedor corrigido');
 fireEvent.click(screen.getByText('Salvar fornecedor')); await waitFor(() => expect(close).toHaveBeenCalledWith(false)); expect(mocks.rpc).toHaveBeenCalledTimes(2);
});
it('cancel does not save and reopening discards uncommitted edits', () => {
 const {close,view,tree} = mount(); fireEvent.change(screen.getByLabelText('Nome do fornecedor'), {target:{value:'Não salvar'}});
 fireEvent.click(screen.getByText('Cancelar')); expect(close).toHaveBeenCalledWith(false); expect(mocks.rpc).not.toHaveBeenCalled();
 view.rerender(tree(false)); view.rerender(tree(true)); expect(screen.getByLabelText('Nome do fornecedor')).toHaveValue('Original');
});
it('pending mutation disables repeated submit and cancellation', async () => {
 let finish: ((value: RpcResult) => void) | undefined; mocks.rpc.mockImplementation(() => new Promise<RpcResult>(resolve => {finish=resolve;})); const {close} = mount();
 fireEvent.click(screen.getByText('Salvar fornecedor')); await waitFor(() => expect(screen.getByText('Salvar fornecedor')).toBeDisabled());
 fireEvent.click(screen.getByText('Salvar fornecedor')); expect(screen.getByText('Cancelar')).toBeDisabled(); expect(mocks.rpc).toHaveBeenCalledTimes(1);
 finish?.({error:null}); await waitFor(() => expect(close).toHaveBeenCalledWith(false));
});
