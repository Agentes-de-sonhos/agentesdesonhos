export type AgencyEventType = 'compromisso' | 'trade' | 'venda' | 'lembrete' | 'reuniao' | 'viagem' | 'aniversario';
export type PresetEventType = 'feriado' | 'comemorativo' | 'trade' | 'treinamento';
export type ViewMode = 'year' | 'month' | 'week' | 'day';

export interface AgencyEvent {
  id: string;
  user_id: string;
  title: string;
  description: string | null;
  event_type: string;
  event_date: string;
  event_time: string | null;
  color: string | null;
  client_id: string | null;
  opportunity_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface PresetEvent {
  id: string;
  title: string;
  description: string | null;
  event_type: PresetEventType;
  event_date: string;
  recurring_yearly: boolean;
  color: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface HiddenPresetEvent {
  id: string;
  user_id: string;
  preset_event_id: string;
  hidden_at: string;
}

export interface CustomEventType {
  id: string;
  user_id: string;
  name: string;
  color: string;
  created_at: string;
  updated_at: string;
}

export interface AgendaFilterPreferences {
  id: string;
  user_id: string;
  hidden_types: string[];
  created_at: string;
  updated_at: string;
}

export interface CalendarEvent {
  id: string;
  title: string;
  description: string | null;
  event_type: string;
  event_date: string;
  event_time: string | null;
  color: string;
  isPreset: boolean;
  isHidden?: boolean;
  client_id?: string | null;
  opportunity_id?: string | null;
}

// Default event type colors
export const eventTypeColors: Record<string, string> = {
  // Agency events (default types)
  compromisso: '#22c55e',
  trade: '#3b82f6',
  venda: '#f97316',
  lembrete: '#6b7280',
  reuniao: '#8b5cf6',
  viagem: '#14b8a6',
  aniversario: '#ec4899',
  // Preset events
  feriado: '#ef4444',
  comemorativo: '#ec4899',
  treinamento: '#eab308',
};

// Default event type labels (Portuguese)
export const eventTypeLabels: Record<string, string> = {
  // Agency events
  compromisso: 'Compromisso',
  trade: 'Evento do Trade',
  venda: 'Venda',
  lembrete: 'Lembrete',
  reuniao: 'Reunião',
  viagem: 'Viagem',
  aniversario: 'Aniversário',
  // Preset events
  feriado: 'Feriado',
  comemorativo: 'Data Comemorativa',
  treinamento: 'Treinamento',
};

// All default agency event types
export const defaultAgencyEventTypes: AgencyEventType[] = [
  'compromisso',
  'trade',
  'venda',
  'lembrete',
  'reuniao',
  'viagem',
  'aniversario',
];

// All preset event types for filter
export const presetEventTypes: PresetEventType[] = [
  'feriado',
  'comemorativo',
  'trade',
  'treinamento',
];
