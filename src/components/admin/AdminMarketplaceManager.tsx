import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import {
  CheckCircle, XCircle, Eye, Clock, GraduationCap, Trash2,
} from "lucide-react";
import {
  Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import type { MarketplaceCourse } from "@/types/marketplace";

export function AdminMarketplaceManager() {
  const queryClient = useQueryClient();
  const [rejectId, setRejectId] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState("");

  const { data: courses = [], isLoading } = useQuery({
    queryKey: ["admin-marketplace-courses"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("marketplace_courses")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      // Get creator names
      const creatorIds = [...new Set((data || []).map((c: any) => c.creator_id))];
      let profiles: any[] = [];
      if (creatorIds.length > 0) {
        const { data: pData } = await supabase
          .from("profiles")
          .select("user_id, name")
          .in("user_id", creatorIds);
        profiles = pData || [];
      }
      return (data || []).map((c: any) => {
        const p = profiles.find((p: any) => p.user_id === c.creator_id);
        return { ...c, creator_name: p?.name } as MarketplaceCourse;
      });
    },
  });

  const approveMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("marketplace_courses")
        .update({ status: "approved", is_active: true, rejection_reason: null })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-marketplace-courses"] });
      toast.success("Curso aprovado!");
    },
  });

  const rejectMutation = useMutation({
    mutationFn: async ({ id, reason }: { id: string; reason: string }) => {
      const { error } = await supabase
        .from("marketplace_courses")
        .update({ status: "rejected", is_active: false, rejection_reason: reason })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-marketplace-courses"] });
      setRejectId(null);
      setRejectReason("");
      toast.success("Curso rejeitado.");
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("marketplace_courses").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-marketplace-courses"] });
      toast.success("Curso removido.");
    },
  });

  const statusMap: Record<string, { label: string; color: string }> = {
    draft: { label: "Rascunho", color: "bg-gray-100 text-gray-800" },
    pending_review: { label: "Aguardando Aprovação", color: "bg-yellow-100 text-yellow-800" },
    approved: { label: "Aprovado", color: "bg-green-100 text-green-800" },
    rejected: { label: "Rejeitado", color: "bg-red-100 text-red-800" },
  };

  const pendingCourses = courses.filter((c) => c.status === "pending_review");
  const otherCourses = courses.filter((c) => c.status !== "pending_review");

  if (isLoading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3].map((i) => <Skeleton key={i} className="h-24 w-full" />)}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {pendingCourses.length > 0 && (
        <div className="space-y-3">
          <h3 className="font-semibold flex items-center gap-2">
            <Clock className="h-4 w-4 text-yellow-600" />
            Aguardando Aprovação ({pendingCourses.length})
          </h3>
          {pendingCourses.map((course) => (
            <Card key={course.id} className="border-yellow-200 bg-yellow-50/50">
              <CardContent className="p-4 flex items-center gap-4">
                <GraduationCap className="h-8 w-8 text-yellow-600 flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="font-semibold">{course.title}</p>
                  <p className="text-sm text-muted-foreground">por {course.creator_name || "—"}</p>
                  <p className="text-sm text-muted-foreground">
                    R$ {Number(course.price).toFixed(2)} · {course.category} · {course.level}
                  </p>
                </div>
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    variant="default"
                    className="gap-1"
                    onClick={() => approveMutation.mutate(course.id)}
                  >
                    <CheckCircle className="h-4 w-4" /> Aprovar
                  </Button>
                  <Button
                    size="sm"
                    variant="destructive"
                    className="gap-1"
                    onClick={() => { setRejectId(course.id); setRejectReason(""); }}
                  >
                    <XCircle className="h-4 w-4" /> Rejeitar
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <div className="space-y-3">
        <h3 className="font-semibold">Todos os Cursos ({otherCourses.length})</h3>
        {otherCourses.length === 0 && (
          <p className="text-sm text-muted-foreground">Nenhum curso cadastrado.</p>
        )}
        {otherCourses.map((course) => {
          const st = statusMap[course.status] || statusMap.draft;
          return (
            <Card key={course.id}>
              <CardContent className="p-4 flex items-center gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="font-medium">{course.title}</p>
                    <Badge className={st.color}>{st.label}</Badge>
                  </div>
                  <p className="text-sm text-muted-foreground">por {course.creator_name || "—"} · R$ {Number(course.price).toFixed(2)}</p>
                </div>
                <div className="flex gap-2">
                  {course.status === "approved" && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => rejectMutation.mutate({ id: course.id, reason: "Desativado pelo admin" })}
                    >
                      Desativar
                    </Button>
                  )}
                  {course.status === "rejected" && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => approveMutation.mutate(course.id)}
                    >
                      Aprovar
                    </Button>
                  )}
                  <Button
                    size="sm"
                    variant="ghost"
                    className="text-destructive"
                    onClick={() => deleteMutation.mutate(course.id)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Reject dialog */}
      <Dialog open={!!rejectId} onOpenChange={() => setRejectId(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Rejeitar Curso</DialogTitle>
            <DialogDescription>Informe o motivo da rejeição para que o criador possa corrigir.</DialogDescription>
          </DialogHeader>
          <Textarea
            placeholder="Motivo da rejeição..."
            value={rejectReason}
            onChange={(e) => setRejectReason(e.target.value)}
            rows={3}
          />
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setRejectId(null)}>Cancelar</Button>
            <Button
              variant="destructive"
              onClick={() => {
                if (rejectId) rejectMutation.mutate({ id: rejectId, reason: rejectReason });
              }}
            >
              Confirmar Rejeição
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
