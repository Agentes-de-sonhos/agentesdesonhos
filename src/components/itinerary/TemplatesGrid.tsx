import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Calendar,
  MapPin,
  ImageIcon,
  Wand2,
  Star,
  Users,
  Trash2,
  Loader2,
} from "lucide-react";
import { useItineraryTemplates, type ItineraryTemplate } from "@/hooks/useItineraryTemplates";
import { InstantiateTemplateDialog } from "./InstantiateTemplateDialog";
import { TRIP_PROFILE_LABELS } from "@/types/itinerary";
import { useNavigate } from "react-router-dom";
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
import { cn } from "@/lib/utils";

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
  const { templates, isLoading, deleteTemplate } = useItineraryTemplates();
  const navigate = useNavigate();
  const [instantiate, setInstantiate] = useState<ItineraryTemplate | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<ItineraryTemplate | null>(null);

  const handleDelete = () => {
    if (!deleteTarget) return;
    deleteTemplate.mutate(deleteTarget.id);
    setDeleteTarget(null);
  };

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
          <Card key={t.id} className="overflow-hidden hover:shadow-md transition-shadow group">
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
              <div className="flex items-start justify-between gap-2">
                <h3 className="font-display font-semibold text-base leading-tight line-clamp-1">{t.name}</h3>
                <button
                  type="button"
                  onClick={() => setDeleteTarget(t)}
                  aria-label="Excluir modelo"
                  className={cn(
                    "inline-flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-md text-muted-foreground/80 transition-colors",
                    "hover:bg-rose-50 hover:text-rose-600 focus-visible:bg-muted focus-visible:text-foreground"
                  )}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
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
                {deleteTemplate.isPending && deleteTarget?.id === t.id ? (
                  <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                ) : (
                  <Wand2 className="mr-1.5 h-3.5 w-3.5" />
                )}
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

      <AlertDialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir modelo</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir o modelo "{deleteTarget?.name}"? Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setDeleteTarget(null)}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={deleteTemplate.isPending}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleteTemplate.isPending && <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />}
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
