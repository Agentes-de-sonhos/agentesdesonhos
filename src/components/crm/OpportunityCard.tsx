import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
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
  MessageSquare,
  Tag,
  User,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
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
import { OpportunityDetailsDrawer } from "./OpportunityDetailsDrawer";
import { QuickLabelPicker } from "./QuickLabelPicker";
import { useOpportunities, useClients } from "@/hooks/useCRM";
import {
  useOpportunityNotesCounts,
  useOpportunityLabelAssignments,
} from "@/hooks/useOpportunityExtras";
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

const clientSchema = z.object({
  name: z.string().min(2, "Nome é obrigatório"),
  email: z.string().email("Email inválido").optional().or(z.literal("")),
  phone: z.string().optional(),
  city: z.string().optional(),
  notes: z.string().optional(),
});

type ClientFormData = z.infer<typeof clientSchema>;

export function OpportunityCard({ opportunity, onDragStart, isOverdue, stageColor }: OpportunityCardProps) {
  const navigate = useNavigate();
  const { deleteOpportunity } = useOpportunities();
  const { updateClient } = useClients();
  const notesCounts = useOpportunityNotesCounts();
  const { byOpportunity } = useOpportunityLabelAssignments();
  const [isEditing, setIsEditing] = useState(false);
  const [showDeleteAlert, setShowDeleteAlert] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [showDetails, setShowDetails] = useState(false);
  const [showLabels, setShowLabels] = useState(false);
  const [showEditClient, setShowEditClient] = useState(false);

  const notesCount = notesCounts[opportunity.id] || 0;
  const appliedLabels = byOpportunity[opportunity.id] || [];

  const clientForm = useForm<ClientFormData>({
    resolver: zodResolver(clientSchema),
    defaultValues: {
      name: opportunity.client?.name || "",
      email: opportunity.client?.email || "",
      phone: opportunity.client?.phone || "",
      city: opportunity.client?.city || "",
      notes: opportunity.client?.notes || "",
    },
  });

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

  const handleEditClientClick = () => {
    if (opportunity.client) {
      clientForm.reset({
        name: opportunity.client.name,
        email: opportunity.client.email || "",
        phone: opportunity.client.phone || "",
        city: opportunity.client.city || "",
        notes: opportunity.client.notes || "",
      });
    }
    setShowEditClient(true);
  };

  const handleUpdateClient = async (data: ClientFormData) => {
    if (!opportunity.client) return;
    await updateClient({
      id: opportunity.client.id,
      name: data.name,
      email: data.email || null,
      phone: data.phone || null,
      city: data.city || null,
      notes: data.notes || null,
    });
    setShowEditClient(false);
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
        onClick={(e) => {
          // Avoid opening when interacting with menu/buttons
          if ((e.target as HTMLElement).closest("button, [role='menuitem'], [role='menu']"))
            return;
          setShowDetails(true);
        }}
        className={cn(
          "cursor-grab active:cursor-grabbing transition-all hover:shadow-lg hover:-translate-y-0.5 bg-card border",
          isOverdue && "ring-2 ring-destructive/60 shadow-destructive/10"
        )}
      >
        <CardContent className="p-3.5">
          {/* Labels strip (top) */}
          {appliedLabels.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mb-2.5">
              {appliedLabels.slice(0, 3).map((label) => {
                // Calculate contrast color based on luminance
                const hex = label.color.replace("#", "");
                const r = parseInt(hex.substring(0, 2), 16);
                const g = parseInt(hex.substring(2, 4), 16);
                const b = parseInt(hex.substring(4, 6), 16);
                const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
                const textColor = luminance > 0.6 ? "#1a1a1a" : "#ffffff";
                return (
                  <span
                    key={label.id}
                    className="inline-flex items-center rounded-full px-2.5 py-0.5 text-[10px] font-semibold"
                    style={{
                      backgroundColor: label.color,
                      color: textColor,
                    }}
                    title={label.name}
                  >
                    {label.name}
                  </span>
                );
              })}
              {appliedLabels.length > 3 && (
                <span className="inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium bg-muted text-muted-foreground">
                  +{appliedLabels.length - 3}
                </span>
              )}
            </div>
          )}

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
                <DropdownMenuItem onClick={() => setShowLabels(true)}>
                  <Tag className="mr-2 h-4 w-4" /> Etiquetas
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setShowDetails(true)}>
                  <MessageSquare className="mr-2 h-4 w-4" /> Anotações
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setIsEditing(true)}>
                  <Edit2 className="mr-2 h-4 w-4" /> Editar oportunidade
                </DropdownMenuItem>
                <DropdownMenuItem onClick={handleEditClientClick}>
                  <User className="mr-2 h-4 w-4" /> Editar cliente
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
            <div className="flex items-center justify-between gap-2 pt-1.5 border-t border-border/50">
              <div className="flex items-center gap-1 text-[11px] text-muted-foreground/70">
                <Clock className="h-3 w-3" />
                <span>Há {timeInStage} nesta etapa</span>
              </div>
              {notesCount > 0 && (
                <div
                  className="flex items-center gap-1 text-[11px] text-muted-foreground"
                  title={`${notesCount} anotação(ões)`}
                >
                  <MessageSquare className="h-3 w-3" />
                  <span>{notesCount}</span>
                </div>
              )}
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

      {/* Edit Client Dialog */}
      <Dialog open={showEditClient} onOpenChange={setShowEditClient}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Editar Cliente</DialogTitle>
          </DialogHeader>
          <Form {...clientForm}>
            <form onSubmit={clientForm.handleSubmit(handleUpdateClient)} className="space-y-4">
              <FormField
                control={clientForm.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Nome Completo *</FormLabel>
                    <FormControl>
                      <Input placeholder="Nome do cliente" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <div className="grid gap-4 sm:grid-cols-2">
                <FormField
                  control={clientForm.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Email</FormLabel>
                      <FormControl>
                        <Input type="email" placeholder="email@exemplo.com" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={clientForm.control}
                  name="phone"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Telefone/WhatsApp</FormLabel>
                      <FormControl>
                        <Input placeholder="Número de telefone" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              <FormField
                control={clientForm.control}
                name="city"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Cidade</FormLabel>
                    <FormControl>
                      <Input placeholder="São Paulo, SP" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={clientForm.control}
                name="notes"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Observações</FormLabel>
                    <FormControl>
                      <Textarea placeholder="Anotações sobre o cliente..." {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <div className="flex justify-end gap-2">
                <Button type="button" variant="outline" onClick={() => setShowEditClient(false)}>
                  Cancelar
                </Button>
                <Button type="submit" disabled={clientForm.formState.isSubmitting}>
                  Salvar
                </Button>
              </div>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      <OpportunityHistoryDialog
        opportunityId={opportunity.id}
        open={showHistory}
        onOpenChange={setShowHistory}
      />

      <OpportunityDetailsDrawer
        opportunity={opportunity}
        open={showDetails}
        onOpenChange={setShowDetails}
      />

      <QuickLabelPicker
        opportunityId={opportunity.id}
        open={showLabels}
        onOpenChange={setShowLabels}
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
