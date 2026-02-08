export type AgencyEventType = 'compromisso' | 'trade' | 'venda' | 'lembrete';
export type PresetEventType = 'feriado' | 'comemorativo' | 'trade';
export type ViewMode = 'year' | 'month' | 'week';

export interface AgencyEvent {
  id: string;
  user_id: string;
  title: string;
  description: string | null;
  event_type: AgencyEventType;
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

export const eventTypeColors: Record<string, string> = {
  // Agency events
  compromisso: '#22c55e',
  trade: '#3b82f6',
  venda: '#f97316',
  lembrete: '#6b7280',
  // Preset events
  feriado: '#ef4444',
  comemorativo: '#ec4899',
};

export const eventTypeLabels: Record<string, string> = {
  compromisso: 'Compromisso',
  trade: 'Evento do Trade',
  venda: 'Venda',
  lembrete: 'Lembrete',
  feriado: 'Feriado',
  comemorativo: 'Data Comemorativa',
};
