import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import {
  isAllowedReportReason,
  sanitizeReportDetails,
  type CommunityReportReason,
  type CommunityReportResolution,
  type CommunityReportStatus,
  type CommunityReportTargetKind,
} from "@/lib/communityReports";

export interface CommunityReportRow {
  id: string;
  reporter_id: string;
  post_id: string | null;
  comment_id: string | null;
  parent_post_id: string | null;
  target_kind: CommunityReportTargetKind;
  content_author_id: string | null;
  content_snapshot: string | null;
  reason: string;
  details: string | null;
  wants_updates: boolean;
  status: CommunityReportStatus;
  admin_notes: string | null;
  resolution: string | null;
  assigned_admin_id: string | null;
  created_at: string;
  review_started_at: string | null;
  closed_at: string | null;
}

const REPORT_COLUMNS =
  "id, reporter_id, post_id, comment_id, parent_post_id, target_kind, content_author_id, content_snapshot, reason, details, wants_updates, status, admin_notes, resolution, assigned_admin_id, created_at, review_started_at, closed_at";

export interface CreateReportInput {
  targetKind: CommunityReportTargetKind;
  postId?: string | null;
  commentId?: string | null;
  reason: CommunityReportReason;
  details?: string;
  wantsUpdates?: boolean;
}

/** Envio de denúncia (publicação ou comentário) pelo próprio usuário. */
export function useCreateCommunityReport() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: CreateReportInput) => {
      if (!user?.id) throw new Error("Não autenticado");
      if (!isAllowedReportReason(input.reason)) throw new Error("Motivo inválido");
      const payload = {
        reporter_id: user.id,
        target_kind: input.targetKind,
        post_id: input.targetKind === "post" ? input.postId ?? null : null,
        comment_id: input.targetKind === "comment" ? input.commentId ?? null : null,
        parent_post_id: input.targetKind === "comment" ? input.postId ?? null : input.postId ?? null,
        reason: input.reason,
        details: input.details ? sanitizeReportDetails(input.details) : null,
        wants_updates: !!input.wantsUpdates,
      };
      const { error } = await (supabase as any).from("community_reports").insert(payload);
      if (error) {
        if ((error.code ?? "") === "23505" || /duplicate|unique/i.test(error.message ?? "")) {
          throw new Error("Você já tem uma denúncia em andamento para este conteúdo.");
        }
        throw new Error(error.message || "Não foi possível enviar a denúncia.");
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["community-my-reports"] });
      queryClient.invalidateQueries({ queryKey: ["admin-community-reports"] });
    },
    onError: (err: any) => toast.error(err?.message || "Não foi possível enviar a denúncia."),
  });
}

/** Área "Minhas denúncias": somente as denúncias do próprio usuário. */
export function useMyCommunityReports() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["community-my-reports", user?.id ?? null],
    enabled: !!user?.id,
    staleTime: 30 * 1000,
    refetchOnWindowFocus: false,
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("community_reports")
        .select(REPORT_COLUMNS)
        .eq("reporter_id", user!.id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as CommunityReportRow[];
    },
  });
}

export interface AdminReportFilters {
  status: CommunityReportStatus | "all";
  targetKind: CommunityReportTargetKind | "all";
  reason: CommunityReportReason | "all";
  from: string;
  to: string;
}

export const DEFAULT_ADMIN_REPORT_FILTERS: AdminReportFilters = {
  status: "all",
  targetKind: "all",
  reason: "all",
  from: "",
  to: "",
};

