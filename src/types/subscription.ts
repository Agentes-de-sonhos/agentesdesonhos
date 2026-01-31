export type SubscriptionPlan = 'essencial' | 'profissional' | 'premium';

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
  // Profissional features
  | 'ai_tools'
  | 'quote_generator'
  | 'trip_wallet'
  | 'reminders'
  | 'financial'
  | 'trainings_live'
  // Premium features
  | 'ai_unlimited'
  | 'trails_premium'
  | 'certificates'
  | 'ranking'
  | 'premium_group'
  | 'fam_tours';

export const PLAN_FEATURES: Record<SubscriptionPlan, Feature[]> = {
  essencial: [
    'news',
    'tourism_map',
    'materials',
    'agenda',
    'crm_basic',
    'trainings_recorded',
  ],
  profissional: [
    'news',
    'tourism_map',
    'materials',
    'agenda',
    'crm_basic',
    'trainings_recorded',
    'ai_tools',
    'quote_generator',
    'trip_wallet',
    'reminders',
    'financial',
    'trainings_live',
  ],
  premium: [
    'news',
    'tourism_map',
    'materials',
    'agenda',
    'crm_basic',
    'trainings_recorded',
    'ai_tools',
    'quote_generator',
    'trip_wallet',
    'reminders',
    'financial',
    'trainings_live',
    'ai_unlimited',
    'trails_premium',
    'certificates',
    'ranking',
    'premium_group',
    'fam_tours',
  ],
};

export const PLAN_LABELS: Record<SubscriptionPlan, string> = {
  essencial: 'Essencial',
  profissional: 'Profissional',
  premium: 'Premium',
};

export const PLAN_DESCRIPTIONS: Record<SubscriptionPlan, string> = {
  essencial: 'Acesso básico às notícias, mapa do turismo, materiais e CRM',
  profissional: 'Ferramentas IA, orçamentos, Trip Wallet e financeiro incluídos',
  premium: 'Acesso completo com trilhas premium, certificados e benefícios exclusivos',
};

export const AI_LIMITS: Record<SubscriptionPlan, number> = {
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
  trip_wallet: 'Trip Wallet',
  reminders: 'Lembretes Automáticos',
  financial: 'Módulo Financeiro',
  trainings_live: 'Treinamentos ao Vivo',
  ai_unlimited: 'IA Ilimitada',
  trails_premium: 'Trilhas Premium',
  certificates: 'Certificados',
  ranking: 'Ranking de Engajamento',
  premium_group: 'Grupo Premium',
  fam_tours: 'Fam Tours Exclusivos',
};

export const REQUIRED_PLAN_FOR_FEATURE: Record<Feature, SubscriptionPlan> = {
  news: 'essencial',
  tourism_map: 'essencial',
  materials: 'essencial',
  agenda: 'essencial',
  crm_basic: 'essencial',
  trainings_recorded: 'essencial',
  ai_tools: 'profissional',
  quote_generator: 'profissional',
  trip_wallet: 'profissional',
  reminders: 'profissional',
  financial: 'profissional',
  trainings_live: 'profissional',
  ai_unlimited: 'premium',
  trails_premium: 'premium',
  certificates: 'premium',
  ranking: 'premium',
  premium_group: 'premium',
  fam_tours: 'premium',
};
