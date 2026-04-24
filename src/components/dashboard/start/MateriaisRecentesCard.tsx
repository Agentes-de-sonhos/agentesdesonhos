import { useNavigate } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { FolderOpen, ArrowRight, Loader2 } from "lucide-react";
import { useMaterials } from "@/hooks/useMaterials";
import { useMemo } from "react";
import { SocialPostCard } from "@/components/materials/SocialPostCard";

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
    return groupIntoGalleries(recent).slice(0, 3);
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
            onClick={() => navigate("/materiais")}
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
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6 justify-items-center">
            {recentGalleries.map((gallery) => (
              <SocialPostCard key={gallery.id} gallery={gallery} />
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}