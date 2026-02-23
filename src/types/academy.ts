export interface LearningTrail {
  id: string;
  name: string;
  description: string | null;
  destination: string;
  image_url: string | null;
  order_index: number;
  is_active: boolean;
  total_hours: number;
  certificate_template_url: string | null;
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

export interface QuizQuestion {
  id: string;
  training_id: string;
  question_text: string;
  question_type: 'multiple_choice' | 'true_false' | 'single_choice';
  order_index: number;
  created_at: string;
  updated_at: string;
  options?: QuizOption[];
}

export interface QuizOption {
  id: string;
  question_id: string;
  option_text: string;
  is_correct: boolean;
  order_index: number;
  created_at: string;
}

export interface UserQuizAttempt {
  id: string;
  user_id: string;
  training_id: string;
  score: number;
  passed: boolean;
  answers: Record<string, string>;
  created_at: string;
}

export interface TrailExamQuestion {
  id: string;
  trail_id: string;
  question_text: string;
  question_type: 'multiple_choice' | 'true_false' | 'single_choice';
  order_index: number;
  created_at: string;
  updated_at: string;
  options?: TrailExamOption[];
}

export interface TrailExamOption {
  id: string;
  question_id: string;
  option_text: string;
  is_correct: boolean;
  order_index: number;
  created_at: string;
}

export interface UserExamAttempt {
  id: string;
  user_id: string;
  trail_id: string;
  score: number;
  passed: boolean;
  answers: Record<string, string>;
  created_at: string;
}

export interface TrailMaterial {
  id: string;
  trail_id: string;
  title: string;
  description: string | null;
  material_type: 'pdf' | 'video' | 'audio' | 'image' | 'link';
  category: string;
  file_url: string | null;
  is_premium: boolean;
  order_index: number;
  created_at: string;
  updated_at: string;
}

export interface AchievementDefinition {
  id: string;
  name: string;
  description: string | null;
  icon: string;
  criteria_type: string;
  criteria_value: number;
  created_at: string;
}

export interface UserAchievement {
  id: string;
  user_id: string;
  achievement_id: string;
  earned_at: string;
  achievement?: AchievementDefinition;
}

export interface TrailWithProgress extends LearningTrail {
  trainings: (TrailTraining & { training: Training })[];
  completedCount: number;
  totalCount: number;
  progressPercent: number;
  allQuizzesPassed: boolean;
  examPassed: boolean;
  hasCertificate: boolean;
}

export interface RankingUser {
  user_id: string;
  name: string;
  avatar_url: string | null;
  agency_name: string | null;
  trails_completed: number;
  total_score: number;
  avg_exam_score: number;
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

export const MATERIAL_CATEGORIES = [
  { value: 'apresentacoes', label: 'Apresentações' },
  { value: 'materiais_venda', label: 'Materiais de Venda' },
  { value: 'laminas', label: 'Lâminas de Divulgação' },
  { value: 'videos_extras', label: 'Vídeos Extras' },
  { value: 'podcasts', label: 'Podcasts' },
  { value: 'infograficos', label: 'Infográficos' },
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
  'Disney',
  'Cruzeiros',
  'Destinos Premium',
];
