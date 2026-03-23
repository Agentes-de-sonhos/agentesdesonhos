import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";
import { toast } from "sonner";

export interface Booking {
  id: string;
  user_id: string;
  client_id: string | null;
  trip_name: string;
  start_date: string | null;
  end_date: string | null;
  status: string;
  total_amount: number;
  notes: string | null;
  created_at: string;
  updated_at: string;
  client?: { id: string; name: string } | null;
}

export interface BookingService {
  id: string;
  booking_id: string;
  user_id: string;
  service_type: string;
  supplier_id: string | null;
  description: string | null;
  sale_price: number;
  cost_price: number;
  expected_commission: number;
  expected_commission_date: string | null;
  status: string;
  created_at: string;
  supplier?: { id: string; name: string } | null;
}

export interface BookingPayment {
  id: string;
  booking_id: string;
  user_id: string;
  payment_method: string;
  amount: number;
  installment_number: number | null;
  total_installments: number | null;
  due_date: string | null;
  payment_date: string | null;
  status: string;
  created_at: string;
}

export interface BookingCommission {
  id: string;
  booking_service_id: string;
  user_id: string;
  supplier_id: string | null;
  commission_amount: number;
  expected_date: string | null;
  received_date: string | null;
  status: string;
  created_at: string;
  supplier?: { id: string; name: string } | null;
}

export const BOOKING_STATUSES: Record<string, string> = {
  lead: "Lead",
  negociacao: "Negociação",
  confirmado: "Confirmado",
  concluido: "Concluído",
  cancelado: "Cancelado",
};

export const SERVICE_TYPES: Record<string, string> = {
  hotel: "Hotel",
  voo: "Voo",
  seguro: "Seguro",
  passeio: "Passeio",
  transfer: "Transfer",
  cruzeiro: "Cruzeiro",
  locacao: "Locação de Veículo",
  outro: "Outro",
};

export const PAYMENT_METHODS: Record<string, string> = {
  pix: "PIX",
  cartao: "Cartão de Crédito",
  boleto: "Boleto",
  dinheiro: "Dinheiro",
  transferencia: "Transferência",
};

export function useBookings() {
  const { user } = useAuth();
  const qc = useQueryClient();

  const bookingsQuery = useQuery({
    queryKey: ["bookings", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("bookings")
        .select("*, client:clients!bookings_client_id_fkey(id, name)")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as Booking[];
    },
    enabled: !!user,
  });

  const createBooking = useMutation({
    mutationFn: async (values: {
      client_id?: string;
      trip_name: string;
      start_date?: string;
      end_date?: string;
      status?: string;
      notes?: string;
    }) => {
      const { data, error } = await supabase
        .from("bookings")
        .insert({ ...values, user_id: user!.id })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["bookings"] });
      toast.success("Venda criada com sucesso");
    },
    onError: () => toast.error("Erro ao criar venda"),
  });

  const updateBooking = useMutation({
    mutationFn: async ({ id, ...values }: { id: string } & Partial<Booking>) => {
      const { error } = await supabase.from("bookings").update(values).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["bookings"] });
      toast.success("Venda atualizada");
    },
    onError: () => toast.error("Erro ao atualizar venda"),
  });

  const deleteBooking = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("bookings").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["bookings"] });
      toast.success("Venda removida");
    },
    onError: () => toast.error("Erro ao remover venda"),
  });

  return { bookings: bookingsQuery.data ?? [], isLoading: bookingsQuery.isLoading, createBooking, updateBooking, deleteBooking };
}

export function useBookingDetail(bookingId: string | undefined) {
  const { user } = useAuth();
  const qc = useQueryClient();

  const bookingQuery = useQuery({
    queryKey: ["booking", bookingId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("bookings")
        .select("*, client:clients!bookings_client_id_fkey(id, name)")
        .eq("id", bookingId!)
        .single();
      if (error) throw error;
      return data as Booking;
    },
    enabled: !!bookingId && !!user,
  });

  const servicesQuery = useQuery({
    queryKey: ["booking-services", bookingId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("booking_services")
        .select("*, supplier:clients!booking_services_supplier_id_fkey(id, name)")
        .eq("booking_id", bookingId!)
        .order("created_at");
      if (error) throw error;
      return data as BookingService[];
    },
    enabled: !!bookingId && !!user,
  });

  const paymentsQuery = useQuery({
    queryKey: ["booking-payments", bookingId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("booking_payments")
        .select("*")
        .eq("booking_id", bookingId!)
        .order("due_date");
      if (error) throw error;
      return data as BookingPayment[];
    },
    enabled: !!bookingId && !!user,
  });

  const commissionsQuery = useQuery({
    queryKey: ["booking-commissions", bookingId],
    queryFn: async () => {
      const serviceIds = servicesQuery.data?.map((s) => s.id) ?? [];
      if (serviceIds.length === 0) return [];
      const { data, error } = await supabase
        .from("booking_commissions")
        .select("*, supplier:clients!booking_commissions_supplier_id_fkey(id, name)")
        .in("booking_service_id", serviceIds)
        .order("expected_date");
      if (error) throw error;
      return data as BookingCommission[];
    },
    enabled: !!bookingId && !!user && !!servicesQuery.data,
  });

  // Mutations
  const addService = useMutation({
    mutationFn: async (values: Omit<BookingService, "id" | "user_id" | "created_at" | "supplier">) => {
      const { error } = await supabase.from("booking_services").insert({ ...values, user_id: user!.id });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["booking-services", bookingId] });
      qc.invalidateQueries({ queryKey: ["booking", bookingId] });
      toast.success("Serviço adicionado");
    },
    onError: () => toast.error("Erro ao adicionar serviço"),
  });

  const deleteService = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("booking_services").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["booking-services", bookingId] });
      qc.invalidateQueries({ queryKey: ["booking", bookingId] });
      toast.success("Serviço removido");
    },
  });

  const addPayment = useMutation({
    mutationFn: async (values: Omit<BookingPayment, "id" | "user_id" | "created_at">) => {
      const { error } = await supabase.from("booking_payments").insert({ ...values, user_id: user!.id });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["booking-payments", bookingId] });
      toast.success("Pagamento registrado");
    },
    onError: () => toast.error("Erro ao registrar pagamento"),
  });

  const updatePayment = useMutation({
    mutationFn: async ({ id, ...values }: { id: string } & Partial<BookingPayment>) => {
      const { error } = await supabase.from("booking_payments").update(values).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["booking-payments", bookingId] });
      toast.success("Pagamento atualizado");
    },
  });

  const addCommission = useMutation({
    mutationFn: async (values: Omit<BookingCommission, "id" | "user_id" | "created_at" | "supplier">) => {
      const { error } = await supabase.from("booking_commissions").insert({ ...values, user_id: user!.id });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["booking-commissions", bookingId] });
      toast.success("Comissão registrada");
    },
    onError: () => toast.error("Erro ao registrar comissão"),
  });

  const updateCommission = useMutation({
    mutationFn: async ({ id, ...values }: { id: string } & Partial<BookingCommission>) => {
      const { error } = await supabase.from("booking_commissions").update(values).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["booking-commissions", bookingId] });
      toast.success("Comissão atualizada");
    },
  });

  return {
    booking: bookingQuery.data,
    services: servicesQuery.data ?? [],
    payments: paymentsQuery.data ?? [],
    commissions: commissionsQuery.data ?? [],
    isLoading: bookingQuery.isLoading,
    addService,
    deleteService,
    addPayment,
    updatePayment,
    addCommission,
    updateCommission,
  };
}
