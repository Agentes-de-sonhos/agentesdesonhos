import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { ExternalLink, Loader2 } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

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
  const { data: news, isLoading } = useQuery({
    queryKey: ["curated-news-dashboard"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("noticias_dashboard")
        .select("*")
        .eq("status", "aprovado")
        .order("relevancia_score", { ascending: false })
        .limit(5);
      if (error) throw error;
      return data as CuratedNews[];
    },
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

  const destaque = news.find((n) => n.tipo_exibicao === "destaque");
  const secundarias = news.filter((n) => n !== destaque).slice(0, 4);

  return (
    <Card className="border-0 shadow-md hover:shadow-lg transition-shadow duration-300">
      <CardContent className="pt-6 space-y-1">
        {/* Destaque */}
        {destaque && (
          <a
            href={destaque.url_original}
            target="_blank"
            rel="noopener noreferrer"
            className="group block rounded-xl p-4 -mx-1 transition-all duration-200 hover:bg-[hsl(var(--section-news))]/5 border-b pb-4 mb-2"
          >
            <div className="flex items-center gap-2 mb-2">
              <Badge className="bg-primary/15 text-primary border-0 text-[10px] uppercase tracking-wider font-semibold">
                Destaque
              </Badge>
              <Badge variant="secondary" className="text-xs bg-[hsl(var(--section-news))]/10 text-[hsl(var(--section-news))]">
                {destaque.categoria}
              </Badge>
            </div>
            <h3 className="font-semibold text-foreground group-hover:text-[hsl(var(--section-news))] transition-colors text-base leading-snug">
              {destaque.titulo_curto}
            </h3>
            <p className="text-sm text-muted-foreground mt-1.5 line-clamp-2">
              {destaque.resumo}
            </p>
            <div className="flex items-center gap-2 mt-2">
              <span className="text-xs text-muted-foreground">{destaque.fonte}</span>
              <span className="text-xs text-muted-foreground">•</span>
              <span className="text-xs text-muted-foreground">{formatDate(destaque.data_publicacao)}</span>
              <ExternalLink className="h-3 w-3 ml-auto text-[hsl(var(--section-news))] opacity-0 group-hover:opacity-100 transition-opacity" />
            </div>
          </a>
        )}

        {/* Secundárias */}
        {secundarias.map((item) => (
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
                <Badge variant="secondary" className="text-[10px] bg-[hsl(var(--section-news))]/10 text-[hsl(var(--section-news))]">
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
      </CardContent>
    </Card>
  );
}
