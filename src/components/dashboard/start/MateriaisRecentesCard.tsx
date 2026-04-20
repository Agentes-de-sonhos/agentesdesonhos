import { useNavigate } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { FolderOpen, ArrowRight, Loader2, ImageIcon } from "lucide-react";
import { useMaterials } from "@/hooks/useMaterials";
import { useMemo } from "react";

export function MateriaisRecentesCard() {
  const navigate = useNavigate();
  const { materials, isLoading, groupIntoGalleries } = useMaterials();

  const recentGalleries = useMemo(() => {
    if (!materials) return [];
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    const recent = materials.filter(
      (m) => new Date(m.published_at).getTime() >= sevenDaysAgo.getTime()
    );
    return groupIntoGalleries(recent).slice(0, 4);
  }, [materials, groupIntoGalleries]);

  return (
    <Card className="border-0 shadow-card">
      <CardContent className="pt-5 pb-5 space-y-4">
        <div className="flex items-start justify-between gap-3 flex-wrap">
          <div className="w-fit">
            <h2 className="font-display text-base sm:text-lg font-semibold text-foreground flex items-center gap-2">
              <FolderOpen className="h-5 w-5 text-primary" />
              Materiais de Divulgação
            </h2>
            <div className="mt-2 h-1 w-full rounded-full bg-primary" />
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate("/materiais-divulgacao")}
            className="text-primary hover:text-primary"
          >
            Ver todos
            <ArrowRight className="ml-1 h-4 w-4" />
          </Button>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : recentGalleries.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground text-sm">
            Nenhum material novo nos últimos 7 dias.
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {recentGalleries.map((gallery) => (
              <button
                key={gallery.id}
                onClick={() => navigate("/materiais-divulgacao")}
                className="group rounded-xl overflow-hidden border border-border bg-card hover:shadow-md transition-all text-left"
              >
                <div className="aspect-[3/4] bg-muted relative overflow-hidden">
                  {gallery.thumbnail_url ? (
                    <img
                      src={gallery.thumbnail_url}
                      alt={gallery.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      loading="lazy"
                    />
                  ) : (
                    <div className="flex items-center justify-center h-full">
                      <ImageIcon className="h-8 w-8 text-muted-foreground/40" />
                    </div>
                  )}
                  <div className="absolute top-2 right-2 bg-background/90 backdrop-blur-sm rounded-full px-2 py-0.5 text-[10px] font-medium">
                    {gallery.materials.length} {gallery.materials.length === 1 ? "arquivo" : "arquivos"}
                  </div>
                </div>
                <div className="p-2">
                  <p className="text-xs font-medium text-foreground line-clamp-1">
                    {gallery.tour_operators?.name || "Material"}
                  </p>
                  <p className="text-[10px] text-muted-foreground line-clamp-1 mt-0.5">
                    {gallery.title}
                  </p>
                </div>
              </button>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}