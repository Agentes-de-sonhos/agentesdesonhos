import type {
  TravelFileListItem,
  TravelFileServiceStatus,
  TravelFileStatus,
} from "@/types/travelFile";

/** Número curto do file sempre com sete dígitos. Nunca concede acesso público. */
export function formatFileNumber(value: number | string | null | undefined): string {
  const digits = String(value ?? "").replace(/\D/g, "");
  if (!digits) return "";
  return digits.padStart(7, "0").slice(-7);
}

export function fileNumberLabel(value: number | string | null | undefined): string {
  const n = formatFileNumber(value);
  return n ? `File nº ${n}` : "";
}

export function bookingProcessLabel(value: number | string | null | undefined): string {
  const n = formatFileNumber(value);
  return n ? `Processo de reserva nº ${n}` : "";
}

export const FILE_STATUS_LABELS: Record<TravelFileStatus, string> = {
  request_received: "Solicitação recebida",
  awaiting_reconfirmation: "Aguardando reconfirmação",
  partially_available: "Parcialmente disponível",
  awaiting_client: "Aguardando cliente",
  sale_confirmed: "Venda confirmada",
  in_operation: "Em operação",
  trip_completed: "Viagem concluída",
  cancelled: "Cancelada",
};

export const SERVICE_STATUS_LABELS: Record<TravelFileServiceStatus, string> = {
  requested: "Solicitado",
  reconfirming: "Em reconfirmação",
  available: "Disponível",
  amount_changed: "Valor alterado",
  unavailable: "Indisponível",
  awaiting_client: "Aguardando cliente",
  booked: "Reservado",
  paid: "Pago",
  issued: "Emitido",
  delivered: "Entregue",
  cancelled: "Cancelado",
};

export type ReservasFilterId =
  | "all"
  | "new"
  | "awaiting_reconfirmation"
  | "awaiting_client"
  | "confirmed"
  | "in_operation"
  | "completed"
  | "cancelled";

/** A aba Reservas é única: os filtros cobrem novas solicitações e etapas posteriores. */
export const RESERVAS_FILTERS: { id: ReservasFilterId; label: string; statuses: TravelFileStatus[] }[] = [
  { id: "all", label: "Todas", statuses: [] },
  { id: "new", label: "Novas solicitações", statuses: ["request_received"] },
  {
    id: "awaiting_reconfirmation",
    label: "Aguardando reconfirmação",
    statuses: ["awaiting_reconfirmation", "partially_available"],
  },
  { id: "awaiting_client", label: "Aguardando cliente", statuses: ["awaiting_client"] },
  { id: "confirmed", label: "Confirmadas", statuses: ["sale_confirmed"] },
  { id: "in_operation", label: "Em operação", statuses: ["in_operation"] },
  { id: "completed", label: "Concluídas", statuses: ["trip_completed"] },
  { id: "cancelled", label: "Canceladas", statuses: ["cancelled"] },
];

/**
 * Contagem exibida em cada filtro. O servidor devolve um contador por etapa;
 * o filtro "Aguardando reconfirmação" soma também "Parcialmente disponível"
 * porque ele cobre as duas etapas.
 */
export type ReservasFilterCounts = Partial<Record<ReservasFilterId | "partially_available", number>>;

export function reservasFilterCount(counts: ReservasFilterCounts, id: ReservasFilterId): number {
  if (id === "awaiting_reconfirmation") {
    return (counts.awaiting_reconfirmation ?? 0) + (counts.partially_available ?? 0);
  }
  return counts[id] ?? 0;
}

const norm = (v: string): string =>
  v
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();

export interface TravelFileSearchOptions {
  filter?: ReservasFilterId;
  search?: string;
  /** Período de viagem (YYYY-MM-DD). Considera qualquer sobreposição. */
  from?: string | null;
  to?: string | null;
  responsibleTeamMemberId?: string | null;
}

/**
 * Busca por número do file, cliente, destino, vendedor, período e status.
 * O número aceita busca com ou sem zeros à esquerda ("1" encontra 0000001).
 */
export function filterTravelFiles<T extends TravelFileListItem>(
  files: T[],
  options: TravelFileSearchOptions = {},
): T[] {
  const { filter = "all", search = "", from, to, responsibleTeamMemberId } = options;
  const statuses = RESERVAS_FILTERS.find((f) => f.id === filter)?.statuses ?? [];
  const q = norm(search);
  const qDigits = q.replace(/\D/g, "");

  return files.filter((file) => {
    if (statuses.length > 0 && !statuses.includes(file.status)) return false;
    if (responsibleTeamMemberId && file.responsible_team_member_id !== responsibleTeamMemberId) {
      return false;
    }
    if (from && file.end_date && file.end_date < from) return false;
    if (to && file.start_date && file.start_date > to) return false;

    if (!q) return true;

    if (qDigits) {
      const number = file.file_number_display || formatFileNumber(file.file_number);
      if (number.includes(qDigits.padStart(7, "0").slice(-7))) return true;
      if (String(file.file_number).includes(qDigits)) return true;
    }

    const hay = norm(
      [
        file.clientName ?? "",
        file.primary_destination ?? "",
        (file.destinations || []).join(" "),
        file.protocol_snapshot ?? "",
        FILE_STATUS_LABELS[file.status] ?? "",
        (file.serviceNames || []).join(" "),
      ].join(" | "),
    );
    return hay.includes(q);
  });
}

export function countUnreadFiles(files: TravelFileListItem[]): number {
  return files.filter((f) => f.unread).length;
}

/** Mensagem de negócio ao tentar excluir um orçamento que originou um file. */
export function quoteDeleteBlockedMessage(fileNumber?: string | number | null): string {
  const n = formatFileNumber(fileNumber);
  return n
    ? `Este orçamento não pode ser excluído. Ele possui uma solicitação de reserva vinculada e precisa ser preservado como origem do File nº ${n}.`
    : "Este orçamento não pode ser excluído. Ele possui uma solicitação de reserva vinculada e precisa ser preservado como origem do processo de reserva.";
}

/** Traduz o erro do banco em mensagem de negócio (nunca texto técnico). */
export function parseQuoteDeleteError(message?: string | null): string | null {
  if (!message) return null;
  const match = /QUOTE_HAS_BOOKING_FILE:([0-9]*)/.exec(message);
  if (!match) return null;
  return quoteDeleteBlockedMessage(match[1] || null);
}
