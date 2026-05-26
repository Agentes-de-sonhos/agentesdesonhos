import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Calendar, MapPin, ImageIcon, Wand2, Star, Users } from "lucide-react";
import { useItineraryTemplates, type ItineraryTemplate } from "@/hooks/useItineraryTemplates";
import { InstantiateTemplateDialog } from "./InstantiateTemplateDialog";
import { TRIP_PROFILE_LABELS } from "@/types/itinerary";
import { useNavigate } from "react-router-dom";

const STYLE_LABELS: Record<string, string> = {
  economico: "Econômico",
  moderado: "Moderado",
  luxo: "Premium",
};

interface Props {
  emptyTitle?: string;
  emptyDescription?: string;
}

export function TemplatesGrid({ emptyTitle, emptyDescription }: Props) {
  const { templates, isLoading } = useItineraryTemplates();
  const navigate = useNavigate();
  const [instantiate, setInstantiate] = useState<ItineraryTemplate | null>(null);

  if (isLoading) {
    return <div className="text-sm text-muted-foreground py-12 text-center">Carregando modelos...</div>;
  }

  if (templates.length === 0) {
    return (
      <Card className="p-10 text-center">
        <Star className="mx-auto h-12 w-12 text-muted-foreground" />
        <h3 className="mt-4 font-display text-lg font-semibold">
          {emptyTitle ?? "Nenhum modelo salvo ainda"}
        </h3>
        <p className="mt-2 text-sm text-muted-foreground max-w-md mx-auto">
          {emptyDescription ??
            "Crie um roteiro e use a ação ‘Salvar como modelo’ para reaproveitar a estrutura em futuras viagens."}
        </p>
        <Button variant="outline" className="mt-4" onClick={() => navigate("/ferramentas-ia/modelos-roteiros")}>
          Abrir biblioteca de modelos
        </Button>
      </Card>
    );
  }

  return (
    <>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {templates.map((t) => (
          <Card key={t.id} className="overflow-hidden hover:shadow-md transition-shadow">
            <div className="relative aspect-[16/10] w-full bg-muted">
              {t.cover_image_url ? (
                <img src={t.cover_image_url} alt={t.name} className="absolute inset-0 h-full w-full object-cover" loading="lazy" />
              ) : (
                <div className="absolute inset-0 flex items-center justify-center text-muted-foreground">
                  <ImageIcon className="h-8 w-8" />
                </div>
              )}
              <div className="absolute bottom-2 left-2">
                <Badge variant="secondary" className="bg-background/90 backdrop-blur text-xs">
                  <Calendar className="mr-1 h-3 w-3" />
                  {t.nights_count} noites
                </Badge>
              </div>
            </div>
            <CardContent className="p-4 space-y-2.5">
              <h3 className="font-display font-semibold text-base leading-tight line-clamp-1">{t.name}</h3>
              {t.destination && (
                <div className="flex items-center text-xs text-muted-foreground gap-1">
                  <MapPin className="h-3 w-3" />
                  <span className="line-clamp-1">{t.destination}</span>
                </div>
              )}
              <div className="flex flex-wrap items-center gap-1.5">
                <Badge variant="outline" className="text-[10px]">{STYLE_LABELS[t.style] ?? t.style}</Badge>
                <Badge variant="outline" className="text-[10px]">
                  <Users className="mr-0.5 h-2.5 w-2.5" />
                  {TRIP_PROFILE_LABELS[t.profile as keyof typeof TRIP_PROFILE_LABELS] ?? t.profile}
                </Badge>
                {(t.activities_count ?? 0) > 0 && (
                  <Badge variant="outline" className="text-[10px]">{t.activities_count} atividades</Badge>
                )}
              </div>
              <Button className="w-full mt-2" size="sm" onClick={() => setInstantiate(t)}>
                <Wand2 className="mr-1.5 h-3.5 w-3.5" />
                Criar roteiro a partir deste
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>

      {instantiate && (
        <InstantiateTemplateDialog
          open={!!instantiate}
          onOpenChange={(o) => { if (!o) setInstantiate(null); }}
          template={instantiate}
        />
      )}
    </>
  );
}