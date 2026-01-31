import { useState } from "react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useNavigate } from "react-router-dom";
import {
  MapPin,
  Users,
  Calendar,
  DollarSign,
  MoreVertical,
  Edit2,
  Trash2,
  FileText,
  Wallet,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
import { OpportunityForm } from "./OpportunityForm";
import { useOpportunities } from "@/hooks/useCRM";
import type { Opportunity } from "@/types/crm";

interface OpportunityCardProps {
  opportunity: Opportunity;
  onDragStart: (e: React.DragEvent, id: string) => void;
}

function formatCurrency(value: number) {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(value);
}

export function OpportunityCard({ opportunity, onDragStart }: OpportunityCardProps) {
  const navigate = useNavigate();
  const { deleteOpportunity } = useOpportunities();
  const [isEditing, setIsEditing] = useState(false);
  const [showDeleteAlert, setShowDeleteAlert] = useState(false);
  const [showClosedDialog, setShowClosedDialog] = useState(false);

  const handleDelete = async () => {
    await deleteOpportunity(opportunity.id);
    setShowDeleteAlert(false);
  };

  const handleCreateQuote = () => {
    // Navigate to quote creation with pre-filled data
    navigate(`/ferramentas-ia/gerar-orcamento`, {
      state: {
        client_name: opportunity.client?.name,
        destination: opportunity.destination,
        start_date: opportunity.start_date,
        end_date: opportunity.end_date,
        adults_count: opportunity.passengers_count,
      },
    });
  };

  const handleCreateTripWallet = () => {
    navigate(`/ferramentas-ia/trip-wallet`, {
      state: {
        client_name: opportunity.client?.name,
        destination: opportunity.destination,
        start_date: opportunity.start_date,
        end_date: opportunity.end_date,
      },
    });
  };

  return (
    <>
      <Card
        draggable
        onDragStart={(e) => onDragStart(e, opportunity.id)}
        className="cursor-grab active:cursor-grabbing hover:shadow-md transition-shadow bg-card"
      >
        <CardContent className="p-3">
          <div className="flex items-start justify-between gap-2 mb-2">
            <div className="flex-1 min-w-0">
              <p className="font-medium text-sm truncate">{opportunity.client?.name}</p>
              <div className="flex items-center gap-1 text-xs text-muted-foreground">
                <MapPin className="h-3 w-3" />
                <span className="truncate">{opportunity.destination}</span>
              </div>
            </div>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="h-7 w-7 flex-shrink-0">
                  <MoreVertical className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => setIsEditing(true)}>
                  <Edit2 className="mr-2 h-4 w-4" /> Editar
                </DropdownMenuItem>
                <DropdownMenuItem onClick={handleCreateQuote}>
                  <FileText className="mr-2 h-4 w-4" /> Criar Orçamento
                </DropdownMenuItem>
                {opportunity.stage === "closed" && (
                  <DropdownMenuItem onClick={handleCreateTripWallet}>
                    <Wallet className="mr-2 h-4 w-4" /> Criar Carteira Digital
                  </DropdownMenuItem>
                )}
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={() => setShowDeleteAlert(true)}
                  className="text-destructive"
                >
                  <Trash2 className="mr-2 h-4 w-4" /> Excluir
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          <div className="space-y-1.5">
            {(opportunity.start_date || opportunity.end_date) && (
              <div className="flex items-center gap-1 text-xs text-muted-foreground">
                <Calendar className="h-3 w-3" />
                <span>
                  {opportunity.start_date && format(new Date(opportunity.start_date), "dd/MM", { locale: ptBR })}
                  {opportunity.start_date && opportunity.end_date && " - "}
                  {opportunity.end_date && format(new Date(opportunity.end_date), "dd/MM", { locale: ptBR })}
                </span>
              </div>
            )}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1 text-xs text-muted-foreground">
                <Users className="h-3 w-3" />
                <span>{opportunity.passengers_count} pax</span>
              </div>
              <Badge variant="secondary" className="text-xs">
                {formatCurrency(opportunity.estimated_value)}
              </Badge>
            </div>
          </div>
        </CardContent>
      </Card>

      <Dialog open={isEditing} onOpenChange={setIsEditing}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Editar Oportunidade</DialogTitle>
          </DialogHeader>
          <OpportunityForm
            opportunity={opportunity}
            onSuccess={() => setIsEditing(false)}
            onCancel={() => setIsEditing(false)}
          />
        </DialogContent>
      </Dialog>

      <AlertDialog open={showDeleteAlert} onOpenChange={setShowDeleteAlert}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir oportunidade?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground">
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
