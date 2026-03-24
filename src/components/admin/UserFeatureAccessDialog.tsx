import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Loader2, KeyRound } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";

/** All features that can be granted individually */
const AVAILABLE_FEATURES = [
  { key: "hotel_raio_x", label: "Raio-X do Hotel", description: "Análise inteligente de hotéis com IA" },
  { key: "financeiro_vendas", label: "Financeiro & Vendas", description: "Painel financeiro completo" },
];

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  userId: string;
  userName: string;
}

export function UserFeatureAccessDialog({ open, onOpenChange, userId, userName }: Props) {
  const { user: currentUser } = useAuth();
  const queryClient = useQueryClient();

  const { data: grants = [], isLoading } = useQuery({
    queryKey: ["user-feature-access", userId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("user_feature_access")
        .select("feature_key")
        .eq("user_id", userId);
      if (error) throw error;
      return (data || []).map((d: any) => d.feature_key as string);
    },
    enabled: open,
  });

  const toggleMutation = useMutation({
    mutationFn: async ({ featureKey, grant }: { featureKey: string; grant: boolean }) => {
      if (grant) {
        const { error } = await supabase.from("user_feature_access").insert({
          user_id: userId,
          feature_key: featureKey,
          granted_by: currentUser?.id,
        });
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("user_feature_access")
          .delete()
          .eq("user_id", userId)
          .eq("feature_key", featureKey);
        if (error) throw error;
      }
    },
    onSuccess: (_, { featureKey, grant }) => {
      queryClient.invalidateQueries({ queryKey: ["user-feature-access", userId] });
      toast.success(grant ? "Permissão concedida" : "Permissão removida");
    },
    onError: () => {
      toast.error("Erro ao alterar permissão");
    },
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <KeyRound className="h-4 w-4 text-primary" />
            Permissões de {userName}
          </DialogTitle>
        </DialogHeader>

        {isLoading ? (
          <div className="flex justify-center py-8">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <div className="space-y-4 py-2">
            <p className="text-sm text-muted-foreground">
              Libere funcionalidades restritas para este usuário. Isso é aditivo — não remove permissões existentes.
            </p>
            {AVAILABLE_FEATURES.map((feat) => {
              const isGranted = grants.includes(feat.key);
              return (
                <div key={feat.key} className="flex items-center justify-between rounded-lg border border-border p-3">
                  <div>
                    <Label className="text-sm font-medium">{feat.label}</Label>
                    <p className="text-xs text-muted-foreground">{feat.description}</p>
                  </div>
                  <Switch
                    checked={isGranted}
                    disabled={toggleMutation.isPending}
                    onCheckedChange={(checked) =>
                      toggleMutation.mutate({ featureKey: feat.key, grant: checked })
                    }
                  />
                </div>
              );
            })}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
