import { useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Loader2, Search, ExternalLink, Eye, Clock, User, MapPin, FileText, CreditCard, Map } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

const RESOURCE_TYPE_LABELS: Record<string, { label: string; icon: React.ElementType; color: string }> = {
  quote: { label: "Orçamento", icon: FileText, color: "bg-blue-100 text-blue-800" },
  trip: { label: "Carteira Digital", icon: CreditCard, color: "bg-green-100 text-green-800" },
  itinerary: { label: "Roteiro", icon: Map, color: "bg-purple-100 text-purple-800" },
  card: { label: "Cartão Virtual", icon: User, color: "bg-orange-100 text-orange-800" },
};

interface ResolvedResource {
  type: string;
  resource_id: string;
  owner_id: string | null;
  data: Record<string, unknown>;
}

export function AdminSupportMode() {
  const [urlInput, setUrlInput] = useState("");
  const { toast } = useToast();

  const resolveMutation = useMutation({
    mutationFn: async (url: string) => {
      const { data, error } = await supabase.functions.invoke("admin-resolve-resource", {
        body: { url },
      });
      if (error) throw new Error(error.message || "Erro ao resolver recurso");
      if (data?.error) throw new Error(data.error);
      return data as ResolvedResource;
    },
    onError: (err: Error) => {
      toast({ title: "Erro", description: err.message, variant: "destructive" });
    },
  });

  // Fetch owner profile when resolved
  const { data: ownerProfile } = useQuery({
    queryKey: ["admin-support-owner", resolveMutation.data?.owner_id],
    queryFn: async () => {
      if (!resolveMutation.data?.owner_id) return null;
      const { data } = await supabase.rpc("get_public_profile", {
        _user_id: resolveMutation.data.owner_id,
      });
      return data as any;
    },
    enabled: !!resolveMutation.data?.owner_id,
  });

  // Fetch recent logs
  const { data: recentLogs } = useQuery({
    queryKey: ["admin-support-logs"],
    queryFn: async () => {
      const { data } = await supabase
        .from("admin_resource_access_logs")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(20);
      return data || [];
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!urlInput.trim()) return;
    resolveMutation.mutate(urlInput.trim());
  };

  const resolved = resolveMutation.data;
  const typeInfo = resolved ? RESOURCE_TYPE_LABELS[resolved.type] : null;

  return (
    <div className="space-y-6">
      {/* Search */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Eye className="h-5 w-5" />
            Modo Suporte — Visualizar Recurso
          </CardTitle>
          <p className="text-sm text-muted-foreground">
            Cole o link público de um orçamento, carteira digital, roteiro ou cartão virtual para visualizar em modo suporte.
          </p>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="flex gap-3">
            <Input
              placeholder="Cole o link aqui — ex: https://seuorcamento.tur.br/agencia/abc123..."
              value={urlInput}
              onChange={(e) => setUrlInput(e.target.value)}
              className="flex-1"
            />
            <Button type="submit" disabled={resolveMutation.isPending || !urlInput.trim()}>
              {resolveMutation.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : (
                <Search className="h-4 w-4 mr-2" />
              )}
              Resolver
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* Result */}
      {resolved && typeInfo && (
        <Card className="border-2 border-primary/20">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Badge className={typeInfo.color}>
                  <typeInfo.icon className="h-3.5 w-3.5 mr-1" />
                  {typeInfo.label}
                </Badge>
                <span className="text-sm text-muted-foreground font-mono">
                  ID: {resolved.resource_id.substring(0, 8)}...
                </span>
              </div>
              <Badge variant="outline" className="text-xs">
                <Eye className="h-3 w-3 mr-1" />
                Somente visualização
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Resource details */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {resolved.data && Object.entries(resolved.data).map(([key, value]) => {
                if (key === "id" || key === "user_id" || key === "public_access_code" || !value) return null;
                const label = formatFieldLabel(key);
                return (
                  <div key={key} className="space-y-1">
                    <p className="text-xs font-medium text-muted-foreground uppercase">{label}</p>
                    <p className="text-sm">{formatFieldValue(key, value)}</p>
                  </div>
                );
              })}
            </div>

            {/* Owner info */}
            {ownerProfile && (
              <div className="border-t pt-4 mt-4">
                <p className="text-xs font-medium text-muted-foreground uppercase mb-2">Proprietário do Recurso</p>
                <div className="flex items-center gap-3">
                  {ownerProfile.avatar_url ? (
                    <img src={ownerProfile.avatar_url} alt="" className="h-10 w-10 rounded-full object-cover" />
                  ) : (
                    <div className="h-10 w-10 rounded-full bg-muted flex items-center justify-center">
                      <User className="h-5 w-5 text-muted-foreground" />
                    </div>
                  )}
                  <div>
                    <p className="font-medium text-sm">{ownerProfile.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {[ownerProfile.agency_name, ownerProfile.city, ownerProfile.state].filter(Boolean).join(" • ")}
                    </p>
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Recent access logs */}
      {recentLogs && recentLogs.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Clock className="h-4 w-4" />
              Acessos recentes em modo suporte
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {recentLogs.map((log: any) => {
                const logType = RESOURCE_TYPE_LABELS[log.resource_type];
                return (
                  <div key={log.id} className="flex items-center justify-between py-2 border-b last:border-0">
                    <div className="flex items-center gap-3">
                      {logType && (
                        <Badge variant="outline" className="text-xs">
                          {logType.label}
                        </Badge>
                      )}
                      <span className="text-xs font-mono text-muted-foreground">
                        {log.resource_id?.substring(0, 8)}...
                      </span>
                    </div>
                    <span className="text-xs text-muted-foreground">
                      {format(new Date(log.created_at), "dd/MM/yy HH:mm", { locale: ptBR })}
                    </span>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function formatFieldLabel(key: string): string {
  const labels: Record<string, string> = {
    client_name: "Cliente",
    destination: "Destino",
    status: "Status",
    total_amount: "Valor Total",
    start_date: "Início",
    end_date: "Fim",
    slug: "Slug",
    name: "Nome",
    agency_name: "Agência",
    is_active: "Ativo",
    travelers_count: "Viajantes",
    trip_type: "Tipo",
    budget_level: "Nível",
  };
  return labels[key] || key.replace(/_/g, " ");
}

function formatFieldValue(key: string, value: unknown): string {
  if (value === null || value === undefined) return "—";
  if (typeof value === "boolean") return value ? "Sim" : "Não";
  if (key === "total_amount" && typeof value === "number") {
    return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value);
  }
  if ((key === "start_date" || key === "end_date") && typeof value === "string") {
    try {
      return format(new Date(value), "dd/MM/yyyy", { locale: ptBR });
    } catch {
      return String(value);
    }
  }
  if (key === "status") {
    const statusLabels: Record<string, string> = {
      draft: "Rascunho",
      published: "Publicado",
      active: "Ativo",
      completed: "Concluído",
    };
    return statusLabels[String(value)] || String(value);
  }
  return String(value);
}
