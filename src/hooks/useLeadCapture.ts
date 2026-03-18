import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";
import { toast } from "sonner";

export interface LeadCaptureForm {
  id: string;
  user_id: string;
  token: string;
  welcome_message: string | null;
  is_active: boolean;
  created_at: string;
}

export interface LeadCapture {
  id: string;
  form_id: string;
  agent_user_id: string;
  lead_name: string;
  lead_phone: string;
  destination: string | null;
  travel_dates: string | null;
  travelers_count: string | null;
  budget: string | null;
  additional_info: string | null;
  ai_suggestion: string | null;
  whatsapp_message: string | null;
  status: string;
  is_read: boolean;
  created_at: string;
}

export function useLeadCapture() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [newLeadAlert, setNewLeadAlert] = useState(false);

  // Get or create agent's form
  const { data: form, isLoading: formLoading } = useQuery({
    queryKey: ["lead-form", user?.id],
    queryFn: async () => {
      if (!user?.id) return null;

      const { data, error } = await supabase
        .from("lead_capture_forms")
        .select("*")
        .eq("user_id", user.id)
        .maybeSingle();

      if (error) throw error;

      if (!data) {
        const { data: newForm, error: createError } = await supabase
          .from("lead_capture_forms")
          .insert({ user_id: user.id } as never)
          .select()
          .single();
        if (createError) throw createError;
        return newForm as LeadCaptureForm;
      }

      return data as LeadCaptureForm;
    },
    enabled: !!user?.id,
  });

  // Get leads
  const { data: leads, isLoading: leadsLoading } = useQuery({
    queryKey: ["lead-captures", user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      const { data, error } = await supabase
        .from("lead_captures")
        .select("*")
        .eq("agent_user_id", user.id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as LeadCapture[];
    },
    enabled: !!user?.id,
  });

  // Realtime listener for new leads
  useEffect(() => {
    if (!user?.id) return;

    const channel = supabase
      .channel("new-leads")
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "lead_captures",
          filter: `agent_user_id=eq.${user.id}`,
        },
        () => {
          setNewLeadAlert(true);
          queryClient.invalidateQueries({ queryKey: ["lead-captures"] });
          toast.success("🎉 Novo lead recebido!", {
            description: "Um novo contato preencheu seu formulário!",
            duration: 8000,
          });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user?.id, queryClient]);

  // Mark lead as read
  const markAsRead = useMutation({
    mutationFn: async (leadId: string) => {
      const { error } = await supabase
        .from("lead_captures")
        .update({ is_read: true } as never)
        .eq("id", leadId);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["lead-captures"] }),
  });

  // Update lead status
  const updateStatus = useMutation({
    mutationFn: async ({ leadId, status }: { leadId: string; status: string }) => {
      const { error } = await supabase
        .from("lead_captures")
        .update({ status } as never)
        .eq("id", leadId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["lead-captures"] });
      toast.success("Status atualizado!");
    },
  });

  // Delete lead
  const deleteLead = useMutation({
    mutationFn: async (leadId: string) => {
      const { error } = await supabase
        .from("lead_captures")
        .delete()
        .eq("id", leadId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["lead-captures"] });
      toast.success("Lead excluído");
    },
  });

  // Update form settings
  const updateForm = useMutation({
    mutationFn: async (updates: Partial<LeadCaptureForm>) => {
      if (!form?.id) throw new Error("Form not found");
      const { error } = await supabase
        .from("lead_capture_forms")
        .update(updates as never)
        .eq("id", form.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["lead-form"] });
      toast.success("Configurações salvas!");
    },
  });

  const unreadCount = leads?.filter((l) => !l.is_read).length ?? 0;

  return {
    form,
    formLoading,
    leads,
    leadsLoading,
    unreadCount,
    newLeadAlert,
    setNewLeadAlert,
    markAsRead: markAsRead.mutate,
    updateStatus: updateStatus.mutate,
    deleteLead: deleteLead.mutate,
    updateForm: updateForm.mutate,
  };
}
