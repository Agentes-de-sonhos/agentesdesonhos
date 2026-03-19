import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Star, MessageCircle, TrendingUp, Users, BarChart3 } from "lucide-react";
import { toast } from "sonner";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

function StarDisplay({ rating }: { rating: number }) {
  return (
    <div className="flex gap-0.5">
      {[1, 2, 3, 4, 5].map((v) => (
        <Star
          key={v}
          className={`h-4 w-4 ${v <= rating ? "fill-yellow-400 text-yellow-400" : "text-muted-foreground/30"}`}
        />
      ))}
    </div>
  );
}

export function AdminFeedbackManager() {
  const queryClient = useQueryClient();

  // Fetch toggle state
  const { data: isEnabled, isLoading: loadingToggle } = useQuery({
    queryKey: ["feedback-popup-enabled"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("feedback_settings" as any)
        .select("value")
        .eq("key", "feedback_popup_enabled")
        .maybeSingle();
      if (error) throw error;
      return (data as any)?.value === "true";
    },
  });

  // Fetch all feedback with profile names
  const { data: feedbacks, isLoading: loadingFeedbacks } = useQuery({
    queryKey: ["admin-feedbacks"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("user_feedback" as any)
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;

      // Fetch profile names for user_ids
      const userIds = [...new Set((data as any[]).map((f: any) => f.user_id))];
      const { data: profiles } = await supabase
        .from("profiles")
        .select("user_id, name")
        .in("user_id", userIds);

      const profileMap = new Map(profiles?.map((p) => [p.user_id, p.name]) || []);

      return (data as any[]).map((f: any) => ({
        ...f,
        user_name: profileMap.get(f.user_id) || "Usuário",
      }));
    },
  });

  const toggleMutation = useMutation({
    mutationFn: async (enabled: boolean) => {
      const { error } = await supabase
        .from("feedback_settings" as any)
        .upsert(
          { key: "feedback_popup_enabled", value: enabled ? "true" : "false", updated_at: new Date().toISOString() } as any,
          { onConflict: "key" }
        );
      if (error) throw error;
    },
    onSuccess: (_, enabled) => {
      queryClient.invalidateQueries({ queryKey: ["feedback-popup-enabled"] });
      toast.success(enabled ? "Pop-up de feedback ativado!" : "Pop-up de feedback desativado!");
    },
    onError: () => toast.error("Erro ao alterar configuração"),
  });

  // Stats
  const totalFeedbacks = feedbacks?.length || 0;
  const avgRating = totalFeedbacks
    ? (feedbacks!.reduce((sum: number, f: any) => sum + f.rating, 0) / totalFeedbacks).toFixed(1)
    : "—";
  const withComments = feedbacks?.filter((f: any) => f.comment).length || 0;
  const ratingDistribution = [1, 2, 3, 4, 5].map(
    (r) => feedbacks?.filter((f: any) => f.rating === r).length || 0
  );

  return (
    <div className="space-y-6">
      {/* Toggle + Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="border-2 border-primary/20">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Pop-up de Feedback</p>
                <p className="text-lg font-bold mt-1">
                  {loadingToggle ? "..." : isEnabled ? "Ativo" : "Inativo"}
                </p>
              </div>
              <Switch
                checked={isEnabled ?? false}
                onCheckedChange={(v) => toggleMutation.mutate(v)}
                disabled={loadingToggle || toggleMutation.isPending}
              />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total de Respostas</p>
                <p className="text-3xl font-bold mt-1">{totalFeedbacks}</p>
              </div>
              <Users className="h-8 w-8 text-muted-foreground/40" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Média de Avaliação</p>
                <div className="flex items-center gap-2 mt-1">
                  <p className="text-3xl font-bold">{avgRating}</p>
                  <Star className="h-5 w-5 fill-yellow-400 text-yellow-400" />
                </div>
              </div>
              <TrendingUp className="h-8 w-8 text-muted-foreground/40" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Com Comentários</p>
                <p className="text-3xl font-bold mt-1">{withComments}</p>
              </div>
              <MessageCircle className="h-8 w-8 text-muted-foreground/40" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Rating distribution */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <BarChart3 className="h-4 w-4" />
            Distribuição de Notas
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {[5, 4, 3, 2, 1].map((star) => {
              const count = ratingDistribution[star - 1];
              const pct = totalFeedbacks ? (count / totalFeedbacks) * 100 : 0;
              return (
                <div key={star} className="flex items-center gap-3">
                  <span className="text-sm font-medium w-8">{star}★</span>
                  <div className="flex-1 h-5 bg-muted rounded-full overflow-hidden">
                    <div
                      className="h-full bg-yellow-400 rounded-full transition-all"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                  <span className="text-sm text-muted-foreground w-12 text-right">
                    {count} ({pct.toFixed(0)}%)
                  </span>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Feedback table */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Respostas dos Usuários</CardTitle>
        </CardHeader>
        <CardContent>
          {loadingFeedbacks ? (
            <p className="text-muted-foreground text-sm py-4 text-center">Carregando...</p>
          ) : !feedbacks?.length ? (
            <p className="text-muted-foreground text-sm py-4 text-center">
              Nenhum feedback recebido ainda.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Usuário</TableHead>
                    <TableHead>Nota</TableHead>
                    <TableHead>Comentário</TableHead>
                    <TableHead>Data</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {feedbacks.map((f: any) => (
                    <TableRow key={f.id}>
                      <TableCell className="font-medium">{f.user_name}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <StarDisplay rating={f.rating} />
                          <Badge
                            variant={f.rating >= 4 ? "default" : f.rating >= 3 ? "secondary" : "destructive"}
                            className="text-xs"
                          >
                            {f.rating}/5
                          </Badge>
                        </div>
                      </TableCell>
                      <TableCell className="max-w-xs">
                        {f.comment ? (
                          <p className="text-sm truncate" title={f.comment}>
                            {f.comment}
                          </p>
                        ) : (
                          <span className="text-muted-foreground text-xs">—</span>
                        )}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground whitespace-nowrap">
                        {new Date(f.created_at).toLocaleDateString("pt-BR", {
                          day: "2-digit",
                          month: "2-digit",
                          year: "numeric",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
