import { useMemo, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { friendlyCurationError } from "@/lib/newsCurationErrors";
import { Crown, Loader2, Search, Sparkles, Trash2, TrendingUp, X } from "lucide-react";
import { spDateKey, spWeekStartKey } from "@/lib/newsRanking";
import { cn } from "@/lib/utils";

type CurationType = "daily" | "weekly" | "top5";

interface CurationItem {
  id: string;
  curation_type: CurationType;
  period_start: string;
  position: number | null;
  noticia_id: string;
  titulo_curto: string;
  fonte: string;
  categoria: string;
  data_publicacao: string;
  reads_count: number;
  likes_count: number;
}

interface CandidateNews {
  id: string;
  titulo_curto: string;
  fonte: string;
  categoria: string;
  data_publicacao: string;
  reads_count: number;
  likes_count: number;
}

function formatDateBr(value: string): string {
  const [y, m, d] = value.split("-").map(Number);
  if (!y || !m || !d) return value;
  return new Date(y, m - 1, d).toLocaleDateString("pt-BR");
}

export function AdminNewsHighlightsManager() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const today = spDateKey();
  const weekStart = spWeekStartKey();

  const [search, setSearch] = useState("");
  const [target, setTarget] = useState<{ type: CurationType; position?: number } | null>(null);

  const curationQuery = useQuery({
    queryKey: ["admin-news-curation", today, weekStart],
    queryFn: async () => {
      const { data, error } = await (supabase as any).rpc("admin_news_curation_list");
      if (error) throw error;
      return (data?.items ?? []) as CurationItem[];
    },
  });

  /** Notícias elegíveis: publicadas na semana corrente, aprovadas e visíveis. */
  const candidatesQuery = useQuery({
    queryKey: ["admin-news-curation-candidates", weekStart],
    queryFn: async () => {
      const start = new Date(`${weekStart}T00:00:00-03:00`).toISOString();
      const { data, error } = await (supabase.from("noticias_dashboard") as any)
        .select("id, titulo_curto, fonte, categoria, data_publicacao, reads_count, likes_count")
        .eq("status", "aprovado")
        .eq("hidden", false)
        .gte("data_publicacao", start)
        .order("data_publicacao", { ascending: false })
        .limit(200);
      if (error) throw error;
      return (data ?? []) as CandidateNews[];
    },
    enabled: !!target,
  });

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ["admin-news-curation"] });
    queryClient.invalidateQueries({ queryKey: ["news-highlights"] });
  };

  const setMutation = useMutation({
    mutationFn: async (vars: { type: CurationType; noticiaId: string; position?: number }) => {
      const { error } = await (supabase as any).rpc("admin_set_news_curation", {
        p_curation_type: vars.type,
        p_noticia_id: vars.noticiaId,
        p_position: vars.position ?? null,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast({ title: "Curadoria atualizada" });
      setTarget(null);
      setSearch("");
      invalidate();
    },
    onError: (e: unknown) =>
      toast({ title: "Não foi possível atualizar", description: friendlyCurationError(e), variant: "destructive" }),
  });

  const removeMutation = useMutation({
    mutationFn: async (vars: { type: CurationType; position?: number }) => {
      const { error } = await (supabase as any).rpc("admin_remove_news_curation", {
        p_curation_type: vars.type,
        p_position: vars.position ?? null,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast({ title: "Curadoria removida", description: "O ranking automático volta a valer." });
      invalidate();
    },
    onError: (e: unknown) =>
      toast({ title: "Não foi possível remover", description: friendlyCurationError(e), variant: "destructive" }),
  });

  const clearMutation = useMutation({
    mutationFn: async () => {
      const { error } = await (supabase as any).rpc("admin_clear_news_curation", { p_period_start: null });
      if (error) throw error;
    },
    onSuccess: () => {
      toast({ title: "Curadoria da semana limpa", description: "Tudo volta ao ranking automático." });
      invalidate();
    },
    onError: (e: unknown) =>
      toast({ title: "Não foi possível limpar", description: friendlyCurationError(e), variant: "destructive" }),
  });

  const items = curationQuery.data ?? [];
  const daily = items.find((i) => i.curation_type === "daily");
  const weekly = items.find((i) => i.curation_type === "weekly");
  const top5 = useMemo(() => {
    const map = new Map<number, CurationItem>();
    items.filter((i) => i.curation_type === "top5" && i.position).forEach((i) => map.set(i.position as number, i));
    return map;
  }, [items]);

  const usedIds = new Set(items.map((i) => i.noticia_id));

  const filteredCandidates = useMemo(() => {
    const q = search.trim().toLowerCase();
    return (candidatesQuery.data ?? []).filter((c) =>
      q ? `${c.titulo_curto} ${c.fonte} ${c.categoria}`.toLowerCase().includes(q) : true
    );
  }, [candidatesQuery.data, search]);

  const renderSlot = (
    label: string,
    item: CurationItem | undefined,
    type: CurationType,
    position?: number
  ) => {
    const isTarget = target?.type === type && target?.position === position;
    return (
      <div
        className={cn(
          "rounded-lg border p-3 space-y-2",
          item ? "border-primary/40 bg-primary/5" : "border-dashed border-border",
          isTarget && "ring-2 ring-primary/40"
        )}
      >
        <div className="flex items-center gap-2">
          <span className="text-xs font-bold uppercase tracking-wide text-muted-foreground">{label}</span>
          {item ? (
            <Badge variant="default" className="text-[10px]">Curadoria manual</Badge>
          ) : (
            <Badge variant="outline" className="text-[10px]">Ranking automático</Badge>
          )}
        </div>
        {item ? (
          <div className="space-y-1">
            <p className="text-sm font-medium leading-snug">{item.titulo_curto}</p>
            <p className="text-[11px] text-muted-foreground">
              {item.fonte} · {item.categoria} · {item.reads_count} leituras · {item.likes_count} curtidas
            </p>
          </div>
        ) : (
          <p className="text-xs text-muted-foreground">Nenhuma notícia definida manualmente.</p>
        )}
        <div className="flex items-center gap-2">
          <Button
            size="sm"
            variant={isTarget ? "secondary" : "outline"}
            onClick={() => setTarget(isTarget ? null : { type, position })}
          >
            {isTarget ? "Cancelar" : item ? "Trocar" : "Definir"}
          </Button>
          {item && (
            <Button
              size="sm"
              variant="ghost"
              className="text-destructive"
              onClick={() => removeMutation.mutate({ type, position })}
              disabled={removeMutation.isPending}
            >
              <X className="h-3.5 w-3.5 mr-1" /> Remover
            </Button>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      <Card className="border-0 shadow-md">
        <CardHeader className="flex flex-row items-start justify-between gap-4">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Crown className="h-5 w-5" />
              Destaques do Radar do Turismo
            </CardTitle>
            <p className="mt-1 text-xs text-muted-foreground">
              Vigência: dia <strong>{formatDateBr(today)}</strong> · semana a partir de{" "}
              <strong>{formatDateBr(weekStart)}</strong> (America/Sao_Paulo). Sem curadoria manual, tudo é
              definido pelo ranking automático (visualizações + curtidas).
            </p>
          </div>
          <Button
            size="sm"
            variant="outline"
            onClick={() => clearMutation.mutate()}
            disabled={clearMutation.isPending || items.length === 0}
          >
            <Trash2 className="h-4 w-4 mr-1" /> Limpar curadoria da semana
          </Button>
        </CardHeader>
        <CardContent className="space-y-5">
          {curationQuery.isLoading ? (
            <div className="flex justify-center py-8"><Loader2 className="h-5 w-5 animate-spin" /></div>
          ) : (
            <>
              <div className="grid gap-3 md:grid-cols-2">
                {renderSlot(`Notícia do Dia (${formatDateBr(today)})`, daily, "daily")}
                {renderSlot(`Notícia da Semana (${formatDateBr(weekStart)})`, weekly, "weekly")}
              </div>

              <div className="space-y-2">
                <Label className="flex items-center gap-2 text-sm">
                  <TrendingUp className="h-4 w-4" /> Top 5 da Semana
                </Label>
                <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                  {[1, 2, 3, 4, 5].map((p) => renderSlot(`Posição ${p}`, top5.get(p), "top5", p))}
                </div>
                <p className="text-[11px] text-muted-foreground">
                  Posições sem curadoria são preenchidas automaticamente pelo ranking orgânico da semana,
                  sem repetir notícias.
                </p>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {target && (
        <Card className="border-0 shadow-md">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Sparkles className="h-4 w-4" />
              Escolher notícia —{" "}
              {target.type === "daily"
                ? "Notícia do Dia"
                : target.type === "weekly"
                ? "Notícia da Semana"
                : `Top 5 · posição ${target.position}`}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="relative">
              <Search className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <Input
                className="pl-9"
                placeholder="Buscar entre as notícias da semana"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            {candidatesQuery.isLoading ? (
              <div className="flex justify-center py-8"><Loader2 className="h-5 w-5 animate-spin" /></div>
            ) : filteredCandidates.length === 0 ? (
              <p className="text-sm text-muted-foreground py-6 text-center">
                Nenhuma notícia elegível encontrada nesta semana.
              </p>
            ) : (
              <div className="max-h-[420px] overflow-y-auto divide-y divide-border/60">
                {filteredCandidates.map((c) => (
                  <div key={c.id} className="flex items-center gap-3 py-2">
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium truncate">{c.titulo_curto}</p>
                      <p className="text-[11px] text-muted-foreground">
                        {c.fonte} · {c.categoria} · {c.reads_count} leituras · {c.likes_count} curtidas
                      </p>
                    </div>
                    {usedIds.has(c.id) && (
                      <Badge variant="secondary" className="text-[10px] shrink-0">Já usada</Badge>
                    )}
                    <Button
                      size="sm"
                      onClick={() =>
                        setMutation.mutate({ type: target.type, noticiaId: c.id, position: target.position })
                      }
                      disabled={setMutation.isPending}
                    >
                      Selecionar
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}