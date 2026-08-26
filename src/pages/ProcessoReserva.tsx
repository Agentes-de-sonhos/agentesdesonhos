import { useEffect, useMemo } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ArrowLeft, ExternalLink, FileText, Loader2 } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";
import { useTravelFile, useTravelFiles } from "@/hooks/useTravelFiles";
import {
  FILE_STATUS_LABELS,
  SERVICE_STATUS_LABELS,
} from "@/lib/travelFiles";
import type { TravelFileServiceStatus, TravelFileStatus } from "@/types/travelFile";
import { useAdminNav } from "@/lib/agencyAdminNav";

const money = (value: number | null | undefined, currency: string) =>
  new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: currency || "BRL",
  }).format(Number(value) || 0);

const parseLocalDate = (value?: string | null): Date | null => {
  if (!value) return null;
  const [y, m, d] = value.split("-").map((n) => parseInt(n, 10));
  if (!y || !m || !d) return null;
  return new Date(y, m - 1, d);
};

const dateLabel = (value?: string | null) => {
  const d = parseLocalDate(value);
  return d ? format(d, "dd/MM/yyyy", { locale: ptBR }) : "—";
};

const EVENT_LABELS: Record<string, string> = {
  request_received: "Solicitação recebida do cliente",
  request_superseded: "Solicitação anterior substituída por nova revisão",
  crm_opportunity_linked: "Oportunidade vinculada no CRM",
  file_status_changed: "Status do processo alterado",
  service_status_changed: "Status de um serviço alterado",
};

