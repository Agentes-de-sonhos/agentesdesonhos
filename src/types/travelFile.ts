/** Processo de reserva (File): registro central da venda originada no orçamento web. */
export type TravelFileStatus =
  | "request_received"
  | "awaiting_reconfirmation"
  | "partially_available"
  | "awaiting_client"
  | "sale_confirmed"
  | "in_operation"
  | "trip_completed"
  | "cancelled";

export type TravelFileServiceStatus =
  | "requested"
  | "reconfirming"
  | "available"
  | "amount_changed"
  | "unavailable"
  | "awaiting_client"
  | "booked"
  | "paid"
  | "issued"
  | "delivered"
  | "cancelled";

export interface TravelFile {
  id: string;
  agency_id: string;
  file_number: number;
  file_number_display: string;
  client_id: string | null;
  opportunity_id: string | null;
  quote_id: string | null;
  root_request_id: string;
  current_request_id: string | null;
  revision: number;
  protocol_snapshot: string | null;
  responsible_user_id: string | null;
  responsible_team_member_id: string | null;
  operations_responsible_team_member_id: string | null;
  primary_destination: string | null;
  destinations: string[];
  start_date: string | null;
  end_date: string | null;
  adults_count: number;
  children_count: number;
  passengers_count: number;
  currency: string;
  pricing_mode: string;
  requested_amount: number;
  reconfirmed_amount: number | null;
  final_sale_amount: number | null;
  status: TravelFileStatus;
  operational_status: string;
  financial_status: string;
  operation_id: string | null;
  opened_at: string;
  confirmed_at: string | null;
  cancelled_at: string | null;
  completed_at: string | null;
  cancellation_reason: string | null;
  created_at: string;
  updated_at: string;
}

export interface TravelFileService {
  id: string;
  file_id: string;
  service_type: string;
  product_name: string;
  supplier_name: string | null;
  city: string | null;
  destination: string | null;
  country: string | null;
  start_date: string | null;
  end_date: string | null;
  quantity: number;
  passengers_count: number | null;
  currency: string;
  requested_amount: number;
  reconfirmed_amount: number | null;
  sold_amount: number | null;
  cost_amount: number | null;
  commission_amount: number | null;
  responsible_team_member_id: string | null;
  is_required: boolean;
  status: TravelFileServiceStatus;
  snapshot: Record<string, unknown>;
  created_at: string;
}

/** Nota interna do processo: nunca é exibida ao cliente. */
export interface TravelFileNote {
  id: string;
  file_id: string;
  agency_id: string;
  author_user_id: string | null;
  author_name: string | null;
  body: string;
  created_at: string;
  updated_at: string;
}

/** Item da lista da aba Reservas, já com dados derivados de leitura. */
export interface TravelFileListItem extends TravelFile {
  clientName: string | null;
  servicesCount: number;
  serviceNames: string[];
  unread: boolean;
  responsibleName?: string | null;
}

