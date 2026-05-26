import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { parseLocalDate } from "@/lib/dateParsing";
import {
  MapPin,
  Calendar,
  Users,
  FileText,
  Link2,
  Pencil,
  Trash2,
  Eye,
  Star,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
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
import { useState } from "react";
import { Itinerary } from "@/types/itinerary";

const statusLabels: Record<Itinerary["status"], string> = {
  draft: "Rascunho",
  generating: "Gerando...",
  review: "Em Revisão",
  approved: "Aprovado",
  published: "Publicado",
};

const statusColors: Record<Itinerary["status"], string> = {
  draft: "bg-gray-100 text-gray-700",
  generating: "bg-yellow-100 text-yellow-700",
  review: "bg-blue-100 text-blue-700",
  approved: "bg-green-100 text-green-700",
  published: "bg-purple-100 text-purple-700",
};

const tripTypeLabels: Record<string, string> = {
  familia: "Família",
  casal: "Casal",
  lua_de_mel: "Lua de Mel",
  sozinho: "Solo",
  corporativo: "Corporativo",
};

interface ItineraryCardProps {
  itinerary: Itinerary;
  onView: (id: string) => void;
  onEdit: (id: string) => void;
  onDelete: (id: string) => void;
  onGeneratePDF: (id: string) => void;
  onPublish: (id: string) => void;
  onCopyLink: (shareToken: string) => void;
  onSaveTemplate?: (id: string) => void;
}

export function ItineraryCard({
  itinerary,
  onView,
  onEdit,
  onDelete,
  onGeneratePDF,
  onPublish,
  onCopyLink,
  onSaveTemplate,
}: ItineraryCardProps) {
  const [confirmOpen, setConfirmOpen] = useState(false);

  const canPublish = itinerary.status === "approved";
  const canCopyLink = itinerary.status === "published" && itinerary.shareToken;

  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-2">
          <div className="space-y-1 min-w-0">
            <CardTitle className="flex items-center gap-2 text-lg">
              <MapPin className="h-4 w-4 text-primary shrink-0" />
              <span className="truncate">{itinerary.destination}</span>
            </CardTitle>
            <CardDescription className="flex items-center gap-1">
              <Calendar className="h-3 w-3" />
              {format(parseLocalDate(itinerary.startDate), "dd/MM/yyyy", { locale: ptBR })}
              {" - "}
              {format(parseLocalDate(itinerary.endDate), "dd/MM/yyyy", { locale: ptBR })}
            </CardDescription>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-3">
        {/* Action icons row */}
        <div className="flex items-center gap-1 flex-wrap">
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={() => onView(itinerary.id)}
            title="Visualizar"
          >
            <Eye className="h-4 w-4 text-muted-foreground" />
          </Button>
          {itinerary.status !== "generating" && (
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={() => onEdit(itinerary.id)}
              title="Editar"
            >
              <Pencil className="h-4 w-4 text-muted-foreground" />
            </Button>
          )}
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={() => onGeneratePDF(itinerary.id)}
            title="Gerar PDF"
          >
            <FileText className="h-4 w-4 text-muted-foreground" />
          </Button>
          {canPublish && (
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={() => onPublish(itinerary.id)}
              title="Publicar Link"
            >
              <Link2 className="h-4 w-4 text-muted-foreground" />
            </Button>
          )}
          {canCopyLink && (
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={() => onCopyLink(itinerary.shareToken!)}
              title="Copiar Link"
            >
              <Link2 className="h-4 w-4 text-primary" />
            </Button>
          )}
          {onSaveTemplate && (
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={() => onSaveTemplate(itinerary.id)}
              title="Salvar como modelo"
            >
              <Star className="h-4 w-4 text-muted-foreground" />
            </Button>
          )}
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={() => setConfirmOpen(true)}
            title="Excluir"
          >
            <Trash2 className="h-4 w-4 text-destructive" />
          </Button>
        </div>

        {/* Badges */}
        <div className="flex flex-wrap items-center gap-2">
          <Badge className={statusColors[itinerary.status]} variant="secondary">
            {statusLabels[itinerary.status]}
          </Badge>
          <Badge variant="outline">
            <Users className="mr-1 h-3 w-3" />
            {itinerary.travelersCount}
          </Badge>
          <Badge variant="outline">
            {tripTypeLabels[itinerary.tripType] || itinerary.tripType}
          </Badge>
        </div>
      </CardContent>

      <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir roteiro?</AlertDialogTitle>
            <AlertDialogDescription>
              O roteiro de {itinerary.destination} será excluído permanentemente. Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => onDelete(itinerary.id)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  );
}
