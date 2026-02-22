import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Sparkles,
  Loader2,
  Check,
  X,
  Star,
  Pencil,
  RefreshCw,
  ArrowDown,
  ExternalLink,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";

interface NoticiasDashboard {
  id: string;
  titulo_curto: string;
  resumo: string;
  categoria: string;
  fonte: string;
  url_original: string;
  relevancia_score: number;
  tipo_exibicao: string;
  status: string;
  data_publicacao: string;
  created_at: string;
}

const CATEGORIAS = ["Aéreo", "Turismo", "Destinos", "Cruzeiros", "Mercado", "Eventos"];

export function AdminNewsCurationManager() {
  const [editingItem, setEditingItem] = useState<NoticiasDashboard | null>(null);
  const [editForm, setEditForm] = useState({ titulo_curto: "", resumo: "", categoria: "", tipo_exibicao: "" });
  const [filterStatus, setFilterStatus] = useState<string>("pendente");
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { user } = useAuth();

  const { data: noticias, isLoading } = useQuery({
    queryKey: ["admin-noticias-curadas", filterStatus],
    queryFn: async () => {
      let query = supabase
        .from("noticias_dashboard")
        .select("*")
        .order("relevancia_score", { ascending: false });

      if (filterStatus !== "todos") {
        query = query.eq("status", filterStatus);
      }

      const { data, error } = await query.limit(50);
      if (error) throw error;
      return data as NoticiasDashboard[];
    },
  });

  const collectMutation = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.functions.invoke("curate-news");
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["admin-noticias-curadas"] });
      toast({
        title: "Coleta concluída!",
        description: `${data.fetched || 0} notícias coletadas, ${data.curated || 0} curadas pela IA`,
      });
    },
    onError: (error) => {
      toast({
        title: "Erro na coleta",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<NoticiasDashboard> }) => {
      const { error } = await supabase.from("noticias_dashboard").update(data).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-noticias-curadas"] });
      queryClient.invalidateQueries({ queryKey: ["curated-news-dashboard"] });
      toast({ title: "Notícia atualizada!" });
    },
    onError: (error) => {
      toast({ title: "Erro", description: error.message, variant: "destructive" });
    },
  });

  const handleApprove = (id: string, tipo: string) => {
    updateMutation.mutate({
      id,
      data: {
        status: "aprovado",
        tipo_exibicao: tipo,
      } as any,
    });
  };

  const handleReject = (id: string) => {
    updateMutation.mutate({ id, data: { status: "rejeitado" } });
  };

  const handleEdit = (item: NoticiasDashboard) => {
    setEditingItem(item);
    setEditForm({
      titulo_curto: item.titulo_curto,
      resumo: item.resumo,
      categoria: item.categoria,
      tipo_exibicao: item.tipo_exibicao,
    });
  };

  const handleSaveEdit = () => {
    if (!editingItem) return;
    updateMutation.mutate({ id: editingItem.id, data: editForm });
    setEditingItem(null);
  };

  const getScoreColor = (score: number) => {
    if (score >= 9) return "text-green-600 bg-green-100";
    if (score >= 7) return "text-yellow-600 bg-yellow-100";
    return "text-red-600 bg-red-100";
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "pendente":
        return <Badge variant="outline" className="text-yellow-600 border-yellow-300">Pendente</Badge>;
      case "aprovado":
        return <Badge className="bg-green-600">Aprovado</Badge>;
      case "rejeitado":
        return <Badge variant="destructive">Rejeitado</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  return (
    <Card className="border-0 shadow-md">
      <CardHeader className="flex flex-row items-center justify-between flex-wrap gap-3">
        <CardTitle className="flex items-center gap-2">
          <Sparkles className="h-5 w-5 text-primary" />
          Curadoria IA de Notícias
        </CardTitle>
        <div className="flex items-center gap-2">
          <Select value={filterStatus} onValueChange={setFilterStatus}>
            <SelectTrigger className="w-[140px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="pendente">Pendentes</SelectItem>
              <SelectItem value="aprovado">Aprovados</SelectItem>
              <SelectItem value="rejeitado">Rejeitados</SelectItem>
              <SelectItem value="todos">Todos</SelectItem>
            </SelectContent>
          </Select>
          <Button
            size="sm"
            onClick={() => collectMutation.mutate()}
            disabled={collectMutation.isPending}
          >
            {collectMutation.isPending ? (
              <Loader2 className="h-4 w-4 mr-1 animate-spin" />
            ) : (
              <RefreshCw className="h-4 w-4 mr-1" />
            )}
            Coletar Agora
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin" />
          </div>
        ) : noticias?.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <Sparkles className="h-10 w-10 mx-auto mb-3 opacity-40" />
            <p>Nenhuma notícia {filterStatus !== "todos" ? filterStatus : ""} encontrada</p>
            <p className="text-sm mt-1">Clique em "Coletar Agora" para buscar novas notícias</p>
          </div>
        ) : (
          <div className="space-y-3">
            {noticias?.map((item) => (
              <div
                key={item.id}
                className="flex flex-col sm:flex-row sm:items-start gap-3 p-4 rounded-lg border bg-card"
              >
                <div className="flex-1 min-w-0 space-y-2">
                  <div className="flex items-center gap-2 flex-wrap">
                    <Badge variant="secondary">{item.categoria}</Badge>
                    <span className="text-xs text-muted-foreground">{item.fonte}</span>
                    <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${getScoreColor(item.relevancia_score)}`}>
                      <Star className="h-3 w-3 inline mr-0.5" />
                      {item.relevancia_score}/10
                    </span>
                    {item.tipo_exibicao === "destaque" && (
                      <Badge className="bg-primary/20 text-primary border-primary/30">Destaque</Badge>
                    )}
                    {getStatusBadge(item.status)}
                  </div>
                  <h4 className="font-medium text-foreground leading-tight">{item.titulo_curto}</h4>
                  <p className="text-sm text-muted-foreground line-clamp-2">{item.resumo}</p>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <span>{new Date(item.data_publicacao).toLocaleDateString("pt-BR")}</span>
                    <a
                      href={item.url_original}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-primary hover:underline inline-flex items-center gap-1"
                    >
                      Ver original <ExternalLink className="h-3 w-3" />
                    </a>
                  </div>
                </div>
                {item.status === "pendente" && (
                  <div className="flex sm:flex-col gap-2 flex-shrink-0">
                    <Button
                      size="sm"
                      variant="default"
                      onClick={() => handleApprove(item.id, "destaque")}
                      disabled={updateMutation.isPending}
                      className="text-xs"
                    >
                      <Star className="h-3 w-3 mr-1" />
                      Destaque
                    </Button>
                    <Button
                      size="sm"
                      variant="secondary"
                      onClick={() => handleApprove(item.id, "secundaria")}
                      disabled={updateMutation.isPending}
                      className="text-xs"
                    >
                      <Check className="h-3 w-3 mr-1" />
                      Aprovar
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => handleEdit(item)}
                      className="text-xs"
                    >
                      <Pencil className="h-3 w-3 mr-1" />
                      Editar
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => handleReject(item.id)}
                      disabled={updateMutation.isPending}
                      className="text-xs text-destructive hover:text-destructive"
                    >
                      <X className="h-3 w-3 mr-1" />
                      Rejeitar
                    </Button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </CardContent>

      {/* Edit Dialog */}
      <Dialog open={!!editingItem} onOpenChange={() => setEditingItem(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Editar Notícia</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Título Curto</Label>
              <Input
                value={editForm.titulo_curto}
                onChange={(e) => setEditForm({ ...editForm, titulo_curto: e.target.value })}
              />
            </div>
            <div>
              <Label>Resumo</Label>
              <Textarea
                value={editForm.resumo}
                onChange={(e) => setEditForm({ ...editForm, resumo: e.target.value })}
                rows={3}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Categoria</Label>
                <Select
                  value={editForm.categoria}
                  onValueChange={(v) => setEditForm({ ...editForm, categoria: v })}
                >
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {CATEGORIAS.map((c) => (
                      <SelectItem key={c} value={c}>{c}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Tipo</Label>
                <Select
                  value={editForm.tipo_exibicao}
                  onValueChange={(v) => setEditForm({ ...editForm, tipo_exibicao: v })}
                >
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="destaque">Destaque</SelectItem>
                    <SelectItem value="secundaria">Secundária</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <Button onClick={handleSaveEdit} className="w-full" disabled={updateMutation.isPending}>
              {updateMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Salvar Alterações
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
