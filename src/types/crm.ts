export interface Client {
  id: string;
  user_id: string;
  name: string;
  email: string | null;
  phone: string | null;
  city: string | null;
  notes: string | null;
  status: ClientStatus;
  travel_preferences: string | null;
  internal_notes: string | null;
  birthday_day: number | null;
  birthday_month: number | null;
  birthday_year: number | null;
  last_interaction_at: string;
  created_at: string;
  updated_at: string;
  opportunities?: Opportunity[];
  total_spent?: number;
  trips_count?: number;
}

export type ClientStatus = 'lead' | 'em_negociacao' | 'cliente_ativo' | 'fidelizado';

export const CLIENT_STATUS_LABELS: Record<ClientStatus, string> = {
  lead: 'Lead',
  em_negociacao: 'Em Negociação',
  cliente_ativo: 'Cliente Ativo',
  fidelizado: 'Fidelizado',
};

export const CLIENT_STATUS_COLORS: Record<ClientStatus, string> = {
  lead: 'bg-blue-500',
  em_negociacao: 'bg-yellow-500',
  cliente_ativo: 'bg-green-500',
  fidelizado: 'bg-purple-500',
};

export interface Opportunity {
  id: string;
  user_id: string;
  client_id: string;
  destination: string;
  start_date: string | null;
  end_date: string | null;
  passengers_count: number;
  estimated_value: number;
  notes: string | null;
  stage: OpportunityStage;
  stage_entered_at: string;
  follow_up_date: string | null;
  created_at: string;
  updated_at: string;
  client?: Client;
}

export interface OpportunityHistory {
  id: string;
  opportunity_id: string;
  from_stage: string | null;
  to_stage: string;
  changed_at: string;
  notes: string | null;
}

export interface SalesGoal {
  id: string;
  user_id: string;
  month: number;
  year: number;
  target_amount: number;
  created_at: string;
  updated_at: string;
}

export type OpportunityStage =
  | 'new_contact'
  | 'in_service'
  | 'quote_creating'
  | 'quote_sent'
  | 'negotiation'
  | 'follow_up'
  | 'closed'
  | 'lost';

export const STAGE_LABELS: Record<OpportunityStage, string> = {
  new_contact: 'Novo Contato',
  in_service: 'Em Atendimento',
  quote_creating: 'Orçamento em Criação',
  quote_sent: 'Orçamento Enviado',
  negotiation: 'Negociação / Ajustes',
  follow_up: 'Follow-up',
  closed: 'Fechado',
  lost: 'Perdido / Arquivado',
};

export const STAGE_COLORS: Record<OpportunityStage, string> = {
  new_contact: 'bg-blue-500',
  in_service: 'bg-yellow-500',
  quote_creating: 'bg-orange-500',
  quote_sent: 'bg-purple-500',
  negotiation: 'bg-pink-500',
  follow_up: 'bg-cyan-500',
  closed: 'bg-green-500',
  lost: 'bg-gray-500',
};

export const STAGES_ORDER: OpportunityStage[] = [
  'new_contact',
  'in_service',
  'quote_creating',
  'quote_sent',
  'negotiation',
  'follow_up',
  'closed',
  'lost',
];
