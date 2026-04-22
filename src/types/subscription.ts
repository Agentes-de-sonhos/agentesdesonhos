export type SubscriptionPlan = 'start' | 'educa_pass' | 'cartao_digital' | 'essencial' | 'profissional' | 'premium' | 'fundador';

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
  | 'news'
  | 'tourism_map'
  | 'materials'
  | 'agenda'
  | 'crm_basic'
  | 'trainings_recorded'
  | 'financial'
  | 'business_card'
  | 'qa_forum'
  | 'qa_comment'
  | 'itinerary'
  | 'quote_generator'
  | 'flight_blocks'
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
  | 'content_creator'
  | 'benefits'
  | 'notepad'
  | 'showcase'
  | 'lamina_customizer'
  | 'lead_capture'
  | 'travel_advisor'
  | 'hotel_raio_x';

const ALL_FEATURES: Feature[] = [
  'news', 'tourism_map', 'materials', 'agenda', 'crm_basic',
  'trainings_recorded', 'financial', 'business_card', 'flight_blocks',
  'qa_forum', 'qa_comment', 'itinerary', 'quote_generator',
  'ai_tools', 'trip_wallet', 'reminders', 'trainings_live',
  'ai_unlimited', 'trails_premium', 'certificates', 'ranking',
  'premium_group', 'fam_tours', 'community', 'content_creator',
  'benefits', 'notepad', 'showcase', 'lamina_customizer',
  'lead_capture', 'travel_advisor', 'hotel_raio_x',
];

const START_FEATURES: Feature[] = [
  'news', 'tourism_map', 'agenda', 'trainings_recorded',
  'materials', 'benefits', 'itinerary', 'content_creator',
];

const PROFISSIONAL_FEATURES: Feature[] = [
  'news', 'tourism_map', 'materials', 'agenda', 'crm_basic',
  'trainings_recorded', 'financial', 'business_card', 'flight_blocks',
  'qa_forum', 'qa_comment', 'itinerary', 'quote_generator',
  'ai_tools', 'trip_wallet', 'reminders', 'trainings_live',
  'trails_premium', 'certificates', 'ranking', 'content_creator',
  'benefits', 'notepad', 'showcase', 'lamina_customizer',
  'lead_capture', 'travel_advisor', 'hotel_raio_x',
];

export const PLAN_FEATURES: Record<SubscriptionPlan, Feature[]> = {
  start: START_FEATURES,
  educa_pass: ['trainings_recorded'],
  cartao_digital: ['business_card'],
  essencial: [
    'news', 'tourism_map', 'materials', 'agenda', 'trainings_recorded',
    'business_card', 'flight_blocks', 'qa_forum', 'itinerary', 'quote_generator',
    'benefits', 'notepad', 'showcase', 'lamina_customizer', 'lead_capture',
    'travel_advisor', 'hotel_raio_x',
  ],
  profissional: PROFISSIONAL_FEATURES,
  premium: ALL_FEATURES,
  fundador: ALL_FEATURES,
};

export const PLAN_LABELS: Record<SubscriptionPlan, string> = {
  start: 'Plano Start',
  educa_pass: 'EducaTravel Pass',
  cartao_digital: 'Cartão Digital Pass',
  essencial: 'Essencial',
  profissional: 'Plano Profissional',
  premium: 'Plano Premium',
  fundador: 'Plano Fundador',
};

export const PLAN_DESCRIPTIONS: Record<SubscriptionPlan, string> = {
  start: 'Comece gratuitamente e teste as principais funcionalidades da plataforma',
  educa_pass: 'Acesso gratuito à EducaTravel Academy',
  cartao_digital: 'Acesso exclusivo ao Cartão de Visita Digital',
  essencial: 'Acesso básico com dashboard, materiais, agenda, roteiros e orçamentos limitados',
  profissional: 'Tudo que você precisa para operar sua agência com eficiência',
  premium: 'Para agentes que querem escalar resultados e se conectar com o mercado',
  fundador: 'Acesso vitalício completo — plano exclusivo dos primeiros membros',
};

export const AI_LIMITS: Record<SubscriptionPlan, number> = {
  start: 0,
  educa_pass: 0,
  cartao_digital: 0,
  essencial: 0,
  profissional: 1000,
  premium: 999999,
  fundador: 1000,
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
  benefits: 'Benefícios e Descontos',
  notepad: 'Bloco de Notas',
  showcase: 'Vitrine de Ofertas',
  lamina_customizer: 'Personalizador de Lâminas',
  lead_capture: 'Captação de Leads',
  travel_advisor: 'Travel Advisor',
  hotel_raio_x: 'Raio-X do Hotel',
};

export const REQUIRED_PLAN_FOR_FEATURE: Record<Feature, SubscriptionPlan> = {
  news: 'start',
  tourism_map: 'start',
  materials: 'start',
  agenda: 'start',
  benefits: 'start',
  trainings_recorded: 'start',
  crm_basic: 'profissional',
  business_card: 'profissional',
  financial: 'profissional',
  flight_blocks: 'profissional',
  qa_forum: 'profissional',
  qa_comment: 'profissional',
  itinerary: 'profissional',
  quote_generator: 'profissional',
  ai_tools: 'profissional',
  trip_wallet: 'profissional',
  reminders: 'profissional',
  trainings_live: 'profissional',
  trails_premium: 'profissional',
  certificates: 'profissional',
  ranking: 'profissional',
  content_creator: 'start',
  notepad: 'profissional',
  showcase: 'profissional',
  lamina_customizer: 'profissional',
  lead_capture: 'profissional',
  travel_advisor: 'profissional',
  hotel_raio_x: 'profissional',
  ai_unlimited: 'premium',
  premium_group: 'premium',
  fam_tours: 'premium',
  community: 'premium',
};

export const DAILY_AI_LIMITS: Partial<Record<SubscriptionPlan, number>> = {
  start: 4,         // 2 roteiros + 2 conteúdos
  profissional: 5,
};

export const ESSENCIAL_DAILY_LIMITS: Partial<Record<Feature, number>> = {
  itinerary: 1,
  quote_generator: 1,
};

export const START_DAILY_LIMITS: Partial<Record<Feature, number>> = {
  itinerary: 2,
};

export const LAUNCH_DATE = new Date('2026-03-16T00:00:00-03:00');

// Stripe price IDs
export const STRIPE_PRICE_IDS: Partial<Record<SubscriptionPlan, string>> = {
  profissional: 'price_1TLxTbFkGdVt5nie0MpVjQM3',
  premium: 'price_1TLxU4FkGdVt5nieNT6rfU3u',
};
