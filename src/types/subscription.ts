export type SubscriptionPlan = 'educa_pass' | 'cartao_digital' | 'essencial' | 'profissional';

export interface Subscription {
  id: string;
  user_id: string;
  plan: SubscriptionPlan;
  started_at: string;
  expires_at: string | null;
  is_active: boolean;
  ai_usage_count: number;
  ai_usage_reset_at: string;
  created_at: string;
  updated_at: string;
}

export type Feature = 
  // Essencial features
  | 'news'
  | 'tourism_map'
  | 'materials'
  | 'agenda'
  | 'crm_basic'
  | 'trainings_recorded'
  | 'financial'
  // Cartão Digital Pass feature
  | 'business_card'
  // Features available in Essencial (some with daily limits)
  | 'qa_forum'
  | 'qa_comment'
  | 'itinerary'
  | 'quote_generator'
  | 'flight_blocks'
  // Profissional-only features
  | 'ai_tools'
  | 'trip_wallet'
  | 'reminders'
  | 'trainings_live'
  | 'ai_unlimited'
  | 'trails_premium'
  | 'certificates'
  | 'ranking'
  | 'premium_group'
  | 'fam_tours'
  | 'community'
  | 'content_creator';

export const PLAN_FEATURES: Record<SubscriptionPlan, Feature[]> = {
  educa_pass: [
    'trainings_recorded',
  ],
  cartao_digital: [
    'business_card',
  ],
  essencial: [
    'news',
    'tourism_map',
    'materials',
    'agenda',
    'trainings_recorded',
    'business_card',
    'flight_blocks',
    'qa_forum',
    'itinerary',
    'quote_generator',
  ],
  profissional: [
    'news',
    'tourism_map',
    'materials',
    'agenda',
    'crm_basic',
    'trainings_recorded',
    'financial',
    'business_card',
    'flight_blocks',
    'qa_forum',
    'qa_comment',
    'itinerary',
    'quote_generator',
    'ai_tools',
    'trip_wallet',
    'reminders',
    'trainings_live',
    'ai_unlimited',
    'trails_premium',
    'certificates',
    'ranking',
    'premium_group',
    'fam_tours',
    'community',
    'content_creator',
  ],
};

export const PLAN_LABELS: Record<SubscriptionPlan, string> = {
  educa_pass: 'EducaTravel Pass',
  cartao_digital: 'Cartão Digital Pass',
  essencial: 'Essencial',
  profissional: 'Plano Fundador',
};

export const PLAN_DESCRIPTIONS: Record<SubscriptionPlan, string> = {
  educa_pass: 'Acesso gratuito à EducaTravel Academy',
  cartao_digital: 'Acesso exclusivo ao Cartão de Visita Digital',
  essencial: 'Acesso básico com dashboard, materiais, agenda, roteiros e orçamentos limitados',
  profissional: 'Acesso completo ao Agentes de Sonhos por R$ 85,90/mês',
};

export const AI_LIMITS: Record<SubscriptionPlan, number> = {
  educa_pass: 0,
  cartao_digital: 0,
  essencial: 0,
  profissional: 1000,
};

export const FEATURE_LABELS: Record<Feature, string> = {
  news: 'Notícias do Trade',
  tourism_map: 'Mapa do Turismo',
  materials: 'Materiais de Divulgação',
  agenda: 'Agenda',
  crm_basic: 'CRM Básico',
  trainings_recorded: 'Treinamentos Gravados',
  business_card: 'Cartão de Visita Digital',
  flight_blocks: 'Bloqueios Aéreos',
  qa_forum: 'Perguntas e Respostas (visualizar)',
  qa_comment: 'Perguntas e Respostas (comentar)',
  itinerary: 'Criação de Roteiros',
  quote_generator: 'Gerador de Orçamentos',
  ai_tools: 'Ferramentas IA',
  trip_wallet: 'Carteira Digital',
  reminders: 'Lembretes Automáticos',
  financial: 'Módulo Financeiro',
  trainings_live: 'Treinamentos ao Vivo',
  community: 'Comunidade',
  ai_unlimited: 'IA Ilimitada',
  trails_premium: 'Trilhas Premium',
  certificates: 'Certificados',
  ranking: 'Ranking de Engajamento',
  premium_group: 'Grupo Premium',
  fam_tours: 'Fam Tours Exclusivos',
  content_creator: 'Criador de Conteúdo',
};

export const REQUIRED_PLAN_FOR_FEATURE: Record<Feature, SubscriptionPlan> = {
  news: 'essencial',
  tourism_map: 'essencial',
  materials: 'essencial',
  agenda: 'essencial',
  crm_basic: 'essencial',
  trainings_recorded: 'educa_pass',
  business_card: 'essencial',
  financial: 'essencial',
  flight_blocks: 'essencial',
  qa_forum: 'essencial',
  qa_comment: 'profissional',
  itinerary: 'essencial',
  quote_generator: 'essencial',
  ai_tools: 'profissional',
  trip_wallet: 'profissional',
  reminders: 'profissional',
  trainings_live: 'profissional',
  ai_unlimited: 'profissional',
  trails_premium: 'profissional',
  certificates: 'profissional',
  ranking: 'profissional',
  premium_group: 'profissional',
  fam_tours: 'profissional',
  community: 'profissional',
  content_creator: 'profissional',
};

/** Daily usage limits for Essencial plan (profissional has unlimited) */
export const ESSENCIAL_DAILY_LIMITS: Partial<Record<Feature, number>> = {
  itinerary: 1,
  quote_generator: 1,
};

// Launch date for countdown
export const LAUNCH_DATE = new Date('2026-03-16T00:00:00-03:00');
