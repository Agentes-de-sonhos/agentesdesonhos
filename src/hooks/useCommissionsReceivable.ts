import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";

export interface CommissionReceivable {
  id: string;
  booking_service_id: string;
  user_id: string;
  supplier_id: string | null;
  commission_amount: number;
  expected_date: string | null;
  received_date: string | null;
  status: string;
  payment_rule: string;
  payment_days: number;
  requires_invoice: boolean;
  invoice_status: string | null;
  invoice_number: string | null;
  invoice_issued_date: string | null;
  invoice_sent_date: string | null;
  internal_notes: string | null;
  created_at: string;
  supplier?: { id: string; name: string } | null;
  service?: {
    id: string;
    booking_id: string;
    service_type: string;
    description: string | null;
    sale_price: number;
    cost_price: number;
    non_commissionable_taxes: number;
    commission_type: string;
    commission_value: number;
    du_value: number;
    du_type: string;
    supplier_id: string | null;
    supplier?: { id: string; name: string } | null;
    booking?: {
      id: string;
      trip_name: string;
      client?: { id: string; name: string } | null;
    } | null;
  } | null;
}

export function useCommissionsReceivable() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["commissions-receivable", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("booking_commissions")
        .select(`
          *,
          supplier:clients!booking_commissions_supplier_id_fkey(id, name),
          service:booking_services!booking_commissions_booking_service_id_fkey(
            id, booking_id, service_type, description, sale_price, cost_price,
            non_commissionable_taxes, commission_type, commission_value, du_value, du_type,
            supplier_id,
            supplier:clients!booking_services_supplier_id_fkey(id, name),
            booking:bookings!booking_services_booking_id_fkey(
              id, trip_name,
              client:clients!bookings_client_id_fkey(id, name)
            )
          )
        `)
        .order("expected_date", { ascending: true, nullsFirst: false });
      if (error) throw error;
      return (data || []) as CommissionReceivable[];
    },
    enabled: !!user,
  });
}
