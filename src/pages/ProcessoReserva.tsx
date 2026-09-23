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
  AlertTriangle,
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  CircleDollarSign,
  ExternalLink,
  FileText,
  Loader2,
  Lock,
  Pencil,
  Plus,
  Trash2,
  Users,
} from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { toast } from "sonner";
import { useAuth } from "@/hooks/useAuth";
import {
  useAgencyTeamDirectory,
  useReservationsCenterAccess,

  useTravelFile,
  useTravelFileMutations,
  useTravelFileNotes,
  useTravelFilesPage,
} from "@/hooks/useTravelFiles";
import { usePermissions } from "@/hooks/usePermissions";
import { FILE_STATUS_LABELS, SERVICE_STATUS_LABELS } from "@/lib/travelFiles";
import {
  describeFileEvent,
  fileStatusStep,
  groupServiceFinancialsByCurrency,
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
import { EditarRascunhoDialog } from "@/components/reservas/EditarRascunhoDialog";
import {
  ManualServiceDialog,
  type ManualServicePayload,
} from "@/components/reservas/ManualServiceDialog";
import {
  useUnifiedWorkflowV2,
  useTravelFileWorkflowLinks,
} from "@/hooks/useUnifiedWorkflow";
import { extractWorkflowCode, humanizeWorkflowError } from "@/lib/confirmSaleMessages";


import {
  assessTravelFileReadiness,
  describeServiceCommission,
  describeServicePendingReasons,
  describeStatusTransitionBlock,
  summarizeReconfirmation,
  isConvertedV2,
  isActiveTravelFileStatus,
} from "@/lib/travelFileConversion";
import {
  displayServiceSupplier,
  serviceOptionLabel,
  travelFileServiceTitle,
} from "@/lib/travelFileServiceIdentity";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";


import { ConfirmSaleDialog } from "@/components/reservas/ConfirmSaleDialog";
import { ServiceFinancialRuleDialog } from "@/components/reservas/ServiceFinancialRuleDialog";

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
  readOnly = false,
}: {
  label: string;
  value: number | null | undefined;
  currency: string;
  onCommit: (next: number | null) => void;
  readOnly?: boolean;
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
        readOnly={readOnly}
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
  // Sempre a lista da Central no contexto atual (plataforma, painel white label
  // ou Site Lab). Nunca uma aba de projetos protegida por outro plano.
  const backToList = nav.reservas();
  const { data, isLoading } = useTravelFile(id);
  const { members, memberNames } = useAgencyTeamDirectory();
  const { setStatus, setResponsibles, saveService, saveManualData, saveManualService } =
    useTravelFileMutations(id);
  const [editDraftOpen, setEditDraftOpen] = useState(false);
  const [manualServiceOpen, setManualServiceOpen] = useState(false);
  const [manualServiceEditing, setManualServiceEditing] = useState<TravelFileService | null>(null);
  // Fluxo unificado V2 (entitlement de agência, desligado por padrão).
  // Fail-closed: carregando ou com erro NUNCA equivale a "desligado".
  const unified = useUnifiedWorkflowV2();
  const unifiedV2 = unified.enabled;
  const unifiedResolved = unified.resolved;
  const unifiedChecking = !unified.resolved && !unified.isError;
  const unifiedFailed = unified.isError && !unified.resolved;
  // Caminho legado só é liberado quando a consulta terminou com "desligado".
  const legacyFlowAllowed = unifiedResolved && !unifiedV2;
  // Vínculos canônicos persistidos (operação/venda) do processo já convertido.
  const workflowLinks = useTravelFileWorkflowLinks(id, unifiedV2);


  const [confirmSaleOpen, setConfirmSaleOpen] = useState(false);
  const [ruleEditing, setRuleEditing] = useState<TravelFileService | null>(null);
  const [supplierExceptions] = useState<Record<string, string>>({});
  /** Mudança de situação que exige justificativa antes de gravar. */
  const [statusJustification, setStatusJustification] = useState<{
    service: TravelFileService;
    status: TravelFileServiceStatus;
    reason: string;
  } | null>(null);

  const { can } = usePermissions();
  // Interface segue as permissões; a autoridade final é o servidor.
  // Ver valores NUNCA autoriza alterar valores: a edição de valor vendido e
  // custo exige reservations.financial.manage e a comissão exige a permissão
  // específica de comissões.
  // Reservas cadastradas internamente também exigem elegibilidade comercial da
  // Central; o servidor bloqueia essas alterações e a interface não oferece a
  // ação. Reservas recebidas pelo site seguem apenas as permissões (leitura do
  // histórico permanece disponível em qualquer caso).
  const { allowed: centerAllowed } = useReservationsCenterAccess();
  const manualBlocked = data?.file?.origin === "manual" && !centerAllowed;
  const canManage = can("reservations.manage") && !manualBlocked;
  const canAssign = can("reservations.assign") && !manualBlocked;

  const canRevenue = can("financial.view_revenue");
  const canMargin = can("financial.view_margin");
  const canCommission = can("financial.commissions.view");
  const canCommissionManage = can("financial.commissions.manage");
  const canFinancialManage = can("reservations.financial.manage");

  const file = data?.file;
  const { notes, addNote, deleteNote } = useTravelFileNotes(id, file?.agency_id);
  // Somente para registrar leitura do processo (lista não é buscada aqui).
  const { markViewed } = useTravelFilesPage({ pageSize: 1 }, false);
  const [noteDraft, setNoteDraft] = useState("");
  const [cancelReason, setCancelReason] = useState("");

  useEffect(() => {
    if (file?.id) markViewed({ id: file.id, agency_id: file.agency_id }).catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [file?.id]);

  const services = data?.services ?? [];
  const totals = useMemo(() => summarizeServiceFinancials(services), [services]);
  /**
   * Reserva manual: o valor efetivo é o dos serviços lançados, agrupado por
   * moeda. Solicitações do site continuam com os valores congelados do file —
   * nada é recalculado nem convertido sem taxa de câmbio.
   */
  const currencyGroups = useMemo(() => {
    if (file?.origin !== "manual") return [];
    return groupServiceFinancialsByCurrency(services, file?.currency);
  }, [services, file?.origin, file?.currency]);
  const suggested = useMemo(() => suggestFileStatusFromServices(services), [services]);
  // Prontidão do fluxo unificado: espelha a RPC apenas para orientar a tela.
  const readiness = useMemo(
    () =>
      file && unifiedV2
        ? assessTravelFileReadiness(file, services, supplierExceptions)
        : null,
    [file, services, supplierExceptions, unifiedV2],
  );
  /** Resumo do bloco de reconfirmação (fluxo unificado). */
  const reconfirmation = useMemo(
    () => summarizeReconfirmation(services, supplierExceptions),
    [services, supplierExceptions],
  );
  /** Pendências por serviço, em linguagem humana. */
  const pendingByService = useMemo(() => {
    const map: Record<string, string[]> = {};
    for (const service of services) {
      map[service.id] = describeServicePendingReasons(service, supplierExceptions);
    }
    return map;
  }, [services, supplierExceptions]);




  const updateFileStatus = async (status: TravelFileStatus, reason?: string) => {
    if (!file) return;
    if (!canManage) {
      toast.error("Você não possui permissão para alterar o processo.");
      return;
    }
    // Avanço para venda confirmada / em operação depende de saber qual fluxo
    // vale para esta agência. Sem resposta definitiva, a ação fica bloqueada.
    if (["sale_confirmed", "in_operation"].includes(status) && !unifiedResolved) {
      toast.error(
        unifiedFailed
          ? "Não conseguimos verificar como esta venda deve ser confirmada. Recarregue a página e tente novamente."
          : "Ainda estamos verificando como esta venda deve ser confirmada. Aguarde um instante e tente novamente.",
      );
      return;
    }
    // Intenção de concluir a venda no fluxo unificado: abre a MESMA confirmação
    // oficial (avanço sequencial e troca de etapa não gravam nada direto).
    if (["sale_confirmed", "in_operation"].includes(status) && unifiedV2) {
      setConfirmSaleOpen(true);
      return;
    }
    if (status === "cancelled" && !(reason || "").trim()) {
      toast.error("Informe o motivo do cancelamento.");
      return;
    }

    try {
      await setStatus.mutateAsync({ status, reason: reason ?? null });
      toast.success(`Processo atualizado: ${FILE_STATUS_LABELS[status]}`);
    } catch (error: any) {
      console.error("travel_file status:", extractWorkflowCode(error));
      toast.error(humanizeWorkflowError(error));
    }
  };


  const updateResponsibles = async (
    commercial: string | null,
    operations: string | null,
    successMessage: string,
  ) => {
    if (!canAssign) {
      toast.error("Você não possui permissão para definir responsáveis.");
      return;
    }
    try {
      await setResponsibles.mutateAsync({ commercial, operations });
      toast.success(successMessage);
    } catch (error: any) {
      toast.error(humanizeWorkflowError(error));
    }
  };

  const patchServiceStatus = async (serviceId: string, status: TravelFileServiceStatus) => {
    try {
      await saveService.mutateAsync({ id: serviceId, status });
    } catch (error: any) {
      toast.error(humanizeWorkflowError(error));
    }
  };

  /**
   * Mudança de situação operacional do serviço.
   * Transições incoerentes são explicadas em português e não são gravadas:
   * reservar/emitir exige fornecedor; "Valor alterado" exige valor
   * reconfirmado; "Indisponível" e "Valor alterado" exigem justificativa
   * (gravada como nota interna do processo).
   */
  const changeServiceStatus = async (
    service: TravelFileService,
    status: TravelFileServiceStatus,
  ) => {
    if (status === service.status) return;
    const block = describeStatusTransitionBlock(service, status, supplierExceptions);
    if (block) {
      toast.error(block);
      return;
    }
    if (["unavailable", "amount_changed"].includes(status)) {
      setStatusJustification({ service, status, reason: "" });
      return;
    }
    await patchServiceStatus(service.id, status);
  };

  /** Confirma a mudança que exige justificativa, registrando a nota interna. */
  const confirmStatusJustification = async () => {
    if (!statusJustification) return;
    const reason = statusJustification.reason.trim();
    if (!reason) {
      toast.error("Escreva a justificativa desta mudança.");
      return;
    }
    const { service, status } = statusJustification;
    try {
      await saveService.mutateAsync({ id: service.id, status });
      await addNote
        .mutateAsync({
          body: `${travelFileServiceTitle(service)} — ${SERVICE_STATUS_LABELS[status]}: ${reason}`,
          authorName: (user?.user_metadata as any)?.full_name || user?.email || null,
        })
        .catch(() => {});
      setStatusJustification(null);
      toast.success("Situação do serviço atualizada.");
    } catch (error: any) {
      toast.error(humanizeWorkflowError(error));
    }
  };


  /** Valores operacionais gravados juntos: o servidor valida cada permissão. */
  const patchServiceAmounts = async (
    service: TravelFileService,
    patch: Partial<
      Pick<
        TravelFileService,
        "reconfirmed_amount" | "sold_amount" | "cost_amount" | "commission_amount"
      >
    >,
  ) => {
    try {
      await saveService.mutateAsync({
        id: service.id,
        financials: {
          reconfirmed_amount: service.reconfirmed_amount,
          sold_amount: service.sold_amount,
          cost_amount: service.cost_amount,
          commission_amount: service.commission_amount,
          ...patch,
        },
      });
    } catch (error: any) {
      toast.error(humanizeWorkflowError(error));
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
  // Reservas cadastradas à mão podem ter dados e serviços editados aqui.
  const isManual = file.origin === "manual";
  /**
   * Solicitação recebida do site, no fluxo unificado e ainda não convertida:
   * a etapa da agência é reconfirmar cada serviço antes da venda.
   */
  const reconfirmationMode = !isManual && !!unifiedV2 && !isConvertedV2(file);


  /** Um valor por moeda, lado a lado — sem somar nem converter moedas. */
  const groupedMoney = (key: "requested" | "reconfirmed" | "sold") =>
    currencyGroups.length === 0
      ? "—"
      : currencyGroups.map((group) => money(group[key], group.currency)).join(" · ");

  /**
   * Cartões do topo dos serviços.
   * Na reconfirmação (solicitação do site, antes da venda) o contexto é
   * OPERACIONAL: solicitado, reconfirmado, vendido e variação. Custo, comissão
   * e margem pertencem à Gestão Financeira e não aparecem aqui.
   * A margem nunca é exibida sem custo informado: ela seria a própria receita.
   */
  const financialCards = reconfirmationMode
    ? canRevenue
      ? [
          {
            currency: file.currency,
            items: [
              { label: "Total solicitado", value: reconfirmation.requested },
              { label: "Total reconfirmado", value: reconfirmation.reconfirmed },
              { label: "Total vendido", value: reconfirmation.sold },
              { label: "Variação vs. solicitado", value: reconfirmation.variation },
            ],
          },
        ]
      : []
    : (
        isManual && currencyGroups.length > 0
          ? currencyGroups
          : [{ currency: file.currency, ...totals }]
      )
        .map((group) => ({
          currency: group.currency,
          items: [
            ...(canMargin ? [{ label: "Custo", value: group.cost }] : []),
            ...(canCommission ? [{ label: "Comissão", value: group.commission }] : []),
            ...(canMargin && canRevenue && group.costKnown
              ? [{ label: "Margem", value: group.margin }]
              : []),
            ...(canRevenue ? [{ label: "Variação vs. solicitado", value: group.variation }] : []),
          ],
        }))
        .filter((card) => card.items.length > 0);



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
              <Select
                value={file.status}
                disabled={!canManage}
                onValueChange={(v) =>
                  v === "cancelled"
                    ? updateFileStatus("cancelled", cancelReason)
                    : updateFileStatus(v as TravelFileStatus)
                }
              >
                <SelectTrigger className="mt-1 h-9">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(FILE_STATUS_LABELS)
                    // Fluxo unificado: escolher "Venda confirmada"/"Em operação"
                    // NÃO grava a etapa — abre a confirmação oficial, que cria
                    // operação e financeiro sem duplicar. Enquanto a verificação
                    // do fluxo não terminar, essas etapas ficam fora da lista.
                    .filter(
                      ([value]) =>
                        legacyFlowAllowed ||
                        unifiedV2 ||
                        !["sale_confirmed", "in_operation"].includes(value),
                    )



                    .map(([value, label]) => (
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
                disabled={!canAssign}
                onValueChange={(v) =>
                  updateResponsibles(
                    v === NO_MEMBER ? null : v,
                    file.operations_responsible_team_member_id,
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
                disabled={!canAssign}
                onValueChange={(v) =>
                  updateResponsibles(
                    file.responsible_team_member_id,
                    v === NO_MEMBER ? null : v,
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
            {next && canManage && (
              <Button size="sm" className="gap-2" onClick={() => updateFileStatus(next)}>
                Avançar para {FILE_STATUS_LABELS[next]}
                <ArrowRight className="h-4 w-4" />
              </Button>
            )}
            {suggested && suggested !== file.status && canManage && (
              <Button
                size="sm"
                variant="outline"
                onClick={() => updateFileStatus(suggested)}
              >
                Sugestão pelos serviços: {FILE_STATUS_LABELS[suggested]}
              </Button>
            )}
            {file.status !== "cancelled" && canManage && (
              <div className="flex min-w-0 flex-1 flex-wrap items-center gap-2">
                <Input
                  value={cancelReason}
                  onChange={(e) => setCancelReason(e.target.value)}
                  placeholder="Motivo do cancelamento (obrigatório)"
                  className="h-9 min-w-[220px] flex-1 bg-background"
                />
                <Button
                  size="sm"
                  variant="outline"
                  className="text-rose-600 hover:text-rose-700"
                  disabled={!cancelReason.trim()}
                  onClick={() => updateFileStatus("cancelled", cancelReason)}
                >
                  Cancelar processo
                </Button>
              </div>
            )}
          </div>
        </Card>

        {/* Fluxo unificado V2: prontidão da venda (somente com entitlement ativo) */}
        {/* Verificação do fluxo em andamento ou com falha: nada de caminho legado. */}
        {!unifiedResolved && (
          <Card className="min-w-0 rounded-2xl border-border/60 p-4 text-sm sm:p-5">
            <h2 className="mb-1 text-sm font-semibold text-foreground">Verificando fluxo de venda</h2>
            {unifiedFailed ? (
              <div className="space-y-3">
                <p className="text-muted-foreground">
                  Não conseguimos verificar como a venda deste processo deve ser confirmada. As
                  etapas de venda confirmada e operação ficam bloqueadas até a verificação
                  terminar.
                </p>
                <Button variant="outline" size="sm" onClick={() => window.location.reload()}>
                  Tentar novamente
                </Button>
              </div>
            ) : (
              <p className="text-muted-foreground">
                Um instante: estamos confirmando qual fluxo de venda vale para esta agência.
              </p>
            )}
          </Card>
        )}

        {/* Serviços */}
        <Card className="min-w-0 rounded-2xl border-border/60 p-4 sm:p-5">
          <div className="mb-3 flex flex-wrap items-baseline justify-between gap-2">
            <h2 className="text-sm font-semibold text-foreground">
              {isManual
                ? "Serviços da reserva"
                : reconfirmationMode
                  ? "Serviços para reconfirmar"
                  : "Serviços solicitados"}
            </h2>

            <div className="flex flex-wrap items-center gap-2">
              {canRevenue &&
                (isManual ? (
                  // Um resumo por moeda: nada é somado entre moedas diferentes.
                  <span className="text-xs text-muted-foreground [overflow-wrap:anywhere]">
                    {currencyGroups.length === 0
                      ? "Sem serviços lançados"
                      : currencyGroups
                          .map(
                            (group) =>
                              `${group.currency}: solicitado ${money(group.requested, group.currency)} · reconfirmado ${money(group.reconfirmed, group.currency)} · venda ${money(group.sold, group.currency)}`,
                          )
                          .join(" | ")}
                  </span>
                ) : (
                  <span className="text-xs text-muted-foreground [overflow-wrap:anywhere]">
                    Solicitado {money(reconfirmation.requested || totals.requested, file.currency)} ·
                    Reconfirmado {money(reconfirmation.reconfirmed, file.currency)} · Venda{" "}
                    {money(totals.sold, file.currency)}
                    {reconfirmationMode && (
                      <>
                        {" · "}
                        {reconfirmation.eligibleCount} pronto(s) para venda ·{" "}
                        {reconfirmation.pendingCount} pendente(s)
                      </>
                    )}
                  </span>

                ))}
              {isManual && canManage && (
                <Button
                  variant="outline"
                  size="sm"
                  className="gap-2"
                  onClick={() => {
                    setManualServiceEditing(null);
                    setManualServiceOpen(true);
                  }}
                >
                  <Plus className="h-4 w-4" />
                  Acrescentar serviço
                </Button>
              )}
            </div>
          </div>

          {financialCards.map((card) => (
            <div key={card.currency} className="mb-3 min-w-0">
              {financialCards.length > 1 && (
                <p className="mb-1 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                  Totais em {card.currency}
                </p>
              )}
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                {card.items.map((item) => (
                  <div
                    key={`${card.currency}-${item.label}`}
                    className="min-w-0 rounded-xl border border-border/50 bg-muted/20 p-3"
                  >
                    <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                      {item.label}
                    </p>
                    <p className="mt-0.5 text-sm font-semibold tabular-nums text-foreground">
                      {money(item.value, card.currency)}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          ))}


          <div className="space-y-2">
            {services.map((service) => (
              <div
                key={service.id}
                className="min-w-0 rounded-xl border border-border/50 p-3 sm:p-4"
              >
                <div className="flex min-w-0 flex-wrap items-center gap-2">
                  <p
                    data-testid={`service-title-${service.id}`}
                    className="min-w-0 text-sm font-medium text-foreground [overflow-wrap:anywhere]"
                  >
                    {travelFileServiceTitle(service)}
                  </p>
                  {serviceOptionLabel(service) && (
                    <Badge variant="secondary" className="font-normal">
                      {serviceOptionLabel(service)}
                    </Badge>
                  )}
                  {service.is_required && <Badge variant="outline">Obrigatório</Badge>}
                  {isManual && canManage && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="ml-auto gap-2"
                      onClick={() => {
                        setManualServiceEditing(service);
                        setManualServiceOpen(true);
                      }}
                    >
                      <Pencil className="h-4 w-4" />
                      Editar
                    </Button>
                  )}
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
                  {displayServiceSupplier(service) ? (
                    <span>Fornecedor: {displayServiceSupplier(service)}</span>
                  ) : (
                    unifiedV2 &&
                    canFinancialManage &&
                    !isConvertedV2(file) && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 gap-1.5 px-2 text-xs"
                        onClick={() => setRuleEditing(service)}
                      >
                        <Plus className="h-3.5 w-3.5" />
                        Adicionar fornecedor
                      </Button>
                    )
                  )}
                </div>


                {reconfirmationMode && (pendingByService[service.id]?.length ?? 0) > 0 && (
                  <div
                    data-testid={`service-pending-${service.id}`}
                    className="mt-2 rounded-xl border border-amber-500/40 bg-amber-500/10 p-3"
                  >
                    <p className="text-xs font-semibold text-foreground">
                      Falta para este serviço entrar na venda:
                    </p>
                    <ul className="mt-1 space-y-1">
                      {pendingByService[service.id].map((reason) => (
                        <li
                          key={reason}
                          className="flex items-start gap-2 text-xs text-muted-foreground"
                        >
                          <AlertTriangle className="mt-0.5 h-3.5 w-3.5 flex-shrink-0 text-amber-600" />
                          <span className="[overflow-wrap:anywhere]">{reason}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
                  <div className="min-w-0">
                    <label className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                      Status do serviço
                    </label>
                    <Select
                      value={service.status}
                      disabled={!canManage}
                      onValueChange={(v) =>
                        changeServiceStatus(service, v as TravelFileServiceStatus)
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
                  {canRevenue && (
                    <>
                      <AmountField
                        label="Solicitado"
                        value={service.requested_amount}
                        currency={service.currency}
                        readOnly
                        onCommit={() => {}}
                      />
                      <AmountField
                        label="Reconfirmado"
                        value={service.reconfirmed_amount}
                        currency={service.currency}
                        readOnly={!canManage}
                        onCommit={(v) => patchServiceAmounts(service, { reconfirmed_amount: v })}
                      />
                      <AmountField
                        label="Vendido"
                        value={service.sold_amount}
                        currency={service.currency}
                        readOnly={!canFinancialManage}
                        onCommit={(v) => patchServiceAmounts(service, { sold_amount: v })}
                      />
                    </>
                  )}
                </div>

                {/* Informações financeiras: opcionais nesta etapa. Custo, comissão,
                    nota fiscal e prazos vivem na Gestão Financeira e nunca
                    impedem a confirmação da venda. */}
                {(canMargin || canCommission || (unifiedV2 && canFinancialManage)) && (
                  <Collapsible className="mt-3">
                    <CollapsibleTrigger asChild>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-9 gap-2 px-2 text-xs text-muted-foreground"
                      >
                        <CircleDollarSign className="h-3.5 w-3.5" />
                        Adicionar informações financeiras agora (opcional)
                      </Button>
                    </CollapsibleTrigger>
                    <CollapsibleContent>
                      <div className="mt-2 rounded-xl border border-border/50 bg-muted/20 p-3">
                        <p className="text-[11px] text-muted-foreground">
                          Opcional nesta etapa: se ficar em branco, o financeiro deste serviço
                          entra como pendente de configuração após a venda.
                        </p>
                        <div className="mt-2 grid grid-cols-1 gap-3 sm:grid-cols-2">
                          {canMargin && (
                            <AmountField
                              label="Custo"
                              value={service.cost_amount}
                              currency={service.currency}
                              readOnly={!canFinancialManage}
                              onCommit={(v) => patchServiceAmounts(service, { cost_amount: v })}
                            />
                          )}
                          {canCommission && (
                            <AmountField
                              label="Comissão"
                              value={service.commission_amount}
                              currency={service.currency}
                              readOnly={!canCommissionManage}
                              onCommit={(v) =>
                                patchServiceAmounts(service, { commission_amount: v })
                              }
                            />
                          )}
                        </div>
                        {unifiedV2 && (
                          <div className="mt-2 flex flex-wrap items-center gap-2">
                            <Badge variant="secondary">{describeServiceCommission(service)}</Badge>
                            {canFinancialManage && !isConvertedV2(file) && (
                              <Button
                                variant="outline"
                                size="sm"
                                className="h-9 gap-1.5 text-xs"
                                onClick={() => setRuleEditing(service)}
                              >
                                <Pencil className="h-3.5 w-3.5" />
                                Fornecedor e regra financeira
                              </Button>
                            )}
                            {isConvertedV2(file) && (
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-9 gap-1.5 text-xs"
                                onClick={() => navigate(`${nav.financeiro}?tab=vendas`)}
                              >
                                <ExternalLink className="h-3.5 w-3.5" />
                                Configurar depois no Financeiro
                              </Button>
                            )}
                          </div>
                        )}
                      </div>
                    </CollapsibleContent>
                  </Collapsible>
                )}

              </div>
            ))}
            {services.length === 0 && (
              <p className="text-sm text-muted-foreground">
                Nenhum serviço registrado neste processo.
              </p>
            )}
          </div>
        </Card>

        {unifiedV2 && isActiveTravelFileStatus(file.status) && readiness && (
          <Card className="min-w-0 rounded-2xl border-border/60 p-4 sm:p-5">
            <h2 className="mb-3 text-sm font-semibold text-foreground">
              Confirmação da venda (fluxo unificado)
            </h2>

            {isConvertedV2(file) ? (
              <div className="rounded-xl border border-emerald-500/40 bg-emerald-500/10 p-4 text-sm">
                <p className="flex items-center gap-2 font-semibold text-foreground">
                  <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                  Venda confirmada e operação iniciada.
                </p>
                <p className="mt-1 text-muted-foreground">
                  O recebimento do cliente e os pagamentos a fornecedores são acompanhados
                  separadamente na operação e no financeiro.
                </p>
                <div className="mt-3 flex flex-wrap gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    className="gap-2"
                    onClick={() => {
                      if (workflowLinks.isLoading || workflowLinks.isFetching) {
                        toast.info("Ainda estamos carregando os vínculos deste processo. Um instante.");
                        return;
                      }
                      if (workflowLinks.isError) {
                        toast.error("Não conseguimos consultar a operação deste processo agora.", {
                          action: {
                            label: "Tentar novamente",
                            onClick: () => { void workflowLinks.refetch(); },
                          },
                        });
                        return;
                      }
                      const operationId = workflowLinks.operationId || file.operation_id;
                      if (!operationId) {
                        toast.error(
                          "Não foi possível localizar a operação deste processo. Verifique suas permissões ou recarregue a página.",
                        );
                        return;
                      }
                      navigate(`${nav.crm("operacoes")}?operation=${operationId}`);
                    }}
                  >
                    <ExternalLink className="h-4 w-4" />
                    Abrir operação
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="gap-2"
                    onClick={() => {
                      if (workflowLinks.isLoading || workflowLinks.isFetching) {
                        toast.info("Ainda estamos carregando os vínculos deste processo. Um instante.");
                        return;
                      }
                      if (workflowLinks.isError) {
                        toast.error("Não conseguimos consultar a venda deste processo agora.", {
                          action: {
                            label: "Tentar novamente",
                            onClick: () => { void workflowLinks.refetch(); },
                          },
                        });
                        return;
                      }
                      if (!workflowLinks.saleId) {
                        toast.error(
                          "Não foi possível localizar a venda deste processo no financeiro. Verifique suas permissões ou recarregue a página.",
                        );
                        return;
                      }
                      navigate(`${nav.financeiro}?tab=vendas&sale=${workflowLinks.saleId}`);
                    }}
                  >
                    <CircleDollarSign className="h-4 w-4" />
                    Abrir financeiro
                  </Button>
                </div>

              </div>
            ) : (
              <div className="space-y-3">
                {readiness.blockers.length === 0 ? (
                  <p className="flex items-center gap-2 rounded-xl border border-emerald-500/40 bg-emerald-500/10 p-3 text-sm text-foreground">
                    <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                    Processo pronto: {readiness.eligible.length} serviço(s), total{" "}
                    {money(readiness.total, readiness.currency || file.currency)}.
                  </p>
                ) : (
                  <ul className="space-y-1.5">
                    {readiness.blockers.map((blocker) => (
                      <li
                        key={blocker}
                        className="flex items-start gap-2 rounded-xl border border-amber-500/40 bg-amber-500/10 p-3 text-sm text-foreground"
                      >
                        <AlertTriangle className="mt-0.5 h-4 w-4 flex-shrink-0 text-amber-600" />
                        <span>{blocker}</span>
                      </li>
                    ))}
                  </ul>
                )}
                {readiness.warnings.map((warning) => (
                  <p key={warning} className="text-xs text-muted-foreground">
                    {warning}
                  </p>
                ))}
                {canManage && (
                  <Button
                    className="min-h-11 w-full gap-2 sm:w-auto"
                    onClick={() => setConfirmSaleOpen(true)}
                  >
                    <CheckCircle2 className="h-4 w-4" />
                    Confirmar venda e iniciar operação
                  </Button>
                )}

              </div>
            )}
          </Card>
        )}

        {/* Visão geral */}
        <Card className="min-w-0 rounded-2xl border-border/60 p-4 sm:p-5">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
            <h2 className="text-sm font-semibold text-foreground">Visão geral</h2>
            {isManual && canManage && (
              <Button
                variant="outline"
                size="sm"
                className="gap-2"
                onClick={() => setEditDraftOpen(true)}
              >
                <Pencil className="h-4 w-4" />
                Editar dados
              </Button>
            )}
          </div>
          <dl className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {[
              {
                label: file.contractor_type === "company" ? "Empresa contratante" : "Contratante",
                value:
                  data?.company?.name ||
                  data?.client?.name ||
                  file.protocol_snapshot ||
                  "—",
              },
              {
                label: "Contato responsável",
                value:
                  data?.contact?.name ||
                  data?.client?.phone ||
                  data?.client?.email ||
                  (file.contact_snapshot as any)?.name ||
                  "—",
              },
              {
                label: "Origem",
                value: isManual ? "Cadastro interno da agência" : "Solicitação pelo site",
              },
              { label: "Viagem", value: file.trip_name || "—" },
              { label: "Destino", value: file.primary_destination || "—" },
              { label: "Período", value: `${dateLabel(file.start_date)} — ${dateLabel(file.end_date)}` },
              {
                label: "Passageiros",
                value: `${file.passengers_count} (${file.adults_count} adulto(s), ${file.children_count} criança(s))`,
              },
              ...(canRevenue
                ? isManual
                  ? [
                      // Reserva manual: soma dos serviços por moeda (cada
                      // requested_amount já é o total do serviço).
                      {
                        label: "Valor dos serviços (solicitado)",
                        value: groupedMoney("requested"),
                      },
                      { label: "Valor reconfirmado", value: groupedMoney("reconfirmed") },
                      { label: "Valor de venda", value: groupedMoney("sold") },
                    ]
                  : [
                      { label: "Valor solicitado", value: money(file.requested_amount, file.currency) },
                      {
                        label: "Valor reconfirmado",
                        value:
                          file.reconfirmed_amount != null
                            ? money(file.reconfirmed_amount, file.currency)
                            : "Aguardando reconfirmação",
                      },
                      {
                        label: "Venda final",
                        value:
                          file.final_sale_amount != null
                            ? money(file.final_sale_amount, file.currency)
                            : "—",
                      },
                    ]
                : []),

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
                      ? `${nav.crm("clientes")}?client=${file.client_id}`
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

        {unifiedV2 && readiness && (
          <ConfirmSaleDialog
            open={confirmSaleOpen}
            onOpenChange={setConfirmSaleOpen}
            file={file}
            readiness={readiness}
            supplierExceptions={supplierExceptions}
          />
        )}
        {unifiedV2 && ruleEditing && (
          <ServiceFinancialRuleDialog
            open={!!ruleEditing}
            onOpenChange={(nextOpen) => {
              if (!nextOpen) setRuleEditing(null);
            }}
            fileId={file.id}
            service={ruleEditing}
          />
        )}

        {isManual && canManage && (
          <>
            <EditarRascunhoDialog
              open={editDraftOpen}
              onOpenChange={setEditDraftOpen}
              file={file}
              currentClient={data?.client ? { id: data.client.id, name: data.client.name } : null}
              currentCompany={data?.company ? { id: data.company.id, name: data.company.name } : null}
              currentContact={data?.contact ? { id: data.contact.id, name: data.contact.name } : null}
              canEditContractor={file.status === "draft"}
              onSave={async (input) => {
                await saveManualData.mutateAsync(input);
                toast.success("Dados da reserva atualizados.");
              }}
            />

            <ManualServiceDialog
              open={manualServiceOpen}
              onOpenChange={(next) => {
                setManualServiceOpen(next);
                if (!next) setManualServiceEditing(null);
              }}
              service={manualServiceEditing}
              canEditAmount={canFinancialManage}
              // A moeda do serviço em edição prevalece; a da reserva é só fallback.
              currency={manualServiceEditing?.currency || file.currency}
              onSave={async (payload: ManualServicePayload) => {
                await saveManualService.mutateAsync({
                  ...payload,
                  currency: manualServiceEditing?.currency || file.currency,
                });
                toast.success("Serviço salvo.");
              }}
            />
          </>
        )}
      </div>
    </DashboardLayout>
  );
}
