import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { TravelFileService } from "@/types/travelFile";
import { ServiceFinancialRuleDialog } from "@/components/reservas/ServiceFinancialRuleDialog";

const saveSupplier = vi.hoisted(() => vi.fn().mockResolvedValue(undefined));
vi.mock("@/hooks/useUnifiedWorkflow", () => ({
  useServiceSupplier: () => ({ mutateAsync: saveSupplier, isPending: false }),
}));
vi.mock("@/integrations/supabase/client", () => ({
  supabase: { from: () => ({ select: () => ({ order: async () => ({ data: [], error: null }) }) }) },
}));
afterEach(() => { cleanup(); saveSupplier.mockClear(); });

const service = {
  id: "svc-1", file_id: "file-1", service_type: "hotel", product_name: "Hotel",
  supplier_name: null, operator_id: null, city: null, destination: null, country: null,
  start_date: null, end_date: null, quantity: 1, passengers_count: null,
  currency: "BRL", requested_amount: 1500, reconfirmed_amount: null,
  sold_amount: null, cost_amount: null, commission_amount: null,
  responsible_team_member_id: null, is_required: false, status: "booked",
  snapshot: { supplier_name: "Operadora do orçamento" }, created_at: "2026-01-01T00:00:00Z",
  commission_type: "fixed", commission_fixed: 500, financial_rule_status: "confirmed",
} satisfies TravelFileService;

describe("edição do fornecedor após a venda", () => {
  it("prefill do orçamento salva apenas fornecedor sem alterar snapshot financeiro", async () => {
    const close = vi.fn();
    render(<QueryClientProvider client={new QueryClient()}>
      <ServiceFinancialRuleDialog open onOpenChange={close} fileId="file-1" service={service} />
    </QueryClientProvider>);
    expect(screen.getByLabelText("Nome do fornecedor")).toHaveValue("Operadora do orçamento");
    fireEvent.click(screen.getByRole("button", { name: "Salvar fornecedor" }));
    await waitFor(() => expect(saveSupplier).toHaveBeenCalledWith({
      serviceId: "svc-1", operatorId: null, supplierName: "Operadora do orçamento",
    }));
    expect(close).toHaveBeenCalledWith(false);
  });
});