export default function ProcessoReserva() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const nav = useAdminNav();
  // Volta para a lista de Reservas do contexto atual (painel da agência ou
  // aba de Reservas em Meus Projetos na plataforma tradicional).
  const backToList = nav.isAgencyAdmin ? nav.reservas() : "/meus-projetos?tab=reservas";
  const queryClient = useQueryClient();
  const { data, isLoading } = useTravelFile(id);
  const { markViewed } = useTravelFiles();

  const file = data?.file;

  useEffect(() => {
    if (file?.id) markViewed({ id: file.id, agency_id: file.agency_id }).catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [file?.id]);

  const totals = useMemo(() => {
    const services = data?.services ?? [];
    return {
      requested: services.reduce((sum, s) => sum + (Number(s.requested_amount) || 0), 0),
      reconfirmed: services.reduce(
        (sum, s) => sum + (Number(s.reconfirmed_amount ?? s.requested_amount) || 0),
        0,
      ),
    };
  }, [data?.services]);

  const updateFileStatus = async (status: TravelFileStatus) => {
    if (!file) return;
    const { error } = await (supabase as any)
      .from("travel_files")
      .update({
        status,
        confirmed_at: status === "sale_confirmed" ? new Date().toISOString() : file.confirmed_at,
        cancelled_at: status === "cancelled" ? new Date().toISOString() : file.cancelled_at,
        completed_at: status === "trip_completed" ? new Date().toISOString() : file.completed_at,
      })
      .eq("id", file.id);
    if (error) {
      toast.error("Não foi possível atualizar o status do processo.");
      return;
    }
    toast.success(`Processo atualizado: ${FILE_STATUS_LABELS[status]}`);
    queryClient.invalidateQueries({ queryKey: ["travel-file", file.id] });
    queryClient.invalidateQueries({ queryKey: ["travel-files"] });
  };

  const updateServiceStatus = async (serviceId: string, status: TravelFileServiceStatus) => {
    const { error } = await (supabase as any)
      .from("travel_file_services")
      .update({ status })
      .eq("id", serviceId);
    if (error) {
      toast.error("Não foi possível atualizar o serviço.");
      return;
    }
    queryClient.invalidateQueries({ queryKey: ["travel-file", id] });
  };

  if (isLoading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center py-24">
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
        </div>
      </DashboardLayout>
    );
  }

  if (!file) {
    return (
      <DashboardLayout>
        <div className="mx-auto max-w-lg py-20 text-center">
          <h1 className="text-lg font-semibold text-foreground">Processo não encontrado</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Este processo de reserva não existe ou não pertence à sua agência.
          </p>
          <Button className="mt-4" onClick={() => navigate(backToList)}>
            Voltar para Reservas
          </Button>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="w-full min-w-0 space-y-6">
        <div className="flex min-w-0 flex-wrap items-center gap-3">
          <Button
            variant="ghost"
            size="sm"
            className="gap-2"
            onClick={() => navigate(backToList)}
          >
            <ArrowLeft className="h-4 w-4" />
            Reservas
          </Button>
          <h1 className="min-w-0 font-display text-xl font-bold text-foreground sm:text-2xl">
            Processo de reserva nº {file.file_number_display}
          </h1>
          <Badge variant="secondary">{FILE_STATUS_LABELS[file.status]}</Badge>
          {file.revision > 1 && <Badge variant="outline">Revisão {file.revision}</Badge>}
        </div>

        {/* Visão geral */}
        <Card className="min-w-0 rounded-2xl border-border/60 p-4 sm:p-5">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
            <h2 className="text-sm font-semibold text-foreground">Visão geral</h2>
            <div className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground">Status do processo</span>
              <Select value={file.status} onValueChange={(v) => updateFileStatus(v as TravelFileStatus)}>
                <SelectTrigger className="h-9 w-[220px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(FILE_STATUS_LABELS).map(([value, label]) => (
                    <SelectItem key={value} value={value}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <dl className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {[
              { label: "Cliente", value: data?.client?.name || file.protocol_snapshot || "—" },
              { label: "Destino", value: file.primary_destination || "—" },
              { label: "Período", value: `${dateLabel(file.start_date)} — ${dateLabel(file.end_date)}` },
              {
                label: "Passageiros",
                value: `${file.passengers_count} (${file.adults_count} adulto(s), ${file.children_count} criança(s))`,
              },
              { label: "Valor solicitado", value: money(file.requested_amount, file.currency) },
              {
                label: "Valor reconfirmado",
                value: file.reconfirmed_amount != null
                  ? money(file.reconfirmed_amount, file.currency)
                  : "Aguardando reconfirmação",
              },
              { label: "Aberto em", value: format(new Date(file.opened_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR }) },
              { label: "Protocolo original", value: file.protocol_snapshot || "—" },
              {
                label: "Confirmado em",
                value: file.confirmed_at
                  ? format(new Date(file.confirmed_at), "dd/MM/yyyy", { locale: ptBR })
                  : "—",
              },
            ].map((item) => (
              <div key={item.label} className="min-w-0 rounded-xl border border-border/50 bg-muted/20 p-3">
                <dt className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                  {item.label}
                </dt>
                <dd className="mt-0.5 text-sm text-foreground [overflow-wrap:anywhere]">{item.value}</dd>
              </div>
            ))}
          </dl>
          <div className="mt-3 flex flex-wrap gap-2">
            {file.quote_id && (
              <Button
                variant="outline"
                size="sm"
                className="gap-2"
                onClick={() => navigate(nav.quote(file.quote_id))}
              >
                <FileText className="h-4 w-4" />
                Orçamento de origem
              </Button>
            )}
            {file.opportunity_id && (
              <Button
                variant="outline"
                size="sm"
                className="gap-2"
                onClick={() => navigate(nav.isAgencyAdmin ? `${nav.crm("funil")}?opportunity=${file.opportunity_id}` : `/crm?opportunity=${file.opportunity_id}`)}
              >
                <ExternalLink className="h-4 w-4" />
                Oportunidade no CRM
              </Button>
            )}
          </div>
        </Card>

        {/* Serviços */}
        <Card className="min-w-0 rounded-2xl border-border/60 p-4 sm:p-5">
          <div className="mb-3 flex flex-wrap items-baseline justify-between gap-2">
            <h2 className="text-sm font-semibold text-foreground">Serviços solicitados</h2>
            <span className="text-xs text-muted-foreground">
              Solicitado {money(totals.requested, file.currency)} · Reconfirmado{" "}
              {money(totals.reconfirmed, file.currency)}
            </span>
          </div>
          <div className="space-y-2">
            {(data?.services ?? []).map((service) => (
              <div
                key={service.id}
                className="min-w-0 rounded-xl border border-border/50 p-3 sm:p-4"
              >
                <div className="flex min-w-0 flex-wrap items-center gap-2">
                  <p className="min-w-0 text-sm font-medium text-foreground [overflow-wrap:anywhere]">
                    {service.product_name}
                  </p>
                  {service.is_required && <Badge variant="outline">Obrigatório</Badge>}
                </div>
                <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
                  {service.city && <span>{service.city}</span>}
                  {(service.start_date || service.end_date) && (
                    <span>
                      {dateLabel(service.start_date)}
                      {service.end_date ? ` — ${dateLabel(service.end_date)}` : ""}
                    </span>
                  )}
                  <span>Qtd. {service.quantity}</span>
                  {service.supplier_name && <span>Fornecedor: {service.supplier_name}</span>}
                </div>
                <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
                  <span className="text-sm font-semibold tabular-nums text-foreground">
                    {money(service.requested_amount, service.currency)}
                  </span>
                  <Select
                    value={service.status}
                    onValueChange={(v) => updateServiceStatus(service.id, v as TravelFileServiceStatus)}
                  >
                    <SelectTrigger className="h-9 w-[200px]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.entries(SERVICE_STATUS_LABELS).map(([value, label]) => (
                        <SelectItem key={value} value={value}>
                          {label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            ))}
            {(data?.services ?? []).length === 0 && (
              <p className="text-sm text-muted-foreground">
                Nenhum serviço registrado neste processo.
              </p>
            )}
          </div>
        </Card>

        {/* Histórico */}
        <Card className="min-w-0 rounded-2xl border-border/60 p-4 sm:p-5">
          <h2 className="mb-3 text-sm font-semibold text-foreground">Histórico</h2>
          <ol className="space-y-2">
            {(data?.events ?? []).map((event) => (
              <li key={event.id} className="min-w-0 rounded-xl border border-border/50 bg-muted/20 p-3">
                <p className="text-sm text-foreground [overflow-wrap:anywhere]">
                  {EVENT_LABELS[event.event_type] || event.event_type}
                </p>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  {format(new Date(event.created_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })} ·{" "}
                  {event.actor_type === "client" ? "Cliente" : event.actor_type === "system" ? "Sistema" : "Agência"}
                </p>
              </li>
            ))}
            {(data?.events ?? []).length === 0 && (
              <li className="text-sm text-muted-foreground">Nenhum evento registrado.</li>
            )}
          </ol>
        </Card>
      </div>
    </DashboardLayout>
  );
}
