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
import { InternationalPhoneInput } from "@/components/ui/international-phone-input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Cake } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
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
import { usePipelineStages } from "@/hooks/usePipelineStages";
import {
  useOpportunityNotesCounts,
  useOpportunityLabelAssignments,
} from "@/hooks/useOpportunityExtras";
import { STAGE_LABELS, STAGE_COLORS, STAGE_TEXT_COLORS, CLIENT_STATUS_LABELS, type Opportunity, type OpportunityStage } from "@/types/crm";
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
  status: z.enum(["lead", "em_negociacao", "cliente_ativo", "fidelizado"]).optional(),
  travel_preferences: z.string().optional(),
  internal_notes: z.string().optional(),
  birthday_day: z.string().optional(),
  birthday_month: z.string().optional(),
  birthday_year: z.string().optional(),
});

type ClientFormData = z.infer<typeof clientSchema>;

export function OpportunityCard({ opportunity, onDragStart, isOverdue, stageColor }: OpportunityCardProps) {
  const navigate = useNavigate();
  const { deleteOpportunity } = useOpportunities();
  const { updateClient } = useClients();
  const { user } = useAuth();
  const notesCounts = useOpportunityNotesCounts();
  const { byOpportunity } = useOpportunityLabelAssignments();
  const { stages } = usePipelineStages();
  // Show "Gerar Orçamento" only up to the stage immediately before "Orçamento Enviado"
  const quoteSentStage = stages.find((s) => s.legacy_key === "quote_sent");
  const currentStage = stages.find(
    (s) => s.id === opportunity.stage_id || s.legacy_key === opportunity.stage
  );
  const canGenerateQuote =
    !quoteSentStage ||
    !currentStage ||
    currentStage.position < quoteSentStage.position;
  const [isEditing, setIsEditing] = useState(false);
  const [showDeleteAlert, setShowDeleteAlert] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [showDetails, setShowDetails] = useState(false);
  const [showLabels, setShowLabels] = useState(false);
  const [showEditClient, setShowEditClient] = useState(false);
  const [linkedDialog, setLinkedDialog] = useState<null | {
    kind: "quote" | "trip";
    existingId: string;
  }>(null);
  const [isCheckingLink, setIsCheckingLink] = useState(false);

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
      status: (opportunity.client?.status as any) || "lead",
      travel_preferences: opportunity.client?.travel_preferences || "",
      internal_notes: opportunity.client?.internal_notes || "",
      birthday_day: opportunity.client?.birthday_day?.toString() || "",
      birthday_month: opportunity.client?.birthday_month?.toString() || "",
      birthday_year: opportunity.client?.birthday_year?.toString() || "",
    },
  });

  const handleDelete = async () => {
    await deleteOpportunity(opportunity.id);
    setShowDeleteAlert(false);
  };

  const buildOpportunityState = () => {
    const adults = opportunity.adults_count ?? opportunity.passengers_count ?? 1;
    const children = opportunity.children_count ?? 0;
    return {
      opportunity_id: opportunity.id,
      client_id: opportunity.client_id,
      client_name: opportunity.client?.name,
      client_email: opportunity.client?.email,
      client_phone: opportunity.client?.phone,
      client_city: opportunity.client?.city,
      destination: opportunity.destination,
      start_date: opportunity.start_date,
      end_date: opportunity.end_date,
      adults_count: adults,
      children_count: children,
      estimated_value: opportunity.estimated_value,
      notes: opportunity.notes,
    };
  };

  const logTimelineEvent = async (toStage: string, notes: string) => {
    try {
      await supabase.from("opportunity_history").insert({
        opportunity_id: opportunity.id,
        to_stage: toStage,
        notes,
      } as any);
    } catch { /* non-fatal */ }
  };

  const proceedCreateQuote = async () => {
    await logTimelineEvent("Orçamento criado", `Novo orçamento iniciado a partir da oportunidade.`);
    navigate(`/ferramentas-ia/gerar-orcamento`, { state: buildOpportunityState() });
  };

  const proceedCreateTripWallet = async () => {
    await logTimelineEvent("Carteira digital criada", `Nova carteira digital iniciada a partir da oportunidade.`);
    navigate(`/ferramentas-ia/trip-wallet/nova`, { state: buildOpportunityState() });
  };

  const handleCreateQuote = async () => {
    if (isCheckingLink) return;
    setIsCheckingLink(true);
    try {
      const { data } = await supabase
        .from("quotes")
        .select("id")
        .eq("opportunity_id", opportunity.id)
        .limit(1)
        .maybeSingle();
      if (data?.id) {
        setLinkedDialog({ kind: "quote", existingId: data.id });
        return;
      }
      await proceedCreateQuote();
    } finally {
      setIsCheckingLink(false);
    }
  };

  const handleCreateTripWallet = async () => {
    if (isCheckingLink) return;
    setIsCheckingLink(true);
    try {
      const { data } = await supabase
        .from("trips")
        .select("id")
        .eq("opportunity_id", opportunity.id)
        .limit(1)
        .maybeSingle();
      if (data?.id) {
        setLinkedDialog({ kind: "trip", existingId: data.id });
        return;
      }
      await proceedCreateTripWallet();
    } finally {
      setIsCheckingLink(false);
    }
  };

  const openExistingLinked = () => {
    if (!linkedDialog) return;
    if (linkedDialog.kind === "quote") {
      navigate(`/ferramentas-ia/gerar-orcamento/${linkedDialog.existingId}`);
    } else {
      navigate(`/ferramentas-ia/trip-wallet/${linkedDialog.existingId}`);
    }
    setLinkedDialog(null);
  };

  const createAnotherLinked = async () => {
    if (!linkedDialog) return;
    const kind = linkedDialog.kind;
    setLinkedDialog(null);
    if (kind === "quote") await proceedCreateQuote();
    else await proceedCreateTripWallet();
  };

  const handleEditClientClick = () => {
    if (opportunity.client) {
      clientForm.reset({
        name: opportunity.client.name,
        email: opportunity.client.email || "",
        phone: opportunity.client.phone || "",
        city: opportunity.client.city || "",
        notes: opportunity.client.notes || "",
        status: (opportunity.client.status as any) || "lead",
        travel_preferences: opportunity.client.travel_preferences || "",
        internal_notes: opportunity.client.internal_notes || "",
        birthday_day: opportunity.client.birthday_day?.toString() || "",
        birthday_month: opportunity.client.birthday_month?.toString() || "",
        birthday_year: opportunity.client.birthday_year?.toString() || "",
      });
    }
    setShowEditClient(true);
  };

  const handleUpdateClient = async (data: ClientFormData) => {
    if (!opportunity.client) return;
    const bDay = data.birthday_day ? parseInt(data.birthday_day) : null;
    const bMonth = data.birthday_month ? parseInt(data.birthday_month) : null;
    const bYear = data.birthday_year ? parseInt(data.birthday_year) : null;
    await updateClient({
      id: opportunity.client.id,
      name: data.name,
      email: data.email || null,
      phone: data.phone || null,
      city: data.city || null,
      notes: data.notes || null,
      status: data.status || "lead",
      travel_preferences: data.travel_preferences || null,
      internal_notes: data.internal_notes || null,
      birthday_day: bDay,
      birthday_month: bMonth,
      birthday_year: bYear,
    });

    // Sync birthday agency event
    if (user) {
      await supabase
        .from("agency_events")
        .delete()
        .eq("user_id", user.id)
        .eq("client_id", opportunity.client.id)
        .eq("event_type", "aniversario");
      if (bDay && bMonth) {
        const now = new Date();
        const currentYear = now.getFullYear();
        const birthdayThisYear = new Date(currentYear, bMonth - 1, bDay);
        const targetYear = birthdayThisYear < now ? currentYear + 1 : currentYear;
        const eventDate = `${targetYear}-${String(bMonth).padStart(2, "0")}-${String(bDay).padStart(2, "0")}`;
        await supabase.from("agency_events").insert({
          user_id: user.id,
          client_id: opportunity.client.id,
          title: `🎂 Aniversário: ${data.name}`,
          event_type: "aniversario",
          event_date: eventDate,
          color: "#ec4899",
        });
      }
    }

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
                {canGenerateQuote && (
                  <DropdownMenuItem onClick={handleCreateQuote}>
                    <FileText className="mr-2 h-4 w-4" /> Gerar Orçamento
                  </DropdownMenuItem>
                )}
                <DropdownMenuItem onClick={handleCreateTripWallet}>
                  <Wallet className="mr-2 h-4 w-4" /> Gerar Carteira Digital
                </DropdownMenuItem>
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
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
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
                        <InternationalPhoneInput
                          value={field.value}
                          onChange={(v) => field.onChange(v ?? "")}
                          placeholder="Número de telefone"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
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
                  name="status"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Status</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Selecione o status" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {Object.entries(CLIENT_STATUS_LABELS).map(([value, label]) => (
                            <SelectItem key={value} value={value}>
                              {label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="space-y-2">
                <FormLabel className="flex items-center gap-1.5">
                  <Cake className="h-4 w-4" />
                  Data de Aniversário
                </FormLabel>
                <div className="grid grid-cols-3 gap-2">
                  <FormField
                    control={clientForm.control}
                    name="birthday_day"
                    render={({ field }) => (
                      <FormItem>
                        <FormControl>
                          <Select onValueChange={field.onChange} value={field.value || ""}>
                            <SelectTrigger>
                              <SelectValue placeholder="Dia" />
                            </SelectTrigger>
                            <SelectContent>
                              {Array.from({ length: 31 }, (_, i) => i + 1).map((d) => (
                                <SelectItem key={d} value={String(d)}>{d}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </FormControl>
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={clientForm.control}
                    name="birthday_month"
                    render={({ field }) => (
                      <FormItem>
                        <FormControl>
                          <Select onValueChange={field.onChange} value={field.value || ""}>
                            <SelectTrigger>
                              <SelectValue placeholder="Mês" />
                            </SelectTrigger>
                            <SelectContent>
                              {["Jan","Fev","Mar","Abr","Mai","Jun","Jul","Ago","Set","Out","Nov","Dez"].map((m, i) => (
                                <SelectItem key={i} value={String(i + 1)}>{m}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </FormControl>
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={clientForm.control}
                    name="birthday_year"
                    render={({ field }) => (
                      <FormItem>
                        <FormControl>
                          <Input type="number" placeholder="Ano (opcional)" min={1920} max={new Date().getFullYear()} {...field} />
                        </FormControl>
                      </FormItem>
                    )}
                  />
                </div>
              </div>

              <FormField
                control={clientForm.control}
                name="travel_preferences"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Preferências de Viagem</FormLabel>
                    <FormControl>
                      <Textarea placeholder="Ex: Prefere praias, viaja em família, classe executiva..." {...field} />
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
                    <FormLabel>Observações Gerais</FormLabel>
                    <FormControl>
                      <Textarea placeholder="Anotações sobre o cliente..." {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={clientForm.control}
                name="internal_notes"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Observações Internas</FormLabel>
                    <FormControl>
                      <Textarea placeholder="Notas internas (não visíveis ao cliente)..." {...field} />
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

      <AlertDialog open={!!linkedDialog} onOpenChange={(o) => !o && setLinkedDialog(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {linkedDialog?.kind === "quote"
                ? "Já existe um orçamento vinculado"
                : "Já existe uma carteira digital vinculada"}
            </AlertDialogTitle>
            <AlertDialogDescription>
              Esta oportunidade já possui {linkedDialog?.kind === "quote" ? "um orçamento" : "uma carteira"}{" "}
              criada. O que você deseja fazer?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="flex-col-reverse sm:flex-row sm:justify-end gap-2">
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <Button variant="outline" onClick={createAnotherLinked}>
              Criar novo(a)
            </Button>
            <AlertDialogAction onClick={openExistingLinked}>
              Abrir existente
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
