// Filtra itens do menu lateral para usuários Premium/Fundadores não admin.
// Admins sempre veem o menu completo.

const HIDDEN_ITEM_KEYS = new Set<string>([
  "bloco_notas",
  "cursos_mentorias",
  "travel_advisor",
  "requisitos_viagem",
  "hotel_raio_x",
]);

const HIDDEN_SECTION_KEYS = new Set<string>([
  "section_recursos_vendas",
]);

const TARGET_PLANS = new Set<string>(["premium", "fundador", "promo_grupo_sc"]);

export function shouldApplyPremiumFundadorFilter(
  isAdmin: boolean,
  plan: string | null | undefined,
): boolean {
  if (isAdmin) return false;
  if (!plan) return false;
  return TARGET_PLANS.has(plan);
}

export function isSectionHiddenForUser(
  sectionKey: string | undefined,
  isAdmin: boolean,
  plan: string | null | undefined,
): boolean {
  if (!sectionKey) return false;
  if (!shouldApplyPremiumFundadorFilter(isAdmin, plan)) return false;
  return HIDDEN_SECTION_KEYS.has(sectionKey);
}

export function isItemHiddenForUser(
  itemKey: string | undefined,
  isAdmin: boolean,
  plan: string | null | undefined,
): boolean {
  if (!itemKey) return false;
  if (!shouldApplyPremiumFundadorFilter(isAdmin, plan)) return false;
  return HIDDEN_ITEM_KEYS.has(itemKey);
}
// Teste de 15 dias (Premium com trial, contas criadas desde 28/09/2026):
// oculta toda a seção "OUTRAS" (incluindo "Mais...") do menu lateral.
const TRIAL_15_START = Date.parse("2026-09-28T03:00:00Z"); // 28/09 00:00 BRT

export function isTrial15MenuUser(
  isAdmin: boolean,
  plan: string | null | undefined,
  userCreatedAt: string | null | undefined,
): boolean {
  if (isAdmin || plan !== "premium" || !userCreatedAt) return false;
  const created = Date.parse(userCreatedAt);
  return Number.isFinite(created) && created >= TRIAL_15_START;
}

// ADS Essencial: só Criar novo, Meus projetos e Agenda (sem GESTÃO e OUTRAS).
export function isAdsEssencialMenuUser(isAdmin: boolean, plan: string | null | undefined): boolean {
  return !isAdmin && plan === "ads_essencial";
}

// ADS Essencial + Gestão (2 ou 5 usuários): tudo menos a seção OUTRAS.
export function isAdsEssencialGestaoMenuUser(isAdmin: boolean, plan: string | null | undefined): boolean {
  return !isAdmin && (plan === "ads_essencial_gestao" || plan === "ads_essencial_gestao_equipe");
}

// ADS Gestão / Gestão Equipe: só GESTÃO e Agenda (sem Criar novo, Meus projetos e OUTRAS).
export function isAdsGestaoMenuUser(isAdmin: boolean, plan: string | null | undefined): boolean {
  return !isAdmin && (plan === "ads_gestao" || plan === "ads_gestao_equipe");
}
