/**
 * Presentation helpers for the Block 3 report: conflicts, read-only skips and
 * the fields the platform deliberately preserves on Google.
 *
 * Diagnostics never expose full personal data of attendees — only counts and
 * summaries reach the UI.
 */

export interface ConflictSummaryLike {
  google_event_id: string | null;
  agency_event_id: string | null;
  conflict_type: string;
  title: string | null;
}

export interface FidelityReportLike {
  conflicts_detected?: number;
  conflicts?: ConflictSummaryLike[];
  read_only_skipped?: number;
  delete_skip_reasons?: Record<string, number>;
  phase_order?: string;
}

export const CONFLICT_TYPE_LABELS: Record<string, string> = {
  both_changed: "Alterado nos dois lados — nada foi sobrescrito",
  precondition_failed: "O evento mudou no Google durante o envio — nada foi sobrescrito",
};

export const DELETE_SKIP_LABELS: Record<string, string> = {
  google_origin: "Criado no Google — excluído apenas da agenda, preservado no Google",
  read_only: "Somente leitura — preservado no Google",
  google_managed: "Gerenciado pelo Google — preservado no Google",
  recurring_instance: "Ocorrência de evento recorrente — preservada no Google",
  unknown_origin: "Origem não comprovada — preservado no Google por segurança",
};

export const READ_ONLY_REASON_LABELS: Record<string, string> = {
  "recurring_instance": "Ocorrência de série recorrente",
  "recurring_series": "Série recorrente",
  "organizer_not_editable": "Organizado por outra pessoa",
  "secondary_calendar": "Agenda secundária",
  locked: "Bloqueado pelo Google",
};

export function conflictTypeLabel(type: string): string {
  return CONFLICT_TYPE_LABELS[type] || "Conflito de sincronização";
}

export function deleteSkipLabel(reason: string): string {
  return DELETE_SKIP_LABELS[reason] || "Exclusão remota não permitida";
}

/** Fields the push never sends, shown to explain what stays intact on Google. */
export const PRESERVED_FIELDS_LABEL =
  "Participantes, videoconferência, recorrência, lembretes, organizador e visibilidade são sempre preservados no Google.";

export function hasConflicts(report: FidelityReportLike | null | undefined): boolean {
  return (report?.conflicts_detected ?? 0) > 0;
}

/** Short banner text for the sync button / report header. */
export function conflictBannerLabel(report: FidelityReportLike | null | undefined): string | null {
  const n = report?.conflicts_detected ?? 0;
  if (n <= 0) return null;
  return n === 1
    ? "1 conflito detectado — revise qual versão manter"
    : `${n} conflitos detectados — revise quais versões manter`;
}

/** Read-only/skip line: how many items were mirrored but not written back. */
export function readOnlySkipLabel(report: FidelityReportLike | null | undefined): string | null {
  const n = report?.read_only_skipped ?? 0;
  if (n <= 0) return null;
  return n === 1
    ? "1 evento somente leitura foi preservado no Google"
    : `${n} eventos somente leitura foram preservados no Google`;
}

/** Explicit warning shown before a deletion may reach Google. */
export function remoteDeletionWarning(origin?: string | null, readOnly?: boolean | null): string {
  if (readOnly || (origin && origin !== "local")) {
    return "Este evento veio do Google. Ele será removido apenas da sua agenda e permanecerá no Google Calendar.";
  }
  return "Este evento foi criado na plataforma. Ao excluir, ele também será removido do seu Google Calendar.";
}

/** Attendee diagnostics: counts only, never the guest list. */
export function attendeeSummaryLabel(attendees: unknown): string | null {
  if (!Array.isArray(attendees) || attendees.length === 0) return null;
  return attendees.length === 1 ? "1 participante" : `${attendees.length} participantes`;
}