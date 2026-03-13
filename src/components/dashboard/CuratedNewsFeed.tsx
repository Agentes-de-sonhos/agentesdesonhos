import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { ExternalLink, Loader2, ArrowRight, Newspaper } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";

interface CuratedNews {
  id: string;
  titulo_curto: string;
  resumo: string;
  categoria: string;
  fonte: string;
  url_original: string;
  relevancia_score: number;
  tipo_exibicao: string;
  data_publicacao: string;
}

function formatDate(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  if (diffHours < 1) return "Agora";
  if (diffHours < 24) return `Há ${diffHours}h`;
  if (diffDays === 1) return "Ontem";
  return date.toLocaleDateString("pt-BR", { day: "2-digit", month: "short" });
}

export function CuratedNewsFeed() {
  const navigate = useNavigate();
  const { data: news, isLoading } = useQuery({
    queryKey: ["curated-news-dashboard"],
    queryFn: async () => {
      const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
      const { data, error } = await supabase
        .from("noticias_dashboard")
        .select("*")
        .eq("status", "aprovado")
        .gte("data_publicacao", twentyFourHoursAgo)
        .order("data_publicacao", { ascending: false })
        .limit(5);
      if (error) throw error;
      return data as CuratedNews[];
    },
    refetchInterval: 5 * 60 * 1000,
  });

  if (isLoading) {
    return (
      <Card className="border-0 shadow-md">
        <CardContent className="flex justify-center py-8">
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  if (!news || news.length === 0) return null;

  const getCategoryColor = (categoria: string) => {
    const cat = categoria.toLowerCase();
    if (cat.includes("aéreo") || cat.includes("aereo") || cat.includes("aviação")) return "bg-sky-500/10 text-sky-600";
    if (cat.includes("cruzeiro") || cat.includes("marítimo")) return "bg-cyan-500/10 text-cyan-600";
    if (cat.includes("hotel") || cat.includes("hospedagem")) return "bg-amber-500/10 text-amber-600";
    if (cat.includes("evento")) return "bg-pink-500/10 text-pink-600";
    if (cat.includes("turismo") || cat.includes("destino")) return "bg-green-500/10 text-green-600";
    if (cat.includes("tecnologia") || cat.includes("digital")) return "bg-violet-500/10 text-violet-600";
    if (cat.includes("regulação") || cat.includes("governo") || cat.includes("política")) return "bg-red-500/10 text-red-600";
    if (cat.includes("econom") || cat.includes("mercado") || cat.includes("financ")) return "bg-emerald-500/10 text-emerald-600";
    if (cat.includes("sustentab") || cat.includes("meio ambiente")) return "bg-lime-500/10 text-lime-600";
    if (cat.includes("operador") || cat.includes("trade")) return "bg-blue-500/10 text-blue-600";
    return "bg-purple-500/10 text-purple-600";
  };

  return (
    <Card className="border-0 shadow-md hover:shadow-lg transition-shadow duration-300">
      <CardContent className="pt-6 space-y-1">
        <div className="mb-3">
          <h2 className="font-display text-base sm:text-lg font-semibold text-foreground flex items-center gap-2">
            <Newspaper className="h-5 w-5 text-[hsl(var(--section-news))]" />
            Radar do Turismo
          </h2>
          <div className="mt-2 h-1 w-16 rounded-full bg-[hsl(var(--section-news))]" />
        </div>
        {news.map((item) => (
          <a
            key={item.id}
            href={item.url_original}
            target="_blank"
            rel="noopener noreferrer"
            className="group flex items-start gap-3 rounded-xl p-3 transition-all duration-200 hover:bg-[hsl(var(--section-news))]/5"
          >
            <div className="flex-1 min-w-0">
              <h4 className="text-sm font-medium text-foreground group-hover:text-[hsl(var(--section-news))] transition-colors line-clamp-2">
                {item.titulo_curto}
              </h4>
              <div className="mt-1.5 flex items-center gap-2">
                <Badge variant="secondary" className={`text-[10px] border-0 ${getCategoryColor(item.categoria)}`}>
                  {item.categoria}
                </Badge>
                <span className="text-xs text-muted-foreground">{item.fonte}</span>
                <span className="text-xs text-muted-foreground">•</span>
                <span className="text-xs text-muted-foreground">{formatDate(item.data_publicacao)}</span>
              </div>
            </div>
            <ExternalLink className="h-4 w-4 flex-shrink-0 text-[hsl(var(--section-news))] opacity-0 transition-opacity group-hover:opacity-100 mt-0.5" />
          </a>
        ))}

        <div className="pt-3 border-t">
          <Button
            variant="ghost"
            className="w-full text-[hsl(var(--section-news))] hover:text-[hsl(var(--section-news))] hover:bg-[hsl(var(--section-news))]/5"
            onClick={() => navigate("/noticias")}
          >
            Mais notícias
            <ArrowRight className="h-4 w-4 ml-2" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
