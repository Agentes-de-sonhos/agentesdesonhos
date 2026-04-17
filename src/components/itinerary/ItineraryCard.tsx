import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { parseLocalDate } from "@/lib/dateParsing";
import {
  MapPin,
  Calendar,
  Users,
  MoreVertical,
  FileText,
  Link2,
  Pencil,
  Trash2,
  Eye,
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
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
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
}

export function ItineraryCard({
  itinerary,
  onView,
  onEdit,
  onDelete,
  onGeneratePDF,
  onPublish,
  onCopyLink,
}: ItineraryCardProps) {
  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="space-y-1">
            <CardTitle className="flex items-center gap-2 text-lg">
              <MapPin className="h-4 w-4 text-primary" />
              {itinerary.destination}
            </CardTitle>
            <CardDescription className="flex items-center gap-1">
              <Calendar className="h-3 w-3" />
              {format(parseLocalDate(itinerary.startDate), "dd/MM/yyyy", { locale: ptBR })}
              {" - "}
              {format(parseLocalDate(itinerary.endDate), "dd/MM/yyyy", { locale: ptBR })}
            </CardDescription>
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8">
                <MoreVertical className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => onView(itinerary.id)}>
                <Eye className="mr-2 h-4 w-4" />
                Visualizar
              </DropdownMenuItem>
              {itinerary.status !== "generating" && (
                <DropdownMenuItem onClick={() => onEdit(itinerary.id)}>
                  <Pencil className="mr-2 h-4 w-4" />
                  Editar
                </DropdownMenuItem>
              )}
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => onGeneratePDF(itinerary.id)}>
                <FileText className="mr-2 h-4 w-4" />
                Gerar PDF
              </DropdownMenuItem>
              {itinerary.status === "approved" && (
                <DropdownMenuItem onClick={() => onPublish(itinerary.id)}>
                  <Link2 className="mr-2 h-4 w-4" />
                  Publicar Link
                </DropdownMenuItem>
              )}
              {itinerary.status === "published" && itinerary.shareToken && (
                <DropdownMenuItem onClick={() => onCopyLink(itinerary.shareToken!)}>
                  <Link2 className="mr-2 h-4 w-4" />
                  Copiar Link
                </DropdownMenuItem>
              )}
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={() => onDelete(itinerary.id)}
                className="text-destructive focus:text-destructive"
              >
                <Trash2 className="mr-2 h-4 w-4" />
                Excluir
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </CardHeader>
      <CardContent>
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
    </Card>
  );
}
