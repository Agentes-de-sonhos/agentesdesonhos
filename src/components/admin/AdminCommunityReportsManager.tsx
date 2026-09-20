import { useMemo, useState } from "react";
import { Loader2, RefreshCw, ShieldAlert, Trash2 } from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import {
  useAdminCommunityReports,
  type CommunityReportRow,
} from "@/hooks/useCommunityReports";
import {
  COMMUNITY_REPORT_REASONS,
  COMMUNITY_REPORT_STATUS_LABELS,
  canTransitionReport,
  reportReasonLabel,
  type CommunityReportStatus,
} from "@/lib/communityReports";

const STATUS_ORDER: CommunityReportStatus[] = [
  "pending",
  "in_review",
  "resolved_action",
  "closed_no_action",
];

function formatDateTime(value: string | null) {
  if (!value) return "—";
  return new Date(value).toLocaleString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

/**
 * Fila de denúncias da Comunidade: filtros, contexto do conteúdo e ações
 * administrativas explícitas e confirmadas. Nenhum conteúdo é removido
 * automaticamente.
 */
export function AdminCommunityReportsManager() {
  const {
    reports,
    filters,
    setFilters,
    isLoading,
    isError,
    refetch,
    displayName,
    updateStatus,
    saveNotes,
    removeContent,
    isMutating,
  } = useAdminCommunityReports();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [notes, setNotes] = useState("");

  const selected = useMemo(
    () => reports.find((report) => report.id === selectedId) ?? null,
    [reports, selectedId],
  );

  const openDetails = (report: CommunityReportRow) => {
    setSelectedId(report.id);
    setNotes(report.admin_notes ?? "");
  };

  return (
    <Card data-admin-community-reports>
      <CardHeader className="flex flex-row items-center justify-between gap-2">
        <CardTitle className="flex items-center gap-2 text-base">
          <ShieldAlert className="h-4 w-4 text-destructive" />
          Denúncias
        </CardTitle>
        <Button variant="ghost" size="icon" onClick={() => refetch()} aria-label="Atualizar fila">
          <RefreshCw className="h-4 w-4" />
        </Button>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Status</Label>
            <Select
              value={filters.status}
              onValueChange={(value) =>
                setFilters((prev) => ({ ...prev, status: value as typeof prev.status }))
              }
            >
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                {STATUS_ORDER.map((status) => (
                  <SelectItem key={status} value={status}>
                    {COMMUNITY_REPORT_STATUS_LABELS[status]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Tipo</Label>
            <Select
              value={filters.targetKind}
              onValueChange={(value) =>
                setFilters((prev) => ({ ...prev, targetKind: value as typeof prev.targetKind }))
              }
            >
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                <SelectItem value="post">Publicação</SelectItem>
                <SelectItem value="comment">Comentário</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Motivo</Label>
            <Select
              value={filters.reason}
              onValueChange={(value) =>
                setFilters((prev) => ({ ...prev, reason: value as typeof prev.reason }))
              }
            >
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                {COMMUNITY_REPORT_REASONS.map((item) => (
                  <SelectItem key={item.value} value={item.value}>
                    {item.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground" htmlFor="report-from">De</Label>
            <Input
              id="report-from"
              type="date"
              value={filters.from}
              onChange={(event) => setFilters((prev) => ({ ...prev, from: event.target.value }))}
            />
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground" htmlFor="report-to">Até</Label>
            <Input
              id="report-to"
              type="date"
              value={filters.to}
              onChange={(event) => setFilters((prev) => ({ ...prev, to: event.target.value }))}
            />
          </div>
        </div>

        {isLoading && (
          <p className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" /> Carregando denúncias...
          </p>
        )}
        {isError && !isLoading && (
          <p className="text-sm text-destructive">Não foi possível carregar a fila de denúncias.</p>
        )}
        {!isLoading && !isError && reports.length === 0 && (
          <p className="text-sm text-muted-foreground">Nenhuma denúncia com esses filtros.</p>
        )}

        <div className="space-y-2">
          {reports.map((report) => (
            <button
              key={report.id}
              type="button"
              onClick={() => openDetails(report)}
              data-admin-report={report.id}
              className="w-full rounded-lg border border-border/60 bg-card px-3 py-2.5 text-left transition hover:bg-muted/40"
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="text-sm font-semibold text-foreground">
                  {reportReasonLabel(report.reason as never)}
                </span>
                <Badge variant={report.status === "pending" ? "secondary" : "outline"}>
                  {COMMUNITY_REPORT_STATUS_LABELS[report.status]}
                </Badge>
              </div>
              <p className="mt-0.5 text-xs text-muted-foreground">
                {report.target_kind === "post" ? "Publicação" : "Comentário"} · autor:{" "}
                {displayName(report.content_author_id)} · denunciante:{" "}
                {displayName(report.reporter_id)} · {formatDateTime(report.created_at)}
              </p>
              {report.content_snapshot && (
                <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">
                  {report.content_snapshot}
                </p>
              )}
            </button>
          ))}
        </div>

        {selected && (
          <Card className="border-primary/30" data-admin-report-details>
            <CardHeader>
              <CardTitle className="text-sm">
                {reportReasonLabel(selected.reason as never)} ·{" "}
                {COMMUNITY_REPORT_STATUS_LABELS[selected.status]}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="grid gap-1 text-xs text-muted-foreground sm:grid-cols-2">
                <span>Tipo: {selected.target_kind === "post" ? "Publicação" : "Comentário"}</span>
                <span>Autor denunciado: {displayName(selected.content_author_id)}</span>
                <span>Denunciante: {displayName(selected.reporter_id)}</span>
                <span>Criada em: {formatDateTime(selected.created_at)}</span>
                <span>Análise iniciada: {formatDateTime(selected.review_started_at)}</span>
                <span>Encerrada em: {formatDateTime(selected.closed_at)}</span>
              </div>
              {selected.content_snapshot && (
                <p className="rounded-md bg-muted/40 px-3 py-2 text-xs text-muted-foreground">
                  {selected.content_snapshot}
                </p>
              )}
              {selected.details && (
                <p className="text-xs text-muted-foreground">
                  Detalhes do denunciante: {selected.details}
                </p>
              )}

              <div className="space-y-1.5">
                <Label htmlFor="admin-report-notes" className="text-xs text-muted-foreground">
                  Observações internas (opcional)
                </Label>
                <Textarea
                  id="admin-report-notes"
                  rows={3}
                  value={notes}
                  onChange={(event) => setNotes(event.target.value)}
                />
                <Button
                  size="sm"
                  variant="outline"
                  disabled={isMutating}
                  onClick={() => void saveNotes({ reportId: selected.id, adminNotes: notes })}
                >
                  Salvar observações
                </Button>
              </div>

              <div className="flex flex-wrap gap-2">
                {canTransitionReport(selected.status, "in_review") && (
                  <ConfirmAction
                    label="Iniciar análise"
                    description="A denúncia passa para o status em análise."
                    disabled={isMutating}
                    onConfirm={() =>
                      void updateStatus({
                        reportId: selected.id,
                        status: "in_review",
                        adminNotes: notes,
                      })
                    }
                  />
                )}
                {canTransitionReport(selected.status, "resolved_action") && (
                  <>
                    <ConfirmAction
                      label="Resolver mantendo conteúdo"
                      description="A denúncia é resolvida com ação e o conteúdo permanece publicado."
                      disabled={isMutating}
                      onConfirm={() =>
                        void updateStatus({
                          reportId: selected.id,
                          status: "resolved_action",
                          resolution: "content_kept",
                          adminNotes: notes,
                        })
                      }
                    />
                    <ConfirmAction
                      label="Remover conteúdo"
                      variant="destructive"
                      icon
                      description="O conteúdo denunciado será removido e a denúncia resolvida com ação."
                      disabled={isMutating}
                      onConfirm={async () => {
                        await removeContent(selected);
                        await updateStatus({
                          reportId: selected.id,
                          status: "resolved_action",
                          resolution: "content_removed",
                          adminNotes: notes,
                        });
                      }}
                    />
                  </>
                )}
                {canTransitionReport(selected.status, "closed_no_action") && (
                  <ConfirmAction
                    label="Encerrar sem ação"
                    description="A denúncia é encerrada sem medidas sobre o conteúdo."
                    disabled={isMutating}
                    onConfirm={() =>
                      void updateStatus({
                        reportId: selected.id,
                        status: "closed_no_action",
                        adminNotes: notes,
                      })
                    }
                  />
                )}
                <Button variant="ghost" size="sm" onClick={() => setSelectedId(null)}>
                  Fechar
                </Button>
              </div>
            </CardContent>
          </Card>
        )}
      </CardContent>
    </Card>
  );
}

function ConfirmAction({
  label,
  description,
  onConfirm,
  disabled,
  variant = "outline",
  icon,
}: {
  label: string;
  description: string;
  onConfirm: () => void | Promise<void>;
  disabled?: boolean;
  variant?: "outline" | "destructive";
  icon?: boolean;
}) {
  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button size="sm" variant={variant} disabled={disabled}>
          {icon && <Trash2 className="mr-2 h-3.5 w-3.5" />}
          {label}
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{label}?</AlertDialogTitle>
          <AlertDialogDescription>{description}</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancelar</AlertDialogCancel>
          <AlertDialogAction onClick={() => void onConfirm()}>Confirmar</AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
