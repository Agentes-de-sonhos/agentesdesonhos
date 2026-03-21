import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import type { CommunityMember, EntryMethod } from "@/types/community-members";

interface JoinCommunityData {
  entry_method: EntryMethod;
  cnpj?: string;
  years_experience?: number;
  bio?: string;
  segments?: string[];
  specialties?: string[];
}

export function useCommunityMembership() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const { data: membership, isLoading } = useQuery({
    queryKey: ["community-membership", user?.id],
    queryFn: async () => {
      if (!user?.id) return null;
      const { data, error } = await supabase
        .from("community_members")
        .select("*")
        .eq("user_id", user.id)
        .maybeSingle();
      if (error) throw error;
      return data as CommunityMember | null;
    },
    enabled: !!user?.id,
  });

  const joinMutation = useMutation({
    mutationFn: async (input: JoinCommunityData) => {
      if (!user?.id) throw new Error("Não autenticado");
      const { error } = await supabase.from("community_members").insert({
        user_id: user.id,
        entry_method: input.entry_method,
        cnpj: input.cnpj || null,
        years_experience: input.years_experience || null,
        bio: input.bio || null,
        segments: input.segments || [],
        specialties: input.specialties || [],
        status: "approved_unverified",
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Bem-vindo à comunidade Travel Experts! 🎉");
      queryClient.invalidateQueries({ queryKey: ["community-membership"] });
    },
    onError: (err: Error) => {
      toast.error(err.message || "Erro ao entrar na comunidade");
    },
  });

  const updateProfileMutation = useMutation({
    mutationFn: async (updates: Partial<CommunityMember>) => {
      if (!user?.id) throw new Error("Não autenticado");
      const { error } = await supabase
        .from("community_members")
        .update(updates)
        .eq("user_id", user.id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Perfil atualizado!");
      queryClient.invalidateQueries({ queryKey: ["community-membership"] });
      queryClient.invalidateQueries({ queryKey: ["community-members"] });
    },
  });

  const isMember = !!membership && membership.status !== "blocked";
  const isBlocked = membership?.status === "blocked";
  const hasApplied = !!membership;

  return {
    membership,
    isLoading,
    isMember,
    isBlocked,
    hasApplied,
    join: joinMutation.mutate,
    isJoining: joinMutation.isPending,
    updateProfile: updateProfileMutation.mutate,
    isUpdating: updateProfileMutation.isPending,
  };
}
