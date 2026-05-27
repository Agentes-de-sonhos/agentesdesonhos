export interface ClientCategory {
  id: string;
  name: string;
  is_active: boolean;
  order_index: number;
  created_at: string;
}

export interface ClientSubcategory {
  id: string;
  name: string;
  category_id: string;
  created_at: string;
}

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
  category_id: string | null;
  subcategory_id: string | null;
  last_interaction_at: string;
  created_at: string;
  updated_at: string;
  opportunities?: Opportunity[];
  total_spent?: number;
  trips_count?: number;
  category?: ClientCategory;
  subcategory?: ClientSubcategory;
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
  adults_count: number;
  children_count: number;
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

export interface PipelineStage {
  id: string;
  user_id: string;
  name: string;
  position: number;
  color: StageColor;
  legacy_key: string | null;
  is_default: boolean;
  created_at: string;
  updated_at: string;
}

export type StageColor =
  | 'blue' | 'amber' | 'orange' | 'violet' | 'rose'
  | 'sky' | 'emerald' | 'slate' | 'green' | 'red'
  | 'indigo' | 'fuchsia' | 'teal' | 'pink';

export interface StageColorTokens {
  bar: string;
  bg: string;
  border: string;
  text: string;
  dot: string;
}

export const STAGE_COLOR_PALETTE: Record<StageColor, StageColorTokens> = {
  blue:    { bar: 'bg-blue-600',    bg: 'bg-blue-50 dark:bg-blue-950/40',       border: 'border-blue-200 dark:border-blue-800',       text: 'text-blue-700 dark:text-blue-300',       dot: 'bg-blue-500' },
  amber:   { bar: 'bg-amber-500',   bg: 'bg-amber-50 dark:bg-amber-950/40',     border: 'border-amber-200 dark:border-amber-800',     text: 'text-amber-700 dark:text-amber-300',     dot: 'bg-amber-500' },
  orange:  { bar: 'bg-orange-600',  bg: 'bg-orange-50 dark:bg-orange-950/40',   border: 'border-orange-200 dark:border-orange-800',   text: 'text-orange-700 dark:text-orange-300',   dot: 'bg-orange-500' },
  violet:  { bar: 'bg-violet-600',  bg: 'bg-violet-50 dark:bg-violet-950/40',   border: 'border-violet-200 dark:border-violet-800',   text: 'text-violet-700 dark:text-violet-300',   dot: 'bg-violet-500' },
  rose:    { bar: 'bg-rose-600',    bg: 'bg-rose-50 dark:bg-rose-950/40',       border: 'border-rose-200 dark:border-rose-800',       text: 'text-rose-700 dark:text-rose-300',       dot: 'bg-rose-500' },
  sky:     { bar: 'bg-sky-600',     bg: 'bg-sky-50 dark:bg-sky-950/40',         border: 'border-sky-200 dark:border-sky-800',         text: 'text-sky-700 dark:text-sky-300',         dot: 'bg-sky-500' },
  emerald: { bar: 'bg-emerald-600', bg: 'bg-emerald-50 dark:bg-emerald-950/40', border: 'border-emerald-200 dark:border-emerald-800', text: 'text-emerald-700 dark:text-emerald-300', dot: 'bg-emerald-500' },
  slate:   { bar: 'bg-slate-500',   bg: 'bg-slate-100 dark:bg-slate-900/40',    border: 'border-slate-200 dark:border-slate-700',     text: 'text-slate-600 dark:text-slate-400',     dot: 'bg-slate-500' },
  green:   { bar: 'bg-green-600',   bg: 'bg-green-50 dark:bg-green-950/40',     border: 'border-green-200 dark:border-green-800',     text: 'text-green-700 dark:text-green-300',     dot: 'bg-green-500' },
  red:     { bar: 'bg-red-600',     bg: 'bg-red-50 dark:bg-red-950/40',         border: 'border-red-200 dark:border-red-800',         text: 'text-red-700 dark:text-red-300',         dot: 'bg-red-500' },
  indigo:  { bar: 'bg-indigo-600',  bg: 'bg-indigo-50 dark:bg-indigo-950/40',   border: 'border-indigo-200 dark:border-indigo-800',   text: 'text-indigo-700 dark:text-indigo-300',   dot: 'bg-indigo-500' },
  fuchsia: { bar: 'bg-fuchsia-600', bg: 'bg-fuchsia-50 dark:bg-fuchsia-950/40', border: 'border-fuchsia-200 dark:border-fuchsia-800', text: 'text-fuchsia-700 dark:text-fuchsia-300', dot: 'bg-fuchsia-500' },
  teal:    { bar: 'bg-teal-600',    bg: 'bg-teal-50 dark:bg-teal-950/40',       border: 'border-teal-200 dark:border-teal-800',       text: 'text-teal-700 dark:text-teal-300',       dot: 'bg-teal-500' },
  pink:    { bar: 'bg-pink-600',    bg: 'bg-pink-50 dark:bg-pink-950/40',       border: 'border-pink-200 dark:border-pink-800',       text: 'text-pink-700 dark:text-pink-300',       dot: 'bg-pink-500' },
};

export function getStageTokens(color: string | null | undefined): StageColorTokens {
  return STAGE_COLOR_PALETTE[(color as StageColor)] || STAGE_COLOR_PALETTE.slate;
}

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
  new_contact: 'bg-blue-600',
  in_service: 'bg-amber-500',
  quote_creating: 'bg-orange-600',
  quote_sent: 'bg-violet-600',
  negotiation: 'bg-rose-600',
  follow_up: 'bg-sky-600',
  closed: 'bg-emerald-600',
  lost: 'bg-slate-500',
};

export const STAGE_BG_COLORS: Record<OpportunityStage, string> = {
  new_contact: 'bg-blue-50 dark:bg-blue-950/40',
  in_service: 'bg-amber-50 dark:bg-amber-950/40',
  quote_creating: 'bg-orange-50 dark:bg-orange-950/40',
  quote_sent: 'bg-violet-50 dark:bg-violet-950/40',
  negotiation: 'bg-rose-50 dark:bg-rose-950/40',
  follow_up: 'bg-sky-50 dark:bg-sky-950/40',
  closed: 'bg-emerald-50 dark:bg-emerald-950/40',
  lost: 'bg-slate-100 dark:bg-slate-900/40',
};

export const STAGE_BORDER_COLORS: Record<OpportunityStage, string> = {
  new_contact: 'border-blue-200 dark:border-blue-800',
  in_service: 'border-amber-200 dark:border-amber-800',
  quote_creating: 'border-orange-200 dark:border-orange-800',
  quote_sent: 'border-violet-200 dark:border-violet-800',
  negotiation: 'border-rose-200 dark:border-rose-800',
  follow_up: 'border-sky-200 dark:border-sky-800',
  closed: 'border-emerald-200 dark:border-emerald-800',
  lost: 'border-slate-200 dark:border-slate-700',
};

export const STAGE_TEXT_COLORS: Record<OpportunityStage, string> = {
  new_contact: 'text-blue-700 dark:text-blue-300',
  in_service: 'text-amber-700 dark:text-amber-300',
  quote_creating: 'text-orange-700 dark:text-orange-300',
  quote_sent: 'text-violet-700 dark:text-violet-300',
  negotiation: 'text-rose-700 dark:text-rose-300',
  follow_up: 'text-sky-700 dark:text-sky-300',
  closed: 'text-emerald-700 dark:text-emerald-300',
  lost: 'text-slate-600 dark:text-slate-400',
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
