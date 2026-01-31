export interface LearningTrail {
  id: string;
  name: string;
  description: string | null;
  destination: string;
  image_url: string | null;
  order_index: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface Training {
  id: string;
  title: string;
  description: string | null;
  category: string;
  training_type: 'live' | 'recorded';
  video_url: string | null;
  duration_minutes: number;
  thumbnail_url: string | null;
  materials_url: string | null;
  instructor: string | null;
  scheduled_at: string | null;
  order_index: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface TrailTraining {
  id: string;
  trail_id: string;
  training_id: string;
  order_index: number;
  created_at: string;
  training?: Training;
}

export interface UserTrainingProgress {
  id: string;
  user_id: string;
  training_id: string;
  is_completed: boolean;
  watched_minutes: number;
  completed_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface UserCertificate {
  id: string;
  user_id: string;
  trail_id: string;
  agent_name: string;
  issued_at: string;
  certificate_number: string;
  created_at: string;
  trail?: LearningTrail;
}

export interface TrailWithProgress extends LearningTrail {
  trainings: (TrailTraining & { training: Training })[];
  completedCount: number;
  totalCount: number;
  progressPercent: number;
}

export interface RankingUser {
  user_id: string;
  name: string;
  avatar_url: string | null;
  trails_completed: number;
  total_watched_minutes: number;
}

export const TRAINING_CATEGORIES = [
  { value: 'hotelaria', label: 'Hotelaria' },
  { value: 'atracoes', label: 'Atrações' },
  { value: 'receptivos', label: 'Receptivos' },
  { value: 'transporte', label: 'Transporte' },
  { value: 'produtos', label: 'Produtos' },
  { value: 'vendas', label: 'Vendas' },
  { value: 'geral', label: 'Geral' },
];

export const POPULAR_DESTINATIONS = [
  'Orlando',
  'Nova York',
  'Miami',
  'Paris',
  'Londres',
  'Roma',
  'Caribe',
  'Cancún',
  'Punta Cana',
  'Buenos Aires',
  'Santiago',
  'Dubai',
  'Europa',
  'Ásia',
];
