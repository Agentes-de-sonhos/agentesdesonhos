import { useState } from "react";
import { Check, X, ThumbsUp, ThumbsDown, PlusCircle, Clock, Building2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAdminHotelRecommendations, useApproveRecommendation } from "@/hooks/useHotelRecommendations";
import { toast } from "sonner";
import { Skeleton } from "@/components/ui/skeleton";

const TYPE_CONFIG = {
  recommend: { label: "Recomendação", icon: ThumbsUp, color: "bg-primary/10 text-primary" },
  remove: { label: "Remoção", icon: ThumbsDown, color: "bg-destructive/10 text-destructive" },
  suggest_new: { label: "Novo hotel", icon: PlusCircle, color: "bg-warning/10 text-warning" },
};

const STATUS_CONFIG = {
  pending: { label: "Pendente", variant: "outline" as const },
  approved: { label: "Aprovado", variant: "default" as const },
  rejected: { label: "Rejeitado", variant: "destructive" as const },
};

export function AdminHotelRecommendationsManager() {
  const [tab, setTab] = useState("pending");
  const { data: recs, isLoading } = useAdminHotelRecommendations();
  const approve = useApproveRecommendation();

  const filtered = (recs || []).filter((r: any) =>
    tab === "all" ? true : r.status === tab
  );

  const handleAction = (rec: any, approveAction: boolean) => {
    approve.mutate(
      { id: rec.id, approve: approveAction, recommendation: rec },
      {
        onSuccess: () =>
          toast.success(approveAction ? "Aprovado com sucesso!" : "Rejeitado."),
        onError: () => toast.error("Erro ao processar."),
      }
    );
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Building2 className="h-5 w-5" />
          Recomendações de Hotéis
        </CardTitle>
      </CardHeader>
      <CardContent>
        <Tabs value={tab} onValueChange={setTab}>
          <TabsList className="mb-4">
            <TabsTrigger value="pending" className="gap-1.5">
              <Clock className="h-3.5 w-3.5" /> Pendentes
              {(recs || []).filter((r: any) => r.status === "pending").length > 0 && (
                <Badge variant="destructive" className="ml-1 h-5 px-1.5 text-[10px]">
                  {(recs || []).filter((r: any) => r.status === "pending").length}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="approved">Aprovados</TabsTrigger>
            <TabsTrigger value="rejected">Rejeitados</TabsTrigger>
            <TabsTrigger value="all">Todos</TabsTrigger>
          </TabsList>

          <TabsContent value={tab}>
            {isLoading ? (
              <div className="space-y-3">
                {[1, 2, 3].map((i) => <Skeleton key={i} className="h-24 w-full rounded-lg" />)}
              </div>
            ) : filtered.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">
                Nenhuma recomendação {tab !== "all" ? STATUS_CONFIG[tab as keyof typeof STATUS_CONFIG]?.label.toLowerCase() : ""}.
              </p>
            ) : (
              <div className="space-y-3">
                {filtered.map((rec: any) => {
                  const typeConf = TYPE_CONFIG[rec.type as keyof typeof TYPE_CONFIG] || TYPE_CONFIG.recommend;
                  const TypeIcon = typeConf.icon;
                  const statusConf = STATUS_CONFIG[rec.status as keyof typeof STATUS_CONFIG] || STATUS_CONFIG.pending;

                  return (
                    <div key={rec.id} className="border border-border/50 rounded-lg p-4 space-y-2">
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium ${typeConf.color}`}>
                            <TypeIcon className="h-3.5 w-3.5" />
                            {typeConf.label}
                          </span>
                          <Badge variant={statusConf.variant}>{statusConf.label}</Badge>
                        </div>
                        {rec.status === "pending" && (
                          <div className="flex items-center gap-1.5 shrink-0">
                            <Button
                              size="sm"
                              variant="outline"
                              className="h-7 gap-1 text-success border-success/30 hover:bg-success/10"
                              onClick={() => handleAction(rec, true)}
                              disabled={approve.isPending}
                            >
                              <Check className="h-3.5 w-3.5" /> Aprovar
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              className="h-7 gap-1 text-destructive border-destructive/30 hover:bg-destructive/10"
                              onClick={() => handleAction(rec, false)}
                              disabled={approve.isPending}
                            >
                              <X className="h-3.5 w-3.5" /> Rejeitar
                            </Button>
                          </div>
                        )}
                      </div>

                      <div className="text-sm">
                        <span className="font-medium">{rec.profile_name}</span>
                        {rec.agency_name && (
                          <span className="text-muted-foreground"> • {rec.agency_name}</span>
                        )}
                      </div>

                      {rec.hotel_name && (
                        <p className="text-sm text-muted-foreground">
                          Hotel: <span className="font-medium text-foreground">{rec.hotel_name}</span>
                        </p>
                      )}

                      {rec.type === "suggest_new" && rec.hotel_data && (
                        <div className="text-xs bg-muted/50 rounded-md p-2 space-y-0.5">
                          <p><strong>Nome:</strong> {rec.hotel_data.name}</p>
                          <p><strong>Destino:</strong> {rec.hotel_data.destination}</p>
                          {rec.hotel_data.country && <p><strong>País:</strong> {rec.hotel_data.country}</p>}
                          {rec.hotel_data.category && <p><strong>Categoria:</strong> {rec.hotel_data.category}</p>}
                          {rec.hotel_data.star_rating && <p><strong>Estrelas:</strong> {rec.hotel_data.star_rating}</p>}
                        </div>
                      )}

                      <p className="text-sm text-muted-foreground italic">"{rec.reason}"</p>

                      <p className="text-xs text-muted-foreground/60">
                        {new Date(rec.created_at).toLocaleDateString("pt-BR", {
                          day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit",
                        })}
                      </p>
                    </div>
                  );
                })}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}