/** Fila administrativa de denúncias (somente administradores, garantido por RLS). */
export function useAdminCommunityReports() {
  const queryClient = useQueryClient();
  const [filters, setFilters] = useState<AdminReportFilters>(DEFAULT_ADMIN_REPORT_FILTERS);

  const query = useQuery({
    queryKey: ["admin-community-reports", filters],
    staleTime: 15 * 1000,
    refetchOnWindowFocus: false,
    queryFn: async () => {
      let request = (supabase as any)
        .from("community_reports")
        .select(REPORT_COLUMNS)
        .order("created_at", { ascending: false })
        .limit(200);
      if (filters.status !== "all") request = request.eq("status", filters.status);
      if (filters.targetKind !== "all") request = request.eq("target_kind", filters.targetKind);
      if (filters.reason !== "all") request = request.eq("reason", filters.reason);
      if (filters.from) request = request.gte("created_at", `${filters.from}T00:00:00`);
      if (filters.to) request = request.lte("created_at", `${filters.to}T23:59:59`);
      const { data, error } = await request;
      if (error) throw error;
      return (data ?? []) as CommunityReportRow[];
    },
  });

  const reports = query.data ?? [];

  const peopleIds = useMemo(
    () =>
      [
        ...new Set(
          reports
            .flatMap((report) => [report.reporter_id, report.content_author_id])
            .filter((id): id is string => !!id),
        ),
      ],
    [reports],
  );

  const profilesQuery = useQuery({
    queryKey: ["admin-community-reports-profiles", peopleIds.join(",")],
    enabled: peopleIds.length > 0,
    staleTime: 60 * 1000,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("id, name")
        .in("id", peopleIds);
      if (error) throw error;
      return (data ?? []) as { id: string; name: string | null }[];
    },
  });

  const names = useMemo(() => {
    const map = new Map<string, string>();
    (profilesQuery.data ?? []).forEach((row) => {
      map.set(row.id, row.name || "Usuário");
    });

    return map;
  }, [profilesQuery.data]);

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ["admin-community-reports"] });
    queryClient.invalidateQueries({ queryKey: ["community-my-reports"] });
  };

  const updateStatus = useMutation({
    mutationFn: async ({
      reportId,
      status,
      resolution,
      adminNotes,
    }: {
      reportId: string;
      status: CommunityReportStatus;
      resolution?: CommunityReportResolution | null;
      adminNotes?: string | null;
    }) => {
      const patch: Record<string, any> = { status };
      if (status === "resolved_action") patch.resolution = resolution ?? "content_kept";
      if (adminNotes !== undefined) patch.admin_notes = adminNotes;
      const { error } = await (supabase as any)
        .from("community_reports")
        .update(patch)
        .eq("id", reportId);
      if (error) throw error;
    },
    onSuccess: () => {
      invalidate();
      toast.success("Denúncia atualizada");
    },
    onError: (err: any) => toast.error(err?.message || "Não foi possível atualizar a denúncia."),
  });

  const saveNotes = useMutation({
    mutationFn: async ({ reportId, adminNotes }: { reportId: string; adminNotes: string }) => {
      const { error } = await (supabase as any)
        .from("community_reports")
        .update({ admin_notes: adminNotes || null })
        .eq("id", reportId);
      if (error) throw error;
    },
    onSuccess: () => {
      invalidate();
      toast.success("Observações salvas");
    },
    onError: (err: any) => toast.error(err?.message || "Não foi possível salvar as observações."),
  });

  /** Remoção explícita do conteúdo denunciado: nunca automática. */
  const removeContent = useMutation({
    mutationFn: async (report: CommunityReportRow) => {
      if (report.target_kind === "comment" && report.comment_id) {
        const { error } = await supabase
          .from("community_post_comments")
          .delete()
          .eq("id", report.comment_id);
        if (error) throw error;
        return;
      }
      if (report.post_id) {
        const { error } = await supabase.from("community_posts").delete().eq("id", report.post_id);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      invalidate();
      queryClient.invalidateQueries({ queryKey: ["community-feed"] });
      toast.success("Conteúdo removido");
    },
    onError: (err: any) => toast.error(err?.message || "Não foi possível remover o conteúdo."),
  });

  return {
    reports,
    filters,
    setFilters,
    isLoading: query.isLoading,
    isError: query.isError,
    refetch: query.refetch,
    displayName: (id: string | null) => (id ? names.get(id) || "Usuário" : "—"),
    updateStatus: updateStatus.mutateAsync,
    saveNotes: saveNotes.mutateAsync,
    removeContent: removeContent.mutateAsync,
    isMutating: updateStatus.isPending || saveNotes.isPending || removeContent.isPending,
  };
}
