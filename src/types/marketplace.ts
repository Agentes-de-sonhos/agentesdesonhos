export type CourseProductType = 'course' | 'mentorship' | 'hybrid';
export type CourseLevel = 'iniciante' | 'intermediario' | 'avancado';
export type CourseStatus = 'draft' | 'pending_review' | 'approved' | 'rejected';

export interface MarketplaceCourse {
  id: string;
  creator_id: string;
  title: string;
  description: string | null;
  cover_image_url: string | null;
  product_type: CourseProductType;
  price: number;
  category: string;
  level: CourseLevel;
  status: CourseStatus;
  rejection_reason: string | null;
  is_active: boolean;
  total_lessons: number;
  total_duration_minutes: number;
  enrolled_count: number;
  created_at: string;
  updated_at: string;
  // joined
  creator_name?: string;
  creator_avatar?: string;
}

export interface MarketplaceModule {
  id: string;
  course_id: string;
  title: string;
  description: string | null;
  order_index: number;
  created_at: string;
  updated_at: string;
  lessons?: MarketplaceLesson[];
}

export interface MarketplaceLesson {
  id: string;
  module_id: string;
  title: string;
  description: string | null;
  video_url: string | null;
  duration_minutes: number;
  material_url: string | null;
  material_name: string | null;
  order_index: number;
  is_preview: boolean;
  created_at: string;
  updated_at: string;
}

export interface MarketplaceMeeting {
  id: string;
  course_id: string;
  title: string;
  description: string | null;
  meeting_date: string;
  meeting_url: string | null;
  recording_url: string | null;
  created_at: string;
  updated_at: string;
}

export interface MarketplaceEnrollment {
  id: string;
  course_id: string;
  user_id: string;
  stripe_session_id: string | null;
  amount_paid: number;
  enrolled_at: string;
}

export interface MarketplaceLessonProgress {
  id: string;
  enrollment_id: string;
  lesson_id: string;
  completed_at: string;
}

export interface MarketplaceComment {
  id: string;
  course_id: string;
  lesson_id: string | null;
  user_id: string;
  content: string;
  created_at: string;
  // joined
  user_name?: string;
  user_avatar?: string;
}

export const COURSE_CATEGORIES = [
  { value: 'destinos', label: 'Destinos' },
  { value: 'vendas', label: 'Vendas' },
  { value: 'marketing', label: 'Marketing' },
  { value: 'gestao', label: 'Gestão de Agência' },
  { value: 'ferramentas', label: 'Ferramentas' },
  { value: 'atendimento', label: 'Atendimento ao Cliente' },
  { value: 'produtos', label: 'Produtos Turísticos' },
  { value: 'geral', label: 'Geral' },
];

export const COURSE_LEVELS = [
  { value: 'iniciante', label: 'Iniciante' },
  { value: 'intermediario', label: 'Intermediário' },
  { value: 'avancado', label: 'Avançado' },
];

export const PRODUCT_TYPES = [
  { value: 'course', label: 'Curso Gravado', description: 'Aulas em vídeo organizadas em módulos' },
  { value: 'mentorship', label: 'Mentoria', description: 'Encontros ao vivo com acompanhamento' },
  { value: 'hybrid', label: 'Híbrido', description: 'Curso gravado + encontros ao vivo' },
];
