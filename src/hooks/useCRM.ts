import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import type { Client, Opportunity, OpportunityStage } from "@/types/crm";

export function useClients() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: clients = [], isLoading } = useQuery({
    queryKey: ["clients", user?.id],
    queryFn: async () => {
      if (!user) return [];
      const { data, error } = await supabase
        .from("clients")
        .select("*")
        .eq("user_id", user.id)
        .order("name", { ascending: true });
      if (error) throw error;
      return data as Client[];
    },
    enabled: !!user,
  });

  const createClientMutation = useMutation({
    mutationFn: async (data: Omit<Client, "id" | "user_id" | "created_at" | "updated_at">) => {
      if (!user) throw new Error("Not authenticated");
      const { data: result, error } = await supabase
        .from("clients")
        .insert({ ...data, user_id: user.id })
        .select()
        .single();
      if (error) throw error;
      return result as Client;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["clients"] });
      toast({ title: "Cliente criado com sucesso" });
    },
    onError: (error) => {
      toast({ title: "Erro ao criar cliente", description: error.message, variant: "destructive" });
    },
  });

  const updateClientMutation = useMutation({
    mutationFn: async ({ id, ...data }: Partial<Client> & { id: string }) => {
      const { error } = await supabase.from("clients").update(data).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["clients"] });
      toast({ title: "Cliente atualizado" });
    },
    onError: (error) => {
      toast({ title: "Erro ao atualizar cliente", description: error.message, variant: "destructive" });
    },
  });

  const deleteClientMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("clients").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["clients"] });
      toast({ title: "Cliente excluído" });
    },
    onError: (error) => {
      toast({ title: "Erro ao excluir cliente", description: error.message, variant: "destructive" });
    },
  });

  return {
    clients,
    isLoading,
    createClient: createClientMutation.mutateAsync,
    updateClient: updateClientMutation.mutateAsync,
    deleteClient: deleteClientMutation.mutateAsync,
    isCreating: createClientMutation.isPending,
  };
}

export function useOpportunities() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: opportunities = [], isLoading } = useQuery({
    queryKey: ["opportunities", user?.id],
    queryFn: async () => {
      if (!user) return [];
      const { data, error } = await supabase
        .from("opportunities")
        .select("*, client:clients(*)")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data.map((o) => ({
        ...o,
        stage: o.stage as OpportunityStage,
        client: o.client as Client,
      })) as Opportunity[];
    },
    enabled: !!user,
  });

  const createOpportunityMutation = useMutation({
    mutationFn: async (data: {
      client_id: string;
      destination: string;
      start_date?: string;
      end_date?: string;
      passengers_count: number;
      estimated_value: number;
      notes?: string;
    }) => {
      if (!user) throw new Error("Not authenticated");
      const { data: result, error } = await supabase
        .from("opportunities")
        .insert({ ...data, user_id: user.id, stage: "new_contact" })
        .select("*, client:clients(*)")
        .single();
      if (error) throw error;

      // Create history entry
      await supabase.from("opportunity_history").insert({
        opportunity_id: result.id,
        from_stage: null,
        to_stage: "new_contact",
      });

      return result as Opportunity;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["opportunities"] });
      toast({ title: "Oportunidade criada" });
    },
    onError: (error) => {
      toast({ title: "Erro ao criar oportunidade", description: error.message, variant: "destructive" });
    },
  });

  const updateOpportunityMutation = useMutation({
    mutationFn: async ({ id, ...data }: Partial<Opportunity> & { id: string }) => {
      const { error } = await supabase.from("opportunities").update(data).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["opportunities"] });
      toast({ title: "Oportunidade atualizada" });
    },
    onError: (error) => {
      toast({ title: "Erro ao atualizar", description: error.message, variant: "destructive" });
    },
  });

  const updateStageMutation = useMutation({
    mutationFn: async ({ id, fromStage, toStage }: { id: string; fromStage: OpportunityStage; toStage: OpportunityStage }) => {
      const { error: updateError } = await supabase
        .from("opportunities")
        .update({ stage: toStage })
        .eq("id", id);
      if (updateError) throw updateError;

      const { error: historyError } = await supabase.from("opportunity_history").insert({
        opportunity_id: id,
        from_stage: fromStage,
        to_stage: toStage,
      });
      if (historyError) throw historyError;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["opportunities"] });
    },
    onError: (error) => {
      toast({ title: "Erro ao mover", description: error.message, variant: "destructive" });
    },
  });

  const deleteOpportunityMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("opportunities").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["opportunities"] });
      toast({ title: "Oportunidade excluída" });
    },
    onError: (error) => {
      toast({ title: "Erro ao excluir", description: error.message, variant: "destructive" });
    },
  });

  return {
    opportunities,
    isLoading,
    createOpportunity: createOpportunityMutation.mutateAsync,
    updateOpportunity: updateOpportunityMutation.mutateAsync,
    updateStage: updateStageMutation.mutateAsync,
    deleteOpportunity: deleteOpportunityMutation.mutateAsync,
    isCreating: createOpportunityMutation.isPending,
  };
}
