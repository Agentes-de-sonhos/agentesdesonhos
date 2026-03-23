import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { awardGamificationPoints, POINTS_CONFIG } from "@/lib/gamification";
import type { Quote, QuoteService, QuoteFormData, ServiceType, ServiceData } from "@/types/quote";

export function useQuotes() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: quotes = [], isLoading } = useQuery({
    queryKey: ["quotes", user?.id],
    queryFn: async () => {
      if (!user) return [];
      const { data, error } = await supabase
        .from("quotes")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(500);
      if (error) throw error;
      return data as Quote[];
    },
    enabled: !!user,
    staleTime: 2 * 60 * 1000,
  });

  const createQuoteMutation = useMutation({
    mutationFn: async (formData: QuoteFormData) => {
      if (!user) throw new Error("User not authenticated");
      const { data, error } = await supabase
        .from("quotes")
        .insert({
          user_id: user.id,
          client_name: formData.client_name,
          client_id: formData.client_id || null,
          adults_count: formData.adults_count,
          children_count: formData.children_count,
          destination: formData.destination,
          start_date: formData.start_date,
          end_date: formData.end_date,
          status: "draft",
        } as any)
        .select()
        .single();
      if (error) throw error;
      return data as Quote;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["quotes"] });
      toast({ title: "Orçamento criado", description: "O orçamento foi criado com sucesso." });
      if (user) awardGamificationPoints(user.id, POINTS_CONFIG.create_quote, "create_quote", data.id);
    },
    onError: (error) => {
      toast({ title: "Erro ao criar orçamento", description: error.message, variant: "destructive" });
    },
  });

  const updateQuoteMutation = useMutation({
    mutationFn: async ({ id, ...data }: Partial<Quote> & { id: string }) => {
      const { error } = await supabase.from("quotes").update(data as any).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["quotes"] });
    },
  });

  const deleteQuoteMutation = useMutation({
    mutationFn: async (id: string) => {
      // Delete services first, then the quote
      await supabase.from("quote_services").delete().eq("quote_id", id);
      const { error } = await supabase.from("quotes").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["quotes"] });
      toast({ title: "Orçamento excluído", description: "O orçamento foi excluído com sucesso." });
    },
    onError: (error) => {
      toast({ title: "Erro ao excluir orçamento", description: error.message, variant: "destructive" });
    },
  });

  const duplicateQuoteMutation = useMutation({
    mutationFn: async (sourceId: string) => {
      if (!user) throw new Error("User not authenticated");
      // Fetch source quote
      const { data: source, error: srcErr } = await supabase
        .from("quotes").select("*").eq("id", sourceId).single();
      if (srcErr || !source) throw srcErr || new Error("Quote not found");

      // Create new quote
      const { data: newQuote, error: newErr } = await supabase
        .from("quotes")
        .insert({
          user_id: user.id,
          client_name: `${source.client_name} (cópia)`,
          adults_count: source.adults_count,
          children_count: source.children_count,
          destination: source.destination,
          start_date: source.start_date,
          end_date: source.end_date,
          total_amount: source.total_amount,
          status: "draft",
          show_detailed_prices: (source as any).show_detailed_prices,
          payment_terms: (source as any).payment_terms,
          valid_until: (source as any).valid_until,
          validity_disclaimer: (source as any).validity_disclaimer,
          use_service_payment: (source as any).use_service_payment ?? false,
        } as any)
        .select()
        .single();
      if (newErr || !newQuote) throw newErr || new Error("Failed to create quote");

      // Copy services
      const { data: services } = await supabase
        .from("quote_services").select("*").eq("quote_id", sourceId).order("order_index");
      if (services && services.length > 0) {
        const newServices = services.map((s: any) => ({
          quote_id: newQuote.id,
          service_type: s.service_type,
          service_data: s.service_data,
          amount: s.amount,
          order_index: s.order_index,
          option_label: s.option_label,
          description: s.description,
          image_url: s.image_url,
          image_urls: s.image_urls || [],
          is_custom_payment: s.is_custom_payment ?? false,
          payment_type: s.payment_type ?? null,
          installments: s.installments ?? null,
          entry_value: s.entry_value ?? null,
          discount_type: s.discount_type ?? null,
          discount_value: s.discount_value ?? null,
          payment_method: s.payment_method ?? null,
        }));
        await supabase.from("quote_services").insert(newServices as any);
      }

      return newQuote as Quote;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["quotes"] });
      toast({ title: "Orçamento duplicado", description: "Uma cópia do orçamento foi criada." });
    },
    onError: (error) => {
      toast({ title: "Erro ao duplicar", description: error.message, variant: "destructive" });
    },
  });

  const publishQuoteMutation = useMutation({
    mutationFn: async (id: string) => {
      const array = new Uint8Array(16);
      crypto.getRandomValues(array);
      const shareToken = Array.from(array).map(b => b.toString(16).padStart(2, '0')).join('');
      const { error } = await supabase.from("quotes").update({ status: "published", share_token: shareToken } as any).eq("id", id);
      if (error) throw error;
      return shareToken;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["quotes"] });
      toast({ title: "Orçamento publicado", description: "O link de compartilhamento foi gerado." });
    },
    onError: (error) => {
      toast({ title: "Erro ao publicar orçamento", description: error.message, variant: "destructive" });
    },
  });

  return {
    quotes,
    isLoading,
    createQuote: createQuoteMutation.mutateAsync,
    updateQuote: updateQuoteMutation.mutateAsync,
    deleteQuote: deleteQuoteMutation.mutateAsync,
    duplicateQuote: duplicateQuoteMutation.mutateAsync,
    publishQuote: publishQuoteMutation.mutateAsync,
    isCreating: createQuoteMutation.isPending,
    isPublishing: publishQuoteMutation.isPending,
    isDuplicating: duplicateQuoteMutation.isPending,
  };
}

