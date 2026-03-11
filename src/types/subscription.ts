export type SubscriptionPlan = 'educa_pass' | 'cartao_digital' | 'essencial' | 'profissional' | 'premium';

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
  // Profissional features
  | 'ai_tools'
  | 'quote_generator'
  | 'trip_wallet'
  | 'reminders'
  | 'trainings_live'
  // Premium features
  | 'ai_unlimited'
  | 'trails_premium'
  | 'certificates'
  | 'ranking'
  | 'premium_group'
  | 'fam_tours'
  | 'community'
  | 'qa_forum';

export const PLAN_FEATURES: Record<SubscriptionPlan, Feature[]> = {
  educa_pass: [
    'trainings_recorded',
  ],
  essencial: [
    'news',
    'tourism_map',
    'materials',
    'agenda',
    'crm_basic',
    'trainings_recorded',
    'financial',
  ],
  profissional: [
    'news',
    'tourism_map',
    'materials',
    'agenda',
    'crm_basic',
    'trainings_recorded',
    'financial',
    'ai_tools',
    'quote_generator',
    'trip_wallet',
    'reminders',
    'trainings_live',
  ],
  premium: [
    'news',
    'tourism_map',
    'materials',
    'agenda',
    'crm_basic',
    'trainings_recorded',
    'financial',
    'ai_tools',
    'quote_generator',
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
    'qa_forum',
  ],
};

export const PLAN_LABELS: Record<SubscriptionPlan, string> = {
  educa_pass: 'EducaTravel Pass',
  essencial: 'Essencial',
  profissional: 'Profissional',
  premium: 'Premium',
};

export const PLAN_DESCRIPTIONS: Record<SubscriptionPlan, string> = {
  educa_pass: 'Acesso gratuito à EducaTravel Academy',
  essencial: 'Acesso básico às notícias, mapa do turismo, materiais e CRM',
  profissional: 'Ferramentas IA, orçamentos, Carteira Digital e financeiro incluídos',
  premium: 'Acesso completo com trilhas premium, certificados e benefícios exclusivos',
};

export const AI_LIMITS: Record<SubscriptionPlan, number> = {
  educa_pass: 0,
  essencial: 0,
  profissional: 20,
  premium: 1000,
};

export const FEATURE_LABELS: Record<Feature, string> = {
  news: 'Notícias do Trade',
  tourism_map: 'Mapa do Turismo',
  materials: 'Materiais de Divulgação',
  agenda: 'Agenda',
  crm_basic: 'CRM Básico',
  trainings_recorded: 'Treinamentos Gravados',
  ai_tools: 'Ferramentas IA',
  quote_generator: 'Gerador de Orçamentos',
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
  qa_forum: 'Perguntas e Respostas',
};

export const REQUIRED_PLAN_FOR_FEATURE: Record<Feature, SubscriptionPlan> = {
  news: 'essencial',
  tourism_map: 'essencial',
  materials: 'essencial',
  agenda: 'essencial',
  crm_basic: 'essencial',
  trainings_recorded: 'educa_pass',
  financial: 'essencial',
  ai_tools: 'profissional',
  quote_generator: 'profissional',
  trip_wallet: 'profissional',
  reminders: 'profissional',
  trainings_live: 'profissional',
  ai_unlimited: 'premium',
  trails_premium: 'premium',
  certificates: 'premium',
  ranking: 'premium',
  premium_group: 'premium',
  fam_tours: 'premium',
  community: 'premium',
  qa_forum: 'premium',
};

// Launch date for countdown
export const LAUNCH_DATE = new Date('2026-03-16T00:00:00-03:00');
