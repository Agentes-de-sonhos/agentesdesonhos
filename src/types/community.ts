export type WorkshopCategory = 'contabilidade' | 'tributaria' | 'impostos' | 'juridico' | 'gestao';

export interface FunTrip {
  id: string;
  destination: string;
  trip_date: string;
  available_spots: number;
  partner_company: string;
  description: string | null;
  image_url: string | null;
  registration_url: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface OnlineMeeting {
  id: string;
  topic: string;
  meeting_datetime: string;
  meeting_url: string | null;
  recording_url: string | null;
  is_past: boolean;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface InPersonEvent {
  id: string;
  city: string;
  location: string;
  theme: string;
  event_date: string;
  registration_url: string | null;
  image_url: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface ProfessionalWorkshop {
  id: string;
  title: string;
  category: WorkshopCategory;
  description: string | null;
  video_url: string | null;
  materials_url: string | null;
  instructor: string | null;
  duration_minutes: number | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface PaidTraining {
  id: string;
  topic: string;
  partner_company: string;
  compensation: string;
  description: string | null;
  apply_url: string | null;
  image_url: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface CommunityHighlight {
  id: string;
  user_id: string;
  month: number;
  year: number;
  contribution_summary: string;
  is_winner: boolean;
  vote_count: number;
  created_at: string;
  updated_at: string;
  profile?: {
    name: string;
    avatar_url: string | null;
  };
}

export interface CommunityVote {
  id: string;
  voter_id: string;
  highlight_id: string;
  month: number;
  year: number;
  created_at: string;
}

export interface WhatsAppCommunity {
  id: string;
  invite_url: string;
  benefits: string[] | null;
  rules: string[] | null;
  is_active: boolean;
  updated_at: string;
}

export interface MonthlyPrize {
  id: string;
  month: number;
  year: number;
  prize_name: string;
  prize_description: string | null;
  prize_image_url: string | null;
  is_active: boolean;
  created_at: string;
}

export const WORKSHOP_CATEGORIES: { value: WorkshopCategory; label: string }[] = [
  { value: 'contabilidade', label: 'Contabilidade para Agências' },
  { value: 'tributaria', label: 'Reforma Tributária' },
  { value: 'impostos', label: 'Impostos' },
  { value: 'juridico', label: 'Jurídico' },
  { value: 'gestao', label: 'Gestão de Negócios' },
];

export const MONTH_NAMES = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
];
