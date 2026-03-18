import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

// ─── Points Configuration ───────────────────────────────────
export const POINTS_CONFIG = {
  // Engajamento básico
  daily_login: 1,
  access_news_page: 1,
  read_news: 1,
  menu_visit: 0.25,

  // EducaTravel Academy
  start_trail: 3,
  complete_module: 5,
  complete_trail: 15,
  earn_certificate: 20,

  // Orçamentos (ALTA PRIORIDADE)
  create_quote: 5,
  finalize_quote: 15,
  send_quote: 20,
  update_quote: 3,

  // CRM / Pipeline
  create_client: 3,
  create_opportunity: 5,
  move_pipeline_stage: 2,
  reach_quote_sent: 10,
  reach_followup: 5,

  // Roteiros
  create_itinerary: 5,
  publish_itinerary: 10,

  // Conteúdo
  generate_content: 4,
  use_material: 2,

  // Vitrine
  create_showcase: 10,
  add_showcase_item: 5,

  // Personalização
  create_business_card: 10,
  use_lamina_customizer: 5,

  // Leads
  receive_lead: 5,
  interact_lead: 3,

  // Benefícios e Comunidade
  add_benefit: 10,
  like_benefit: 1,
  ask_question: 2,
  answer_question: 5,
  useful_vote_received: 5,
  best_answer: 10,

  // Agenda
  create_event: 2,

  // Missões
  daily_mission_complete: 10,
  weekly_mission_complete: 30,
  strategic_mission_complete: 50,
} as const;

// ─── Anti-abuse: Daily Limits ────────────────────────────────
export const DAILY_LIMITS: Record<string, number> = {
  daily_login: 1,
  access_news_page: 1,
  read_news: 5,
  menu_visit: 15,
  like_benefit: 10,
  ask_question: 5,
  answer_question: 10,
  create_event: 5,
  create_quote: 5,
  update_quote: 10,
  generate_content: 5,
  use_material: 10,
  create_client: 10,
  create_opportunity: 5,
  move_pipeline_stage: 10,
  interact_lead: 10,
  add_showcase_item: 10,
};

// ─── Levels ──────────────────────────────────────────────────
export const LEVELS = [
  { name: "Iniciante", min: 0, max: 50, icon: "🌱", color: "from-gray-400 to-gray-500" },
  { name: "Explorador", min: 51, max: 200, icon: "🧭", color: "from-blue-400 to-blue-600" },
  { name: "Agente Pro", min: 201, max: 500, icon: "⭐", color: "from-purple-400 to-purple-600" },
  { name: "Especialista", min: 501, max: 1200, icon: "💎", color: "from-amber-400 to-amber-600" },
  { name: "Elite", min: 1201, max: Infinity, icon: "👑", color: "from-yellow-400 to-amber-500" },
] as const;

export function getLevel(points: number) {
  return LEVELS.find((l) => points >= l.min && points <= l.max) || LEVELS[0];
}

export function getLevelProgress(points: number) {
  const level = getLevel(points);
  const nextLevel = LEVELS.find((l) => l.min > level.min);
  if (!nextLevel) return 100;
  const range = nextLevel.min - level.min;
  const progress = points - level.min;
  return Math.min(Math.round((progress / range) * 100), 100);
}

export function getNextLevel(points: number) {
  const level = getLevel(points);
  return LEVELS.find((l) => l.min > level.min) || null;
}

// ─── Trackable Sections ─────────────────────────────────────
export const TRACKABLE_SECTIONS: Record<string, string> = {
  "/mapa-turismo": "Mapa do Turismo",
  "/educa-academy": "EducaTravel Academy",
  "/bloqueios-aereos": "Bloqueios Aéreos",
  "/materiais": "Materiais",
  "/noticias": "Notícias",
  "/agenda": "Agenda",
  "/bloco-notas": "Bloco de Notas",
  "/gestao-clientes": "Gestão de Clientes",
  "/ferramentas-ia": "Ferramentas IA",
  "/comunidade": "Comunidade",
  "/mentorias": "Cursos e Mentorias",
  "/perguntas-respostas": "Perguntas e Respostas",
  "/financeiro": "Financeiro",
  "/calculadora": "Calculadora",
  "/hotel-advisor": "Hotel Advisor",
  "/beneficios": "Benefícios",
};

