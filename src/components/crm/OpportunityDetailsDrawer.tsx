import { useNavigate } from "react-router-dom";
import { format, formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  MapPin,
  MessageSquare,
  Calendar,
  Users,
  DollarSign,
  Pencil,
  ExternalLink,
  Phone,
  StickyNote,
  Clock,
  CalendarClock,
  FileText,
} from "lucide-react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { OpportunityNotesTimeline } from "./OpportunityNotesTimeline";
import { OpportunityLabelPicker } from "./OpportunityLabelPicker";
import {
  useOpportunityLabelAssignments,
  useOpportunityNotes,
} from "@/hooks/useOpportunityExtras";
import { useOpportunityFollowups } from "@/hooks/useOpportunityFollowups";
import { STAGE_LABELS, STAGE_COLORS, type Opportunity } from "@/types/crm";
import { cn } from "@/lib/utils";

interface OpportunityDetailsDrawerProps {
  opportunity: Opportunity | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onEdit?: () => void;
}

function formatCurrency(value: number) {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(value || 0);
}

function parseDateOnly(d?: string | null) {
  if (!d) return null;
  // YYYY-MM-DD safe parse (local midnight)
  const [y, m, day] = d.split("-").map(Number);
  if (!y || !m || !day) return new Date(d);
  return new Date(y, m - 1, day);
}

function SummaryCard({
  icon: Icon,
  label,
  value,
  accent,
}: {
  icon: any;
  label: string;
  value: React.ReactNode;
  accent?: string;
}) {
  return (
    <div className="rounded-xl border border-border bg-card p-3 flex items-start gap-3">
      <div
        className={cn(
          "h-9 w-9 rounded-lg flex items-center justify-center flex-shrink-0",
          accent || "bg-primary/10 text-primary"
        )}
      >
        <Icon className="h-4 w-4" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
          {label}
        </p>
        <p className="text-sm font-medium text-foreground break-words mt-0.5">
          {value}
        </p>
      </div>
    </div>
  );
}

function SectionTitle({
  icon: Icon,
  children,
}: {
  icon: any;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-center gap-2 mb-3">
      <Icon className="h-4 w-4 text-primary" />
      <h3 className="text-sm font-semibold text-foreground uppercase tracking-wide">
        {children}
      </h3>
    </div>
  );
}

