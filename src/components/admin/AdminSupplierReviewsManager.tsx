import { useMemo, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { Star, ShieldCheck, Flag } from "lucide-react";
import {
  COMMENT_STATUS_LABEL,
  REVIEW_SOURCE_LABEL,
  ratingLabel,
  reviewErrorMessage,
  type ReviewCommentStatus,
} from "@/lib/communityReviews";

interface AdminReviewRow {
  id: string;
  supplier_source: string;
  supplier_id: string;
  user_id: string;
  rating: number;
  comment: string | null;
  comment_status: ReviewCommentStatus;
  moderation_reason: string | null;
  created_at: string;
  updated_at: string;
  author_name: string | null;
  author_agency_name: string | null;
  author_avatar_url: string | null;
  open_reports: number;
  report_reasons: string[];
}

type StatusFilter = "pending" | "approved" | "rejected" | "reported" | "all";

const STATUS_OPTIONS: { value: StatusFilter; label: string }[] = [
  { value: "pending", label: "Pendentes" },
  { value: "approved", label: "Aprovados" },
  { value: "rejected", label: "Rejeitados / ocultos" },
  { value: "reported", label: "Denunciados" },
  { value: "all", label: "Todos" },
];

export function AdminSupplierReviewsManager() {
  const queryClient = useQueryClient();
  const [status, setStatus] = useState<StatusFilter>("pending");
  const [source, setSource] = useState<string>("all");
  const [rating, setRating] = useState<string>("all");
  const [search, setSearch] = useState("");
  const [pendingAction, setPendingAction] = useState<{
    review: AdminReviewRow;
    action: "approve" | "reject" | "delete";
  } | null>(null);
  const [reason, setReason] = useState("");

  const { data: counts } = useQuery({
    queryKey: ["admin-supplier-review-counts"],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("admin_supplier_review_counts");
      if (error) throw error;
      return (data || {}) as Record<string, number>;
    },
  });

  const { data: reviews = [], isLoading } = useQuery({
    queryKey: ["admin-supplier-reviews", status, source, rating],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("admin_list_supplier_reviews", {
        _status: status === "all" ? null : status,
        _source: source === "all" ? null : source,
        _rating: rating === "all" ? null : (Number(rating) as 3 | 4 | 5),
        _limit: 200,
        _offset: 0,
      });
      if (error) throw error;
      return (data || []) as AdminReviewRow[];
    },
  });

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return reviews;
    return reviews.filter(
      (r) =>
        (r.author_name || "").toLowerCase().includes(term) ||
        (r.author_agency_name || "").toLowerCase().includes(term) ||
        r.supplier_id.toLowerCase().includes(term),
    );
  }, [reviews, search]);

  const moderate = useMutation({
    mutationFn: async (input: { reviewId: string; action: string; reason?: string }) => {
      const { error } = await supabase.rpc("moderate_supplier_review", {
        _review_id: input.reviewId,
        _action: input.action,
        _reason: input.reason || null,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-supplier-reviews"] });
      queryClient.invalidateQueries({ queryKey: ["admin-supplier-review-counts"] });
      queryClient.invalidateQueries({ queryKey: ["supplier-community-reviews"] });
      queryClient.invalidateQueries({ queryKey: ["supplier-community-review-stats"] });
      toast.success("Moderação registrada");
    },
    onError: (error: unknown) => {
      toast.error(reviewErrorMessage((error as { message?: string })?.message));
    },
  });

  const confirmAction = () => {
    if (!pendingAction) return;
    moderate.mutate(
      { reviewId: pendingAction.review.id, action: pendingAction.action, reason: reason.trim() || undefined },
      {
        onSettled: () => {
          setPendingAction(null);
          setReason("");
        },
      },
    );
  };

  return (
    <Card className="rounded-2xl">
      <CardHeader>
        <CardTitle className="flex flex-wrap items-center gap-2 text-lg">
          <ShieldCheck className="h-5 w-5 text-primary" aria-hidden="true" />
          Avaliações do Mapa do Turismo
          {!!counts?.pending && (
            <Badge variant="destructive" className="text-[10px]">
              {counts.pending} pendente{counts.pending === 1 ? "" : "s"}
            </Badge>
          )}
          {!!counts?.reported && (
            <Badge variant="secondary" className="text-[10px] gap-1">
              <Flag className="h-3 w-3" aria-hidden="true" />
              {counts.reported} denunciado{counts.reported === 1 ? "" : "s"}
            </Badge>
          )}
        </CardTitle>
        <p className="text-sm text-muted-foreground">
          Escala pública de 3 a 5 estrelas. Comentários só ficam visíveis após aprovação. O texto do
          usuário nunca é alterado — apenas aprovado, oculto ou removido, sempre com registro.
        </p>
      </CardHeader>

      <CardContent className="space-y-4">
        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
          <Select value={status} onValueChange={(v) => setStatus(v as StatusFilter)}>
            <SelectTrigger className="rounded-xl">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {STATUS_OPTIONS.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={source} onValueChange={setSource}>
            <SelectTrigger className="rounded-xl">
              <SelectValue placeholder="Serviço" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos os serviços</SelectItem>
              {Object.entries(REVIEW_SOURCE_LABEL).map(([value, label]) => (
                <SelectItem key={value} value={value}>
                  {label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={rating} onValueChange={setRating}>
            <SelectTrigger className="rounded-xl">
              <SelectValue placeholder="Nota" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas as notas</SelectItem>
              <SelectItem value="3">3 — Bom</SelectItem>
              <SelectItem value="4">4 — Muito bom</SelectItem>
              <SelectItem value="5">5 — Excelente</SelectItem>
            </SelectContent>
          </Select>

          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar por autor, agência ou fornecedor"
            className="rounded-xl"
          />
        </div>

        {isLoading ? (
          <p className="text-sm text-muted-foreground">Carregando...</p>
        ) : filtered.length === 0 ? (
          <p className="py-8 text-center text-sm text-muted-foreground">
            Nenhuma avaliação encontrada com esses filtros.
          </p>
        ) : (
          <div className="space-y-3">
            {filtered.map((review) => (
              <div key={review.id} className="rounded-xl border border-border/50 p-4 space-y-2">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-foreground break-words">
                      {review.author_name || "Agente"}
                      {review.author_agency_name ? ` · ${review.author_agency_name}` : ""}
                    </p>
                    <p className="text-xs text-muted-foreground break-all">
                      {REVIEW_SOURCE_LABEL[review.supplier_source] || review.supplier_source} ·{" "}
                      {review.supplier_id}
                    </p>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge variant="secondary" className="gap-1 text-[10px]">
                      <Star className="h-3 w-3 fill-amber-400 text-amber-400" aria-hidden="true" />
                      {review.rating} — {ratingLabel(review.rating)}
                    </Badge>
                    <Badge
                      variant={review.comment_status === "pending" ? "destructive" : "outline"}
                      className="text-[10px]"
                    >
                      {COMMENT_STATUS_LABEL[review.comment_status]}
                    </Badge>
                    {review.open_reports > 0 && (
                      <Badge variant="destructive" className="gap-1 text-[10px]">
                        <Flag className="h-3 w-3" aria-hidden="true" />
                        {review.open_reports}
                      </Badge>
                    )}
                  </div>
                </div>

                {review.comment && (
                  <p className="rounded-lg bg-muted/40 p-3 text-sm text-foreground/80 whitespace-pre-line break-words">
                    {review.comment}
                  </p>
                )}

                {review.report_reasons?.length > 0 && (
                  <p className="text-xs text-rose-600 dark:text-rose-400">
                    Denúncias: {review.report_reasons.join(", ")}
                  </p>
                )}
                {review.moderation_reason && (
                  <p className="text-xs text-muted-foreground">
                    Motivo registrado: {review.moderation_reason}
                  </p>
                )}

                <div className="flex flex-wrap gap-2 pt-1">
                  {review.comment && review.comment_status !== "approved" && (
                    <Button
                      size="sm"
                      className="rounded-lg"
                      onClick={() => setPendingAction({ review, action: "approve" })}
                    >
                      Aprovar comentário
                    </Button>
                  )}
                  {review.comment && review.comment_status !== "rejected" && (
                    <Button
                      size="sm"
                      variant="outline"
                      className="rounded-lg"
                      onClick={() => setPendingAction({ review, action: "reject" })}
                    >
                      Rejeitar / ocultar
                    </Button>
                  )}
                  <Button
                    size="sm"
                    variant="ghost"
                    className="rounded-lg text-muted-foreground hover:text-destructive"
                    onClick={() => setPendingAction({ review, action: "delete" })}
                  >
                    Remover avaliação
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>

      <AlertDialog open={!!pendingAction} onOpenChange={(open) => !open && setPendingAction(null)}>
        <AlertDialogContent className="rounded-2xl">
          <AlertDialogHeader>
            <AlertDialogTitle>
              {pendingAction?.action === "approve"
                ? "Aprovar comentário"
                : pendingAction?.action === "reject"
                  ? "Rejeitar comentário"
                  : "Remover avaliação"}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {pendingAction?.action === "delete"
                ? "A avaliação será removida e a média recalculada. A ação fica registrada no log."
                : "A decisão fica registrada no log de moderação, com autor e motivo."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <Textarea
            value={reason}
            maxLength={300}
            onChange={(e) => setReason(e.target.value)}
            placeholder="Motivo (opcional, visível ao autor em comentários rejeitados)"
            className="rounded-xl resize-none min-h-[70px]"
          />
          <AlertDialogFooter>
            <AlertDialogCancel className="rounded-xl">Cancelar</AlertDialogCancel>
            <AlertDialogAction
              className="rounded-xl"
              disabled={moderate.isPending}
              onClick={confirmAction}
            >
              Confirmar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  );
}