/**
 * Fase 3 — Pedido de reserva (VIP).
 * Um pedido NÃO é uma reserva confirmada: é uma solicitação que a agência
 * precisa reconfirmar (disponibilidade e valores) antes de qualquer conclusão.
 */

export type BookingRequestStatus =
  | "received"
  | "under_review"
  | "awaiting_reconfirmation"
  | "approved"
  | "partially_approved"
  | "unavailable"
  | "awaiting_client_acceptance"
  | "accepted"
  | "converted"
  | "cancelled"
  | "expired"
  | "superseded";

export type BookingRequestItemReviewStatus =
  | "pending"
  | "available"
  | "unavailable"
  | "repriced"
  | "replaced"
  | "approved"
  | "rejected";

export interface BookingRequest {
  id: string;
  root_request_id: string | null;
  version: number;
  quote_id: string;
  user_id: string;
  agency_id: string;
  client_id: string | null;
  opportunity_id: string | null;
  protocol: string;
  status: BookingRequestStatus;
  client_name: string;
  client_email: string;
  client_whatsapp: string;
  client_notes: string | null;
  disclaimer_accepted_at: string;
  disclaimer_text_snapshot: string;
  currency: string;
  total_estimated: number;
  revised_total: number | null;
  client_final_accepted_at: string | null;
  expires_at: string | null;
  public_access_token: string;
  created_at: string;
  updated_at: string;
}

export interface BookingRequestItem {
  id: string;
  request_id: string;
  source_quote_service_id: string | null;
  service_type: string;
  service_name: string;
  snapshot: Record<string, unknown>;
  amount_snapshot: number;
  selection_mode_snapshot: "optional" | "required" | "alternative" | "free";
  choice_group_snapshot: {
    id: string;
    title: string;
    group_type: "alternative" | "free";
    min_select: number;
    max_select: number | null;
  } | null;
  quantity: number;
  review_status: BookingRequestItemReviewStatus;
  revised_amount: number | null;
  replacement_snapshot: Record<string, unknown> | null;
  agency_note: string | null;
  client_accepted: boolean | null;
  operation_service_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface BookingRequestEvent {
  id: string;
  request_id: string;
  item_id: string | null;
  actor_type: "client" | "agency" | "system";
  actor_user_id: string | null;
  actor_team_member_id: string | null;
  event_type: string;
  payload: Record<string, unknown>;
  created_at: string;
}

/** Resposta pública mínima do endpoint `submit-booking-request`. */
export interface BookingRequestSubmitResult {
  success: true;
  request_id: string;
  protocol: string;
  version: number;
  status: BookingRequestStatus;
  total_estimated: number;
  currency: string;
  public_access_token: string;
  duplicate: boolean;
  message: string;
}
