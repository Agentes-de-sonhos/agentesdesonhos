/**
 * Prévia de link (WhatsApp/redes sociais) por domínio de agência.
 * Imagem = logotipo oficial centralizado em 1200×630 (arquivos em /public/og).
 * Só os domínios listados recebem prévia própria; os demais ficam inalterados.
 */
import { normalizeBrandHost } from "@/lib/agencySiteBrand";

export interface AgencySharePreview {
  siteName: string;
  title: string;
  description: string;
  /** Caminho do arquivo em /public — vira URL absoluta no domínio da agência. */
  imagePath: string;
}

const JU: AgencySharePreview = {
  siteName: "Destinos com a Ju",
  title: "Destinos com a Ju | Viagens Personalizadas, Orlando e Cruzeiros",
  description:
    "Consultoria completa em viagens sob medida com Juliana Neves. Ingressos, Orlando, roteiros pela Europa, cruzeiros e suporte antes, durante e depois.",
  imagePath: "/og/share-ju.jpg",
};
const LIMITES: AgencySharePreview = {
  siteName: "100 Limites Viagens",
  title: "100 Limites | Agência de Viagens & Especialista em Portugal",
  description:
    "Viagens personalizadas pelo Brasil e pelo mundo com Amanda Larini. Consultoria dedicada, atendimento próximo e receptivo exclusivo em Portugal.",
  imagePath: "/og/share-limites.jpg",
};
const PARAISO: AgencySharePreview = {
  siteName: "Paraíso Viagens",
  title: "Paraíso Viagens | Curadoria de Viagens e Experiências Exclusivas",
  description:
    "Viagens desenhadas sob medida com curadoria de luxo por Mariana e Daniela. Experiências autênticas, hospitalidade de excelência e atendimento próximo.",
  imagePath: "/og/share-paraiso.jpg",
};
const MUNDO: AgencySharePreview = {
  siteName: "O Mundo em Cores",
  title: "O Mundo em Cores | Studio de Viagens por Vanessa Figueiredo",
  description:
    "Viagens desenhadas sob medida com cuidado e cor por Vanessa Figueiredo. Universal Orlando, Xcaret, resorts, cruzeiros e acompanhamento completo.",
  imagePath: "/og/share-mundo.jpg",
};

const CURTI: AgencySharePreview = {
  siteName: "Curti Viagens",
  title: "Curti Viagens | Agência de Viagens em Holambra (SP)",
  description:
    "Consultoria completa de viagens desde 2013: Orlando, cruzeiros, resorts no Brasil, Nova York, Europa e roteiros sob medida com a Curti Viagens.",
  imagePath: "/og/share-curti.jpg",
};

const DRICA: AgencySharePreview = {
  siteName: "Drica Viagens",
  title: "Drica Viagens | Viagens sob medida com Adriana Martins",
  description: "Drica Viagens: viagens sob medida com Adriana Martins. Orlando, cruzeiros, resorts e roteiros planejados com atendimento próximo.",
  imagePath: "/og/share-drica.jpg",
};
const ESSYA: AgencySharePreview = {
  siteName: "Essyatur",
  title: "Essyatur | Consultoria de Viagens em São Paulo (SP)",
  description: "Essyatur: consultoria de viagens sob medida em São Paulo (SP), com mais de 10 anos de experiência.",
  imagePath: "/og/share-essya.jpg",
};
const ARENA: AgencySharePreview = {
  siteName: "Arena Travel Group",
  title: "Arena Travel Group | Viagens sob medida para famílias e grupos",
  description: "Viagens sob medida para famílias e grupos, resorts, Europa e experiências na neve com a Arena Travel Group.",
  imagePath: "/og/share-arena.jpg",
};
const PRISTUR: AgencySharePreview = {
  siteName: "Pristur Viagens",
  title: "Pristur Viagens | Planejamento de viagens com a Priscila",
  description: "Viagens em família, parques, cruzeiros e resorts com planejamento personalizado e acompanhamento da Pristur Viagens.",
  imagePath: "/og/share-pristur.jpg",
};

const PREVIEW_BY_HOST: Record<string, AgencySharePreview> = {
  "destinoscomaju.com.br": JU,
  "www.destinoscomaju.com.br": JU,
  "100limites.tur.br": LIMITES,
  "www.100limites.tur.br": LIMITES,
  "paraisoviagens.com": PARAISO,
  "www.paraisoviagens.com": PARAISO,
  "omundoemcores.com.br": MUNDO,
  "www.omundoemcores.com.br": MUNDO,
  "curtiviagens.com.br": CURTI,
  "www.curtiviagens.com.br": CURTI,
  "dricaviagens.com.br": DRICA,
  "www.dricaviagens.com.br": DRICA,
  "essyatur.com.br": ESSYA,
  "www.essyatur.com.br": ESSYA,
  "arenatravelgroup.com.br": ARENA,
  "www.arenatravelgroup.com.br": ARENA,
  "pristur.com.br": PRISTUR,
  "www.pristur.com.br": PRISTUR,
};

/** Host canônico (o mesmo dos sitemaps): apex → www, exceto quando o www não está ativo. */
const APEX_ONLY = new Set(["paraisoviagens.com"]);
const CANONICAL_WWW = new Set([
  "curtiviagens.com.br", "dricaviagens.com.br", "essyatur.com.br", "arenatravelgroup.com.br",
  "pristur.com.br", "destinoscomaju.com.br", "omundoemcores.com.br", "100limites.tur.br",
]);

export function canonicalAgencyHost(hostname: string): string {
  const host = (hostname || "").trim().toLowerCase().replace(/:\d+$/, "");
  if (APEX_ONLY.has(host.replace(/^www\./, ""))) return host.replace(/^www\./, "");
  return CANONICAL_WWW.has(host) ? `www.${host}` : host;
}

export function resolveAgencySharePreview(hostname?: string | null) {
  const host = normalizeBrandHost(hostname);
  const preview = PREVIEW_BY_HOST[host];
  if (!preview) return null;
  return { ...preview, image: `https://${host === "curtiviagens.com.br" ? canonicalAgencyHost(host) : host}${preview.imagePath}`, canonical: `https://${canonicalAgencyHost(host)}/` };
}
