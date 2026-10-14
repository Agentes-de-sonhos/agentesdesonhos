import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

const base = {
  sale_id: "s", user_id: "u", product_type: "hotel", description: null, sale_price: 1000,
  non_commissionable_taxes: 0, commission_type: "percentage", commission_value: 0,
  commission_status: "pendente", status: "pendente", supplier_name: null, payment_rule: "x",
  payment_days: 0, requires_invoice: false, invoice_status: null, invoice_number: null,
  invoice_issued_date: null, invoice_sent_date: null, internal_notes: null,
  created_at: "2026-10-01", destination: "Orlando", commission_amount: 0, received_amount: 0,
};
const rows = [
  { ...base, id: "zero", client_name: "Cliente Zero Sem Data", expected_date: null, received_date: null, sale_date: "2026-10-13" },
  { ...base, id: "fut", client_name: "Cliente Futuro", commission_value: 10, commission_amount: 100, expected_date: "2027-01-15", received_date: null, sale_date: "2026-10-14" },
];

vi.mock("@/hooks/useCommissionsReceivable", () => ({
  useCommissionsReceivable: () => ({ data: rows, isLoading: false }),
}));
vi.mock("@/hooks/useFinancialExport", () => ({
  useFinancialExport: () => ({ showExport: false, setShowExport: () => {}, agencyName: "" }),
}));
vi.mock("@/integrations/supabase/client", () => ({
  supabase: { from: () => { throw new Error("banco não deve ser acessado"); } },
}));

import { CommissionsReceivable } from "@/components/financial/CommissionsReceivable";

describe("CommissionsReceivable usa commissionInMonth", () => {
  it("out/2026: mostra comissão zero sem datas e oculta a futura", () => {
    render(
      <QueryClientProvider client={new QueryClient()}>
        <CommissionsReceivable viewMonth={10} viewYear={2026} />
      </QueryClientProvider>,
    );
    expect(screen.getAllByText(/Cliente Zero Sem Data/).length).toBeGreaterThan(0);
    expect(screen.queryByText(/Cliente Futuro/)).toBeNull();
    expect(screen.getByText("1 comissão(ões)")).toBeTruthy();
  });
});
