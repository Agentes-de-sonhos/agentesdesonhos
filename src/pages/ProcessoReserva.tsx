import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  ArrowLeft,
  ArrowRight,
  ExternalLink,
  FileText,
  Loader2,
  Lock,
  Trash2,
  Users,
} from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { toast } from "sonner";
import { useAuth } from "@/hooks/useAuth";
import {
  useAgencyTeamDirectory,
  useTravelFile,
  useTravelFileMutations,
  useTravelFileNotes,
  useTravelFiles,
} from "@/hooks/useTravelFiles";
import { FILE_STATUS_LABELS, SERVICE_STATUS_LABELS } from "@/lib/travelFiles";
import {
  describeFileEvent,
  fileStatusStep,
  nextFileStatus,
  summarizeServiceFinancials,
  suggestFileStatusFromServices,
} from "@/lib/travelFileWorkflow";
import type {
  TravelFileService,
  TravelFileServiceStatus,
  TravelFileStatus,
} from "@/types/travelFile";
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

const NO_MEMBER = "none";

/** Campo monetário do serviço: só grava quando o valor realmente muda. */
function AmountField({
  label,
  value,
  currency,
  onCommit,
}: {
  label: string;
  value: number | null | undefined;
  currency: string;
  onCommit: (next: number | null) => void;
}) {
  const [draft, setDraft] = useState(value == null ? "" : String(value));

  useEffect(() => {
    setDraft(value == null ? "" : String(value));
  }, [value]);

  const commit = () => {
    const trimmed = draft.trim().replace(",", ".");
    const next = trimmed === "" ? null : Number(trimmed);
    if (next != null && (!Number.isFinite(next) || next < 0)) {
      setDraft(value == null ? "" : String(value));
      toast.error("Informe um valor válido.");
      return;
    }
    if ((next ?? null) === (value ?? null)) return;
    onCommit(next);
  };

  return (
    <div className="min-w-0">
      <label className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
        {label}
      </label>
      <Input
        inputMode="decimal"
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={commit}
        placeholder={money(0, currency)}
        className="mt-1 h-9 bg-background tabular-nums"
      />
    </div>
  );
}

