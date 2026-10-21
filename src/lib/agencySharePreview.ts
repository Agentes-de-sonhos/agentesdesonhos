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

const PREVIEW_BY_HOST: Record<string, AgencySharePreview> = {
  "destinoscomaju.com.br": JU,
  "www.destinoscomaju.com.br": JU,
  "100limites.tur.br": LIMITES,
  "www.100limites.tur.br": LIMITES,
  "paraisoviagens.com": PARAISO,
  "www.paraisoviagens.com": PARAISO,
  "omundoemcores.com.br": MUNDO,
  "www.omundoemcores.com.br": MUNDO,
};

export function resolveAgencySharePreview(hostname?: string | null) {
  const host = normalizeBrandHost(hostname);
  const preview = PREVIEW_BY_HOST[host];
  if (!preview) return null;
  const origin = `https://${host}`;
  return { ...preview, image: `${origin}${preview.imagePath}`, canonical: `${origin}/` };
}