export function OpportunityDetailsDrawer({
  opportunity,
  open,
  onOpenChange,
  onEdit,
}: OpportunityDetailsDrawerProps) {
  const navigate = useNavigate();
  const { byOpportunity, unassignLabel } = useOpportunityLabelAssignments();
  const { followups } = useOpportunityFollowups(opportunity?.id);
  const appliedLabels = opportunity ? byOpportunity[opportunity.id] || [] : [];

  if (!opportunity) return null;

  const client = opportunity.client;
  const start = parseDateOnly(opportunity.start_date);
  const end = parseDateOnly(opportunity.end_date);
  const adults = opportunity.adults_count ?? opportunity.passengers_count ?? 0;
  const children = opportunity.children_count ?? 0;
  const totalPax = adults + children;

  const handleOpenClient = () => {
    if (!client?.id) return;
    onOpenChange(false);
    navigate(`/gestao-clientes/clientes?client=${client.id}`);
  };

  const handleEdit = () => {
    onOpenChange(false);
    // Defer to allow sheet to close before opening edit dialog
    setTimeout(() => onEdit?.(), 50);
  };

  // Sort followups chronologically (most recent first for "histórico")
  const sortedFollowups = [...followups].sort((a, b) =>
    b.follow_up_date.localeCompare(a.follow_up_date)
  );

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        className="w-full sm:max-w-3xl lg:max-w-4xl overflow-y-auto p-0"
      >
        {/* HEADER */}
        <div className="sticky top-0 z-10 bg-card/95 backdrop-blur border-b border-border px-6 pt-6 pb-4">
          <SheetHeader className="space-y-3 text-left">
            <div className="flex items-start justify-between gap-3 flex-wrap">
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <SheetTitle className="text-xl leading-tight">
                    {client?.name || "Sem cliente"}
                  </SheetTitle>
                  {client?.id && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="h-7 px-2 text-xs gap-1"
                      onClick={handleOpenClient}
                    >
                      <ExternalLink className="h-3.5 w-3.5" />
                      Abrir Cliente
                    </Button>
                  )}
                </div>
                <div className="flex items-center gap-3 mt-1.5 flex-wrap text-sm text-muted-foreground">
                  <span className="inline-flex items-center gap-1.5">
                    <MapPin className="h-3.5 w-3.5" />
                    {opportunity.destination || "—"}
                  </span>
                  {client?.phone && (
                    <span className="inline-flex items-center gap-1.5">
                      <Phone className="h-3.5 w-3.5" />
                      {client.phone}
                    </span>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Badge
                  className={cn(
                    "text-white text-xs px-2.5 py-1",
                    STAGE_COLORS[opportunity.stage]
                  )}
                >
                  {STAGE_LABELS[opportunity.stage]}
                </Badge>
                <Button
                  type="button"
                  size="sm"
                  onClick={handleEdit}
                  className="gap-1.5"
                >
                  <Pencil className="h-3.5 w-3.5" />
                  Editar Oportunidade
                </Button>
              </div>
            </div>

            {/* Labels */}
            <div className="flex items-center gap-2 flex-wrap">
              {appliedLabels.length === 0 ? (
                <span className="text-xs text-muted-foreground">
                  Nenhuma etiqueta aplicada
                </span>
              ) : (
                appliedLabels.map((label) => (
                  <button
                    key={label.id}
                    type="button"
                    onClick={() =>
                      unassignLabel({
                        opportunityId: opportunity.id,
                        labelId: label.id,
                      })
                    }
                    className="group inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-xs font-medium text-white transition-opacity hover:opacity-80"
                    style={{ backgroundColor: label.color }}
                    title="Clique para remover"
                  >
                    {label.name}
                    <span className="opacity-0 group-hover:opacity-100 transition-opacity">
                      ×
                    </span>
                  </button>
                ))
              )}
              <OpportunityLabelPicker opportunityId={opportunity.id} />
            </div>
          </SheetHeader>
        </div>

        {/* BODY */}
        <div className="px-6 py-6 space-y-8">
          {/* SECTION 1 — Resumo da Viagem */}
          <section>
            <SectionTitle icon={FileText}>Resumo da Viagem</SectionTitle>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              <SummaryCard
                icon={MapPin}
                label="Destino"
                value={opportunity.destination || "—"}
              />
              {start && (
                <SummaryCard
                  icon={Calendar}
                  label="Ida"
                  value={format(start, "dd/MM/yyyy", { locale: ptBR })}
                  accent="bg-emerald-500/10 text-emerald-600"
                />
              )}
              {end && (
                <SummaryCard
                  icon={Calendar}
                  label="Volta"
                  value={format(end, "dd/MM/yyyy", { locale: ptBR })}
                  accent="bg-rose-500/10 text-rose-600"
                />
              )}
              {totalPax > 0 && (
                <SummaryCard
                  icon={Users}
                  label="Passageiros"
                  value={
                    children > 0
                      ? `${adults} adulto${adults === 1 ? "" : "s"} + ${children} criança${children === 1 ? "" : "s"}`
                      : `${adults} adulto${adults === 1 ? "" : "s"}`
                  }
                  accent="bg-sky-500/10 text-sky-600"
                />
              )}
              {opportunity.estimated_value > 0 && (
                <SummaryCard
                  icon={DollarSign}
                  label="Valor estimado"
                  value={formatCurrency(opportunity.estimated_value)}
                  accent="bg-amber-500/10 text-amber-600"
                />
              )}
            </div>
          </section>

          <Separator />

          {/* SECTION 2 — Informações da Oportunidade */}
          <section>
            <SectionTitle icon={CalendarClock}>
              Informações da Oportunidade
            </SectionTitle>
            <div className="rounded-xl border border-border bg-card divide-y divide-border">
              <InfoRow
                label="Etapa"
                value={STAGE_LABELS[opportunity.stage]}
              />
              {opportunity.stage_entered_at && (
                <InfoRow
                  label="Tempo nesta etapa"
                  value={`Há ${formatDistanceToNow(
                    new Date(opportunity.stage_entered_at),
                    { locale: ptBR }
                  )}`}
                />
              )}
              {opportunity.created_at && (
                <InfoRow
                  label="Criada em"
                  value={format(
                    new Date(opportunity.created_at),
                    "dd/MM/yyyy 'às' HH:mm",
                    { locale: ptBR }
                  )}
                />
              )}
              {opportunity.updated_at &&
                opportunity.updated_at !== opportunity.created_at && (
                  <InfoRow
                    label="Última atualização"
                    value={format(
                      new Date(opportunity.updated_at),
                      "dd/MM/yyyy 'às' HH:mm",
                      { locale: ptBR }
                    )}
                  />
                )}
              {opportunity.follow_up_date && (
                <InfoRow
                  label="Próximo follow-up"
                  value={
                    parseDateOnly(opportunity.follow_up_date)
                      ? format(
                          parseDateOnly(opportunity.follow_up_date)!,
                          "dd/MM/yyyy",
                          { locale: ptBR }
                        )
                      : opportunity.follow_up_date
                  }
                />
              )}
              {client?.email && (
                <InfoRow label="E-mail do cliente" value={client.email} />
              )}
              {client?.city && (
                <InfoRow label="Cidade do cliente" value={client.city} />
              )}
              {opportunity.notes && (
                <InfoRow
                  label="Observações internas"
                  value={
                    <span className="whitespace-pre-wrap">
                      {opportunity.notes}
                    </span>
                  }
                />
              )}
            </div>
          </section>

          <Separator />

          {/* SECTION 3 — Follow-ups */}
          <section>
            <SectionTitle icon={CalendarClock}>
              Histórico de Follow-ups
              {sortedFollowups.length > 0 && (
                <Badge variant="secondary" className="ml-2 text-[10px]">
                  {sortedFollowups.length}
                </Badge>
              )}
            </SectionTitle>
            {sortedFollowups.length === 0 ? (
              <p className="text-sm text-muted-foreground py-2">
                Nenhum follow-up agendado para esta oportunidade.
              </p>
            ) : (
              <div className="relative pl-5 border-l-2 border-border space-y-3">
                {sortedFollowups.map((fu) => {
                  const d = parseDateOnly(fu.follow_up_date);
                  return (
                    <div key={fu.id} className="relative">
                      <span className="absolute -left-[27px] top-2 h-3 w-3 rounded-full bg-sky-500 border-2 border-background" />
                      <div className="rounded-lg border border-border bg-card p-3">
                        <div className="flex items-center gap-2 text-xs font-semibold text-foreground">
                          <Clock className="h-3.5 w-3.5 text-sky-600" />
                          {d
                            ? format(d, "dd/MM/yyyy", { locale: ptBR })
                            : fu.follow_up_date}
                        </div>
                        {fu.note ? (
                          <p className="text-sm text-foreground/90 whitespace-pre-wrap mt-1.5">
                            {fu.note}
                          </p>
                        ) : (
                          <p className="text-xs text-muted-foreground italic mt-1.5">
                            Sem descrição
                          </p>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </section>

          <Separator />

          {/* SECTION 4 — Anotações */}
          <section>
            <SectionTitle icon={StickyNote}>Anotações</SectionTitle>
            <OpportunityNotesTimeline opportunityId={opportunity.id} />
          </section>
        </div>
      </SheetContent>
    </Sheet>
  );
}

function InfoRow({
  label,
  value,
}: {
  label: string;
  value: React.ReactNode;
}) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-[200px_1fr] gap-1 sm:gap-4 px-4 py-2.5">
      <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide self-start">
        {label}
      </span>
      <span className="text-sm text-foreground break-words">{value}</span>
    </div>
  );
}