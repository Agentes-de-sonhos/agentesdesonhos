import { useQuery } from "@tanstack/react-query";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Newspaper, ExternalLink, Loader2 } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";

export default function Noticias() {
  const { data: news, isLoading } = useQuery({
    queryKey: ["all-news"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("news")
        .select("*")
        .eq("is_active", true)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  function formatDate(dateString: string): string {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffHours < 1) return "Agora";
    if (diffHours < 24) return `Há ${diffHours} hora${diffHours > 1 ? "s" : ""}`;
    if (diffDays === 1) return "Ontem";
    if (diffDays < 7) return `${diffDays} dias atrás`;
    return date.toLocaleDateString("pt-BR", { day: "2-digit", month: "short", year: "numeric" });
  }

  return (
    <DashboardLayout>
      <div className="space-y-8 animate-fade-in">
        <div>
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl gradient-primary">
              <Newspaper className="h-6 w-6 text-primary-foreground" />
            </div>
            <div>
              <h1 className="font-display text-3xl font-bold text-foreground">
                Notícias
              </h1>
              <p className="text-muted-foreground">
                Fique por dentro das novidades do turismo
              </p>
            </div>
          </div>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : news?.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            <Newspaper className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>Nenhuma notícia disponível no momento</p>
          </div>
        ) : (
          <div className="space-y-4">
            {news?.map((item) => (
              <a
                key={item.id}
                href={item.url}
                target="_blank"
                rel="noopener noreferrer"
                className="block"
              >
                <Card className="group shadow-card transition-all duration-300 hover:-translate-y-1 hover:shadow-card-hover">
                  <CardContent className="p-6">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <Badge variant="secondary">{item.category}</Badge>
                          <span className="text-xs text-muted-foreground">
                            {item.source} • {formatDate(item.created_at)}
                          </span>
                        </div>
                        <h3 className="font-display text-lg font-semibold text-foreground group-hover:text-primary transition-colors">
                          {item.title}
                        </h3>
                      </div>
                      <ExternalLink className="h-5 w-5 flex-shrink-0 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100" />
                    </div>
                  </CardContent>
                </Card>
              </a>
            ))}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
