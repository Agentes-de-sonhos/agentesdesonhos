import { AlertCircle, RefreshCw, ShieldAlert } from "lucide-react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { MobileTopBar } from "@/components/layout/MobileTopBar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useMyCommunityReports } from "@/hooks/useCommunityReports";
import {
  COMMUNITY_REPORT_STATUS_LABELS,
  reportReasonLabel,
  type CommunityReportStatus,
} from "@/lib/communityReports";

function formatDate(value: string) {
  return new Date(value).toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

function statusVariant(status: CommunityReportStatus) {
  if (status === "pending") return "secondary" as const;
  if (status === "in_review") return "default" as const;
  return "outline" as const;
}

/**
 * Área simples para o denunciante acompanhar motivo, tipo, data e status,
 * mesmo quando optou por não receber notificações.
 */
export default function MinhasDenuncias() {
  const { data, isLoading, isError, refetch } = useMyCommunityReports();
  const reports = data ?? [];

  return (
    <DashboardLayout>
      <MobileTopBar title="Minhas denúncias" />
      <div className="mx-auto w-full max-w-3xl space-y-4 px-4 py-4 sm:px-6">
        <div className="flex items-center justify-between gap-2">
          <div>
            <h1 className="flex items-center gap-2 text-xl font-semibold text-foreground">
              <ShieldAlert className="h-5 w-5 text-destructive" />
              Minhas denúncias
            </h1>
            <p className="text-sm text-muted-foreground">
              Acompanhe o andamento das denúncias que você enviou.
            </p>
          </div>
          <Button variant="ghost" size="icon" onClick={() => refetch()} aria-label="Atualizar">
            <RefreshCw className="h-4 w-4" />
          </Button>
        </div>

        {isLoading && (
          <div className="space-y-2">
            <Skeleton className="h-20 w-full" />
            <Skeleton className="h-20 w-full" />
          </div>
        )}

        {isError && !isLoading && (
          <Card className="border-destructive/40">
            <CardContent className="flex items-center gap-2 py-4 text-sm text-muted-foreground">
              <AlertCircle className="h-4 w-4 text-destructive" />
              Não foi possível carregar suas denúncias agora.
            </CardContent>
          </Card>
        )}

        {!isLoading && !isError && reports.length === 0 && (
          <Card>
            <CardContent className="py-8 text-center text-sm text-muted-foreground">
              Você ainda não enviou nenhuma denúncia.
            </CardContent>
          </Card>
        )}

        {reports.map((report) => (
          <Card key={report.id} data-my-report={report.id}>
            <CardContent className="space-y-2 py-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="text-sm font-semibold text-foreground">
                  {reportReasonLabel(report.reason as never)}
                </span>
                <Badge variant={statusVariant(report.status)}>
                  {COMMUNITY_REPORT_STATUS_LABELS[report.status]}
                </Badge>
              </div>
              <p className="text-xs text-muted-foreground">
                {report.target_kind === "post" ? "Publicação" : "Comentário"} ·{" "}
                {formatDate(report.created_at)}
              </p>
              {report.content_snapshot && (
                <p className="line-clamp-2 rounded-md bg-muted/40 px-3 py-2 text-xs text-muted-foreground">
                  {report.content_snapshot}
                </p>
              )}
            </CardContent>
          </Card>
        ))}
      </div>
    </DashboardLayout>
  );
}