// ─── Action Labels ───────────────────────────────────────────
export const ACTION_LABELS: Record<string, string> = {
  daily_login: "Login diário",
  access_news_page: "Acessou Notícias",
  read_news: "Leu notícia",
  menu_visit: "Navegação no menu",
  start_trail: "Iniciou trilha",
  complete_module: "Concluiu módulo",
  complete_trail: "Concluiu trilha",
  earn_certificate: "Certificado conquistado",
  create_quote: "Criou orçamento",
  finalize_quote: "Finalizou orçamento",
  send_quote: "Enviou orçamento",
  update_quote: "Atualizou orçamento",
  create_client: "Criou cliente",
  create_opportunity: "Criou oportunidade",
  move_pipeline_stage: "Avançou etapa do funil",
  reach_quote_sent: "Orçamento enviado",
  reach_followup: "Follow-up",
  create_itinerary: "Criou roteiro",
  publish_itinerary: "Publicou roteiro",
  generate_content: "Gerou conteúdo IA",
  use_material: "Usou material",
  create_showcase: "Criou vitrine",
  add_showcase_item: "Adicionou lâmina",
  create_business_card: "Criou cartão digital",
  use_lamina_customizer: "Personalizou lâmina",
  receive_lead: "Recebeu lead",
  interact_lead: "Interagiu com lead",
  add_benefit: "Adicionou benefício",
  like_benefit: "Curtiu benefício",
  ask_question: "Fez pergunta",
  answer_question: "Respondeu pergunta",
  useful_vote_received: "Voto útil recebido",
  best_answer: "Melhor resposta",
  create_event: "Criou evento na agenda",
  daily_mission_complete: "Missão diária completa",
  weekly_mission_complete: "Missão semanal completa",
  strategic_mission_complete: "Missão estratégica completa",
};

// ─── Mission Definitions ────────────────────────────────────
export interface MissionDef {
  key: string;
  title: string;
  description: string;
  type: "daily" | "weekly" | "strategic";
  requirements: { action: string; count: number }[];
  bonusPoints: number;
  icon: string;
}

export const MISSIONS: MissionDef[] = [
  // Daily
  {
    key: "daily_login_news",
    title: "Dia Produtivo",
    description: "Faça login e acesse as notícias",
    type: "daily",
    requirements: [
      { action: "daily_login", count: 1 },
      { action: "access_news_page", count: 1 },
    ],
    bonusPoints: POINTS_CONFIG.daily_mission_complete,
    icon: "🔥",
  },
  {
    key: "daily_productive",
    title: "Ação do Dia",
    description: "Crie 1 orçamento, conteúdo ou roteiro",
    type: "daily",
    requirements: [
      { action: "create_quote|generate_content|create_itinerary", count: 1 },
    ],
    bonusPoints: POINTS_CONFIG.daily_mission_complete,
    icon: "⚡",
  },
  // Weekly
  {
    key: "weekly_quotes",
    title: "Máquina de Orçamentos",
    description: "Crie 2 orçamentos esta semana",
    type: "weekly",
    requirements: [{ action: "create_quote", count: 2 }],
    bonusPoints: POINTS_CONFIG.weekly_mission_complete,
    icon: "📋",
  },
  {
    key: "weekly_content",
    title: "Criador de Conteúdo",
    description: "Gere 2 conteúdos esta semana",
    type: "weekly",
    requirements: [{ action: "generate_content", count: 2 }],
    bonusPoints: POINTS_CONFIG.weekly_mission_complete,
    icon: "✍️",
  },
  {
    key: "weekly_lead",
    title: "Caçador de Leads",
    description: "Interaja com 1 lead esta semana",
    type: "weekly",
    requirements: [{ action: "interact_lead|receive_lead", count: 1 }],
    bonusPoints: POINTS_CONFIG.weekly_mission_complete,
    icon: "🎯",
  },
  // Strategic
  {
    key: "strategic_funnel",
    title: "Funil Completo",
    description: "Crie cliente + orçamento + envio",
    type: "strategic",
    requirements: [
      { action: "create_client", count: 1 },
      { action: "create_quote", count: 1 },
      { action: "send_quote", count: 1 },
    ],
    bonusPoints: POINTS_CONFIG.strategic_mission_complete,
    icon: "🏆",
  },
  {
    key: "strategic_combo",
    title: "Combo Power",
    description: "Vitrine + conteúdo + orçamento",
    type: "strategic",
    requirements: [
      { action: "create_showcase|add_showcase_item", count: 1 },
      { action: "generate_content", count: 1 },
      { action: "create_quote", count: 1 },
    ],
    bonusPoints: POINTS_CONFIG.strategic_mission_complete,
    icon: "💫",
  },
];

// ─── Points Toast ────────────────────────────────────────────
export function showPointsToast(points: number, action: string) {
  const label = ACTION_LABELS[action] || action;
  toast(`⭐ +${points} pts`, {
    description: label,
    duration: 3000,
    position: "top-right",
  });
}

// ─── Standalone Award Function ───────────────────────────────
// Can be called from any hook without needing React context
export async function awardGamificationPoints(
  userId: string,
  points: number,
  action: string,
  referenceId?: string,
  showToast = true
): Promise<boolean> {
  // Anti-abuse: check daily limits
  const limit = DAILY_LIMITS[action];
  if (limit) {
    const today = new Date().toISOString().split("T")[0];
    const { count } = await supabase
      .from("gamification_points")
      .select("*", { count: "exact", head: true })
      .eq("user_id", userId)
      .eq("action", action)
      .gte("created_at", today + "T00:00:00.000Z")
      .lte("created_at", today + "T23:59:59.999Z");
    if ((count || 0) >= limit) return false;
  }

  const { error } = await supabase.from("gamification_points").insert({
    user_id: userId,
    points,
    action,
    reference_id: referenceId || null,
  });

  if (!error && showToast) {
    showPointsToast(points, action);
  }

  return !error;
}
