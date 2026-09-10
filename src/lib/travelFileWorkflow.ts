import type {
  TravelFile,
  TravelFileListItem,
  TravelFileService,
  TravelFileServiceStatus,
  TravelFileStatus,
} from "@/types/travelFile";
import { FILE_STATUS_LABELS, SERVICE_STATUS_LABELS } from "@/lib/travelFiles";

/**
 * Fluxo operacional do File (processo de reserva).
 * O File é o registro central: aqui vivem apenas as regras de leitura e de
 * sugestão de etapa — nenhuma consulta e nenhuma estrutura nova de dados.
 */
export const FILE_STATUS_ORDER: TravelFileStatus[] = [
  "request_received",
  "awaiting_reconfirmation",
  "partially_available",
  "awaiting_client",
  "sale_confirmed",
  "in_operation",
  "trip_completed",
];

export const FINAL_FILE_STATUSES: TravelFileStatus[] = ["trip_completed", "cancelled"];

export function isFinalFileStatus(status: TravelFileStatus): boolean {
  return FINAL_FILE_STATUSES.includes(status);
}

/** Posição da etapa na régua (1..7). Cancelada fica fora da régua. */
export function fileStatusStep(status: TravelFileStatus): number {
  const index = FILE_STATUS_ORDER.indexOf(status);
  return index < 0 ? 0 : index + 1;
}

/** Próximo passo natural sugerido — nunca bloqueia a escolha manual da agência. */
export function nextFileStatus(status: TravelFileStatus): TravelFileStatus | null {
  if (status === "cancelled") return null;
  const index = FILE_STATUS_ORDER.indexOf(status);
  if (index < 0 || index >= FILE_STATUS_ORDER.length - 1) return null;
  return FILE_STATUS_ORDER[index + 1];
}

/**
 * Sugestão de etapa a partir dos serviços.
 * A decisão final é sempre da agência: isto apenas orienta a operação.
 */
export function suggestFileStatusFromServices(
  services: Pick<TravelFileService, "status">[],
): TravelFileStatus | null {
  if (services.length === 0) return null;
  const statuses = services.map((s) => s.status);
  const every = (fn: (s: TravelFileServiceStatus) => boolean) => statuses.every(fn);
  const some = (fn: (s: TravelFileServiceStatus) => boolean) => statuses.some(fn);

  if (every((s) => s === "cancelled")) return "cancelled";
  if (every((s) => ["booked", "paid", "issued", "delivered"].includes(s))) return "sale_confirmed";
  if (some((s) => s === "awaiting_client") || some((s) => s === "amount_changed")) {
    return "awaiting_client";
  }
  if (some((s) => s === "unavailable") && some((s) => s === "available")) {
    return "partially_available";
  }
  if (some((s) => s === "reconfirming")) return "awaiting_reconfirmation";
  if (every((s) => s === "requested")) return "request_received";
  return null;
}

export interface TravelFileFinancials {
  requested: number;
  reconfirmed: number;
  sold: number;
  cost: number;
  commission: number;
  /** Margem = venda − custo (quando houver custo informado). */
  margin: number;
  /** Diferença entre reconfirmado e solicitado: alerta de reajuste. */
  variation: number;
}

const num = (value: unknown): number => {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
};

/** Consolidação financeira do file a partir dos serviços congelados. */
export function summarizeServiceFinancials(services: TravelFileService[]): TravelFileFinancials {
  let requested = 0;
  let reconfirmed = 0;
  let sold = 0;
  let cost = 0;
  let commission = 0;

  for (const service of services) {
    if (service.status === "cancelled") continue;
    const req = num(service.requested_amount);
    const rec = service.reconfirmed_amount == null ? req : num(service.reconfirmed_amount);
    requested += req;
    reconfirmed += rec;
    sold += service.sold_amount == null ? rec : num(service.sold_amount);
    cost += num(service.cost_amount);
    commission += num(service.commission_amount);
  }

  return {
    requested,
    reconfirmed,
    sold,
    cost,
    commission,
    margin: sold - cost,
    variation: reconfirmed - requested,
  };
}

