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
  non_commissionable_taxes: number;
  commission_type: string;
  commission_value: number;
  du_value: number;
  du_type: string;
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
  receipt_type: string;
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

export interface BookingDocument {
  id: string;
  booking_id: string;
  user_id: string;
  doc_type: string;
  file_url: string | null;
  created_at: string;
}

export const BOOKING_STATUSES: Record<string, string> = {
  lead: "Lead",
  negociacao: "Negociação",
  confirmado: "Confirmado",
  concluido: "Concluído",
  cancelado: "Cancelado",
};

export const STATUS_COLORS: Record<string, { bg: string; text: string }> = {
  lead: { bg: "bg-muted", text: "text-muted-foreground" },
  negociacao: { bg: "bg-amber-100 dark:bg-amber-900/30", text: "text-amber-700 dark:text-amber-400" },
  confirmado: { bg: "bg-blue-100 dark:bg-blue-900/30", text: "text-blue-700 dark:text-blue-400" },
  concluido: { bg: "bg-emerald-100 dark:bg-emerald-900/30", text: "text-emerald-700 dark:text-emerald-400" },
  cancelado: { bg: "bg-red-100 dark:bg-red-900/30", text: "text-red-700 dark:text-red-400" },
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

export const SERVICE_ICONS: Record<string, string> = {
  hotel: "🏨",
  voo: "✈️",
  seguro: "🛡️",
  passeio: "🎭",
  transfer: "🚗",
  cruzeiro: "🚢",
  locacao: "🚙",
  outro: "📦",
};

export const PAYMENT_METHODS: Record<string, string> = {
  pix: "PIX",
  cartao: "Cartão de Crédito",
  boleto: "Boleto",
  dinheiro: "Dinheiro",
  transferencia: "Transferência",
};

export function useClients() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["clients-list", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("clients")
        .select("id, name")
        .eq("user_id", user!.id)
        .order("name");
      if (error) throw error;
      return data as { id: string; name: string }[];
    },
    enabled: !!user,
    staleTime: 5 * 60 * 1000,
  });
}

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

  // Fetch summary data for list view (payments per booking)
  const paymentsQuery = useQuery({
    queryKey: ["all-booking-payments", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("booking_payments")
        .select("booking_id, amount, status, receipt_type");
      if (error) throw error;
      return data as { booking_id: string; amount: number; status: string; receipt_type: string }[];
    },
    enabled: !!user,
  });

  const commissionsQuery = useQuery({
    queryKey: ["all-booking-commissions-summary", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("booking_commissions")
        .select("booking_service_id, commission_amount, status");
      if (error) throw error;
      return data as { booking_service_id: string; commission_amount: number; status: string }[];
    },
    enabled: !!user,
  });

  const servicesQuery = useQuery({
    queryKey: ["all-booking-services-summary", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("booking_services")
        .select("id, booking_id");
      if (error) throw error;
      return data as { id: string; booking_id: string }[];
    },
    enabled: !!user,
  });

  // Build summary map
  const paymentsByBooking = new Map<string, { paid: number; pending: number }>();
  paymentsQuery.data?.forEach((p) => {
    const entry = paymentsByBooking.get(p.booking_id) || { paid: 0, pending: 0 };
    if (p.status === "pago") entry.paid += Number(p.amount);
    else entry.pending += Number(p.amount);
    paymentsByBooking.set(p.booking_id, entry);
  });

  // Map service IDs to booking IDs
  const serviceToBooking = new Map<string, string>();
  servicesQuery.data?.forEach((s) => serviceToBooking.set(s.id, s.booking_id));

  const commissionsByBooking = new Map<string, { received: number; pending: number }>();
  commissionsQuery.data?.forEach((c) => {
    const bookingId = serviceToBooking.get(c.booking_service_id);
    if (!bookingId) return;
    const entry = commissionsByBooking.get(bookingId) || { received: 0, pending: 0 };
    if (c.status === "recebido") entry.received += Number(c.commission_amount);
    else entry.pending += Number(c.commission_amount);
    commissionsByBooking.set(bookingId, entry);
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
      qc.invalidateQueries({ queryKey: ["booking"] });
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

  return {
    bookings: bookingsQuery.data ?? [],
    isLoading: bookingsQuery.isLoading,
    paymentsByBooking,
    commissionsByBooking,
    createBooking,
    updateBooking,
    deleteBooking,
  };
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

  const documentsQuery = useQuery({
    queryKey: ["booking-documents", bookingId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("booking_documents")
        .select("*")
        .eq("booking_id", bookingId!)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as BookingDocument[];
    },
    enabled: !!bookingId && !!user,
  });

  const addService = useMutation({
    mutationFn: async (values: Omit<BookingService, "id" | "user_id" | "created_at" | "supplier">) => {
      const { error } = await supabase.from("booking_services").insert({ ...values, user_id: user!.id });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["booking-services", bookingId] });
      qc.invalidateQueries({ queryKey: ["booking", bookingId] });
      qc.invalidateQueries({ queryKey: ["bookings"] });
      toast.success("Serviço adicionado");
    },
    onError: () => toast.error("Erro ao adicionar serviço"),
  });

  const updateService = useMutation({
    mutationFn: async ({ id, ...values }: { id: string } & Partial<BookingService>) => {
      const { error } = await supabase.from("booking_services").update(values).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["booking-services", bookingId] });
      qc.invalidateQueries({ queryKey: ["booking", bookingId] });
      qc.invalidateQueries({ queryKey: ["bookings"] });
      toast.success("Serviço atualizado");
    },
    onError: () => toast.error("Erro ao atualizar serviço"),
  });

  const deleteService = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("booking_services").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["booking-services", bookingId] });
      qc.invalidateQueries({ queryKey: ["booking", bookingId] });
      qc.invalidateQueries({ queryKey: ["bookings"] });
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
      qc.invalidateQueries({ queryKey: ["all-booking-payments"] });
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
      qc.invalidateQueries({ queryKey: ["all-booking-payments"] });
      toast.success("Pagamento atualizado");
    },
  });

  const deletePayment = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("booking_payments").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["booking-payments", bookingId] });
      qc.invalidateQueries({ queryKey: ["all-booking-payments"] });
      toast.success("Pagamento removido");
    },
  });

  const addCommission = useMutation({
    mutationFn: async (values: Omit<BookingCommission, "id" | "user_id" | "created_at" | "supplier">) => {
      const { error } = await supabase.from("booking_commissions").insert({ ...values, user_id: user!.id });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["booking-commissions", bookingId] });
      qc.invalidateQueries({ queryKey: ["all-booking-commissions-summary"] });
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
      qc.invalidateQueries({ queryKey: ["all-booking-commissions-summary"] });
      toast.success("Comissão atualizada");
    },
  });

  return {
    booking: bookingQuery.data,
    services: servicesQuery.data ?? [],
    payments: paymentsQuery.data ?? [],
    commissions: commissionsQuery.data ?? [],
    documents: documentsQuery.data ?? [],
    isLoading: bookingQuery.isLoading,
    addService,
    updateService,
    deleteService,
    addPayment,
    updatePayment,
    deletePayment,
    addCommission,
    updateCommission,
  };
}
