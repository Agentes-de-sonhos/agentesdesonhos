import { useNavigate } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { BookOpen, ArrowRight, MapPin } from "lucide-react";
import { usePlaybook } from "@/hooks/usePlaybook";
import { Skeleton } from "@/components/ui/skeleton";

export function PlaybookList() {
  const navigate = useNavigate();
  const { destinations, isLoading } = usePlaybook();

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {[1, 2, 3].map((i) => (
          <Card key={i}>
            <Skeleton className="h-36 rounded-t-lg" />
            <CardContent className="pt-4">
              <Skeleton className="h-5 w-3/4 mb-2" />
              <Skeleton className="h-4 w-full" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  if (destinations.length === 0) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <BookOpen className="h-14 w-14 mx-auto text-muted-foreground/30 mb-4" />
          <p className="text-lg font-semibold mb-1">Nenhum Playbook disponível</p>
          <p className="text-sm text-muted-foreground">
            Em breve serão adicionados playbooks comerciais para destinos populares.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <div className="p-2.5 rounded-xl bg-primary/10">
          <BookOpen className="h-5 w-5 text-primary" />
        </div>
        <div>
          <h2 className="text-lg font-bold text-foreground">Playbooks de Vendas</h2>
          <p className="text-xs text-muted-foreground">Guias estratégicos de vendas por destino ou produto</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {destinations.map((dest) => (
          <Card
            key={dest.id}
            className="group cursor-pointer border-0 shadow-sm hover:shadow-lg transition-all duration-300 overflow-hidden"
            onClick={() => navigate(`/playbook/${dest.slug}`)}
          >
            {dest.image_url ? (
              <div className="h-36 overflow-hidden">
                <img
                  src={dest.image_url}
                  alt={dest.name}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                />
              </div>
            ) : (
              <div className="h-36 bg-gradient-to-br from-primary/10 to-primary/20 flex items-center justify-center">
                <MapPin className="h-12 w-12 text-primary/30" />
              </div>
            )}
            <CardContent className="pt-4 pb-4">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <h3 className="font-bold text-foreground group-hover:text-primary transition-colors truncate">
                    {dest.name}
                  </h3>
                  {dest.description && (
                    <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{dest.description}</p>
                  )}
                </div>
                <ArrowRight className="h-4 w-4 text-muted-foreground group-hover:text-primary shrink-0 mt-1 transition-colors" />
              </div>
              <Badge variant="outline" className="mt-3 text-[10px]">
                <BookOpen className="h-3 w-3 mr-1" />
                14 módulos
              </Badge>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