export interface ReservasIndicators {
  total: number;
  unread: number;
  newRequests: number;
  awaitingReconfirmation: number;
  awaitingClient: number;
  confirmed: number;
  inOperation: number;
  cancelled: number;
  requestedAmount: number;
  confirmedAmount: number;
  currency: string;
}

/** Indicadores da Central de Reservas (somente leitura da lista já carregada). */
export function summarizeReservas(files: TravelFileListItem[]): ReservasIndicators {
  const has = (status: TravelFileStatus) => files.filter((f) => f.status === status).length;
  const confirmedStatuses: TravelFileStatus[] = ["sale_confirmed", "in_operation", "trip_completed"];

  return {
    total: files.length,
    unread: files.filter((f) => f.unread).length,
    newRequests: has("request_received"),
    awaitingReconfirmation: has("awaiting_reconfirmation") + has("partially_available"),
    awaitingClient: has("awaiting_client"),
    confirmed: has("sale_confirmed"),
    inOperation: has("in_operation"),
    cancelled: has("cancelled"),
    requestedAmount: files
      .filter((f) => f.status !== "cancelled")
      .reduce((sum, f) => sum + num(f.requested_amount), 0),
    confirmedAmount: files
      .filter((f) => confirmedStatuses.includes(f.status))
      .reduce(
        (sum, f) => sum + num(f.final_sale_amount ?? f.reconfirmed_amount ?? f.requested_amount),
        0,
      ),
    currency: files[0]?.currency || "BRL",
  };
}

/** Idade da solicitação em dias completos — usada para o alerta de atraso. */
export function fileAgeInDays(file: Pick<TravelFile, "opened_at">, now = new Date()): number {
  const opened = new Date(file.opened_at).getTime();
  if (!Number.isFinite(opened)) return 0;
  return Math.max(0, Math.floor((now.getTime() - opened) / 86400000));
}

/** Solicitação nova parada há 2 dias ou mais merece destaque na lista. */
export function isFileOverdue(
  file: Pick<TravelFile, "opened_at" | "status">,
  now = new Date(),
): boolean {
  if (isFinalFileStatus(file.status) || file.status === "sale_confirmed") return false;
  return fileAgeInDays(file, now) >= 2;
}

const teamName = (id: string | null | undefined, directory: Record<string, string>): string =>
  (id && directory[id]) || "responsável não definido";

/** Descrição em linguagem de negócio de cada evento do histórico. */
export function describeFileEvent(
  event: { event_type: string; payload?: Record<string, unknown> | null },
  directory: Record<string, string> = {},
): string {
  const payload = (event.payload || {}) as Record<string, any>;
  const fileStatus = (v: unknown) => FILE_STATUS_LABELS[v as TravelFileStatus] ?? String(v ?? "—");
  const serviceStatus = (v: unknown) =>
    SERVICE_STATUS_LABELS[v as TravelFileServiceStatus] ?? String(v ?? "—");

  switch (event.event_type) {
    case "request_received":
      return "Solicitação recebida do cliente";
    case "request_superseded":
      return "Solicitação anterior substituída por nova revisão";
    case "crm_opportunity_linked":
      return "Oportunidade vinculada no CRM";
    case "file_status_changed":
      return `Etapa alterada de "${fileStatus(payload.from)}" para "${fileStatus(payload.to)}"${
        payload.reason ? ` — ${payload.reason}` : ""
      }`;
    case "file_responsible_changed":
      return `Responsável comercial alterado para ${teamName(payload.to, directory)}`;
    case "file_operations_responsible_changed":
      return `Responsável pela operação alterado para ${teamName(payload.to, directory)}`;
    case "service_status_changed":
      return `${payload.service_name || "Serviço"}: "${serviceStatus(payload.from)}" → "${serviceStatus(payload.to)}"`;
    case "service_amounts_changed":
      return `${payload.service_name || "Serviço"}: valores atualizados`;
    default:
      return event.event_type;
  }
}
