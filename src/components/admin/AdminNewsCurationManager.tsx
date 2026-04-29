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
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
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
  Brain,
  Trash2,
  ChevronDown,
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
  score_perfil: number | null;
  aderencia_perfil: string | null;
  score_explicacao: string | null;
  tipo_exibicao: string;
  status: string;
  data_publicacao: string;
  created_at: string;
}

const CATEGORIAS = ["Aéreo", "Turismo", "Destinos", "Cruzeiros", "Mercado", "Eventos"];

const MOTIVOS_REJEICAO = [
  "Irrelevante para agentes",
  "Promocional / publicitária",
  "Duplicada",
  "Pouco interesse para o trade",
  "Fora do tema turismo B2B",
  "Conteúdo de baixa qualidade",
  "Notícia muito antiga",
  "Outro",
];

const MOTIVOS_APROVACAO = [
  "Alta relevância para o trade",
  "Tendência de mercado",
  "Impacto comercial direto",
  "Notícia de destino estratégico",
  "Movimento de operadora/cia aérea",
  "Evento importante",
  "Outro",
];

export function AdminNewsCurationManager() {
  const [editingItem, setEditingItem] = useState<NoticiasDashboard | null>(null);
  const [editForm, setEditForm] = useState({ titulo_curto: "", resumo: "", categoria: "", tipo_exibicao: "" });
  const [filterStatus, setFilterStatus] = useState<string>("pendente");
  const [sortOrder, setSortOrder] = useState<"desc" | "asc">("desc");
  const [filterCategoria, setFilterCategoria] = useState<string>("todas");
  const [filterFonte, setFilterFonte] = useState<string>("todas");
  const [decisionDialog, setDecisionDialog] = useState<{
    item: NoticiasDashboard;
    decisao: "aprovado" | "rejeitado";
    tipo?: string;
  } | null>(null);
  const [motivo, setMotivo] = useState<string>("");
  const [scoreFinal, setScoreFinal] = useState<number>(0);
  const [motivoCustom, setMotivoCustom] = useState<string>("");
  const [resetScope, setResetScope] = useState<null | "todas" | "pendente" | "rejeitado" | "aprovado">(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { user } = useAuth();

  // Estatísticas de aprendizado da curadoria
  const { data: stats } = useQuery({
    queryKey: ["news-curation-stats"],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("get_news_curation_stats");
      if (error) throw error;
      return data as {
        total_feedback: number;
        total_aprovados: number;
        total_rejeitados: number;
        feedback_30d: number;
        nivel_aderencia: "baixa" | "media" | "alta";
      };
    },
    staleTime: 60_000,
  });

  const { data: noticias, isLoading } = useQuery({
    queryKey: ["admin-noticias-curadas", filterStatus, sortOrder, filterCategoria, filterFonte],
    queryFn: async () => {
      let query = supabase
        .from("noticias_dashboard")
        .select("*")
        .order("data_publicacao", { ascending: sortOrder === "asc" });

      if (filterStatus !== "todos") {
        query = query.eq("status", filterStatus);
      }
      if (filterCategoria !== "todas") {
        query = query.eq("categoria", filterCategoria);
      }
      if (filterFonte !== "todas") {
        query = query.eq("fonte", filterFonte);
      }

      const { data, error } = await query.limit(100);
      if (error) throw error;
      return data as NoticiasDashboard[];
    },
  });

  // Extract unique sources for filter
  const { data: fontes } = useQuery({
    queryKey: ["admin-noticias-fontes"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("noticias_dashboard")
        .select("fonte");
      if (error) throw error;
      const unique = [...new Set(data.map((d) => d.fonte))].sort();
      return unique;
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

  const openDecisionDialog = (
    item: NoticiasDashboard,
    decisao: "aprovado" | "rejeitado",
    tipo?: string
  ) => {
    setDecisionDialog({ item, decisao, tipo });
    setMotivo("");
    setMotivoCustom("");
    setScoreFinal(item.relevancia_score);
  };

  const decisionMutation = useMutation({
    mutationFn: async () => {
      if (!decisionDialog) return;
      const { item, decisao, tipo } = decisionDialog;
      const motivoFinal = motivo === "Outro" ? motivoCustom : motivo;

      // Atualiza notícia
      const updateData: any = { status: decisao };
      if (decisao === "aprovado") {
        updateData.tipo_exibicao = tipo || "secundaria";
        if (scoreFinal !== item.relevancia_score) {
          updateData.relevancia_score = scoreFinal;
        }
      }
      const { error: upErr } = await supabase
        .from("noticias_dashboard")
        .update(updateData)
        .eq("id", item.id);
      if (upErr) throw upErr;

      // Salva feedback para aprendizado da IA
      const { error: fbErr } = await supabase.from("news_curation_feedback").insert({
        noticia_id: item.id,
        titulo: item.titulo_curto,
        resumo: item.resumo,
        categoria: item.categoria,
        fonte: item.fonte,
        score_ia: item.relevancia_score,
        score_final: decisao === "aprovado" ? scoreFinal : null,
        decisao,
        motivo: motivoFinal || null,
        created_by: user?.id,
      });
      if (fbErr) throw fbErr;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-noticias-curadas"] });
      queryClient.invalidateQueries({ queryKey: ["curated-news-dashboard"] });
      toast({
        title: decisionDialog?.decisao === "aprovado" ? "Notícia aprovada!" : "Notícia rejeitada",
        description: "A IA vai aprender com essa decisão na próxima coleta.",
      });
      setDecisionDialog(null);
    },
    onError: (error: any) => {
      toast({ title: "Erro", description: error.message, variant: "destructive" });
    },
  });

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
      <CardHeader className="flex flex-col gap-3">
        <div className="flex flex-row items-center justify-between flex-wrap gap-3">
          <CardTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            Curadoria IA de Notícias
          </CardTitle>
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
        <div className="flex items-start gap-2 p-3 rounded-md bg-blue-50 border border-blue-200 text-xs text-blue-900">
          <Brain className="h-4 w-4 mt-0.5 flex-shrink-0 text-blue-600" />
          <div>
            <strong>Aprendizado ativo:</strong> a IA traz todas as notícias das últimas 24h como
            "pendentes" para você decidir. Cada aprovação ou rejeição com motivo é usada como
            exemplo na próxima coleta — quanto mais você curar, mais preciso fica o score.
          </div>
        </div>
        {stats && (
          <div className="flex items-center gap-3 p-3 rounded-md border bg-gradient-to-r from-violet-50 to-blue-50 text-xs flex-wrap">
            <Brain className="h-4 w-4 text-violet-600" />
            <span className="font-semibold text-violet-900">IA ajustada ao seu perfil:</span>
            <Badge
              className={
                stats.nivel_aderencia === "alta"
                  ? "bg-emerald-600 hover:bg-emerald-600"
                  : stats.nivel_aderencia === "media"
                  ? "bg-amber-500 hover:bg-amber-500"
                  : "bg-slate-400 hover:bg-slate-400"
              }
            >
              Aderência {stats.nivel_aderencia}
            </Badge>
            <span className="text-muted-foreground">
              {stats.total_feedback} decisões treinadas ({stats.total_aprovados} aprovadas, {stats.total_rejeitados} rejeitadas) — {stats.feedback_30d} nos últimos 30 dias
            </span>
          </div>
        )}
        <div className="flex items-center gap-2 flex-wrap">
          <Select value={filterStatus} onValueChange={setFilterStatus}>
            <SelectTrigger className="w-[130px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="pendente">Pendentes</SelectItem>
              <SelectItem value="aprovado">Aprovados</SelectItem>
              <SelectItem value="rejeitado">Rejeitados</SelectItem>
              <SelectItem value="todos">Todos</SelectItem>
            </SelectContent>
          </Select>
          <Select value={sortOrder} onValueChange={(v) => setSortOrder(v as "asc" | "desc")}>
            <SelectTrigger className="w-[160px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="desc">Mais recentes</SelectItem>
              <SelectItem value="asc">Mais antigas</SelectItem>
            </SelectContent>
          </Select>
          <Select value={filterCategoria} onValueChange={setFilterCategoria}>
            <SelectTrigger className="w-[140px]">
              <SelectValue placeholder="Categoria" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="todas">Todas categorias</SelectItem>
              {CATEGORIAS.map((c) => (
                <SelectItem key={c} value={c}>{c}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={filterFonte} onValueChange={setFilterFonte}>
            <SelectTrigger className="w-[160px]">
              <SelectValue placeholder="Fonte" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="todas">Todas fontes</SelectItem>
              {fontes?.map((f) => (
                <SelectItem key={f} value={f}>{f}</SelectItem>
              ))}
            </SelectContent>
          </Select>
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
                    {item.score_perfil != null && (
                      <span
                        title={item.score_explicacao || "Score ajustado ao seu padrão de curadoria"}
                        className={`text-xs font-bold px-2 py-0.5 rounded-full inline-flex items-center gap-1 border ${
                          item.score_perfil >= 8
                            ? "bg-violet-100 text-violet-700 border-violet-300"
                            : item.score_perfil >= 5
                            ? "bg-violet-50 text-violet-600 border-violet-200"
                            : "bg-slate-100 text-slate-600 border-slate-200"
                        }`}
                      >
                        <Brain className="h-3 w-3" />
                        Perfil {item.score_perfil}/10
                      </span>
                    )}
                    {item.tipo_exibicao === "destaque" && (
                      <Badge className="bg-primary/20 text-primary border-primary/30">Destaque</Badge>
                    )}
                    {getStatusBadge(item.status)}
                  </div>
                  <h4 className="font-medium text-foreground leading-tight">{item.titulo_curto}</h4>
                  <p className="text-sm text-muted-foreground line-clamp-2">{item.resumo}</p>
                  {item.score_explicacao && (
                    <p className="text-[11px] text-violet-700 italic flex items-start gap-1">
                      <Brain className="h-3 w-3 mt-0.5 flex-shrink-0" />
                      {item.score_explicacao}
                    </p>
                  )}
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
                      onClick={() => openDecisionDialog(item, "aprovado", "destaque")}
                      disabled={updateMutation.isPending}
                      className="text-xs"
                    >
                      <Star className="h-3 w-3 mr-1" />
                      Destaque
                    </Button>
                    <Button
                      size="sm"
                      variant="secondary"
                      onClick={() => openDecisionDialog(item, "aprovado", "secundaria")}
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
                      onClick={() => openDecisionDialog(item, "rejeitado")}
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

      {/* Decision Dialog (aprovar/rejeitar com motivo) */}
      <Dialog open={!!decisionDialog} onOpenChange={(open) => !open && setDecisionDialog(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {decisionDialog?.decisao === "aprovado" ? (
                <><Check className="h-5 w-5 text-green-600" /> Aprovar notícia</>
              ) : (
                <><X className="h-5 w-5 text-destructive" /> Rejeitar notícia</>
              )}
            </DialogTitle>
          </DialogHeader>
          {decisionDialog && (
            <div className="space-y-4">
              <div className="p-3 bg-muted rounded text-sm">
                <p className="font-medium">{decisionDialog.item.titulo_curto}</p>
                <p className="text-xs text-muted-foreground mt-1">
                  {decisionDialog.item.fonte} · IA sugeriu nota {decisionDialog.item.relevancia_score}/10
                </p>
              </div>

              {decisionDialog.decisao === "aprovado" && (
                <div>
                  <Label>Sua nota final (0-10)</Label>
                  <div className="flex items-center gap-2 mt-1">
                    <Input
                      type="number"
                      min={0}
                      max={10}
                      value={scoreFinal}
                      onChange={(e) => setScoreFinal(Math.max(0, Math.min(10, Number(e.target.value))))}
                    />
                    <span className="text-xs text-muted-foreground whitespace-nowrap">
                      A IA aprende com sua nota
                    </span>
                  </div>
                </div>
              )}

              <div>
                <Label>
                  Motivo {decisionDialog.decisao === "rejeitado" ? "(obrigatório)" : "(opcional)"}
                </Label>
                <Select value={motivo} onValueChange={setMotivo}>
                  <SelectTrigger className="mt-1">
                    <SelectValue placeholder="Selecione um motivo..." />
                  </SelectTrigger>
                  <SelectContent>
                    {(decisionDialog.decisao === "aprovado" ? MOTIVOS_APROVACAO : MOTIVOS_REJEICAO).map((m) => (
                      <SelectItem key={m} value={m}>{m}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {motivo === "Outro" && (
                <div>
                  <Label>Descreva o motivo</Label>
                  <Textarea
                    value={motivoCustom}
                    onChange={(e) => setMotivoCustom(e.target.value)}
                    rows={2}
                    placeholder="Explique brevemente..."
                  />
                </div>
              )}

              <Button
                onClick={() => decisionMutation.mutate()}
                className="w-full"
                variant={decisionDialog.decisao === "aprovado" ? "default" : "destructive"}
                disabled={
                  decisionMutation.isPending ||
                  (decisionDialog.decisao === "rejeitado" && !motivo) ||
                  (motivo === "Outro" && !motivoCustom.trim())
                }
              >
                {decisionMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                Confirmar {decisionDialog.decisao === "aprovado" ? "aprovação" : "rejeição"}
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </Card>
  );
}
