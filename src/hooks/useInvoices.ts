import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import type {
  Invoice, InvoiceService, InvoiceInstallment, InvoicePayment,
  InvoiceServiceInput, InvoiceSourceType,
} from "@/types/invoice";
import { computeInvoiceTotals, computeServiceTotals } from "@/types/invoice";

export interface CreateInvoiceInput {
  client_id?: string | null;
  client_name: string;
  client_company?: string | null;
  client_document?: string | null;
  client_email?: string | null;
  client_phone?: string | null;
  destination?: string | null;
  travel_start?: string | null;
  travel_end?: string | null;
  passengers?: Array<{ name?: string; document?: string }>;
  due_date?: string | null;
  issue_date?: string;
  status?: Invoice["status"];
  source_type?: InvoiceSourceType;
  source_id?: string | null;
  notes?: string | null;
  terms?: string | null;
  pix_key?: string | null;
  currency?: string;
  services: InvoiceServiceInput[];
  installments?: Array<{ label?: string; amount: number; due_date?: string | null }>;
}

export function useInvoices() {
  const { user } = useAuth();
  const { toast } = useToast();
  const qc = useQueryClient();

  const { data: invoices = [], isLoading } = useQuery({
    queryKey: ["invoices", user?.id],
    queryFn: async () => {
      if (!user) return [];
      const { data, error } = await supabase
        .from("invoices")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(500);
      if (error) throw error;
      return (data || []) as Invoice[];
    },
    enabled: !!user,
    staleTime: 2 * 60 * 1000,
  });

  const getInvoiceDetail = async (invoiceId: string): Promise<Invoice | null> => {
    const { data: inv, error } = await supabase
      .from("invoices").select("*").eq("id", invoiceId).maybeSingle();
    if (error || !inv) return null;
    const [{ data: services }, { data: installments }, { data: payments }] = await Promise.all([
      supabase.from("invoice_services").select("*").eq("invoice_id", invoiceId).order("order_index"),
      supabase.from("invoice_installments").select("*").eq("invoice_id", invoiceId).order("installment_number"),
      supabase.from("invoice_payments").select("*").eq("invoice_id", invoiceId).order("payment_date"),
    ]);
    return {
      ...(inv as Invoice),
      services: (services || []) as InvoiceService[],
      installments: (installments || []) as InvoiceInstallment[],
      payments: (payments || []) as InvoicePayment[],
    };
  };

  const createInvoice = useMutation({
    mutationFn: async (input: CreateInvoiceInput) => {
      if (!user) throw new Error("Não autenticado");
      const totals = computeInvoiceTotals(input.services);
      const { data: inv, error } = await supabase
        .from("invoices")
        .insert({
          user_id: user.id,
          client_id: input.client_id ?? null,
          client_name: input.client_name,
          client_company: input.client_company ?? null,
          client_document: input.client_document ?? null,
          client_email: input.client_email ?? null,
          client_phone: input.client_phone ?? null,
          destination: input.destination ?? null,
          travel_start: input.travel_start ?? null,
          travel_end: input.travel_end ?? null,
          passengers: input.passengers ?? [],
          issue_date: input.issue_date ?? new Date().toISOString().slice(0, 10),
          due_date: input.due_date ?? null,
          status: input.status ?? "draft",
          source_type: input.source_type ?? "manual",
          source_id: input.source_id ?? null,
          notes: input.notes ?? null,
          terms: input.terms ?? null,
          pix_key: input.pix_key ?? null,
          currency: input.currency ?? "BRL",
          ...totals,
        } as any)
        .select()
        .single();
      if (error) throw error;

      if (input.services.length) {
        const svcRows = input.services.map((s, i) => {
          const t = computeServiceTotals(s);
          return {
            invoice_id: inv.id,
            user_id: user.id,
            order_index: i,
            category: s.category,
            description: s.description ?? null,
            fare: s.fare || 0,
            taxes: s.taxes || 0,
            discount: s.discount || 0,
            commission: s.commission || 0,
            rav: s.rav || 0,
            net_amount: t.net_amount,
            final_amount: t.final_amount,
          };
        });
        const { error: sErr } = await supabase.from("invoice_services").insert(svcRows as any);
        if (sErr) throw sErr;
      }

      if (input.installments && input.installments.length) {
        const insRows = input.installments.map((p, i) => ({
          invoice_id: inv.id,
          user_id: user.id,
          installment_number: i + 1,
          label: p.label ?? (i === 0 && input.installments!.length > 1 ? "Entrada" : `${i + 1}ª parcela`),
          amount: p.amount,
          due_date: p.due_date ?? null,
        }));
        const { error: iErr } = await supabase.from("invoice_installments").insert(insRows as any);
        if (iErr) throw iErr;
      } else {
        // single installment by default
        await supabase.from("invoice_installments").insert({
          invoice_id: inv.id,
          user_id: user.id,
          installment_number: 1,
          label: "Pagamento único",
          amount: totals.total_amount,
          due_date: input.due_date ?? null,
        } as any);
      }

      return inv as Invoice;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["invoices"] });
      toast({ title: "Fatura criada com sucesso" });
    },
    onError: (e: any) => toast({
      title: "Erro ao criar fatura", description: e.message, variant: "destructive",
    }),
  });

  const updateInvoiceStatus = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: Invoice["status"] }) => {
      const { error } = await supabase.from("invoices").update({ status } as any).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["invoices"] }),
  });

  const deleteInvoice = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("invoices").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["invoices"] });
      toast({ title: "Fatura excluída" });
    },
  });

  const addPayment = useMutation({
    mutationFn: async (p: {
      invoice_id: string;
      installment_id?: string | null;
      amount: number;
      payment_date?: string;
      method?: string;
      notes?: string;
    }) => {
      if (!user) throw new Error("Não autenticado");
      const { data, error } = await supabase
        .from("invoice_payments")
        .insert({
          invoice_id: p.invoice_id,
          installment_id: p.installment_id ?? null,
          user_id: user.id,
          amount: p.amount,
          payment_date: p.payment_date ?? new Date().toISOString().slice(0, 10),
          method: p.method ?? "pix",
          notes: p.notes ?? null,
          receipt_number: "", // trigger fills
        } as any)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["invoices"] });
      toast({ title: "Pagamento registrado" });
    },
    onError: (e: any) => toast({
      title: "Erro ao registrar pagamento", description: e.message, variant: "destructive",
    }),
  });

  return {
    invoices,
    isLoading,
    getInvoiceDetail,
    createInvoice,
    updateInvoiceStatus,
    deleteInvoice,
    addPayment,
  };
}