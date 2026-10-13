/**
 * PADRÃO OURO dos novos sites white-label gerados a partir do briefing.
 *
 * Estrutura consolidada a partir de Destinos com a Ju e 100 Limites: todas as
 * seções nascem LIGADAS e depois são desligadas pontualmente por agência.
 * Conteúdo (textos, fotos, dados legais) vem SEMPRE do briefing da agência —
 * este arquivo só define estrutura/ordem/acabamento, nunca dados de agência.
 *
 * Não altera `DEFAULT_SECTIONS` nem perfis existentes: apenas novos perfis de
 * prévia (fixtures de briefing) usam `buildGoldStandardProfile`.
 */
import type { AgencySectionKey, AgencySectionOverride } from "@/lib/agencySiteConfig";
import type { AgencySiteProfile, AgencySiteProfileKey } from "@/lib/agencySiteProfile";

/** Ordem de leitura do padrão ouro (hero e Central de Solicitações são fixos). */
export const GOLD_STANDARD_SECTION_ORDER: AgencySectionKey[] = [
  "orlando",
  "resorts",
  "authority",
  "destinations",
  "highlights",
  "modules",
  "about",
  "differentials",
  "concierge",
  "testimonials",
  "avaliacoes",
  "faq",
  "newsletter",
];

/** Seções que dependem de dado real/integração específica: ficam desligadas. */
const GOLD_STANDARD_OFF: AgencySectionKey[] = ["dmc", "offers", "signature", "credentials", "team"];

export function goldStandardSections(): Partial<Record<AgencySectionKey, AgencySectionOverride>> {
  const out: Partial<Record<AgencySectionKey, AgencySectionOverride>> = {};
  GOLD_STANDARD_SECTION_ORDER.forEach((key, i) => {
    out[key] = { enabled: true, order: i + 1 };
  });
  GOLD_STANDARD_OFF.forEach((key) => {
    out[key] = { enabled: false };
  });
  return out;
}

/**
 * Monta o perfil de um novo site a partir do padrão ouro. `overrides` traz o
 * conteúdo do briefing; `sections` do briefing desligam/reordenam pontualmente.
 */
export function buildGoldStandardProfile(
  key: AgencySiteProfileKey,
  overrides: Partial<AgencySiteProfile> = {},
): AgencySiteProfile {
  return {
    alternateSurfaces: true,
    compactSectionSpacing: true,
    randomizeDestinations: true,
    resortsMap: { enabled: true },
    ...overrides,
    key,
    sections: { ...goldStandardSections(), ...(overrides.sections ?? {}) },
  };
}
