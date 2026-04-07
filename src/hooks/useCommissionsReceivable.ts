import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";

export interface CommissionReceivable {
  id: string;
  sale_id: string;
  user_id: string;
  product_type: string;
  description: string | null;
  sale_price: number;
  non_commissionable_taxes: number;
  commission_type: string;
  commission_value: number;
  commission_status: string;
  status: string;
  supplier_name: string | null;
  payment_rule: string;
  payment_days: number;
  expected_date: string | null;
  received_date: string | null;
  requires_invoice: boolean;
  invoice_status: string | null;
  invoice_number: string | null;
  invoice_issued_date: string | null;
  invoice_sent_date: string | null;
  internal_notes: string | null;
  created_at: string;
  client_name: string;
  destination: string;
  sale_date: string;
  commission_amount: number;
}

function calculateCommission(p: { sale_price: number; non_commissionable_taxes: number; commission_type: string; commission_value: number }): number {
  const base = Number(p.sale_price) - (Number(p.non_commissionable_taxes) || 0);
  if (p.commission_type === "percentage") return base * Number(p.commission_value) / 100;
  return Number(p.commission_value);
}

export function useCommissionsReceivable() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["commissions-receivable", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("sale_products")
        .select(`
          *,
          sale:sales!sale_products_sale_id_fkey(client_name, destination, sale_date)
        `)
        .eq("user_id", user!.id)
        .order("expected_date", { ascending: true, nullsFirst: false });
      if (error) throw error;

      return (data || []).map((row: any) => ({
        ...row,
        client_name: row.sale?.client_name || "—",
        destination: row.sale?.destination || "",
        sale_date: row.sale?.sale_date || "",
        commission_amount: calculateCommission(row),
        status: row.commission_status || "previsao_criada",
      })) as CommissionReceivable[];
    },
    enabled: !!user,
  });
}
