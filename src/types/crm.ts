export interface Client {
  id: string;
  user_id: string;
  name: string;
  email: string | null;
  phone: string | null;
  city: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
  opportunities?: Opportunity[];
}

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