export default function ProcessoReserva() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const nav = useAdminNav();
  const { user } = useAuth();
  // Volta para a lista de Reservas do contexto atual (painel da agência ou
  // aba de Reservas em Meus Projetos na plataforma tradicional).
  const backToList = nav.isAgencyAdmin ? nav.reservas() : "/meus-projetos?tab=reservas";
  const { data, isLoading } = useTravelFile(id);
  const { markViewed } = useTravelFiles();
  const { members, memberNames } = useAgencyTeamDirectory();
  const { updateFile, updateService } = useTravelFileMutations(id);

  const file = data?.file;
  const { notes, addNote, deleteNote } = useTravelFileNotes(id, file?.agency_id);
  const [noteDraft, setNoteDraft] = useState("");
  const [cancelReason, setCancelReason] = useState("");

  useEffect(() => {
    if (file?.id) markViewed({ id: file.id, agency_id: file.agency_id }).catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [file?.id]);

  const services = data?.services ?? [];
  const totals = useMemo(() => summarizeServiceFinancials(services), [services]);
  const suggested = useMemo(() => suggestFileStatusFromServices(services), [services]);

  const patchFile = async (patch: Record<string, unknown>, successMessage: string) => {
    try {
      await updateFile.mutateAsync(patch as any);
      toast.success(successMessage);
    } catch {
      toast.error("Não foi possível salvar a alteração.");
    }
  };

  const updateFileStatus = async (status: TravelFileStatus) => {
    if (!file) return;
    const now = new Date().toISOString();
    await patchFile(
      {
        status,
        confirmed_at: status === "sale_confirmed" ? now : file.confirmed_at,
        cancelled_at: status === "cancelled" ? now : file.cancelled_at,
        completed_at: status === "trip_completed" ? now : file.completed_at,
        cancellation_reason:
          status === "cancelled" ? cancelReason.trim() || file.cancellation_reason : file.cancellation_reason,
        final_sale_amount:
          status === "sale_confirmed" ? totals.sold : file.final_sale_amount,
        reconfirmed_amount:
          status === "sale_confirmed" || status === "awaiting_client"
            ? totals.reconfirmed
            : file.reconfirmed_amount,
      },
      `Processo atualizado: ${FILE_STATUS_LABELS[status]}`,
    );
  };

  const patchService = async (serviceId: string, patch: Partial<TravelFileService>) => {
    try {
      await updateService.mutateAsync({ id: serviceId, patch });
    } catch {
      toast.error("Não foi possível atualizar o serviço.");
    }
  };

  const submitNote = async () => {
    const body = noteDraft.trim();
    if (!body) return;
    try {
      await addNote.mutateAsync({
        body,
        authorName: (user?.user_metadata as any)?.full_name || user?.email || null,
      });
      setNoteDraft("");
      toast.success("Nota interna registrada.");
    } catch {
      toast.error("Não foi possível salvar a nota.");
    }
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

  const next = nextFileStatus(file.status);

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
          <span className="text-xs text-muted-foreground">
            Etapa {fileStatusStep(file.status) || "—"} de 7
          </span>
        </div>

        {/* Etapa e responsáveis */}
        <Card className="min-w-0 rounded-2xl border-border/60 p-4 sm:p-5">
          <h2 className="mb-3 text-sm font-semibold text-foreground">Andamento do processo</h2>
          <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
            <div className="min-w-0">
              <label className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                Etapa atual
              </label>
              <Select value={file.status} onValueChange={(v) => updateFileStatus(v as TravelFileStatus)}>
                <SelectTrigger className="mt-1 h-9">
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
            <div className="min-w-0">
              <label className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                Responsável comercial
              </label>
              <Select
                value={file.responsible_team_member_id ?? NO_MEMBER}
                onValueChange={(v) =>
                  patchFile(
                    { responsible_team_member_id: v === NO_MEMBER ? null : v },
                    "Responsável comercial atualizado.",
                  )
                }
              >
                <SelectTrigger className="mt-1 h-9">
                  <SelectValue placeholder="Não definido" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={NO_MEMBER}>Não definido</SelectItem>
                  {members.map((m) => (
                    <SelectItem key={m.id} value={m.id}>
                      {m.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="min-w-0">
              <label className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                Responsável pela operação
              </label>
              <Select
                value={file.operations_responsible_team_member_id ?? NO_MEMBER}
                onValueChange={(v) =>
                  patchFile(
                    { operations_responsible_team_member_id: v === NO_MEMBER ? null : v },
                    "Responsável pela operação atualizado.",
                  )
                }
              >
                <SelectTrigger className="mt-1 h-9">
                  <SelectValue placeholder="Não definido" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={NO_MEMBER}>Não definido</SelectItem>
                  {members.map((m) => (
                    <SelectItem key={m.id} value={m.id}>
                      {m.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="mt-3 flex flex-wrap items-center gap-2">
            {next && (
              <Button size="sm" className="gap-2" onClick={() => updateFileStatus(next)}>
                Avançar para {FILE_STATUS_LABELS[next]}
                <ArrowRight className="h-4 w-4" />
              </Button>
            )}
            {suggested && suggested !== file.status && (
              <Button
                size="sm"
                variant="outline"
                onClick={() => updateFileStatus(suggested)}
              >
                Sugestão pelos serviços: {FILE_STATUS_LABELS[suggested]}
              </Button>
            )}
            {file.status !== "cancelled" && (
              <div className="flex min-w-0 flex-1 flex-wrap items-center gap-2">
                <Input
                  value={cancelReason}
                  onChange={(e) => setCancelReason(e.target.value)}
                  placeholder="Motivo do cancelamento (opcional)"
                  className="h-9 min-w-[220px] flex-1 bg-background"
                />
                <Button
                  size="sm"
                  variant="outline"
                  className="text-rose-600 hover:text-rose-700"
                  onClick={() => updateFileStatus("cancelled")}
                >
                  Cancelar processo
                </Button>
              </div>
            )}
          </div>
        </Card>

        {/* Visão geral */}
        <Card className="min-w-0 rounded-2xl border-border/60 p-4 sm:p-5">
          <h2 className="mb-3 text-sm font-semibold text-foreground">Visão geral</h2>
          <dl className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {[
              { label: "Cliente", value: data?.client?.name || file.protocol_snapshot || "—" },
              { label: "Contato", value: data?.client?.phone || data?.client?.email || "—" },
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
              {
                label: "Venda final",
                value: file.final_sale_amount != null
                  ? money(file.final_sale_amount, file.currency)
                  : "—",
              },
              { label: "Aberto em", value: format(new Date(file.opened_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR }) },
              { label: "Protocolo original", value: file.protocol_snapshot || "—" },
              {
                label: "Responsável comercial",
                value: file.responsible_team_member_id
                  ? memberNames[file.responsible_team_member_id] || "—"
                  : "Não definido",
              },
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
            {file.client_id && (
              <Button
                variant="outline"
                size="sm"
                className="gap-2"
                onClick={() =>
                  navigate(
                    nav.isAgencyAdmin
                      ? `${nav.clientes()}?client=${file.client_id}`
                      : `/gestao-clientes?client=${file.client_id}`,
                  )
                }
              >
                <Users className="h-4 w-4" />
                Ficha do cliente
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
              {money(totals.reconfirmed, file.currency)} · Venda {money(totals.sold, file.currency)}
            </span>
          </div>

          <div className="mb-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
            {[
              { label: "Custo", value: totals.cost },
              { label: "Comissão", value: totals.commission },
              { label: "Margem", value: totals.margin },
              { label: "Variação vs. solicitado", value: totals.variation },
            ].map((item) => (
              <div key={item.label} className="min-w-0 rounded-xl border border-border/50 bg-muted/20 p-3">
                <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                  {item.label}
                </p>
                <p className="mt-0.5 text-sm font-semibold tabular-nums text-foreground">
                  {money(item.value, file.currency)}
                </p>
              </div>
            ))}
          </div>

          <div className="space-y-2">
            {services.map((service) => (
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
                  <span>Solicitado {money(service.requested_amount, service.currency)}</span>
                </div>

                <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-5">
                  <div className="min-w-0">
                    <label className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                      Status do serviço
                    </label>
                    <Select
                      value={service.status}
                      onValueChange={(v) =>
                        patchService(service.id, { status: v as TravelFileServiceStatus })
                      }
                    >
                      <SelectTrigger className="mt-1 h-9">
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
                  <AmountField
                    label="Reconfirmado"
                    value={service.reconfirmed_amount}
                    currency={service.currency}
                    onCommit={(v) => patchService(service.id, { reconfirmed_amount: v })}
                  />
                  <AmountField
                    label="Vendido"
                    value={service.sold_amount}
                    currency={service.currency}
                    onCommit={(v) => patchService(service.id, { sold_amount: v })}
                  />
                  <AmountField
                    label="Custo"
                    value={service.cost_amount}
                    currency={service.currency}
                    onCommit={(v) => patchService(service.id, { cost_amount: v })}
                  />
                  <AmountField
                    label="Comissão"
                    value={service.commission_amount}
                    currency={service.currency}
                    onCommit={(v) => patchService(service.id, { commission_amount: v })}
                  />
                </div>
              </div>
            ))}
            {services.length === 0 && (
              <p className="text-sm text-muted-foreground">
                Nenhum serviço registrado neste processo.
              </p>
            )}
          </div>
        </Card>

        {/* Notas internas */}
        <Card className="min-w-0 rounded-2xl border-border/60 p-4 sm:p-5">
          <div className="mb-2 flex items-center gap-2">
            <Lock className="h-4 w-4 text-muted-foreground" />
            <h2 className="text-sm font-semibold text-foreground">Notas internas</h2>
          </div>
          <p className="mb-3 text-xs text-muted-foreground">
            Visíveis apenas para a sua equipe. O cliente nunca tem acesso a estas anotações.
          </p>
          <Textarea
            value={noteDraft}
            onChange={(e) => setNoteDraft(e.target.value)}
            placeholder="Registre tratativas com fornecedores, prazos e combinados internos..."
            rows={3}
            className="bg-background"
          />
          <div className="mt-2 flex justify-end">
            <Button size="sm" onClick={submitNote} disabled={!noteDraft.trim() || addNote.isPending}>
              Salvar nota
            </Button>
          </div>

          <div className="mt-4 space-y-2">
            {notes.map((note) => (
              <div key={note.id} className="min-w-0 rounded-xl border border-border/50 bg-muted/20 p-3">
                <p className="text-sm text-foreground [overflow-wrap:anywhere] whitespace-pre-wrap">
                  {note.body}
                </p>
                <div className="mt-1 flex flex-wrap items-center justify-between gap-2">
                  <p className="text-xs text-muted-foreground">
                    {note.author_name || "Equipe"} ·{" "}
                    {format(new Date(note.created_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                  </p>
                  {note.author_user_id === user?.id && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 gap-1 text-xs text-muted-foreground"
                      onClick={() => deleteNote.mutateAsync(note.id).catch(() => {})}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                      Excluir
                    </Button>
                  )}
                </div>
              </div>
            ))}
            {notes.length === 0 && (
              <p className="text-sm text-muted-foreground">Nenhuma nota interna registrada.</p>
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
                  {describeFileEvent(event, memberNames)}
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