export function useQuote(id: string | undefined) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const { data: quote, isLoading } = useQuery({
    queryKey: ["quote", id],
    queryFn: async () => {
      if (!id) return null;
      const { data: quoteData, error: quoteError } = await supabase
        .from("quotes").select("*").eq("id", id).single();
      if (quoteError) throw quoteError;

      const { data: servicesData, error: servicesError } = await supabase
        .from("quote_services").select("*").eq("quote_id", id).order("order_index", { ascending: true });
      if (servicesError) throw servicesError;

      return {
        ...quoteData,
        services: servicesData.map((s) => ({
          ...s,
          service_type: s.service_type as ServiceType,
          service_data: s.service_data as unknown as ServiceData,
        })),
      } as Quote;
    },
    enabled: !!id,
  });

  async function recalcQuoteTotal(quoteId: string) {
    const { data: allServices } = await supabase
      .from("quote_services")
      .select("amount")
      .eq("quote_id", quoteId);
    const total = (allServices || []).reduce((sum, s) => sum + (Number(s.amount) || 0), 0);
    await supabase.from("quotes").update({ total_amount: total }).eq("id", quoteId);
  }

  const addServiceMutation = useMutation({
    mutationFn: async ({
      service_type, service_data, amount, option_label, description, image_url, image_urls,
    }: {
      service_type: ServiceType;
      service_data: ServiceData;
      amount: number;
      option_label?: string;
      description?: string;
      image_url?: string;
      image_urls?: string[];
    }) => {
      if (!id) throw new Error("Quote ID is required");
      const currentServices = quote?.services || [];
      const nextOrderIndex = currentServices.length;

      const { data, error } = await supabase
        .from("quote_services")
        .insert({
          quote_id: id,
          service_type,
          service_data: service_data as any,
          amount,
          order_index: nextOrderIndex,
          option_label: option_label || null,
          description: description || null,
          image_url: image_url || null,
          image_urls: image_urls && image_urls.length > 0 ? image_urls : [],
        } as any)
        .select()
        .single();
      if (error) throw error;

      await recalcQuoteTotal(id);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["quote", id] });
      queryClient.invalidateQueries({ queryKey: ["quotes"] });
      toast({ title: "Serviço adicionado", description: "O serviço foi adicionado ao orçamento." });
    },
    onError: (error) => {
      toast({ title: "Erro ao adicionar serviço", description: error.message, variant: "destructive" });
    },
  });

  const updateServiceMutation = useMutation({
    mutationFn: async ({
      serviceId, service_type, service_data, amount, option_label, description, image_url, image_urls,
    }: {
      serviceId: string;
      service_type: ServiceType;
      service_data: ServiceData;
      amount: number;
      option_label?: string;
      description?: string;
      image_url?: string;
      image_urls?: string[];
    }) => {
      const { error } = await supabase
        .from("quote_services")
        .update({
          service_type,
          service_data: service_data as any,
          amount,
          option_label: option_label || null,
          description: description || null,
          image_url: image_url || null,
          image_urls: image_urls && image_urls.length > 0 ? image_urls : [],
        } as any)
        .eq("id", serviceId);
      if (error) throw error;
      await recalcQuoteTotal(id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["quote", id] });
      queryClient.invalidateQueries({ queryKey: ["quotes"] });
      toast({ title: "Serviço atualizado", description: "O serviço foi atualizado com sucesso." });
    },
    onError: (error) => {
      toast({ title: "Erro ao atualizar serviço", description: error.message, variant: "destructive" });
    },
  });

  const deleteServiceMutation = useMutation({
    mutationFn: async (serviceId: string) => {
      const { error } = await supabase.from("quote_services").delete().eq("id", serviceId);
      if (error) throw error;
      await recalcQuoteTotal(id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["quote", id] });
      queryClient.invalidateQueries({ queryKey: ["quotes"] });
      toast({ title: "Serviço removido", description: "O serviço foi removido do orçamento." });
    },
    onError: (error) => {
      toast({ title: "Erro ao remover serviço", description: error.message, variant: "destructive" });
    },
  });

  return {
    quote,
    isLoading,
    addService: addServiceMutation.mutateAsync,
    updateService: updateServiceMutation.mutateAsync,
    deleteService: deleteServiceMutation.mutateAsync,
    isAddingService: addServiceMutation.isPending,
  };
}

export function usePublicQuote(token: string | undefined) {
  const { data: quote, isLoading } = useQuery({
    queryKey: ["public-quote", token],
    queryFn: async () => {
      if (!token) return null;
      const { data: quoteData, error: quoteError } = await supabase
        .from("quotes").select("*").eq("share_token", token).eq("status", "published").maybeSingle();
      if (quoteError) throw quoteError;
      if (!quoteData) return null;

      const { data: servicesData, error: servicesError } = await supabase
        .from("quote_services").select("*").eq("quote_id", quoteData.id).order("order_index", { ascending: true });
      if (servicesError) throw servicesError;

      return {
        ...quoteData,
        services: servicesData.map((s) => ({
          ...s,
          service_type: s.service_type as ServiceType,
          service_data: s.service_data as unknown as ServiceData,
        })),
      } as Quote;
    },
    enabled: !!token,
  });

  return { quote, isLoading };
}
