import { useState } from "react";
import { format, formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useNavigate } from "react-router-dom";
import {
  MapPin,
  Users,
  Calendar,
  MoreVertical,
  Edit2,
  Trash2,
  FileText,
  Wallet,
  History,
  Clock,
  AlertTriangle,
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
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { OpportunityForm } from "./OpportunityForm";
import { OpportunityHistoryDialog } from "./OpportunityHistoryDialog";
import { useOpportunities } from "@/hooks/useCRM";
import { STAGE_LABELS, STAGE_COLORS, STAGE_TEXT_COLORS, type Opportunity, type OpportunityStage } from "@/types/crm";
import { cn } from "@/lib/utils";

interface OpportunityCardProps {
  opportunity: Opportunity;
  onDragStart: (e: React.DragEvent, id: string) => void;
  isOverdue?: boolean;
  stageColor?: OpportunityStage;
}

function formatCurrency(value: number) {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(value);
}

export function OpportunityCard({ opportunity, onDragStart, isOverdue, stageColor }: OpportunityCardProps) {
  const navigate = useNavigate();
  const { deleteOpportunity } = useOpportunities();
  const [isEditing, setIsEditing] = useState(false);
  const [showDeleteAlert, setShowDeleteAlert] = useState(false);
  const [showHistory, setShowHistory] = useState(false);

  const handleDelete = async () => {
    await deleteOpportunity(opportunity.id);
    setShowDeleteAlert(false);
  };

  const handleCreateQuote = () => {
    const adults = opportunity.adults_count ?? opportunity.passengers_count ?? 1;
    const children = opportunity.children_count ?? 0;
    navigate(`/ferramentas-ia/gerar-orcamento`, {
      state: {
        opportunity_id: opportunity.id,
        client_id: opportunity.client_id,
        client_name: opportunity.client?.name,
        destination: opportunity.destination,
        start_date: opportunity.start_date,
        end_date: opportunity.end_date,
        adults_count: adults,
        children_count: children,
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

  const timeInStage = formatDistanceToNow(new Date(opportunity.stage_entered_at), {
    locale: ptBR,
    addSuffix: false,
  });

  return (
    <>
      <Card
        draggable
        onDragStart={(e) => onDragStart(e, opportunity.id)}
        className={cn(
          "cursor-grab active:cursor-grabbing transition-all hover:shadow-lg hover:-translate-y-0.5 bg-card border",
          isOverdue && "ring-2 ring-destructive/60 shadow-destructive/10"
        )}
      >
        <CardContent className="p-3.5">
          {/* Header: client name + menu */}
          <div className="flex items-start justify-between gap-2 mb-2.5">
            <div className="flex-1 min-w-0">
              <p className="font-bold text-sm text-foreground leading-tight truncate">
                {opportunity.client?.name}
              </p>
              <div className="flex items-center gap-1.5 mt-1">
                <MapPin className="h-3.5 w-3.5 text-primary flex-shrink-0" />
                <span className="text-xs font-medium text-foreground/80 truncate">
                  {opportunity.destination}
                </span>
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
                <DropdownMenuItem onClick={() => setShowHistory(true)}>
                  <History className="mr-2 h-4 w-4" /> Histórico
                </DropdownMenuItem>
                <DropdownMenuSeparator />
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

          {/* Key info */}
          <div className="space-y-2">
            {(opportunity.start_date || opportunity.end_date) && (
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <Calendar className="h-3.5 w-3.5" />
                <span>
                  {opportunity.start_date &&
                    format(new Date(opportunity.start_date), "dd/MM", { locale: ptBR })}
                  {opportunity.start_date && opportunity.end_date && " → "}
                  {opportunity.end_date &&
                    format(new Date(opportunity.end_date), "dd/MM", { locale: ptBR })}
                </span>
              </div>
            )}

            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 flex-wrap">
                <div className="flex items-center gap-1 text-xs text-muted-foreground">
                  <Users className="h-3.5 w-3.5" />
                  <span>
                    {(() => {
                      const adults = opportunity.adults_count ?? opportunity.passengers_count ?? 0;
                      const children = opportunity.children_count ?? 0;
                      const adultsLabel = `${adults} adulto${adults === 1 ? "" : "s"}`;
                      if (children > 0) {
                        return `${adultsLabel} + ${children} criança${children === 1 ? "" : "s"}`;
                      }
                      return adultsLabel;
                    })()}
                  </span>
                </div>
                {isOverdue && (
                  <Tooltip>
                    <TooltipTrigger>
                      <AlertTriangle className="h-3.5 w-3.5 text-destructive" />
                    </TooltipTrigger>
                    <TooltipContent>Follow-up atrasado!</TooltipContent>
                  </Tooltip>
                )}
              </div>
              <span className="text-sm font-bold text-foreground">
                {formatCurrency(opportunity.estimated_value)}
              </span>
            </div>

            {/* Time in stage - subtle */}
            <div className="flex items-center gap-1 text-[11px] text-muted-foreground/70 pt-1.5 border-t border-border/50">
              <Clock className="h-3 w-3" />
              <span>Há {timeInStage} nesta etapa</span>
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

      <OpportunityHistoryDialog
        opportunityId={opportunity.id}
        open={showHistory}
        onOpenChange={setShowHistory}
      />

      <AlertDialog open={showDeleteAlert} onOpenChange={setShowDeleteAlert}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir oportunidade?</AlertDialogTitle>
            <AlertDialogDescription>Esta ação não pode ser desfeita.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground"
            >
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
